// src/components/SyncStatus.jsx
import { useOfflineSync } from '../hooks/useOfflineSync'

export default function SyncStatus({ tabla }) {
  const { isOnline, isSyncing, pendientes, sync } = useOfflineSync(tabla)

  return (
    <div className="sync-status">
      <span className={`sync-dot ${isOnline ? 'online' : 'offline'}`} />

      <span className="sync-label">
        {isSyncing
          ? 'Sincronizando...'
          : isOnline
            ? 'En línea'
            : 'Sin conexión'}
      </span>

      {pendientes > 0 && (
        <span className="sync-badge">{pendientes}</span>
      )}

      {isOnline && !isSyncing && pendientes > 0 && (
        <button className="sync-btn" onClick={sync}>↑ Subir</button>
      )}
    </div>
  )
}