// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { WorkoutProvider } from './context/WorkoutContext' // ← Nueva Mejora: Persistencia de sesión
import DesktopBlock from './components/DesktopBlock'

import Landing   from './pages/Landing'
import Login     from './pages/Login'
import Register  from './pages/Register'
import Paywall   from './pages/Paywall'
import Dashboard from './pages/Dashboard'
import Calendar  from './pages/Calendar'
import Workout   from './pages/Workout'
import Diet      from './pages/Diet'
import Progress  from './pages/Progress'
import Routines  from './pages/Routines'
import Profile   from './pages/Profile'
import Admin     from './pages/Admin'
import AppLayout from './components/AppLayout'

// --- GUARDS ORIGINALES (SIN CAMBIOS) ---

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <SplashScreen />
  if (!user)   return <Navigate to="/login" replace />
  return children
}

function RequirePro({ children }) {
  const { user, isPro, loading } = useAuth()
  if (loading) return <SplashScreen />
  if (!user)   return <Navigate to="/login"   replace />
  if (!isPro)  return <Navigate to="/paywall" replace />
  return children
}

function RequireAdmin({ children }) {
  const { user, isAdmin, loading } = useAuth()
  if (loading)  return <SplashScreen />
  if (!user)    return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/"      replace />
  return children
}

function RedirectIfAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <SplashScreen />
  if (user)    return <Navigate to="/dashboard" replace />
  return children
}

function SplashScreen() {
  return (
    <div style={{
      background: '#0F0F0F', height: '100dvh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: '2.5rem', fontWeight: 800, color: '#CCFF00',
        letterSpacing: '0.1em', textShadow: '0 0 20px rgba(204,255,0,0.4)',
      }}>FORZA</span>
    </div>
  )
}

// --- COMPONENTE PRINCIPAL ---

export default function App() {
  // Bloqueo de escritorio original
  if (typeof window !== 'undefined' && window.innerWidth > 768) {
    return <DesktopBlock />
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/"         element={<Landing />} />
        <Route path="/landing"  element={<Landing />} />
        <Route path="/login"    element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
        <Route path="/register" element={<Register />} /> 
        <Route path="/paywall"  element={<RequireAuth><Paywall /></RequireAuth>} />

        {/* MEJORA APLICADA: 
            Envolvemos las rutas Pro con <WorkoutProvider>. 
            Esto permite que al navegar entre Dashboard, Workout y Diet, 
            el estado del entrenamiento se mantenga vivo en el contexto global.
        */}
        <Route element={
          <RequirePro>
            <WorkoutProvider>
              <AppLayout />
            </WorkoutProvider>
          </RequirePro>
        }>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/calendar"  element={<Calendar />} />
          <Route path="/workout"   element={<Workout />} />
          <Route path="/diet"      element={<Diet />} />
          <Route path="/progress"  element={<Progress />} />
          <Route path="/routines"  element={<Routines />} />
          <Route path="/profile"   element={<Profile />} />
        </Route>

        {/* Ruta Admin */}
        <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}