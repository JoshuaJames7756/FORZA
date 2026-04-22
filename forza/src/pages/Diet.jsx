// src/pages/Diet.jsx
import { useEffect, useState, useRef, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabaseAuth } from '../lib/supabase'
import styles from '../assets/css/modules/Diet.module.css'
import { calcMacroGoals } from '../lib/macros'

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Desayuno', icon: '🌅' },
  { value: 'lunch',     label: 'Almuerzo', icon: '☀️' },
  { value: 'dinner',    label: 'Cena',      icon: '🌙' },
  { value: 'snack',     label: 'Snack',     icon: '🍎' },
]

export default function Diet() {
  const { profile } = useAuth();
  
  const macroGoals = useMemo(
    () => calcMacroGoals(profile) ?? { calories: 2000, protein_g: 150, carbs_g: 250, fat_g: 65 },
    [profile]
  )  

  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [isCustom, setIsCustom] = useState(false) 
  
  const [searchQ, setSearchQ] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState([])
  
  const [selected, setSelected] = useState(null) 
  const [mealType, setMealType] = useState('lunch')
  const [quantity, setQuantity] = useState('100')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const searchTimeout = useRef(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => { if (profile?.id) fetchLogs(profile.id) }, [profile])

  async function fetchLogs(userId) {
    setLoading(true)
    const { data } = await supabaseAuth
      .from('diet_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('logged_at', today)
      .order('id', { ascending: true })
    setLogs(data || [])
    setLoading(false)
  }

  function handleSearchInput(val) {
    setSearchQ(val)
    setSelected(null)
    setIsCustom(false)
    clearTimeout(searchTimeout.current)
    if (val.length < 2) { setResults([]); return }
    searchTimeout.current = setTimeout(() => searchFood(val), 500)
  }

  async function searchFood(query) {
    setSearching(true)
    try {
      const url = `/api/off/api/v2/search?search_terms=${encodeURIComponent(query)}&page_size=8&fields=product_name,nutriments&lc=es`
      const res = await fetch(url, {
        headers: {
          'Authorization': `Basic ${btoa(`${import.meta.env.VITE_OFF_USER}:${import.meta.env.VITE_OFF_PASS}`)}`,
        }
      })
      const data = await res.json()
      setResults(data.products?.filter(p => p.product_name && p.nutriments) || [])
    } catch {
      setResults([])
      showToast('⚠️ API saturada o sin conexión.')
    }
    setSearching(false)
  }

  function selectFood(product) {
    const n = product.nutriments
    setSelected({
      name: product.product_name,
      calories: n['energy-kcal_100g'] || n['energy-kcal'] || 0,
      protein_g: n['proteins_100g'] || 0,
      carbs_g: n['carbohydrates_100g'] || 0,
      fat_g: n['fat_100g'] || 0,
    })
    setResults([])
    setIsCustom(false)
  }

  function startCustom() {
    setIsCustom(true)
    setSelected({
      name: searchQ || '',
      calories: '',
      protein_g: '',
      carbs_g: '',
      fat_g: ''
    })
    setResults([])
  }

  function getAdjusted(field) {
    if (!selected) return 0
    if (isCustom) return parseFloat(selected[field] || 0).toFixed(1)
    return ((selected[field] * parseFloat(quantity || 100)) / 100).toFixed(1)
  }

  async function saveFood() {
    if (!selected || !profile?.id) return
    if (isCustom && (!selected.name || !selected.calories)) {
      showToast('⚠️ Completa nombre y calorías')
      return
    }

    setSaving(true)
    const qty = parseFloat(quantity) || 100
    
    const finalData = isCustom ? {
      user_id: profile.id,
      food_name: selected.name,
      calories: parseFloat(selected.calories || 0),
      protein_g: parseFloat(selected.protein_g || 0),
      carbs_g: parseFloat(selected.carbs_g || 0),
      fat_g: parseFloat(selected.fat_g || 0),
      quantity_g: qty,
      meal_type: mealType,
      logged_at: today,
    } : {
      user_id: profile.id,
      food_name: selected.name,
      calories: (selected.calories * qty / 100),
      protein_g: (selected.protein_g * qty / 100),
      carbs_g: (selected.carbs_g * qty / 100),
      fat_g: (selected.fat_g * qty / 100),
      quantity_g: qty,
      meal_type: mealType,
      logged_at: today,
    }

    const { error } = await supabaseAuth.from('diet_logs').insert(finalData)
    
    if (!error) {
      await fetchLogs(profile.id)
      showToast('✓ Registrado correctamente')
      closeModal()
    } else {
      showToast('❌ Error al guardar')
    }
    setSaving(false)
  }

  function closeModal() {
    setShowAdd(false)
    setSelected(null)
    setSearchQ('')
    setQuantity('100')
    setIsCustom(false)
    setResults([])
  }

  async function removeLog(id) {
    await supabaseAuth.from('diet_logs').delete().eq('id', id)
    setLogs(prev => prev.filter(l => l.id !== id))
    showToast('Eliminado')
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2200) }
  
  const handleFocus = (e) => e.target.select()
  
  const openGoogleSearch = () => {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQ || 'alimento')}+informacion+nutricional`, '_blank')
  }

  const totals = logs.reduce((acc, l) => ({
    calories: acc.calories + (l.calories || 0),
    protein_g: acc.protein_g + (l.protein_g || 0),
    carbs_g: acc.carbs_g + (l.carbs_g || 0),
    fat_g: acc.fat_g + (l.fat_g || 0),
  }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })

  const grouped = MEAL_TYPES.reduce((acc, m) => {
    acc[m.value] = logs.filter(l => l.meal_type === m.value)
    return acc
  }, {})

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <header className={styles.header}>
        <div>
          <p className={styles.pageTag}>Nutrición</p>
          <h1 className={styles.title}>Dieta</h1>
          <p className={styles.date}>{formatDate(today)}</p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowAdd(true)}>＋ Agregar</button>
      </header>

      <div className={styles.macroRow}>
        <MacroRing label="Cal" value={Math.round(totals.calories)} goal={macroGoals.calories} unit="kcal" color="var(--color-primary)" />
        <MacroRing label="Prot" value={Math.round(totals.protein_g)} goal={macroGoals.protein_g} unit="g" color="#00cfff" />
        <MacroRing label="Carbs" value={Math.round(totals.carbs_g)} goal={macroGoals.carbs_g} unit="g" color="#ffaa00" />
        <MacroRing label="Grasas" value={Math.round(totals.fat_g)} goal={macroGoals.fat_g} unit="g" color="#ff7070" />
      </div>

      {loading ? (
        <div className={styles.skeletonList}>
          {Array(3).fill(0).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      ) : (
        MEAL_TYPES.map(meal => (
          <div key={meal.value} className={styles.mealGroup}>
            <div className={styles.mealHeader}>
              <span className={styles.mealIcon}>{meal.icon}</span>
              <span className={styles.mealName}>{meal.label}</span>
              <span className={styles.mealCals}>
                {Math.round(grouped[meal.value].reduce((a, l) => a + l.calories, 0))} kcal
              </span>
            </div>
            {grouped[meal.value].length === 0 ? (
              <p className={styles.mealEmpty}>Sin registros</p>
            ) : (
              grouped[meal.value].map(log => (
                <div key={log.id} className={styles.logRow}>
                  <div className={styles.logInfo}>
                    <p className={styles.logName}>{log.food_name}</p>
                    <p className={styles.logMacros}>
                      {Math.round(log.calories)} kcal · {Math.round(log.protein_g)}g prot · {log.quantity_g}g
                    </p>
                  </div>
                  <button className={styles.removeBtn} onClick={() => removeLog(log.id)}>✕</button>
                </div>
              ))
            )}
          </div>
        ))
      )}

      {showAdd && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.sheet} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <h2 className={styles.sheetTitle}>{isCustom ? 'Nuevo Registro' : 'Agregar Alimento'}</h2>

            {!selected && !isCustom && (
              <>
                <label className={styles.sheetLabel}>Buscar alimento</label>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Ej: arroz, pollo, avena..."
                  value={searchQ}
                  onChange={e => handleSearchInput(e.target.value)}
                  autoFocus
                />

                {searching && <p className={styles.searching}>Buscando en base de datos...</p>}

                {results.length > 0 && (
                  <div className={styles.resultsList}>
                    {results.map((p, i) => (
                      <button key={i} className={styles.resultItem} onClick={() => selectFood(p)}>
                        <p className={styles.resultName}>{p.product_name}</p>
                        <p className={styles.resultMacro}>
                          {Math.round(p.nutriments?.['energy-kcal_100g'] || 0)} kcal/100g
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                <div className={styles.noResults}>
                  <p>{results.length > 0 ? '¿No es lo que buscas?' : '¿No encuentras el alimento?'}</p>
                  <div className={styles.noResultsBtns}>
                    <button onClick={startCustom} className={styles.manualBtn}>✍️ Crear manual</button>
                    <button onClick={openGoogleSearch} className={styles.googleBtn}>🔍 Ver en Google</button>
                  </div>
                </div>
              </>
            )}

            {selected && (
              <div className={styles.selectedCard}>
                {isCustom ? (
                  <div className={styles.customFields}>
                    <label className={styles.sheetLabel}>Nombre del alimento</label>
                    <input type="text" className={styles.searchInput} value={selected.name} 
                      onChange={e => setSelected({...selected, name: e.target.value})} />
                    
                    <div className={styles.mealTypeGrid} style={{ gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '0px' }}>
                      <div>
                        <label className={styles.sheetLabel}>Calorías Totales</label>
                        <input type="number" className={styles.searchInput} value={selected.calories} onFocus={handleFocus} 
                          onChange={e => setSelected({...selected, calories: e.target.value})} inputMode="decimal" />
                      </div>
                      <div>
                        <label className={styles.sheetLabel}>Proteína (g)</label>
                        <input type="number" className={styles.searchInput} value={selected.protein_g} onFocus={handleFocus}
                          onChange={e => setSelected({...selected, protein_g: e.target.value})} inputMode="decimal" />
                      </div>
                    </div>
                    
                    <div className={styles.mealTypeGrid} style={{ gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label className={styles.sheetLabel}>Carbs (g)</label>
                        <input type="number" className={styles.searchInput} value={selected.carbs_g} onFocus={handleFocus}
                          onChange={e => setSelected({...selected, carbs_g: e.target.value})} inputMode="decimal" />
                      </div>
                      <div>
                        <label className={styles.sheetLabel}>Grasas (g)</label>
                        <input type="number" className={styles.searchInput} value={selected.fat_g} onFocus={handleFocus}
                          onChange={e => setSelected({...selected, fat_g: e.target.value})} inputMode="decimal" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <p className={styles.selectedName} style={{ margin: 0 }}>{selected.name}</p>
                      <button className={styles.removeBtn} style={{ padding: 0 }} onClick={() => setSelected(null)}>Cambiar</button>
                    </div>
                    <div className={styles.selectedMacros}>
                      <span>🔥 {getAdjusted('calories')} kcal</span>
                      <span>💪 {getAdjusted('protein_g')}g prot</span>
                      <span>🌾 {getAdjusted('carbs_g')}g carbs</span>
                      <span>🫒 {getAdjusted('fat_g')}g grasas</span>
                    </div>
                    <label className={styles.sheetLabel} style={{ marginTop: '1.25rem' }}>Cantidad (g)</label>
                    <input type="number" className={styles.searchInput} value={quantity} onFocus={handleFocus}
                      onChange={e => setQuantity(e.target.value)} inputMode="decimal" />
                  </>
                )}

                <label className={styles.sheetLabel} style={{ marginTop: '0.5rem' }}>Tipo de comida</label>
                <div className={styles.mealTypeGrid}>
                  {MEAL_TYPES.map(m => (
                    <button key={m.value} type="button"
                      className={`${styles.mealTypeBtn} ${mealType === m.value ? styles.mealTypeBtnActive : ''}`}
                      onClick={() => setMealType(m.value)}
                    >
                      <span>{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button className={styles.saveBtn} onClick={saveFood} disabled={(isCustom ? !selected?.name : !selected) || saving}>
              {saving ? <span className={styles.spinner} /> : 'Guardar en Dieta'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MacroRing({ label, value, goal, unit, color }) {
  const safeGoal = goal > 0 ? goal : 1 
  const pct = Math.min(value / safeGoal, 1)
  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct)

  return (
    <div className={styles.macroRing}>
      <svg width="70" height="70" viewBox="0 0 70 70">
        <circle cx="35" cy="35" r={r} fill="none" stroke="var(--color-border)" strokeWidth="5" />
        <circle cx="35" cy="35" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 35 35)"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className={styles.macroRingText}>
        <span className={styles.macroVal}>{value}</span>
        <span className={styles.macroUnit}>{unit}</span>
      </div>
      <span className={styles.macroLabel}>{label}</span>
    </div>
  )
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })
}