import { useEffect, useState, useCallback } from 'react'
import { syncPendientes, pullFromSupabase } from '../lib/sync'
import { db } from '../lib/db'

export function useOfflineSync(tabla = null) {
  const [isOnline, setIsOnline]     = useState(navigator.onLine)
  const [isSyncing, setIsSyncing]   = useState(false)
  const [pendientes, setPendientes] = useState(0)
  const [ultimaSync, setUltimaSync] = useState(null)
  const [syncError, setSyncError]   = useState(null)

  // Detectar cambios de red
  useEffect(() => {
    const up   = () => setIsOnline(true)
    const down = () => setIsOnline(false)
    window.addEventListener('online',  up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online',  up)
      window.removeEventListener('offline', down)
    }
  }, [])

  // Auto-sync al recuperar conexión
  useEffect(() => {
    if (isOnline) handleSync()
  }, [isOnline, handleSync])

  // Contador de pendientes en tiempo real
  useEffect(() => {
    const interval = setInterval(async () => {
      const count = await db.syncQueue.count()
      setPendientes(count)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleSync = useCallback(async () => {
    if (!isOnline || isSyncing) return
    setIsSyncing(true)
    setSyncError(null)
    try {
      const resultado = await syncPendientes()
      if (tabla) await pullFromSupabase(tabla)
      setUltimaSync(new Date())
      if (resultado.errores.length > 0) setSyncError(resultado.errores)
      return resultado
    } catch (err) {
      setSyncError([{ error: err.message }])
    } finally {
      setIsSyncing(false)
    }
  }, [isOnline, isSyncing, tabla])

  return { isOnline, isSyncing, pendientes, ultimaSync, syncError, sync: handleSync }
}