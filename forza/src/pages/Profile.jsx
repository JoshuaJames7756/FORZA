// src/pages/Profile.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabaseAuth } from '../lib/supabase'
import styles from '../assets/css/modules/Profile.module.css'
import { usePushNotifications } from '../hooks/usePushNotifications' // Importación agregada

const GOAL_LABELS  = { muscle: 'Ganar masa', fat_loss: 'Perder grasa', maintain: 'Mantenerme' }
const LEVEL_LABELS = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' }

const GOALS  = [
  { value: 'muscle',   icon: '💪', label: 'Ganar masa' },
  { value: 'fat_loss', icon: '🔥', label: 'Perder grasa' },
  { value: 'maintain', icon: '⚖️', label: 'Mantenerme' },
]
const LEVELS = [
  { value: 'beginner',     label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced',     label: 'Avanzado' },
]

export default function Profile() {
  const navigate        = useNavigate()
  const { profile, user } = useAuth()

  // Hook de notificaciones push integrado correctamente dentro del componente
  const { subscribed, loading: loadingPush, subscribe } = usePushNotifications(profile?.id)

  const [editing,      setEditing]      = useState(false)
  const [fullName,     setFullName]     = useState(profile?.full_name || '')
  const [weightKg,     setWeightKg]     = useState(profile?.weight_kg || '')
  const [goal,         setGoal]         = useState(profile?.goal || 'muscle')
  const [level,        setLevel]        = useState(profile?.level || 'beginner')

  const [changingPass, setChangingPass] = useState(false)
  const [newPass,      setNewPass]      = useState('')
  const [confirmPass,  setConfirmPass]  = useState('')

  const [saving,       setSaving]       = useState(false)
  const [toast,        setToast]        = useState('')
  const [error,        setError]        = useState('')

  function startEdit() {
    setFullName(profile?.full_name || '')
    setWeightKg(profile?.weight_kg || '')
    setGoal(profile?.goal || 'muscle')
    setLevel(profile?.level || 'beginner')
    setEditing(true)
  }

  async function saveProfile() {
    if (!profile?.id) return
    setSaving(true)
    setError('')

    const { error } = await supabaseAuth
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        weight_kg: parseFloat(weightKg) || null,
        goal,
        level,
      })
      .eq('id', profile.id)

    setSaving(false)
    if (error) { setError('Error guardando perfil. Intenta de nuevo.'); return }
    showToast('✓ Perfil actualizado')
    setEditing(false)
    window.location.reload()
  }

  async function changePassword() {
    setError('')
    if (newPass.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (newPass !== confirmPass) { setError('Las contraseñas no coinciden.'); return }
    setSaving(true)
    const { error } = await supabaseAuth.auth.updateUser({ password: newPass })
    setSaving(false)
    if (error) { setError('Error al cambiar contraseña.'); return }
    showToast('✓ Contraseña actualizada')
    setChangingPass(false)
    setNewPass('')
    setConfirmPass('')
  }

  async function handleLogout() {
    await supabaseAuth.auth.signOut()
    navigate('/')
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2200) }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className={styles.page}>

      {toast && <div className={styles.toast}>{toast}</div>}

      {/* AVATAR + INFO */}
      <div className={styles.avatarSection}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.avatarInfo}>
          <h1 className={styles.avatarName}>{profile?.full_name || 'Sin nombre'}</h1>
          <p className={styles.avatarEmail}>{user?.email}</p>
          <div className={styles.proBadge}>
            {profile?.is_pro
              ? <span className={styles.proActive}>⚡ Pro</span>
              : <span className={styles.proFree}>Free</span>
            }
          </div>
        </div>
      </div>

      {/* STATS RÁPIDOS */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{profile?.weight_kg ?? '—'}</span>
          <span className={styles.statLabel}>kg actuales</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{GOAL_LABELS[profile?.goal] ?? '—'}</span>
          <span className={styles.statLabel}>objetivo</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{LEVEL_LABELS[profile?.level] ?? '—'}</span>
          <span className={styles.statLabel}>nivel</span>
        </div>
      </div>

      {/* SECCIÓN: DATOS PERSONALES */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Datos personales</span>
          {!editing && (
            <button className={styles.editBtn} onClick={startEdit}>Editar</button>
          )}
        </div>

        {!editing ? (
          <div className={styles.infoList}>
            <InfoRow label="Nombre"   value={profile?.full_name || '—'} />
            <InfoRow label="Peso"     value={profile?.weight_kg ? `${profile.weight_kg} kg` : '—'} />
            <InfoRow label="Objetivo" value={GOAL_LABELS[profile?.goal]  || '—'} />
            <InfoRow label="Nivel"     value={LEVEL_LABELS[profile?.level] || '—'} />
          </div>
        ) : (
          <div className={styles.editForm}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Nombre completo</label>
              <input className={styles.fieldInput}
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Peso actual (kg)</label>
              <input className={styles.fieldInput} type="number"
                value={weightKg}
                onChange={e => setWeightKg(e.target.value)}
                placeholder="Ej: 75" inputMode="decimal"
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Objetivo</label>
              <div className={styles.optionGrid}>
                {GOALS.map(g => (
                  <button key={g.value} type="button"
                    className={`${styles.optionBtn} ${goal === g.value ? styles.optionActive : ''}`}
                    onClick={() => setGoal(g.value)}
                  >
                    <span>{g.icon}</span>
                    <span className={styles.optionLabel}>{g.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Nivel</label>
              <div className={styles.optionGrid}>
                {LEVELS.map(l => (
                  <button key={l.value} type="button"
                    className={`${styles.optionBtn} ${level === l.value ? styles.optionActive : ''}`}
                    onClick={() => setLevel(l.value)}
                  >
                    <span className={styles.optionLabel}>{l.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && <div className={styles.errorBox}>{error}</div>}

            <div className={styles.editActions}>
              <button className={styles.cancelBtn} onClick={() => { setEditing(false); setError('') }}>Cancelar</button>
              <button className={styles.saveBtn} onClick={saveProfile} disabled={saving}>
                {saving ? <span className={styles.spinner} /> : 'Guardar'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN: SEGURIDAD */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Seguridad</span>
          {!changingPass && (
            <button className={styles.editBtn} onClick={() => setChangingPass(true)}>Cambiar</button>
          )}
        </div>

        {!changingPass ? (
          <div className={styles.infoList}>
            <InfoRow label="Contraseña" value="••••••••••" />
          </div>
        ) : (
          <div className={styles.editForm}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Nueva contraseña</label>
              <input className={styles.fieldInput} type="password"
                placeholder="Mínimo 6 caracteres"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Confirmar contraseña</label>
              <input className={styles.fieldInput} type="password"
                placeholder="Repite la contraseña"
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
              />
            </div>

            {error && <div className={styles.errorBox}>{error}</div>}

            <div className={styles.editActions}>
              <button className={styles.cancelBtn} onClick={() => { setChangingPass(false); setError(''); setNewPass(''); setConfirmPass('') }}>Cancelar</button>
              <button className={styles.saveBtn} onClick={changePassword} disabled={saving}>
                {saving ? <span className={styles.spinner} /> : 'Cambiar'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN: CUENTA */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Cuenta</span>
        <div className={styles.infoList}>
          <InfoRow label="Email" value={user?.email || '—'} />
          <InfoRow label="Estado" value={profile?.is_pro ? 'Pro activo' : 'Free'} accent={profile?.is_pro} />
          
          {/* Bloque de notificaciones agregado aquí */}
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Notificaciones</span>
            <button 
              className={styles.editBtn} 
              onClick={() => subscribe('07:00')}
              disabled={loadingPush}
            >
              {loadingPush ? '...' : (subscribed ? '🔔 Activas' : '🔕 Activar')}
            </button>
          </div>

          <InfoRow label="ID" value={profile?.id?.slice(0, 16) + '...' || '—'} mono />
        </div>
      </div>

      {/* LOGOUT */}
      <button className={styles.logoutBtn} onClick={handleLogout}>
        Cerrar sesión
      </button>

      {/* Admin link */}
      {profile?.is_admin && (
        <button className={styles.adminLink} onClick={() => navigate('/admin')}>
          Ir al panel Admin →
        </button>
      )}

    </div>
  )
}

function InfoRow({ label, value, accent, mono }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={`${styles.infoValue} ${accent ? styles.infoValueAccent : ''} ${mono ? styles.infoValueMono : ''}`}>
        {value}
      </span>
    </div>
  )
}