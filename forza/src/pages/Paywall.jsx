// src/pages/Paywall.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseAuth } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import styles from '../assets/css/modules/Paywall.module.css'

const PAYMENT_INFO = {
  method:  'Transferencia / QR Bancario',
  details: '+591 74328155',
  amount:  'Bs. 180',
  note:    'Incluye tu correo en la transferencia para activación rápida.',
}

const UNLOCK_ITEMS = [
  'Entrenamiento activo con timer',
  'Calendario semanal personalizable',
  'Seguimiento de macros y dieta',
  'Historial completo de sesiones',
  'Fotos y medidas de progreso',
  'Notificaciones de recordatorio',
]

export default function Paywall() {
  const navigate           = useNavigate()
  const { profile, loading } = useAuth()
  const [copied, setCopied]  = useState(false)

  // Redirigir si ya es Pro o Admin
  useEffect(() => {
    if (loading) return
    if (profile?.is_pro || profile?.is_admin) {
      navigate('/dashboard', { replace: true })
    }
  }, [profile, loading])

  async function handleLogout() {
    await supabaseAuth.auth.signOut()
    navigate('/')
  }

  function copyContact() {
    navigator.clipboard.writeText(PAYMENT_INFO.details)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Mientras carga el perfil no mostrar nada para evitar flash
  if (loading) return null

  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} />

      <div className={styles.container}>

        {/* Logo */}
        <div className={styles.logoCircle}>
          <span className={styles.logoText}>FORZ<span className={styles.arrow}>↗</span>A</span>
        </div>

        {/* Saludo */}
        {profile?.full_name && (
          <p className={styles.greeting}>Hola, {profile.full_name.split(' ')[0]} 👋</p>
        )}

        {/* Lock */}
        <div className={styles.lockWrapper}>
          <div className={styles.lockIcon}>🔒</div>
          <h1 className={styles.title}>Un paso más<br /><span className={styles.accent}>para acceder.</span></h1>
          <p className={styles.sub}>Tu cuenta fue creada. Activa el acceso Pro con un pago único para desbloquear todo.</p>
        </div>

        {/* Features */}
        <div className={styles.featuresBox}>
          <p className={styles.featuresTitle}>Desbloqueas:</p>
          <ul className={styles.featuresList}>
            {UNLOCK_ITEMS.map(item => (
              <li key={item} className={styles.featuresItem}>
                <span className={styles.check} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Precio */}
        <div className={styles.priceRow}>
          <span className={styles.priceLabel}>Pago único</span>
          <span className={styles.priceAmount}>{PAYMENT_INFO.amount}</span>
          <span className={styles.priceForever}>para siempre</span>
        </div>

        {/* Paso 1 */}
        <div className={styles.payCard}>
          <div className={styles.payHeader}>
            <span className={styles.payStep}>1</span>
            <span className={styles.payStepText}>Realiza tu pago</span>
          </div>
          <p className={styles.payMethod}>{PAYMENT_INFO.method}</p>
          <div className={styles.payDetailRow}>
            <span className={styles.payDetail}>{PAYMENT_INFO.details}</span>
            <button className={styles.copyBtn} onClick={copyContact}>
              {copied ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
          <p className={styles.payNote}>{PAYMENT_INFO.note}</p>
        </div>

        {/* Paso 2 */}
        <div className={styles.payCard}>
          <div className={styles.payHeader}>
            <span className={styles.payStep}>2</span>
            <span className={styles.payStepText}>Espera la activación</span>
          </div>
          <p className={styles.payNote}>
            Una vez confirmado el pago, activaremos tu cuenta Pro en menos de 24 horas.
            Recibirás acceso completo al recargar la app.
          </p>
        </div>

        <button className={styles.refreshBtn} onClick={() => window.location.reload()}>
          ¿Ya pagaste? Recargar app →
        </button>

        <button className={styles.logoutBtn} onClick={handleLogout}>
          Cerrar sesión
        </button>

      </div>
    </div>
  )
}