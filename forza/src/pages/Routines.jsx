import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabaseAuth } from '../lib/supabase'
import styles from '../assets/css/modules/Routines.module.css'

const MUSCLE_GROUPS = [
  'chest','back','shoulders','biceps','triceps','legs','glutes','core','cardio','full_body'
]
const MUSCLE_LABELS = {
  chest:'Pecho', back:'Espalda', shoulders:'Hombros', biceps:'Bíceps',
  triceps:'Tríceps', legs:'Piernas', glutes:'Glúteos', core:'Core',
  cardio:'Cardio', full_body:'Cuerpo completo'
}

export default function Routines() {
  const { profile } = useAuth()

  // Listas
  const [myRoutines,   setMyRoutines]   = useState([])
  const [templates,    setTemplates]    = useState([])
  const [exercises,    setExercises]    = useState([])
  const [loading,      setLoading]      = useState(true)

  // UI state
  const [tab,          setTab]          = useState(0)   // 0=Mis rutinas 1=Plantillas
  const [toast,        setToast]        = useState('')
  const [saving,       setSaving]       = useState(false)

  // Modal crear/editar rutina
  const [routineModal, setRoutineModal] = useState(null) // null | { mode:'create'|'edit', routine? }
  const [rName,        setRName]        = useState('')
  const [rDesc,        setRDesc]        = useState('')
  const [rExercises,   setRExercises]   = useState([])  // [{ exercise_id, sets, reps, rest_seconds, order_index }]

  // Modal agregar ejercicio a rutina
  const [exModal,      setExModal]      = useState(false)
  const [exFilter,     setExFilter]     = useState('')
  const [exGroup,      setExGroup]      = useState('')

  // Crear ejercicio personalizado
  const [createExMode, setCreateExMode] = useState(false)
  const [newExName,    setNewExName]    = useState('')
  const [newExGroup,   setNewExGroup]   = useState('chest')
  const [savingEx,     setSavingEx]     = useState(false)

  useEffect(() => { if (profile?.id) fetchAll(profile.id) }, [profile])

  async function fetchAll(userId) {
    setLoading(true)
    const [{ data: mine }, { data: tmpl }, { data: exs }] = await Promise.all([
      supabaseAuth.from('routines')
        .select('id, name, description, created_at')
        .eq('user_id', userId)
        .eq('is_template', false)
        .order('created_at', { ascending: false }),
      supabaseAuth.from('routines')
        .select('id, name, description')
        .eq('is_template', true)
        .order('name'),
      supabaseAuth.from('exercises')
        .select('id, name, muscle_group, user_id')
        .eq('is_active', true)
        .order('muscle_group'),
    ])
    setMyRoutines(mine || [])
    setTemplates(tmpl || [])
    setExercises(exs || [])
    setLoading(false)
  }

  // ── Abrir modal crear ──────────────────────────────────
  function openCreate() {
    setRName('')
    setRDesc('')
    setRExercises([])
    setRoutineModal({ mode: 'create' })
  }

  // ── Abrir modal editar ─────────────────────────────────
  async function openEdit(routine) {
    setRName(routine.name)
    setRDesc(routine.description || '')
    const { data } = await supabaseAuth
      .from('routine_exercises')
      .select('*, exercises(id, name, muscle_group)')
      .eq('routine_id', routine.id)
      .order('order_index')
    setRExercises(data?.map(e => ({
      id:           e.id,
      exercise_id:  e.exercise_id,
      name:         e.exercises?.name,
      muscle_group: e.exercises?.muscle_group,
      sets:         e.sets,
      reps:         e.reps,
      rest_seconds: e.rest_seconds,
      order_index:  e.order_index,
    })) || [])
    setRoutineModal({ mode: 'edit', routine })
  }

  // ── Clonar plantilla ───────────────────────────────────
  async function cloneTemplate(template) {
    if (!profile?.id) return
    setSaving(true)
    const { data: newRoutine, error } = await supabaseAuth
      .from('routines')
      .insert({ user_id: profile.id, name: template.name, description: template.description, is_template: false })
      .select()
      .single()
    if (error || !newRoutine) { setSaving(false); return }
    const { data: tmplExs } = await supabaseAuth
      .from('routine_exercises')
      .select('*')
      .eq('routine_id', template.id)
    if (tmplExs?.length > 0) {
      await supabaseAuth.from('routine_exercises').insert(
        tmplExs.map(e => ({
          routine_id:   newRoutine.id,
          exercise_id:  e.exercise_id,
          sets:         e.sets,
          reps:         e.reps,
          rest_seconds: e.rest_seconds,
          order_index:  e.order_index,
        }))
      )
    }
    await fetchAll(profile.id)
    showToast(`✓ "${template.name}" clonada`)
    setSaving(false)
  }

  // ── Eliminar rutina ────────────────────────────────────
  async function deleteRoutine(id) {
    await supabaseAuth.from('routines').delete().eq('id', id)
    setMyRoutines(prev => prev.filter(r => r.id !== id))
    showToast('Rutina eliminada')
  }

  // ── Guardar rutina (crear o editar) ────────────────────
  async function saveRoutine() {
    if (!rName.trim() || !profile?.id) return
    setSaving(true)
    let routineId
    if (routineModal.mode === 'create') {
      const { data, error } = await supabaseAuth
        .from('routines')
        .insert({ user_id: profile.id, name: rName.trim(), description: rDesc.trim(), is_template: false })
        .select()
        .single()
      if (error || !data) { setSaving(false); return }
      routineId = data.id
    } else {
      routineId = routineModal.routine.id
      await supabaseAuth
        .from('routines')
        .update({ name: rName.trim(), description: rDesc.trim() })
        .eq('id', routineId)
      await supabaseAuth.from('routine_exercises').delete().eq('routine_id', routineId)
    }
    if (rExercises.length > 0) {
      await supabaseAuth.from('routine_exercises').insert(
        rExercises.map((e, i) => ({
          routine_id:   routineId,
          exercise_id:  e.exercise_id,
          sets:         parseInt(e.sets)         || 3,
          reps:         String(e.reps)           || '10',
          rest_seconds: parseInt(e.rest_seconds) || 90,
          order_index:  i,
        }))
      )
    }
    await fetchAll(profile.id)
    showToast(routineModal.mode === 'create' ? '✓ Rutina creada' : '✓ Rutina guardada')
    setSaving(false)
    setRoutineModal(null)
  }

  // ── Ejercicios en el builder ───────────────────────────
  function addExercise(ex) {
    setRExercises(prev => [...prev, {
      exercise_id:  ex.id,
      name:         ex.name,
      muscle_group: ex.muscle_group,
      sets:         3,
      reps:         '10-12',
      rest_seconds: 90,
      order_index:  prev.length,
    }])
    setExModal(false)
    setCreateExMode(false)
  }

  function removeExercise(index) {
    setRExercises(prev => prev.filter((_, i) => i !== index))
  }

  function updateExField(index, field, value) {
    setRExercises(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e))
  }

  function moveEx(index, dir) {
    setRExercises(prev => {
      const arr  = [...prev]
      const swap = index + dir
      if (swap < 0 || swap >= arr.length) return arr
      ;[arr[index], arr[swap]] = [arr[swap], arr[index]]
      return arr
    })
  }

  // ── Crear ejercicio personalizado ──────────────────────
  async function createCustomExercise() {
    if (!newExName.trim() || !profile?.id) return
    setSavingEx(true)

    const { data, error } = await supabaseAuth
      .from('exercises')
      .insert({
        name:         newExName.trim(),
        muscle_group: newExGroup,
        is_active:    true,
        user_id:      profile.id,
      })
      .select('id, name, muscle_group, user_id')
      .single()

    setSavingEx(false)

    if (error) {
      showToast('Error al crear ejercicio')
      return
    }

    // Añadir a lista local y seleccionar directo
    setExercises(prev => [...prev, data])
    addExercise(data)
    setNewExName('')
    setNewExGroup('chest')
  }

  function closeExModal() {
    setExModal(false)
    setCreateExMode(false)
    setExFilter('')
    setExGroup('')
    setNewExName('')
    setNewExGroup('chest')
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2200) }

  const filteredExercises = exercises.filter(e => {
    const matchGroup  = !exGroup  || e.muscle_group === exGroup
    const matchSearch = !exFilter || e.name.toLowerCase().includes(exFilter.toLowerCase())
    return matchGroup && matchSearch
  })

  // ── RENDER ─────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {toast && <div className={styles.toast}>{toast}</div>}

      {/* HEADER */}
      <header className={styles.header}>
        <div>
          <p className={styles.pageTag}>Entreno</p>
          <h1 className={styles.title}>Rutinas</h1>
        </div>
        <button className={styles.createBtn} onClick={openCreate}>＋ Nueva</button>
      </header>

      {/* TABS */}
      <div className={styles.tabs}>
        {['Mis Rutinas', 'Plantillas'].map((t, i) => (
          <button key={t}
            className={`${styles.tab} ${tab === i ? styles.tabActive : ''}`}
            onClick={() => setTab(i)}
          >{t}</button>
        ))}
      </div>

      {loading ? (
        <div className={styles.skeletonList}>
          {Array(3).fill(0).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      ) : (
        <>
          {/* MIS RUTINAS */}
          {tab === 0 && (
            myRoutines.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>📋</span>
                <p className={styles.emptyText}>No tienes rutinas propias aún.</p>
                <p className={styles.emptyHint}>Crea una desde cero o clona una plantilla.</p>
                <button className={styles.emptyBtn} onClick={() => setTab(1)}>Ver plantillas →</button>
              </div>
            ) : (
              <div className={styles.routineList}>
                {myRoutines.map(r => (
                  <RoutineCard key={r.id} routine={r}
                    onEdit={() => openEdit(r)}
                    onDelete={() => deleteRoutine(r.id)}
                  />
                ))}
              </div>
            )
          )}

          {/* PLANTILLAS */}
          {tab === 1 && (
            <div className={styles.routineList}>
              {templates.map(t => (
                <RoutineCard key={t.id} routine={t} isTemplate
                  onClone={() => cloneTemplate(t)}
                  cloning={saving}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── MODAL: CREAR / EDITAR RUTINA ── */}
      {routineModal && (
        <div className={styles.overlay} onClick={() => setRoutineModal(null)}>
          <div className={styles.sheet} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <h2 className={styles.sheetTitle}>
              {routineModal.mode === 'create' ? 'Nueva rutina' : 'Editar rutina'}
            </h2>

            <label className={styles.sheetLabel}>Nombre de la rutina</label>
            <input className={styles.sheetInput}
              placeholder="Ej: Push A — Pecho y Tríceps"
              value={rName}
              onChange={e => setRName(e.target.value)}
            />

            <label className={styles.sheetLabel}>Descripción (opcional)</label>
            <input className={styles.sheetInput}
              placeholder="Ej: Día de empuje para hipertrofia"
              value={rDesc}
              onChange={e => setRDesc(e.target.value)}
            />

            <div className={styles.exListHeader}>
              <label className={styles.sheetLabel} style={{ margin: 0 }}>
                Ejercicios ({rExercises.length})
              </label>
              <button className={styles.addExBtn} onClick={() => setExModal(true)}>
                ＋ Agregar
              </button>
            </div>

            {rExercises.length === 0 ? (
              <div className={styles.noExercises}>
                <span>Sin ejercicios. Toca "Agregar" para comenzar.</span>
              </div>
            ) : (
              <div className={styles.exBuilderList}>
                {rExercises.map((ex, i) => (
                  <div key={i} className={styles.exBuilderRow}>
                    <div className={styles.exBuilderOrder}>
                      <button className={styles.moveBtn} onClick={() => moveEx(i, -1)} disabled={i === 0}>▲</button>
                      <span className={styles.exBuilderNum}>{i + 1}</span>
                      <button className={styles.moveBtn} onClick={() => moveEx(i, 1)} disabled={i === rExercises.length - 1}>▼</button>
                    </div>
                    <div className={styles.exBuilderInfo}>
                      <p className={styles.exBuilderMuscle}>{MUSCLE_LABELS[ex.muscle_group] || ex.muscle_group}</p>
                      <p className={styles.exBuilderName}>{ex.name}</p>
                      <div className={styles.exParams}>
                        <div className={styles.exParam}>
                          <label className={styles.exParamLabel}>Sets</label>
                          <input type="number" className={styles.exParamInput}
                            value={ex.sets}
                            onChange={e => updateExField(i, 'sets', e.target.value)}
                            min="1" max="10" inputMode="numeric"
                          />
                        </div>
                        <div className={styles.exParam}>
                          <label className={styles.exParamLabel}>Reps</label>
                          <input type="text" className={styles.exParamInput}
                            value={ex.reps}
                            onChange={e => updateExField(i, 'reps', e.target.value)}
                            placeholder="10-12"
                          />
                        </div>
                        <div className={styles.exParam}>
                          <label className={styles.exParamLabel}>Descanso</label>
                          <input type="number" className={styles.exParamInput}
                            value={ex.rest_seconds}
                            onChange={e => updateExField(i, 'rest_seconds', e.target.value)}
                            min="30" max="300" step="15" inputMode="numeric"
                          />
                        </div>
                      </div>
                    </div>
                    <button className={styles.removeExBtn} onClick={() => removeExercise(i)}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <button className={styles.saveBtn}
              onClick={saveRoutine}
              disabled={saving || !rName.trim()}
            >
              {saving
                ? <span className={styles.spinner} />
                : routineModal.mode === 'create' ? 'Crear rutina' : 'Guardar cambios'
              }
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: AGREGAR EJERCICIO ── */}
      {exModal && (
        <div className={styles.overlay} onClick={closeExModal}>
          <div className={styles.sheet} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />

            {!createExMode ? (
              <>
                <h2 className={styles.sheetTitle}>Agregar ejercicio</h2>

                <input className={styles.sheetInput}
                  placeholder="Buscar ejercicio..."
                  value={exFilter}
                  onChange={e => setExFilter(e.target.value)}
                  autoFocus
                />

                <div className={styles.groupFilters}>
                  <button
                    className={`${styles.groupBtn} ${exGroup === '' ? styles.groupBtnActive : ''}`}
                    onClick={() => setExGroup('')}
                  >Todos</button>
                  {MUSCLE_GROUPS.map(g => (
                    <button key={g}
                      className={`${styles.groupBtn} ${exGroup === g ? styles.groupBtnActive : ''}`}
                      onClick={() => setExGroup(g)}
                    >{MUSCLE_LABELS[g]}</button>
                  ))}
                </div>

                <div className={styles.exPickList}>
                  {filteredExercises.map(ex => (
                    <button key={ex.id} className={styles.exPickRow}
                      onClick={() => addExercise(ex)}
                      disabled={rExercises.some(e => e.exercise_id === ex.id)}
                    >
                      <div>
                        <p className={styles.exPickMuscle}>
                          {MUSCLE_LABELS[ex.muscle_group]}
                          {ex.user_id && <span className={styles.customBadge}> · Personalizado</span>}
                        </p>
                        <p className={styles.exPickName}>{ex.name}</p>
                      </div>
                      <span className={styles.exPickAdd}>
                        {rExercises.some(e => e.exercise_id === ex.id) ? '✓' : '＋'}
                      </span>
                    </button>
                  ))}
                </div>

                {/* ── Botón crear ejercicio propio ── */}
                <button
                  className={styles.createExBtn}
                  onClick={() => setCreateExMode(true)}
                >
                  ＋ Crear ejercicio personalizado
                </button>
              </>
            ) : (
              <>
                {/* ── Formulario crear ejercicio ── */}
                <button className={styles.backBtn} onClick={() => setCreateExMode(false)}>
                  ← Volver a la lista
                </button>

                <h2 className={styles.sheetTitle}>Nuevo ejercicio</h2>

                <label className={styles.sheetLabel}>Nombre</label>
                <input className={styles.sheetInput}
                  placeholder="Ej: Curl con cable unilateral"
                  value={newExName}
                  onChange={e => setNewExName(e.target.value)}
                  autoFocus
                />

                <label className={styles.sheetLabel}>Grupo muscular</label>
                <select
                  className={styles.sheetInput}
                  value={newExGroup}
                  onChange={e => setNewExGroup(e.target.value)}
                >
                  {MUSCLE_GROUPS.map(g => (
                    <option key={g} value={g}>{MUSCLE_LABELS[g]}</option>
                  ))}
                </select>

                <button
                  className={styles.saveBtn}
                  onClick={createCustomExercise}
                  disabled={savingEx || !newExName.trim()}
                >
                  {savingEx
                    ? <span className={styles.spinner} />
                    : 'Crear y agregar →'
                  }
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

// ── RoutineCard component ──────────────────────────────────
function RoutineCard({ routine, isTemplate, onEdit, onDelete, onClone, cloning }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={styles.routineCard}>
      <div className={styles.routineCardMain} onClick={() => !isTemplate && setOpen(p => !p)}>
        <div className={styles.routineCardLeft}>
          <span className={styles.routineCardIcon}>{isTemplate ? '📋' : '⚡'}</span>
          <div className={styles.routineInfo}> {/* Contenedor para info y badge */}
            <p className={styles.routineCardName}>{routine.name}</p>
            
            {/* Badge de PLANTILLA alineado a la izquierda */}
            {isTemplate && <span className={styles.plantillaBadge}>PLANTILLA</span>}
            
            {routine.description && (
              <p className={styles.routineCardDesc}>{routine.description}</p>
            )}
          </div>
        </div>
        {isTemplate ? (
          <button className={styles.cloneBtn} onClick={onClone} disabled={cloning}>
            {cloning ? '...' : '→'}
          </button>
        ) : (
          <span className={styles.routineCardChevron}>{open ? '▲' : '▼'}</span>
        )}
      </div>

      {!isTemplate && open && (
        <div className={styles.routineActions}>
          <button className={styles.actionBtn} onClick={onEdit}>✏️ Editar</button>
          <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={onDelete}>🗑 Eliminar</button>
        </div>
      )}
    </div>
  )
}