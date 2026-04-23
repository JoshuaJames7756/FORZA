// src/pages/Landing.jsx
import { useNavigate } from 'react-router-dom'
import styles from '../assets/css/modules/Landing.module.css'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>

      {/* ── HERO ───────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.logoCircle}>
          <span className={styles.logoText}>FORZ<span className={styles.arrow}>↗</span>A</span>
        </div>

        <span className={styles.tag}>Tu entrenamiento. Tu data. Tu progreso.</span>

        <h1 className={styles.heroTitle}>
          Entrena con<br />
          <span className={styles.accent}>propósito</span><br />
          cada día.
        </h1>

        <p className={styles.heroSub}>
          La app de fitness diseñada para atletas serios.
          Sin distracciones. Solo resultados.
        </p>

        <div className={styles.ctaGroup}>
          <button
            className={styles.btnPrimary}
            onClick={() => navigate('/register')}
          >
            Empezar ahora — Es gratis
          </button>
          <button
            className={styles.btnGhost}
            onClick={() => navigate('/login')}
          >
            Ya tengo cuenta
          </button>
        </div>

        <span className={styles.scrollHint}>↓ Descubre FORZA</span>
      </section>

      {/* ── STATS ──────────────────────────────────── */}
      <div className={styles.statsRow}>
        {[
          { num: '30+', label: 'Ejercicios' },
          { num: '4',   label: 'Plantillas' },
          { num: '1×',  label: 'Pago único' },
        ].map(s => (
          <div key={s.label} className={styles.stat}>
            <span className={styles.statNum}>{s.num}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── FEATURES ───────────────────────────────── */}
      <section className={styles.section}>
        <span className={styles.sectionLabel}>Lo que incluye</span>
        <h2 className={styles.sectionTitle}>Todo lo que<br />necesitas.</h2>

        {FEATURES.map(f => (
          <div key={f.title} className={styles.featureCard}>
            <div className={styles.featureIcon}>{f.icon}</div>
            <h3 className={styles.featureTitle}>{f.title}</h3>
            <p className={styles.featureDesc}>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* ── PRICING ────────────────────────────────── */}
      <section className={styles.section}>
        <span className={styles.sectionLabel}>Precio</span>
        <h2 className={styles.sectionTitle}>Una vez.<br />Para siempre.</h2>

        <div className={styles.priceCard}>
          <span className={styles.priceBadge}>Pago Único — Acceso Pro</span>
          <div className={styles.priceAmount}>$180</div>
          <p className={styles.pricePeriod}>Un solo pago. Sin suscripción mensual. Sin sorpresas.</p>

          <ul className={styles.priceFeatures}>
            {PRICE_ITEMS.map(item => (
              <li key={item}><span className={styles.check} />  {item}</li>
            ))}
          </ul>

          <button
            className={styles.btnPrimary}
            onClick={() => navigate('/register')}
          >
            Quiero acceso Pro →
          </button>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerLogo}>FORZ↗A</div>
        <p className={styles.footerSub}>Hecho con fuego por JVSoftware · Cochabamba, Bolivia</p>
      </footer>

    </div>
  )
}

// ── Data ───────────────────────────────────────────────────

const FEATURES = [
  {
    icon: '⚡',
    title: 'Entrenamiento Activo',
    desc: 'Timer de descanso circular, registro de pesos y reps, historial de sesiones anteriores visible en tiempo real.',
  },
  {
    icon: '📅',
    title: 'Calendario Semanal',
    desc: 'Asigna rutinas, días de descanso o cardio a cada día. Soporta splits A/B.',
  },
  {
    icon: '🥗',
    title: 'Seguimiento de Macros',
    desc: 'Registra alimentos por nombre o código de barras con Open Food Facts.',
  },
  {
    icon: '📈',
    title: 'Progreso Real',
    desc: 'Gráficas de volumen, peso corporal, medidas y fotos de progreso (front, side, back).',
  },
]

const PRICE_ITEMS = [
  'Acceso completo a todas las funciones',
  'Historial ilimitado de entrenamientos',
  'Calendario semanal personalizable',
  'Seguimiento de macros + Open Food Facts',
  'Fotos de progreso + medidas corporales',
  'Notificaciones de recordatorio',
  'Actualizaciones futuras incluidas',
]