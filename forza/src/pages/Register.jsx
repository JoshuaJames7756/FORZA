// src/pages/Register.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabaseAuth } from '../lib/supabase'
import styles from '../assets/css/modules/Auth.module.css'

// Pasos del registro
const STEP_AUTH    = 0  // email + contraseña
const STEP_PROFILE = 1  // nombre + datos básicos

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(STEP_AUTH)

  // Step 0
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [confirmPass, setConfirm]   = useState('')

  // Step 1
  const [fullName, setFullName]     = useState('')
  const [weightKg, setWeightKg]     = useState('')
  const [goal, setGoal]             = useState('muscle')
  const [level, setLevel]           = useState('beginner')

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // ── PASO 0: crear usuario en Supabase Auth ──────────────
  async function handleAuth(e) {
    e.preventDefault()
    setError('')

    if (password !== confirmPass) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setLoading(true)

    const { error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    })

    setLoading(false)

    if (error) {
      setError(getErrorMessage(error.message))
      return
    }

    setStep(STEP_PROFILE)
  }

// ── PASO 1: completar perfil ────────────────────────────
  async function handleProfile(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // signUp ya dejó la sesión activa — solo la obtenemos
    const { data: { session } } = await supabaseAuth.auth.getSession()

    if (!session?.user) {
      setError('Sesión expirada. Vuelve a registrarte.')
      setLoading(false)
      setStep(STEP_AUTH)
      return
    }

    const { error: updateError } = await supabaseAuth
      .from('profiles')
      .update({
        full_name: fullName,
        weight_kg: parseFloat(weightKg) || null,
        goal,
        level,
      })
      .eq('id', session.user.id)

    setLoading(false)

    if (updateError) {
      setError('Error guardando tu perfil. Intenta de nuevo.')
      return
    }

    navigate('/paywall')
  }

  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} />

      <div className={styles.container}>

        {/* Logo */}
        <div className={styles.logoWrap} onClick={() => navigate('/')}>
          <div className={styles.logoCircle}>
            <span className={styles.logoText}>FORZ<span className={styles.arrow}>↗</span>A</span>
          </div>
        </div>

        {/* Progress dots */}
        <div className={styles.stepDots}>
          <span className={`${styles.dot} ${step >= 0 ? styles.dotActive : ''}`} />
          <span className={styles.dotLine} />
          <span className={`${styles.dot} ${step >= 1 ? styles.dotActive : ''}`} />
        </div>

        {/* ── STEP 0: Auth ─────────────────────────── */}
        {step === STEP_AUTH && (
          <>
            <div className={styles.header}>
              <h1 className={styles.title}>Crea tu<br /><span className={styles.accent}>cuenta.</span></h1>
              <p className={styles.sub}>Gratis. Sin tarjeta. Sin trampa.</p>
            </div>

            <form className={styles.form} onSubmit={handleAuth}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Correo electrónico</label>
                <input
                  type="email"
                  className={styles.input}
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Contraseña</label>
                <input
                  type="password"
                  className={styles.input}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Confirmar contraseña</label>
                <input
                  type="password"
                  className={styles.input}
                  placeholder="Repite tu contraseña"
                  value={confirmPass}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className={styles.errorBox}>
                  <span className={styles.errorIcon}>!</span>
                  {error}
                </div>
              )}

              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                {loading ? <span className={styles.spinner} /> : 'Continuar →'}
              </button>
            </form>

            <div className={styles.formFooter}>
              <span className={styles.footerText}>¿Ya tienes cuenta?</span>
              <Link to="/login" className={styles.footerLink}>Inicia sesión</Link>
            </div>
          </>
        )}

        {/* ── STEP 1: Perfil ───────────────────────── */}
        {step === STEP_PROFILE && (
          <>
            <div className={styles.header}>
              <h1 className={styles.title}>Cuéntanos<br /><span className={styles.accent}>sobre ti.</span></h1>
              <p className={styles.sub}>Personaliza tu experiencia FORZA.</p>
            </div>

            <form className={styles.form} onSubmit={handleProfile}>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Tu nombre</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="¿Cómo te llamamos?"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Peso actual (kg)</label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="ej: 75"
                  value={weightKg}
                  onChange={e => setWeightKg(e.target.value)}
                  min="30"
                  max="300"
                  step="0.1"
                />
              </div>

              {/* Objetivo */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>¿Cuál es tu objetivo?</label>
                <div className={styles.optionGrid}>
                  {GOALS.map(g => (
                    <button
                      key={g.value}
                      type="button"
                      className={`${styles.optionBtn} ${goal === g.value ? styles.optionActive : ''}`}
                      onClick={() => setGoal(g.value)}
                    >
                      <span className={styles.optionIcon}>{g.icon}</span>
                      <span className={styles.optionLabel}>{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nivel */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Nivel de experiencia</label>
                <div className={styles.optionGrid}>
                  {LEVELS.map(l => (
                    <button
                      key={l.value}
                      type="button"
                      className={`${styles.optionBtn} ${level === l.value ? styles.optionActive : ''}`}
                      onClick={() => setLevel(l.value)}
                    >
                      <span className={styles.optionLabel}>{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className={styles.errorBox}>
                  <span className={styles.errorIcon}>!</span>
                  {error}
                </div>
              )}

              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                {loading ? <span className={styles.spinner} /> : 'Completar registro →'}
              </button>

            </form>
          </>
        )}

      </div>
    </div>
  )
}

const GOALS = [
  { value: 'muscle',   icon: '💪', label: 'Ganar masa' },
  { value: 'fat_loss', icon: '🔥', label: 'Perder grasa' },
  { value: 'maintain', icon: '⚖️', label: 'Mantenerme' },
]

const LEVELS = [
  { value: 'beginner',     label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced',     label: 'Avanzado' },
]

function getErrorMessage(msg) {
  if (msg.includes('already registered')) return 'Este correo ya está registrado.'
  if (msg.includes('Password should'))    return 'La contraseña debe tener al menos 6 caracteres.'
  if (msg.includes('Invalid email'))      return 'Correo electrónico inválido.'
  return 'Ocurrió un error. Intenta de nuevo.'
}