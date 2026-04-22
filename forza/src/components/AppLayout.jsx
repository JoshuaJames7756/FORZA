// src/components/AppLayout.jsx
import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import styles from '../assets/css/modules/AppLayout.module.css'

/**
 * Layout principal de la app para usuarios Pro.
 * Envuelve todas las rutas privadas (/dashboard, /calendar, /workout, /diet, /progress)
 * con el BottomNav fijo en la parte inferior.
 */
export default function AppLayout() {
  return (
    <div className={styles.layout}>
      {/* Contenido de la página activa */}
      <main className={styles.main}>
        <Outlet />
      </main>

      {/* Barra de navegación inferior fija */}
      <BottomNav />
    </div>
  )
}