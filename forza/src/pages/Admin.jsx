// src/pages/Admin.jsx
import { useEffect, useState } from 'react'
import { supabaseAuth } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import styles from '../assets/css/modules/Admin.module.css'

export default function Admin() {
  const navigate  = useNavigate()
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [toast,   setToast]   = useState('')

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data } = await supabaseAuth
      .from('profiles')
      .select('id, full_name, is_pro, is_admin, created_at, weight_kg, goal')
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  async function togglePro(userId, currentValue) {
    const { error } = await supabaseAuth
      .from('profiles')
      .update({ is_pro: !currentValue })
      .eq('id', userId)

    if (!error) {
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, is_pro: !currentValue } : u
      ))
      showToast(currentValue ? 'Pro desactivado' : '✓ Pro activado')
    }
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  async function handleLogout() {
    await supabaseAuth.auth.signOut()
    navigate('/')
  }

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.id.includes(search)
  )

  return (
    <div className={styles.page}>

      {/* Toast */}
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Header */}
      <header className={styles.header}>
        <div>
          <p className={styles.adminTag}>Admin Panel</p>
          <h1 className={styles.title}>FORZA</h1>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout}>Salir</button>
      </header>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{users.length}</span>
          <span className={styles.statLabel}>Total usuarios</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum} style={{ color: 'var(--color-primary)' }}>
            {users.filter(u => u.is_pro).length}
          </span>
          <span className={styles.statLabel}>Usuarios Pro</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum} style={{ color: '#ff7070' }}>
            {users.filter(u => !u.is_pro).length}
          </span>
          <span className={styles.statLabel}>Sin Pro</span>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchWrap}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Buscar por nombre o ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Users list */}
      {loading ? (
        <div className={styles.loadingText}>Cargando usuarios...</div>
      ) : (
        <div className={styles.userList}>
          {filtered.map(user => (
            <div key={user.id} className={styles.userCard}>
              <div className={styles.userInfo}>
                <div className={styles.avatar}>
                  {user.full_name ? user.full_name[0].toUpperCase() : '?'}
                </div>
                <div>
                  <p className={styles.userName}>{user.full_name || 'Sin nombre'}</p>
                  <p className={styles.userId}>{user.id.slice(0, 16)}...</p>
                  <p className={styles.userMeta}>
                    {user.goal ? GOAL_LABELS[user.goal] : '—'} · {user.weight_kg ? `${user.weight_kg}kg` : '—'}
                  </p>
                </div>
              </div>
              <div className={styles.userActions}>
                {user.is_admin && <span className={styles.adminBadge}>Admin</span>}
                <button
                  className={`${styles.proToggle} ${user.is_pro ? styles.proActive : ''}`}
                  onClick={() => togglePro(user.id, user.is_pro)}
                >
                  {user.is_pro ? 'Pro ✓' : 'Activar Pro'}
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className={styles.emptyText}>No se encontraron usuarios.</p>
          )}
        </div>
      )}
    </div>
  )
}

const GOAL_LABELS = {
  muscle:   'Ganar masa',
  fat_loss: 'Perder grasa',
  maintain: 'Mantener',
}