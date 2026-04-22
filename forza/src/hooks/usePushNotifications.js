// src/hooks/usePushNotifications.js
import { useState, useEffect } from 'react'
import { supabaseAuth } from '../lib/supabase'

/**
 * Hook para manejar notificaciones push en FORZA
 * Solicita permiso, suscribe al SW y guarda el endpoint en Supabase
 */
export function usePushNotifications(userId) {
  const [permission,   setPermission]   = useState(Notification.permission)
  const [subscribed,   setSubscribed]   = useState(false)
  const [loading,      setLoading]      = useState(false)

  useEffect(() => {
    if (!userId) return
    checkSubscription()
  }, [userId])

  async function checkSubscription() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    setSubscribed(!!sub)
  }

  async function requestPermission() {
    if (!('Notification' in window)) return false
    const result = await Notification.requestPermission()
    setPermission(result)
    return result === 'granted'
  }

  async function subscribe(reminderTime = null) {
    setLoading(true)
    try {
      const granted = permission === 'granted' || await requestPermission()
      if (!granted) { setLoading(false); return false }

      const reg = await navigator.serviceWorker.ready

      // Obtener o crear suscripción
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        // NOTA: En producción, genera tu propio VAPID key pair:
        // npx web-push generate-vapid-keys
        // Por ahora usamos un placeholder — reemplazar con tu clave pública real
        const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

        if (!VAPID_PUBLIC_KEY) {
          console.warn('[FORZA Push] VITE_VAPID_PUBLIC_KEY no configurada.')
          // Aún así guardamos como "suscrito" para testing local
          setSubscribed(true)
          setLoading(false)
          return true
        }

        sub = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
      }

      const subJSON = sub.toJSON()

      // Guardar en Supabase
      if (userId) {
        await supabaseAuth.from('push_subscriptions').upsert({
          user_id:       userId,
          endpoint:      subJSON.endpoint,
          p256dh:        subJSON.keys?.p256dh    || '',
          auth_key:      subJSON.keys?.auth      || '',
          reminder_time: reminderTime,
        }, { onConflict: 'endpoint' })
      }

      setSubscribed(true)
      setLoading(false)
      return true
    } catch (err) {
      console.error('[FORZA Push] Error al suscribir:', err)
      setLoading(false)
      return false
    }
  }

  async function unsubscribe() {
    setLoading(true)
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await sub.unsubscribe()
      await supabaseAuth.from('push_subscriptions')
        .delete()
        .eq('endpoint', sub.endpoint)
    }
    setSubscribed(false)
    setLoading(false)
  }

  return { permission, subscribed, loading, subscribe, unsubscribe }
}

// ── Helper: convertir VAPID key de base64 a Uint8Array ────
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output  = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i)
  return output
}