// src/lib/dataService.js
// Capa de datos: intenta Supabase, si falla usa IndexedDB
import { supabaseAuth } from './supabase'
import { db } from './db'
import { saveLocal } from './sync'

// ─────────────────────────────────────────────────
// QUERY — leer datos con fallback a IndexedDB
// ─────────────────────────────────────────────────
export async function query(tabla, filtros = {}) {
  try {
    let q = supabaseAuth.from(tabla).select(filtros.select || '*')

    if (filtros.eq)     Object.entries(filtros.eq).forEach(([k, v]) => { q = q.eq(k, v) })
    if (filtros.or)     q = q.or(filtros.or)
    if (filtros.order)  q = q.order(filtros.order.col, { ascending: filtros.order.asc ?? true })
    if (filtros.limit)  q = q.limit(filtros.limit)
    if (filtros.not)    q = q.not(...filtros.not)
    if (filtros.single) q = q.maybeSingle()

    const { data, error } = await q
    if (error) throw error

    // Guardar en IndexedDB para uso offline
    if (data && !filtros.single) {
      await db[tabla].bulkPut(
        data.map(row => ({ ...row, syncStatus: 'synced' }))
      ).catch(() => {}) // silencioso si falla
    }

    return { data, error: null }

  } catch (err) {
    console.warn(`[FORZA] Sin red, leyendo ${tabla} desde IndexedDB`)

    // Fallback a IndexedDB
    try {
      let collection = db[tabla].toCollection()

      // Aplicar filtros básicos offline
      if (filtros.eq) {
        const entries = Object.entries(filtros.eq)
        const [key, val] = entries[0]
        collection = db[tabla].where(key).equals(val)
      }

      let results = await collection.toArray()

      // Filtros adicionales en memoria
      if (filtros.eq && Object.keys(filtros.eq).length > 1) {
        const entries = Object.entries(filtros.eq).slice(1)
        results = results.filter(row =>
          entries.every(([k, v]) => row[k] === v)
        )
      }

      if (filtros.order) {
        results.sort((a, b) => {
          const aVal = a[filtros.order.col]
          const bVal = b[filtros.order.col]
          return filtros.order.asc !== false
            ? aVal > bVal ? 1 : -1
            : aVal < bVal ? 1 : -1
        })
      }

      if (filtros.limit) results = results.slice(0, filtros.limit)
      if (filtros.single) return { data: results[0] || null, error: null, offline: true }

      return { data: results, error: null, offline: true }

    } catch (dbErr) {
      return { data: filtros.single ? null : [], error: dbErr, offline: true }
    }
  }
}

// ─────────────────────────────────────────────────
// INSERT — guarda local siempre, sube si hay red
// ─────────────────────────────────────────────────
export async function insert(tabla, datos) {
  try {
    const { data, error } = await supabaseAuth
      .from(tabla).insert(datos).select().single()
    if (error) throw error

    // Guardar en local como synced
    await db[tabla].put({ ...data, syncStatus: 'synced' }).catch(() => {})
    return { data, error: null }

  } catch (err) {
    console.warn(`[FORZA] Sin red, guardando ${tabla} offline`)
    const data = await saveLocal(tabla, datos)
    return { data, error: null, offline: true }
  }
}

// ─────────────────────────────────────────────────
// UPDATE — actualiza local siempre, sube si hay red
// ─────────────────────────────────────────────────
export async function update(tabla, id, datos) {
  try {
    const { data, error } = await supabaseAuth
      .from(tabla).update(datos).eq('id', id).select().single()
    if (error) throw error

    await db[tabla].update(id, { ...datos, syncStatus: 'synced' }).catch(() => {})
    return { data, error: null }

  } catch (err) {
    console.warn(`[FORZA] Sin red, actualizando ${tabla} offline`)
    await db[tabla].update(id, { ...datos, syncStatus: 'pending' }).catch(() => {})
    return { data: { id, ...datos }, error: null, offline: true }
  }
}

// ─────────────────────────────────────────────────
// UPSERT — insert o update según exista el id
// ─────────────────────────────────────────────────
export async function upsert(tabla, datos) {
  try {
    const { data, error } = await supabaseAuth
      .from(tabla).upsert(datos, { onConflict: 'id' }).select().single()
    if (error) throw error

    await db[tabla].put({ ...data, syncStatus: 'synced' }).catch(() => {})
    return { data, error: null }

  } catch (err) {
    const data = await saveLocal(tabla, datos)
    return { data, error: null, offline: true }
  }
}

// ─────────────────────────────────────────────────
// REMOVE — borra local siempre, encola para Supabase
// ─────────────────────────────────────────────────
export async function remove(tabla, id) {
  try {
    const { error } = await supabaseAuth.from(tabla).delete().eq('id', id)
    if (error) throw error

    await db[tabla].delete(id).catch(() => {})
    return { error: null }

  } catch (err) {
    // Importar deleteLocal desde sync
    const { deleteLocal } = await import('./sync')
    await deleteLocal(tabla, id)
    return { error: null, offline: true }
  }
}