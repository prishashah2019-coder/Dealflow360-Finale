import { useEffect, useState } from 'react'
import DataTable from '../components/DataTable.jsx'
import { getAuditLog } from '../api/auditLog.js'

export default function AuditLog() {
  const [logs, setLogs] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await getAuditLog()
        if (!cancelled) setLogs(res.data || [])
      } catch (err) {
        if (!cancelled) {
          setError('Could not load the audit log.')
          setLogs([])
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const columns = [
    { key: 'timestamp', label: 'When', render: (l) => new Date(l.timestamp).toLocaleString() },
    { key: 'user', label: 'User' },
    { key: 'role', label: 'Role' },
    { key: 'entityType', label: 'Entity' },
    { key: 'action', label: 'Action', render: (l) => l.action.replace(/_/g, ' ') },
    { key: 'reason', label: 'Note' },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="titles">
          <h1>Audit Log</h1>
          <div className="subtitle">Every approval decision, edit, nudge, and escalation across the platform - who, when, and why.</div>
        </div>
      </div>
      {error && <div className="error-text">{error}</div>}
      <div className="card">
        {logs === null ? (
          <div className="loading-state">Loading audit log…</div>
        ) : (
          <DataTable columns={columns} rows={logs} emptyMessage="No activity logged yet." />
        )}
      </div>
    </div>
  )
}
