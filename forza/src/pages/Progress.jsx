import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabaseAuth } from '../lib/supabase'
import styles from '../assets/css/modules/Progress.module.css'

const MEASUREMENT_FIELDS = [
  { key: 'chest_cm',  label: 'Pecho'    },
  { key: 'waist_cm',  label: 'Cintura'  },
  { key: 'hips_cm',   label: 'Caderas'  },
  { key: 'bicep_cm',  label: 'Bícep'    },
  { key: 'thigh_cm',  label: 'Muslo'    },
  { key: 'calf_cm',   label: 'Pantorrilla' },
]

const TABS = ['Peso', 'Medidas', 'Fotos', 'Sesiones']

export default function Progress() {
  const { profile } = useAuth()
  const [tab, setTab] = useState(0)

  // Weight
  const [weightLogs, setWeightLogs] = useState([])
  const [newWeight, setNewWeight] = useState('')

  // Measurements
  const [measurements, setMeasurements] = useState([])
  const [newMeasure, setNewMeasure] = useState({})
  const [showMeasureForm, setShowMeasureForm] = useState(false)

  // Photos
  const [photos, setPhotos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [photoAngle, setPhotoAngle] = useState('front')
  const fileRef = useRef(null)

  // Sessions
  const [sessions, setSessions] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => { if (profile?.id) loadAll(profile.id) }, [profile])

  async function loadAll(userId) {
    setLoading(true)
    const [w, m, p, s] = await Promise.all([
      supabaseAuth.from('weight_log').select('*').eq('user_id', userId).order('logged_at', { ascending: false }).limit(30),
      supabaseAuth.from('body_measurements').select('*').eq('user_id', userId).order('measured_at', { ascending: false }).limit(10),
      supabaseAuth.from('progress_photos').select('*').eq('user_id', userId).order('taken_at', { ascending: false }),
      supabaseAuth.from('workout_sessions').select('id, started_at, finished_at, routine_name, total_volume').eq('user_id', userId).not('finished_at', 'is', null).order('started_at', { ascending: false }).limit(20),
    ])
    setWeightLogs(w.data || [])
    setMeasurements(m.data || [])
    setPhotos(p.data || [])
    setSessions(s.data || [])
    setLoading(false)
  }

  async function logWeight() {
    if (!newWeight || !profile?.id) return
    setSaving(true)
    const { error } = await supabaseAuth.from('weight_log').upsert({
      user_id: profile.id, weight_kg: parseFloat(newWeight), logged_at: today
    }, { onConflict: 'user_id,logged_at' })
    if (!error) {
      await supabaseAuth.from('profiles').update({ weight_kg: parseFloat(newWeight) }).eq('id', profile.id)
      await loadAll(profile.id)
      showToast('✓ Peso registrado')
      setNewWeight('')
    }
    setSaving(false)
  }

  async function saveMeasurement() {
    if (!profile?.id) return
    setSaving(true)
    const payload = { user_id: profile.id, measured_at: today, ...newMeasure }
    Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k] })
    await supabaseAuth.from('body_measurements').upsert(payload, { onConflict: 'user_id,measured_at' })
    await loadAll(profile.id)
    showToast('✓ Medidas guardadas')
    setNewMeasure({})
    setShowMeasureForm(false)
    setSaving(false)
  }

  async function uploadPhoto(e) {
    const file = e.target.files[0]
    if (!file || !profile?.id) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const filename = `${Date.now()}.${ext}`
    const path = `${profile.id}/${filename}`

    const { error: uploadErr } = await supabaseAuth.storage
      .from('progress-photos')
      .upload(path, file, { contentType: file.type })

    if (!uploadErr) {
      const { data: { publicUrl } } = supabaseAuth.storage.from('progress-photos').getPublicUrl(path)
      await supabaseAuth.from('progress_photos').insert({
        user_id: profile.id, photo_url: publicUrl, angle: photoAngle, taken_at: today,
      })
      await loadAll(profile.id)
      showToast('✓ Foto subida')
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2200) }

  function Sparkline({ data }) {
    if (data.length < 2) return null
    const vals = [...data].reverse().map(d => d.weight_kg)
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const range = max - min || 1
    const W = 200, H = 40
    const pts = vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * W
      const y = H - ((v - min) / range) * (H - 4) - 2
      return `${x},${y}`
    }).join(' ')

    return (
      <svg width={W} height={H} className={styles.sparkline}>
        <polyline points={pts} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }

  return (
    <div className="page-container"> {/* MEJORA: Clase global para centrado móvil */}
      {toast && <div className={styles.toast}>{toast}</div>}

      <header className={styles.header}>
        <p className="accent">Tu evolución</p>
        <h1 className={styles.title}>Progreso</h1>
      </header>

      <div className={styles.tabs}>
        {TABS.map((t, i) => (
          <button key={t}
            className={`${styles.tab} ${tab === i ? styles.tabActive : ''}`}
            onClick={() => setTab(i)}
          >{t}</button>
        ))}
      </div>

      {loading ? (
        <div className={styles.skeletonList}>
          {Array(3).fill(0).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      ) : (
        <>
          {tab === 0 && (
            <div className={styles.tabContent}>
              {/* MEJORA: Contenedor flexible para que el botón no se salga */}
              <div className="registration-group">
                <div style={{ position: 'relative' }}>
                  <input type="number" className="input-field"
                    placeholder="Ej: 78.5" value={newWeight}
                    onChange={e => setNewWeight(e.target.value)} inputMode="decimal"
                  />
                  <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }}>kg</span>
                </div>
                <button className="btn-primary" onClick={logWeight} disabled={saving || !newWeight}>
                  {saving ? '...' : 'REGISTRAR'}
                </button>
              </div>

              {weightLogs.length >= 2 && (
                <div className={styles.sparkCard}>
                  <div className={styles.sparkHeader}>
                    <span className={styles.sparkLabel}>Últimas {weightLogs.length} entradas</span>
                    <span className={styles.sparkDelta}>
                      {`${(weightLogs[0].weight_kg - weightLogs[weightLogs.length - 1].weight_kg) > 0 ? '+' : ''}${(weightLogs[0].weight_kg - weightLogs[weightLogs.length - 1].weight_kg).toFixed(1)} kg`}
                    </span>
                  </div>
                  <Sparkline data={weightLogs} />
                </div>
              )}

              <div className={styles.logList}>
                {weightLogs.length === 0
                  ? <p className={styles.emptyText}>Sin registros de peso aún.</p>
                  : weightLogs.map(w => (
                    <div key={w.id} className={styles.logRow}>
                      <span className={styles.logDate}>{formatDate(w.logged_at)}</span>
                      <span className={styles.logWeight}>{w.weight_kg} kg</span>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {tab === 1 && (
            <div className={styles.tabContent}>
              <button className="btn-primary" onClick={() => setShowMeasureForm(p => !p)} style={{ marginBottom: '1rem', background: 'transparent', border: '1px solid var(--color-border)', color: 'white' }}>
                {showMeasureForm ? 'Cancelar' : '＋ Registrar medidas hoy'}
              </button>

              {showMeasureForm && (
                <div className={styles.measureForm}>
                  <div className={styles.measureGrid}>
                    {MEASUREMENT_FIELDS.map(f => (
                      <div key={f.key} className={styles.measureField}>
                        <label className={styles.measureLabel}>{f.label} (cm)</label>
                        <input type="number" className="input-field"
                          placeholder="—"
                          value={newMeasure[f.key] || ''}
                          onChange={e => setNewMeasure(p => ({ ...p, [f.key]: e.target.value }))}
                          inputMode="decimal"
                        />
                      </div>
                    ))}
                  </div>
                  <button className="btn-primary" onClick={saveMeasurement} disabled={saving} style={{ marginTop: '1rem' }}>
                    {saving ? 'Guardando...' : 'Guardar medidas'}
                  </button>
                </div>
              )}

              {measurements.length === 0 ? (
                <p className={styles.emptyText}>Sin medidas registradas aún.</p>
              ) : (
                measurements.map(m => (
                  <div key={m.id} className={styles.measureCard}>
                    <p className={styles.measureDate}>{formatDate(m.measured_at)}</p>
                    <div className={styles.measureValues}>
                      {MEASUREMENT_FIELDS.map(f => m[f.key] ? (
                        <div key={f.key} className={styles.measureValue}>
                          <span className={styles.measureValueLabel}>{f.label}</span>
                          <span className={styles.measureValueNum}>{m[f.key]} cm</span>
                        </div>
                      ) : null)}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 2 && (
            <div className={styles.tabContent}>
              <div className={styles.photoControls}>
                <div className={styles.angleSelect}>
                  {['front','side','back'].map(a => (
                    <button key={a}
                      className={`${styles.angleBtn} ${photoAngle === a ? styles.angleBtnActive : ''}`}
                      onClick={() => setPhotoAngle(a)}
                    >
                      {{ front: 'Frente', side: 'Lateral', back: 'Espalda' }[a]}
                    </button>
                  ))}
                </div>
                <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }} onChange={uploadPhoto} />
                <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ marginTop: '1rem' }}>
                  {uploading ? 'Subiendo...' : '📷 Subir foto'}
                </button>
              </div>

              {photos.length === 0 ? (
                <p className={styles.emptyText}>Sin fotos de progreso aún.</p>
              ) : (
                <div className={styles.photoGrid}>
                  {photos.map(p => (
                    <div key={p.id} className={styles.photoCard}>
                      <img src={p.photo_url} alt={p.angle} className={styles.photoImg} loading="lazy" />
                      <div className={styles.photoMeta}>
                        <span className={styles.photoAngle}>{{ front: 'Frente', side: 'Lateral', back: 'Espalda' }[p.angle] || p.angle}</span>
                        <span className={styles.photoDate}>{formatDate(p.taken_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 3 && (
            <div className={styles.tabContent}>
              {sessions.length === 0 ? (
                <p className={styles.emptyText}>Sin sesiones completadas aún.</p>
              ) : (
                sessions.map(s => {
                  const mins = s.finished_at && s.started_at
                    ? Math.round((new Date(s.finished_at) - new Date(s.started_at)) / 60000)
                    : null
                  return (
                    <div key={s.id} className={styles.sessionCard}>
                      <div className={styles.sessionLeft}>
                        <p className={styles.sessionName}>{s.routine_name || 'Entrenamiento'}</p>
                        <p className={styles.sessionDate}>{formatDateTime(s.started_at)}</p>
                      </div>
                      <div className={styles.sessionRight}>
                        {mins !== null && <span className={styles.sessionStat}>{mins} min</span>}
                        {s.total_volume > 0 && (
                          <span className={styles.sessionVol}>{Math.round(s.total_volume).toLocaleString()} kg</span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatDateTime(dtStr) {
  const d = new Date(dtStr)
  return d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' }) + ' · ' +
         d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
}