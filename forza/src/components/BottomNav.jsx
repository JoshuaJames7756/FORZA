// src/components/BottomNav.jsx
import { useNavigate, useLocation } from 'react-router-dom'
import styles from '../assets/css/modules/BottomNav.module.css'

const NAV_ITEMS = [
  {
    path: '/dashboard',
    label: 'Inicio',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
        strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
        <path d="M9 21V12h6v9"/>
      </svg>
    ),
  },
  {
    path: '/routines',
    label: 'Rutinas',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
        strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
        <line x1="9" y1="12" x2="15" y2="12"/>
        <line x1="9" y1="16" x2="13" y2="16"/>
      </svg>
    ),
  },
  {
    path: '/workout',
    label: 'Entrenar',
    isCenter: true,
    icon: (active) => (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
        strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
      </svg>
    ),
  },
  {
    path: '/diet',
    label: 'Dieta',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
        strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C8 2 5 5.5 5 10c0 3 1.5 5.5 4 7v3a1 1 0 001 1h4a1 1 0 001-1v-3c2.5-1.5 4-4 4-7 0-4.5-3-8-7-8z"/>
        <line x1="12" y1="2" x2="12" y2="6"/>
      </svg>
    ),
  },
  {
    path: '/profile',
    label: 'Perfil',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
        strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path))
        
        return (
          <button
            key={item.path}
            className={`${styles.item} ${item.isCenter ? styles.centerItem : ''} ${active ? styles.active : ''}`}
            onClick={() => navigate(item.path)}
          >
            {item.isCenter ? (
              <div className={`${styles.centerBtn} ${active ? styles.centerBtnActive : ''}`}>
                {item.icon(active)}
              </div>
            ) : (
              <>
                <div className={styles.iconWrap}>{item.icon(active)}</div>
                <span className={styles.label}>{item.label}</span>
              </>
            )}
          </button>
        )
      })}
    </nav>
  )
}