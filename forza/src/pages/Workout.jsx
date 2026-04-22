// src/pages/Workout.jsx
import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useWorkout } from '../context/WorkoutContext' // Mejora: Acceso al estado global
import { supabaseAuth } from '../lib/supabase'
import RestTimer from '../components/RestTimer'
import styles from '../assets/css/modules/Workout.module.css'

export default function Workout() {
  const { profile } = useAuth()
  const { workoutState, setWorkoutState, resetWorkout } = useWorkout()

  // Extraemos del estado global con valores de respaldo para evitar errores de .length
  const { 
    view = 'select', 
    routines = [], 
    selectedRoutine = null, 
    exercises = [], 
    session = null, 
    sets = {}, 
    prevSets = {}, 
    activeEx = 0, 
    startTime = null 
  } = workoutState

  // Estados locales para UI inmediata
  const [showTimer, setShowTimer] = useState(false)
  const [timerSecs, setTimerSecs] = useState(90)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Usamos ref para el tiempo como en tu original, pero sincronizado
  const startTimeRef = useRef(startTime ? new Date(startTime) : null)

  useEffect(() => { 
    if (profile?.id && routines.length === 0) fetchRoutines(profile.id) 
  }, [profile])

  async function fetchRoutines(userId) {
    setLoading(true)
    const { data } = await supabaseAuth
      .from('routines')
      .select('id, name, is_template')
      .or(`user_id.eq.${userId},is_template.eq.true`)
      .order('is_template', { ascending: false })
    
    setWorkoutState(prev => ({ ...prev, routines: data || [] }))
    setLoading(false)
  }

  async function startSession(routine) {
    setLoading(true)
    
    // 1. Cargar ejercicios
    const { data: exData } = await supabaseAuth
      .from('routine_exercises')
      .select('*, exercises(id, name, muscle_group)')
      .eq('routine_id', routine.id)
      .order('order_index')

    // 2. Buscar última sesión para pesos previos
    const { data: lastSession } = await supabaseAuth
      .from('workout_sessions')
      .select('id')
      .eq('user_id', profile.id)
      .eq('routine_id', routine.id)
      .not('finished_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const prevMap = {}
    if (lastSession) {
      const { data: lastSets } = await supabaseAuth
        .from('session_sets')
        .select('*')
        .eq('session_id', lastSession.id)
      lastSets?.forEach(s => {
        if (!prevMap[s.exercise_id]) prevMap[s.exercise_id] = []
        prevMap[s.exercise_id].push(s)
      })
    }

    // 3. Crear sesión en Supabase
    const { data: newSession } = await supabaseAuth
      .from('workout_sessions')
      .insert({
        user_id: profile.id,
        routine_id: routine.id,
        routine_name: routine.name,
      })
      .select()
      .single()

    // 4. Mapear sets iniciales
    const setsMap = {}
    exData?.forEach(ex => {
      setsMap[ex.exercise_id] = Array.from({ length: ex.sets }, (_, i) => {
        const prev = prevMap[ex.exercise_id]?.[i]
        return {
          weight: prev?.weight_kg ?? '',
          reps: prev?.reps ?? '',
          done: false,
          set_number: i + 1,
        }
      })
    })

    // Actualizamos el contexto global
    const now = new Date()
    startTimeRef.current = now
    
    setWorkoutState(prev => ({
      ...prev,
      view: 'active',
      selectedRoutine: routine,
      exercises: exData || [],
      session: newSession,
      sets: setsMap,
      prevSets: prevMap,
      activeEx: 0,
      startTime: now.toISOString()
    }))

    setTimerSecs(exData?.[0]?.rest_seconds || 90)
    setLoading(false)
  }

  function completeSet(exId, setIndex) {
    const updatedSets = { ...sets }
    if (updatedSets[exId]) {
      updatedSets[exId][setIndex] = { ...updatedSets[exId][setIndex], done: true }
      setWorkoutState(prev => ({ ...prev, sets: updatedSets }))
      
      const ex = exercises.find(e => e.exercise_id === exId)
      if (ex) {
        setTimerSecs(ex.rest_seconds || 90)
        setShowTimer(true)
      }
    }
  }

  function updateSetField(exId, setIndex, field, value) {
    const updatedSets = { ...sets }
    if (updatedSets[exId]) {
      updatedSets[exId][setIndex] = { ...updatedSets[exId][setIndex], [field]: value }
      setWorkoutState(prev => ({ ...prev, sets: updatedSets }))
    }
  }

  function calcVolume() {
    let total = 0
    Object.values(sets).forEach(exSets => {
      exSets.forEach(s => {
        if (s.done) total += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0)
      })
    })
    return total
  }

  async function finishSession() {
    if (!session || saving) return
    setSaving(true)

    const volume = calcVolume()
    const setsToInsert = []
    exercises.forEach(ex => {
      const exSets = sets[ex.exercise_id] || []
      exSets.forEach(s => {
        if (s.done) {
          setsToInsert.push({
            session_id: session.id,
            exercise_id: ex.exercise_id,
            exercise_name: ex.exercises?.name || '',
            set_number: s.set_number,
            weight_kg: parseFloat(s.weight) || 0,
            reps: parseInt(s.reps) || 0,
            completed: true,
          })
        }
      })
    })

    if (setsToInsert.length > 0) {
      await supabaseAuth.from('session_sets').insert(setsToInsert)
    }

    await supabaseAuth
      .from('workout_sessions')
      .update({ finished_at: new Date().toISOString(), total_volume: volume })
      .eq('id', session.id)

    setSaving(false)
    setWorkoutState(prev => ({ ...prev, view: 'finish' }))
  }

// Se añade ?. para evitar errores si sets[exId] no existe aún
  function doneCount(exId) { return (sets[exId] || []).filter(s => s?.done).length }
  function totalSets(exId) { return (sets[exId] || []).length }
  
  const handleInputFocus = (e) => e.target.select()
  
  // Se añade ?. para que si exercises es undefined, no rompa la app
  const currentEx = exercises?.[activeEx]

  // ── VISTA: SELECCIÓN ──────────────────────────────────
  if (view === 'select') {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.pageTag}>Entrenar</p>
          <h1 className={styles.title}>¿Qué toca<br /><span className={styles.accent}>hoy?</span></h1>
        </header>

        {loading ? (
          <div className={styles.skeletonList}>
            {Array(4).fill(0).map((_, i) => <div key={i} className={styles.skeleton} />)}
          </div>
        ) : (routines?.length === 0 || !routines) ? ( // ⚡ CORRECCIÓN AQUÍ: Chequeo seguro de length
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🏋️</span>
            <p className={styles.emptyText}>No tienes rutinas aún.</p>
          </div>
        ) : (
          <div className={styles.routineList}>
            {routines.map(r => (
              <button key={r.id} className={styles.routineCard} onClick={() => startSession(r)}>
                <div className={styles.routineCardLeft}>
                  <span className={styles.routineCardIcon}>⚡</span>
                  <div>
                    <p className={styles.routineCardName}>{r.name}</p>
                    {r.is_template && <span className={styles.templateTag}>Plantilla</span>}
                  </div>
                </div>
                <span className={styles.routineCardArrow}>→</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }
  
  // ── VISTA: FINISH ─────────────────────────────────────
  if (view === 'finish') {
    const finalStartTime = startTime ? new Date(startTime) : new Date()
    const duration = Math.round((new Date() - finalStartTime) / 60000)
    const volume = calcVolume()
    const totalDone = Object.values(sets).reduce((acc, s) => acc + s.filter(x => x.done).length, 0)

    return (
      <div className={styles.page}>
        <div className={styles.finishWrapper}>
          <div className={styles.finishIcon}>🏆</div>
          <h1 className={styles.finishTitle}>¡Sesión<br /><span className={styles.accent}>completada!</span></h1>

          <div className={styles.finishStats}>
            <div className={styles.finishStat}>
              <span className={styles.finishStatNum}>{duration}</span>
              <span className={styles.finishStatLabel}>min</span>
            </div>
            <div className={styles.finishStat}>
              <span className={styles.finishStatNum}>{totalDone}</span>
              <span className={styles.finishStatLabel}>sets</span>
            </div>
            <div className={styles.finishStat}>
              <span className={styles.finishStatNum}>{Math.round(volume).toLocaleString()}</span>
              <span className={styles.finishStatLabel}>kg vol</span>
            </div>
          </div>

          <button className={styles.finishBtn} onClick={resetWorkout}>
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  // ── VISTA: ENTRENAMIENTO ACTIVO ───────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.activeTop}>
        <div>
          <p className={styles.activeRoutineName}>{selectedRoutine?.name}</p>
          <p className={styles.activeProgress}>
            Ejercicio {activeEx + 1} de {exercises.length}
          </p>
        </div>
        <button className={styles.finishEarlyBtn} onClick={finishSession} disabled={saving}>
          {saving ? 'Guardando...' : 'Finalizar'}
        </button>
      </div>

      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${exercises.length > 0 ? ((activeEx + 1) / exercises.length) * 100 : 0}%` }}
        />
      </div>

      <div className={styles.exTabs}>
        {exercises.map((ex, i) => (
          <button
            key={ex.id}
            className={`
              ${styles.exTab} 
              ${i === activeEx ? styles.exTabActive : ''} 
              ${doneCount(ex.exercise_id) === totalSets(ex.exercise_id) ? styles.exTabDone : ''}
            `}
            onClick={() => { 
                setWorkoutState(prev => ({ ...prev, activeEx: i }));
                setTimerSecs(ex.rest_seconds || 90);
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {currentEx && (
        <div className={styles.exCard}>
          <div className={styles.exHeader}>
            <div style={{ flex: 1 }}>
              <p className={styles.exMuscle}>{currentEx.exercises?.muscle_group}</p>
              <h2 className={styles.exName}>{currentEx.exercises?.name}</h2>
              <p className={styles.exTarget}>
                Objetivo: {currentEx.sets}×{currentEx.reps} · {currentEx.rest_seconds}s
              </p>
            </div>
            <div className={styles.exDoneCount}>
              <span className={styles.exDoneNum}>{doneCount(currentEx.exercise_id)}</span>
              <span className={styles.exDoneTotal}>/{totalSets(currentEx.exercise_id)}</span>
            </div>
          </div>

          <div className={styles.setList}>
            <div className={styles.setRow}>
              <span className={styles.setColLabel}>#</span>
              <span className={styles.setColLabel}>Prev</span>
              <span className={styles.setColLabel}>Peso</span>
              <span className={styles.setColLabel}>Reps</span>
              <span className={styles.setColLabel}></span>
            </div>

            {(sets[currentEx.exercise_id] || []).map((s, i) => {
              const prev = prevSets[currentEx.exercise_id]?.[i]
              return (
                <div key={i} className={`${styles.setRow} ${s.done ? styles.setRowDone : ''}`}>
                  <span className={styles.setNum}>{i + 1}</span>
                  <span className={styles.setPrev}>
                    {prev ? `${prev.weight_kg}×${prev.reps}` : '—'}
                  </span>

                  <input
                    type="number"
                    className={styles.setInput}
                    placeholder="0"
                    value={s.weight}
                    onFocus={handleInputFocus}
                    onChange={e => updateSetField(currentEx.exercise_id, i, 'weight', e.target.value)}
                    disabled={s.done}
                    inputMode="decimal"
                  />

                  <input
                    type="number"
                    className={styles.setInput}
                    placeholder="0"
                    value={s.reps}
                    onFocus={handleInputFocus}
                    onChange={e => updateSetField(currentEx.exercise_id, i, 'reps', e.target.value)}
                    disabled={s.done}
                    inputMode="numeric"
                  />

                  <button
                    className={`${styles.setDoneBtn} ${s.done ? styles.setDoneBtnDone : ''}`}
                    onClick={() => !s.done && completeSet(currentEx.exercise_id, i)}
                    disabled={s.done}
                  >
                    {s.done ? '✓' : '○'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className={styles.exNav}>
        <button
          className={styles.exNavBtn}
          disabled={activeEx === 0}
          onClick={() => setWorkoutState(prev => ({ ...prev, activeEx: prev.activeEx - 1 }))}
        >
          Anterior
        </button>
        <button
          className={`${styles.exNavBtn} ${styles.exNavBtnNext}`}
          disabled={activeEx === exercises.length - 1}
          onClick={() => { 
            const nextIdx = activeEx + 1;
            setWorkoutState(prev => ({ ...prev, activeEx: nextIdx }));
            setTimerSecs(exercises[nextIdx]?.rest_seconds || 90);
          }}
        >
          Siguiente
        </button>
      </div>

      <button className={styles.timerToggle} onClick={() => setShowTimer(p => !p)}>
        {showTimer ? '✕ Ocultar Timer' : '⏱ Timer de descanso'}
      </button>

      {showTimer && (
        <RestTimer
          defaultSeconds={timerSecs}
          autoStart={false}
          onFinish={() => {}}
        />
      )}

      <button className={styles.finishBtnBottom} onClick={finishSession} disabled={saving}>
        {saving ? 'Guardando sesión...' : '🏁 Finalizar Entrenamiento'}
      </button>
    </div>
  )
}