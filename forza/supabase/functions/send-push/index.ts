// supabase/functions/send-push/index.ts
// Supabase Edge Function — envía notificaciones push a usuarios
// Deploy: supabase functions deploy send-push
//
// Variables de entorno requeridas (en Supabase Dashboard > Edge Functions > Secrets):
//   VAPID_PUBLIC_KEY   → tu clave pública VAPID
//   VAPID_PRIVATE_KEY  → tu clave privada VAPID
//   VAPID_EMAIL        → mailto:tu@correo.com

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Web Push usando Deno ───────────────────────────────────
// Implementación manual de Web Push sin librería externa

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')  || ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_EMAIL       = Deno.env.get('VAPID_EMAIL')       || 'mailto:admin@forza.app'

serve(async (req) => {
  // Solo POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Verificar Authorization header (llamar desde cron o dashboard)
  const authHeader = req.headers.get('Authorization')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (authHeader !== `Bearer ${serviceKey}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')            || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  )

  const body = await req.json().catch(() => ({}))

  // Modo 1: enviar a usuario específico (user_id en body)
  // Modo 2: enviar recordatorio diario a todos los que tienen reminder_time configurado
  const now        = new Date()
  const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:00`

  let query = supabase.from('push_subscriptions').select('*')

  if (body.user_id) {
    query = query.eq('user_id', body.user_id)
  } else {
    // Enviar solo a quienes tienen recordatorio en esta hora (±5 min)
    query = query.eq('reminder_time', currentTime)
  }

  const { data: subscriptions, error } = await query
  if (error || !subscriptions?.length) {
    return new Response(JSON.stringify({ sent: 0, error: error?.message }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const payload = JSON.stringify({
    title: body.title || '¡FORZA te espera! 💪',
    body:  body.body  || 'Es hora de tu entrenamiento. ¡No te rajes!',
    url:   body.url   || '/workout',
  })

  let sent = 0
  const failed: string[] = []

  for (const sub of subscriptions) {
    try {
      await sendWebPush({
        endpoint: sub.endpoint,
        p256dh:   sub.p256dh,
        auth:     sub.auth_key,
        payload,
      })
      sent++
    } catch (err) {
      console.error(`Failed to push to ${sub.endpoint}:`, err)
      failed.push(sub.id)
      // Si el endpoint ya no es válido, eliminarlo
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }

  return new Response(JSON.stringify({ sent, failed: failed.length }), {
    headers: { 'Content-Type': 'application/json' }
  })
})

// ── Web Push Manual (sin librería) ─────────────────────────
// Usa el estándar RFC 8291 + RFC 8292 (VAPID)
async function sendWebPush({ endpoint, p256dh, auth, payload }: {
  endpoint: string
  p256dh:   string
  auth:     string
  payload:  string
}) {
  // Importar claves VAPID
  const vapidHeaders = await buildVapidHeaders(endpoint)

  // Cifrar el payload con ECDH + AES-GCM (RFC 8291)
  const encrypted = await encryptPayload(payload, p256dh, auth)

  const response = await fetch(endpoint, {
    method:  'POST',
    headers: {
      ...vapidHeaders,
      'Content-Type':     'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL':              '86400',
    },
    body: encrypted,
  })

  if (!response.ok) {
    const err: any = new Error(`Push failed: ${response.status}`)
    err.statusCode = response.status
    throw err
  }

  return response
}

async function buildVapidHeaders(endpoint: string) {
  const audience = new URL(endpoint).origin
  const now      = Math.floor(Date.now() / 1000)

  const header  = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  const claims  = btoa(JSON.stringify({ aud: audience, exp: now + 43200, sub: VAPID_EMAIL }))
  const unsigned = `${header}.${claims}`

  // Importar clave privada VAPID
  const privKeyBytes = base64UrlToUint8Array(VAPID_PRIVATE_KEY)
  const cryptoKey = await crypto.subtle.importKey(
    'raw', privKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  )

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsigned)
  )

  const jwt = `${unsigned}.${uint8ArrayToBase64Url(new Uint8Array(signature))}`

  return {
    Authorization:   `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
  }
}

async function encryptPayload(payload: string, p256dhBase64: string, authBase64: string) {
  const encoder    = new TextEncoder()
  const payloadBuf = encoder.encode(payload)

  // Claves del cliente
  const clientPublicKey = base64UrlToUint8Array(p256dhBase64)
  const authSecret      = base64UrlToUint8Array(authBase64)

  // Generar par de claves efímeras del servidor
  const serverKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  )

  const serverPublicKeyRaw = await crypto.subtle.exportKey('raw', serverKeys.publicKey)

  // Importar clave pública del cliente
  const clientKey = await crypto.subtle.importKey(
    'raw', clientPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false, []
  )

  // Derivar secreto compartido
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientKey },
    serverKeys.privateKey, 256
  )

  // Salt aleatorio de 16 bytes
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // PRK usando HKDF
  const prk = await hkdfExtract(authSecret, new Uint8Array(sharedSecret))

  // Content encryption key
  const cekInfo = buildInfo('aesgcm', clientPublicKey, new Uint8Array(serverPublicKeyRaw))
  const cek = await hkdfExpand(prk, salt, cekInfo, 16)

  // Nonce
  const nonceInfo = buildInfo('nonce', clientPublicKey, new Uint8Array(serverPublicKeyRaw))
  const nonce = await hkdfExpand(prk, salt, nonceInfo, 12)

  // Cifrar con AES-GCM
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const paddedPayload = new Uint8Array([...new Uint8Array(2), ...payloadBuf]) // 2 bytes de padding
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce }, aesKey, paddedPayload
  )

  // Construir el body final (salt + record size + server public key + ciphertext)
  const rs = paddedPayload.byteLength + 16 + 1
  const serverPublicKeyBytes = new Uint8Array(serverPublicKeyRaw)
  const result = new Uint8Array(
    16 + 4 + 1 + serverPublicKeyBytes.length + ciphertext.byteLength
  )
  let offset = 0
  result.set(salt,                              offset); offset += 16
  result[offset++] = (rs >> 24) & 0xff
  result[offset++] = (rs >> 16) & 0xff
  result[offset++] = (rs >>  8) & 0xff
  result[offset++] =  rs        & 0xff
  result[offset++] = serverPublicKeyBytes.length
  result.set(serverPublicKeyBytes,              offset); offset += serverPublicKeyBytes.length
  result.set(new Uint8Array(ciphertext),        offset)

  return result.buffer
}

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array) {
  const saltKey = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const prk = await crypto.subtle.sign('HMAC', saltKey, ikm)
  return new Uint8Array(prk)
}

async function hkdfExpand(prk: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number) {
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const combined = new Uint8Array([...salt, ...info, 0x01])
  const okm = await crypto.subtle.sign('HMAC', prkKey, combined)
  return new Uint8Array(okm).slice(0, length)
}

function buildInfo(type: string, clientKey: Uint8Array, serverKey: Uint8Array) {
  const encoder = new TextEncoder()
  const typeBytes = encoder.encode(`Content-Encoding: ${type}\0`)
  const label = encoder.encode('P-256\0')
  const info = new Uint8Array(
    typeBytes.length + label.length + 2 + clientKey.length + 2 + serverKey.length
  )
  let o = 0
  info.set(typeBytes, o); o += typeBytes.length
  info.set(label,     o); o += label.length
  info[o++] = 0; info[o++] = clientKey.length
  info.set(clientKey, o); o += clientKey.length
  info[o++] = 0; info[o++] = serverKey.length
  info.set(serverKey, o)
  return info
}

function base64UrlToUint8Array(base64: string) {
  const pad = '='.repeat((4 - base64.length % 4) % 4)
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)))
}

function uint8ArrayToBase64Url(arr: Uint8Array) {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}