// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabaseAuth } from '../lib/supabase'
import styles from '../assets/css/modules/Dashboard.module.css'

export default function Dashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [todaySchedule, setTodaySchedule] = useState(null)
  const [weekSessions, setWeekSessions] = useState(0)
  const [streak, setStreak] = useState(0) 
  const [loading, setLoading] = useState(true)

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const today = new Date()
  // Ajuste para que Lunes sea 0 y Domingo 6
  const todayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1
  
  const firstName = profile?.full_name?.split(' ')[0] || 'Atleta'

  useEffect(() => {
    if (!profile?.id) return
    fetchDashboardData(profile.id)
  }, [profile])

  async function fetchDashboardData(userId) {
    setLoading(true)
    try {
      // 1. Sincronizar racha desde el perfil
      if (profile?.streak_count !== undefined) {
        setStreak(profile.streak_count)
      }

      // 2. Obtener horario de hoy
      const { data: schedule } = await supabaseAuth
        .from('user_schedules')
        .select('*, routines(name)')
        .eq('user_id', userId)
        .eq('day_of_week', todayIndex)
        .eq('week_label', 'A') // Asumiendo semana A por defecto
        .maybeSingle()

      // 3. Sesiones completadas esta semana
      const weekStart = getWeekStart()
      const { count } = await supabaseAuth
        .from('workout_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('started_at', weekStart.toISOString())
        .not('finished_at', 'is', null)

      setTodaySchedule(schedule)
      setWeekSessions(count || 0)
    } catch (err) {
      console.error("Error cargando dashboard:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      
      {/* ── HEADER ── */}
      <header className={styles.header}>
        <div>
          <p className={styles.greeting}>{getGreeting()}</p>
          <h1 className={styles.name}>
            {firstName} <span className={styles.wave}>👋</span>
          </h1>
        </div>
        <div className={styles.weightBadge} onClick={() => navigate('/progress')}>
          <span className={styles.weightNum}>{profile?.weight_kg ?? '—'}</span>
          <span className={styles.weightUnit}>kg</span>
        </div>
      </header>

      {/* ── STATS ROW ── */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>🔥</span>
          <div>
            <span className={styles.statNum}>{streak}</span>
            <span className={styles.statLabel}>días de racha</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>📅</span>
          <div>
            <span className={styles.statNum}>{weekSessions}</span>
            <span className={styles.statLabel}>esta semana</span>
          </div>
        </div>
      </div>

      {/* ── SEMANA VISUAL ── */}
      <div className={styles.weekRow}>
        {dayNames.map((day, i) => (
          <div 
            key={day} 
            className={`${styles.weekDay} ${i === todayIndex ? styles.weekDayToday : ''}`}
          >
            <span className={styles.weekDayName}>{day}</span>
            <div className={`
              ${styles.weekDot} 
              ${i < todayIndex ? styles.weekDotDone : ''} 
              ${i === todayIndex ? styles.weekDotToday : ''}
            `} />
          </div>
        ))}
      </div>

      {/* ── SECCIÓN HOY ── */}
      <section className={styles.section}>
        <span className={styles.sectionLabel}>Hoy</span>

        {loading ? (
          <div className={styles.skeleton} />
        ) : todaySchedule ? (
          <div className={`${styles.todayCard} ${todaySchedule.type === 'rest' ? styles.todayRest : ''}`}>
            <div className={styles.todayInfo}>
              <span className={styles.todayIcon}>
                {todaySchedule.type === 'rest' ? '😴' : todaySchedule.type === 'cardio' ? '🏃' : '⚡'}
              </span>
              <div>
                <h3 className={styles.todayTitle}>
                  {todaySchedule.type === 'rest' ? 'Día de descanso' : 
                   todaySchedule.type === 'cardio' ? 'Cardio' : 
                   (todaySchedule.routines?.name || 'Entrenamiento')}
                </h3>
                <p className={styles.todaySub}>
                  {todaySchedule.type === 'rest' ? 'Tu cuerpo crece en reposo.' : 'Rutina asignada para hoy'}
                </p>
              </div>
            </div>
            {todaySchedule.type !== 'rest' && (
              <button className={styles.startBtn} onClick={() => navigate('/workout')}>
                Iniciar →
              </button>
            )}
          </div>
        ) : (
          <div className={styles.emptyCard}>
            <span className={styles.emptyIcon}>📋</span>
            <p className={styles.emptyText}>Sin plan para hoy.</p>
            <button className={styles.weightBtn} onClick={() => navigate('/calendar')}>
              Ver calendario
            </button>
          </div>
        )}
      </section>

      {/* ── ACCESOS RÁPIDOS ── */}
      <section className={styles.section}>
        <span className={styles.sectionLabel}>Accesos rápidos</span>
        <div className={styles.quickGrid}>
          {QUICK_ACTIONS.map(action => (
            <button 
              key={action.label} 
              className={styles.quickCard} 
              onClick={() => navigate(action.path)}
            >
              <span className={styles.quickIcon}>{action.icon}</span>
              <span className={styles.quickLabel}>{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── PESO ACTUAL ── */}
      <section className={styles.section}>
        <span className={styles.sectionLabel}>Peso corporal</span>
        <div className={styles.weightCard}>
          <div className={styles.weightMain}>
            <span className={styles.weightBig}>{profile?.weight_kg ?? '—'}</span>
            <span className={styles.weightKg}>kg</span>
          </div>
          <p className={styles.weightHint}>Mantén tu progreso actualizado</p>
          <button className={styles.weightBtn} onClick={() => navigate('/progress')}>
            Registrar peso →
          </button>
        </div>
      </section>

    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────

function getGreeting() {
  const hour = new Date().getHours()
  const morning = ['¡A darle con todo!', 'Buen día, campeón', 'Energía al máximo']
  const afternoon = ['No bajes el ritmo', 'Buenas tardes', '¡Sigue así!']
  const evening = ['Cierra el día fuerte', 'Buenas noches', 'A descansar']
  
  const select = (arr) => arr[Math.floor(Math.random() * arr.length)]
  
  if (hour < 12) return select(morning)
  if (hour < 19) return select(afternoon)
  return select(evening)
}

function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  const start = new Date(now)
  start.setDate(now.getDate() + diff)
  start.setHours(0, 0, 0, 0)
  return start
}

const QUICK_ACTIONS = [
  { path: '/workout',     icon: '⚡', label: 'Entrenar' },
  { path: '/diet',      icon: '🥗', label: 'Comidas' },
  { path: '/progress', icon: '📈', label: 'Progreso' },
  { path: '/calendar', icon: '📅', label: 'Mi Plan' },
]