// src/lib/sync.js
import { db } from './db'
import { supabase } from './supabase'
import { v4 as uuidv4 } from 'uuid'

// ─────────────────────────────────────────────────
// GUARDAR LOCAL — siempre funciona, con o sin red
// El llamador puede omitir id y se genera aquí
// ─────────────────────────────────────────────────
export async function saveLocal(tabla, datos) {
  const registro = {
    id: datos.id ?? uuidv4(),   // genera uuid si no viene
    ...datos,
    syncStatus: 'pending',
    updatedAt: new Date().toISOString(),
  }

  await db[tabla].put(registro)

  await db.syncQueue.add({
    tabla,
    operacion: datos.id ? 'upsert' : 'insert',
    registroId: registro.id,
    timestamp: new Date().toISOString(),
  })

  return registro
}

// ─────────────────────────────────────────────────
// SYNC — sube todo lo pendiente a Supabase
// ─────────────────────────────────────────────────
export async function syncPendientes() {
  const cola = await db.syncQueue.toArray()
  if (cola.length === 0) return { sincronizados: 0, errores: [] }

  let sincronizados = 0
  const errores = []

  for (const item of cola) {
    try {
        // ── DELETE ──
        if (item.operacion === 'delete') {
        const { error } = await supabase
            .from(item.tabla)
            .delete()
            .eq('id', item.registroId)

        if (error) throw error
        await db.syncQueue.delete(item.localId)
        sincronizados++
        continue
        }

        // ── INSERT / UPSERT ──
        const registro = await db[item.tabla].get(item.registroId)
        if (!registro) {
        await db.syncQueue.delete(item.localId)
        continue
        }

        const { syncStatus, updatedAt, ...datosLimpios } = registro

        const { error } = await supabase
        .from(item.tabla)
        .upsert(datosLimpios, { onConflict: 'id' })

        if (error) throw error

        await db[item.tabla].update(item.registroId, { syncStatus: 'synced' })
        await db.syncQueue.delete(item.localId)
        sincronizados++

    } catch (err) {
        console.error(`[FORZA Sync] Error en ${item.tabla}:`, err.message)
        errores.push({ tabla: item.tabla, error: err.message })
        await db[item.tabla].update(item.registroId, { syncStatus: 'error' })
    }
  }

  return { sincronizados, errores }
}

// ─────────────────────────────────────────────────
// PULL — baja datos frescos de Supabase a IndexedDB
// Filtra por user_id excepto en exercises (tiene globales)
// ─────────────────────────────────────────────────
export async function pullFromSupabase(tabla, userId) {
  let query = supabase.from(tabla).select('*')

  if (tabla === 'exercises') {
    // Ejercicios globales (user_id null) + los del usuario
    query = query.or(`user_id.eq.${userId},user_id.is.null`)
  } else if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query
  if (error) throw error

  await db[tabla].clear()
  await db[tabla].bulkPut(
    data.map(row => ({ ...row, syncStatus: 'synced' }))
  )

  return data
}

// ─────────────────────────────────────────────────
// ELIMINAR LOCAL — marca para borrar en Supabase
// ─────────────────────────────────────────────────
export async function deleteLocal(tabla, id) {
  // Guardamos el id con operacion 'delete' en la cola
  await db.syncQueue.add({
    tabla,
    operacion: 'delete',
    registroId: id,
    timestamp: new Date().toISOString(),
  })

  // Borramos localmente de inmediato
  await db[tabla].delete(id)
}