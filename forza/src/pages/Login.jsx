// src/pages/Login.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabaseAuth } from '../lib/supabase'
import styles from '../assets/css/modules/Auth.module.css'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabaseAuth.auth.signInWithPassword({ email, password })

    if (error) {
      setError(getErrorMessage(error.message))
      setLoading(false)
      return
    }

    navigate('/dashboard')
  }

  return (
    <div className={styles.page}>

      {/* Fondo decorativo */}
      <div className={styles.bgGlow} />

      <div className={styles.container}>

        {/* Logo */}
        <div className={styles.logoWrap} onClick={() => navigate('/')}>
          <div className={styles.logoCircle}>
            <span className={styles.logoText}>FORZ<span className={styles.arrow}>↗</span>A</span>
          </div>
        </div>

        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Bienvenido<br /><span className={styles.accent}>de vuelta.</span></h1>
          <p className={styles.sub}>Ingresa tus datos para continuar.</p>
        </div>

        {/* Form */}
        <form className={styles.form} onSubmit={handleLogin}>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Correo electrónico</label>
            <input
              type="email"
              className={styles.input}
              placeholder="tu@correo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Contraseña</label>
            <input
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className={styles.errorBox}>
              <span className={styles.errorIcon}>!</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            className={styles.btnPrimary}
            disabled={loading}
          >
            {loading ? <span className={styles.spinner} /> : 'Ingresar →'}
          </button>

        </form>

        {/* Footer */}
        <div className={styles.formFooter}>
          <span className={styles.footerText}>¿No tienes cuenta?</span>
          <Link to="/register" className={styles.footerLink}>Regístrate gratis</Link>
        </div>

      </div>
    </div>
  )
}

function getErrorMessage(msg) {
  if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (msg.includes('Email not confirmed'))        return 'Debes confirmar tu correo antes de ingresar.'
  if (msg.includes('Too many requests'))          return 'Demasiados intentos. Espera unos minutos.'
  return 'Ocurrió un error. Intenta de nuevo.'
}