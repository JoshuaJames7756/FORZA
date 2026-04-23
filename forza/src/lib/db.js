import Dexie from 'dexie'

export const db = new Dexie('ForzaDB')

db.version(1).stores({
  // NOTA: Dexie solo necesita los campos que vas a usar
  // para filtrar/buscar. El resto se guarda automáticamente.
  // uuid como PK — no uses ++ (autoincremento), ya tienes id propio.

  // Medidas corporales → filtrar por usuario y ordenar por fecha
  body_measurements: 'id, user_id, measured_at, syncStatus',

  // Registro de comidas → filtrar por usuario, fecha y tipo de comida
  diet_logs: 'id, user_id, logged_at, meal_type, syncStatus',

  // Catálogo de ejercicios → buscar por nombre o grupo muscular
  // user_id nullable: hay ejercicios globales (null) y del usuario
  exercises: 'id, user_id, muscle_group, is_active, syncStatus',

  // Perfil → uno por usuario, se busca directo por id
  profiles: 'id, syncStatus',

  // Fotos de progreso → por usuario y fecha
  // ⚠️ photo_url guarda la URL de Supabase Storage, no el blob
  progress_photos: 'id, user_id, taken_at, syncStatus',

  // Suscripciones push → por usuario
  push_subscriptions: 'id, user_id, syncStatus',

  // Ejercicios de una rutina → la relación clave es routine_id
  routine_exercises: 'id, routine_id, exercise_id, order_index, syncStatus',

  // Rutinas → por usuario, separar templates de personales
  routines: 'id, user_id, is_template, syncStatus',

  // Sets de una sesión → la relación clave es session_id
  // exercise_id indexado para stats por ejercicio
  session_sets: 'id, session_id, exercise_id, syncStatus',

  // Horarios → por usuario y día de la semana (0-6)
  user_schedules: 'id, user_id, day_of_week, routine_id, syncStatus',

  // Registro de peso → por usuario y fecha (para gráficas)
  weight_log: 'id, user_id, logged_at, syncStatus',

  // Sesiones de entrenamiento → por usuario, rutina y fecha inicio
  workout_sessions: 'id, user_id, routine_id, started_at, syncStatus',

  // Cola interna de sincronización — NO modificar
  syncQueue: '++localId, tabla, operacion, timestamp',
})

export default db