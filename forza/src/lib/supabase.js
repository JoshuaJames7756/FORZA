// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const URL  = import.meta.env.VITE_SUPABASE_URL
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!URL || !ANON) {
  throw new Error('[FORZA] Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY')
}

/**
 * Cliente público — sin sesión
 * Uso: datos públicos (plantillas, ejercicios, etc.)
 */
export const supabase = createClient(URL, ANON, {
  auth: { persistSession: false }
})

/**
 * Cliente autenticado — sesión persistente
 * Uso: login, register, logout, onAuthStateChange
 *      Y todas las queries RLS (profile, workout, diet…)
 * 
 * Un solo GoTrueClient → sin conflictos de storage
 */
export const supabaseAuth = createClient(URL, ANON, {
  auth: {
    persistSession: true,
    storageKey: 'forza-auth'
  }
})