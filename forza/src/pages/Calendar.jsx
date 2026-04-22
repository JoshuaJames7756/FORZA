// src/pages/Calendar.jsx
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabaseAuth } from '../lib/supabase'
import styles from '../assets/css/modules/Calendar.module.css'

const DAY_NAMES  = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DAY_FULL   = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const TYPE_ICONS = { routine: '⚡', rest: '😴', cardio: '🏃' }
const TYPE_LABEL = { routine: 'Rutina', rest: 'Descanso', cardio: 'Cardio' }

export default function Calendar() {
  const { profile } = useAuth()

  const [weekLabel,    setWeekLabel]    = useState('A')
  const [schedule,     setSchedule]     = useState({})
  const [routines,     setRoutines]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [modal,        setModal]        = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [toast,        setToast]        = useState('')
  const [draftType,    setDraftType]    = useState('routine')
  const [draftRoutine, setDraftRoutine] = useState('')

  const todayIndex = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1 })()

  useEffect(() => { if (profile?.id) fetchData(profile.id) }, [profile, weekLabel])

  async function fetchData(userId) {
    setLoading(true)

    const [{ data: rData }, { data: sData }] = await Promise.all([
      supabaseAuth.from('routines')
        .select('id, name, is_template')
        .or(`user_id.eq.${userId},is_template.eq.true`)
        .order('is_template', { ascending: false }),
      supabaseAuth.from('user_schedules')
        .select('*, routines(name)')
        .eq('user_id', userId)
        .eq('week_label', weekLabel),
    ])

    const map = {}
    sData?.forEach(row => { map[row.day_of_week] = row })

    setRoutines(rData || [])
    setSchedule(map)
    setLoading(false)
  }

  function openModal(dayIndex) {
    const existing = schedule[dayIndex]
    setDraftType(existing?.type || 'routine')
    setDraftRoutine(existing?.routine_id || routines[0]?.id || '')
    setModal({ dayIndex })
  }

  async function saveDay() {
    if (!profile?.id || modal === null) return
    setSaving(true)
    const { dayIndex } = modal
    const existing = schedule[dayIndex]
    const payload = {
      user_id:     profile.id,
      day_of_week: dayIndex,
      week_label:  weekLabel,
      type:        draftType,
      routine_id:  draftType === 'routine' ? draftRoutine : null,
    }
    const op = existing
      ? supabaseAuth.from('user_schedules').update(payload).eq('id', existing.id)
      : supabaseAuth.from('user_schedules').insert(payload)
    const { error } = await op
    if (!error) { await fetchData(profile.id); showToast('✓ Guardado') }
    setSaving(false)
    setModal(null)
  }

  async function clearDay(dayIndex) {
    const existing = schedule[dayIndex]
    if (!existing) return
    await supabaseAuth.from('user_schedules').delete().eq('id', existing.id)
    setSchedule(prev => { const n = { ...prev }; delete n[dayIndex]; return n })
    showToast('Día limpiado')
    setModal(null)
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2200) }

  return (
    <div className={styles.page}>

      {toast && <div className={styles.toast}>{toast}</div>}

      {/* HEADER */}
      <header className={styles.header}>
        <div>
          <p className={styles.pageTag}>Mi Plan Semanal</p>
          <h1 className={styles.title}>Calendario</h1>
        </div>
        <div className={styles.weekToggle}>
          {['A', 'B'].map(w => (
            <button key={w}
              className={`${styles.weekBtn} ${weekLabel === w ? styles.weekBtnActive : ''}`}
              onClick={() => setWeekLabel(w)}
            >Semana {w}</button>
          ))}
        </div>
      </header>

      <p className={styles.hint}>Toca un día para asignar rutina o descanso.</p>

      {/* WEEK GRID */}
      {loading ? (
        <div className={styles.skeletonGrid}>
          {Array(7).fill(0).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      ) : (
        <div className={styles.grid}>
          {DAY_NAMES.map((day, i) => {
            const row    = schedule[i]
            const type   = row?.type
            const isToday = i === todayIndex
            return (
              <div key={day}
                className={`${styles.dayCard} ${type ? styles['day_' + type] : ''} ${isToday ? styles.dayToday : ''}`}
                onClick={() => openModal(i)}
              >
                <div className={styles.dayTop}>
                  <span className={`${styles.dayName} ${isToday ? styles.dayNameActive : ''}`}>{day}</span>
                  {isToday && <span className={styles.todayPill}>hoy</span>}
                </div>
                <span className={styles.dayIcon}>{type ? TYPE_ICONS[type] : '＋'}</span>
                <span className={styles.dayLabel}>
                  {type === 'routine'
                    ? (row?.routines?.name || 'Rutina')
                    : type ? TYPE_LABEL[type] : 'Asignar'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* LEGEND */}
      <div className={styles.legend}>
        {Object.entries(TYPE_LABEL).map(([k, v]) => (
          <div key={k} className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles['ldot_' + k]}`} />
            <span className={styles.legendLabel}>{v}</span>
          </div>
        ))}
      </div>

      {/* SUMMARY BAR */}
      <div className={styles.summary}>
        {[
          { label: 'entrenos', val: Object.values(schedule).filter(s => s.type === 'routine').length },
          { label: 'descansos', val: Object.values(schedule).filter(s => s.type === 'rest').length },
          { label: 'cardio', val: Object.values(schedule).filter(s => s.type === 'cardio').length },
          { label: 'libres', val: 7 - Object.keys(schedule).length },
        ].map(s => (
          <div key={s.label} className={styles.summaryItem}>
            <span className={styles.summaryNum}>{s.val}</span>
            <span className={styles.summaryLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* MODAL BOTTOM SHEET */}
      {modal !== null && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.sheet} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />

            <h2 className={styles.sheetTitle}>
              {DAY_FULL[modal.dayIndex]}
              <span className={styles.sheetWeek}> · Semana {weekLabel}</span>
            </h2>

            {/* Tipo de día */}
            <label className={styles.sheetLabel}>Tipo de día</label>
            <div className={styles.typeGrid}>
              {['routine', 'rest', 'cardio'].map(t => (
                <button key={t}
                  className={`${styles.typeBtn} ${draftType === t ? styles.typeBtnActive : ''}`}
                  onClick={() => setDraftType(t)}
                >
                  <span className={styles.typeBtnIcon}>{TYPE_ICONS[t]}</span>
                  <span className={styles.typeBtnLabel}>{TYPE_LABEL[t]}</span>
                </button>
              ))}
            </div>

            {/* Selector de rutina */}
            {draftType === 'routine' && (
              <>
                <label className={styles.sheetLabel}>Seleccionar rutina</label>
                {routines.length === 0 ? (
                  <p className={styles.emptyRoutines}>No tienes rutinas creadas aún.</p>
                ) : (
                  <div className={styles.routineScroll}>
                    {routines.map(r => (
                      <button key={r.id}
                        className={`${styles.routineRow} ${draftRoutine === r.id ? styles.routineRowActive : ''}`}
                        onClick={() => setDraftRoutine(r.id)}
                      >
                        <span className={styles.routineRowName}>{r.name}</span>
                        {r.is_template && <span className={styles.templateBadge}>Plantilla</span>}
                        {draftRoutine === r.id && <span className={styles.routineCheck}>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className={styles.sheetActions}>
              <button className={styles.saveBtn}
                onClick={saveDay}
                disabled={saving || (draftType === 'routine' && !draftRoutine)}
              >
                {saving ? <span className={styles.spinner} /> : 'Guardar'}
              </button>
              {schedule[modal.dayIndex] && (
                <button className={styles.clearBtn} onClick={() => clearDay(modal.dayIndex)}>
                  Limpiar día
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}