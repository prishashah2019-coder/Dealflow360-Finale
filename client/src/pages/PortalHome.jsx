import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../components/DataTable.jsx'
import Badge from '../components/Badge.jsx'
import { listPortalQuotations } from '../api/portal.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function PortalHome() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [quotations, setQuotations] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await listPortalQuotations()
        if (!cancelled) setQuotations(res.data || [])
      } catch (err) {
        if (!cancelled) {
          setError('Could not load your quotations. Please try again shortly.')
          setQuotations([])
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const columns = [
    { key: '_id', label: 'Quotation', render: (q) => `#${String(q._id).slice(-6).toUpperCase()}` },
    { key: 'total', label: 'Total', render: (q) => `$${(q.total || 0).toLocaleString()}` },
    { key: 'lineCount', label: 'Items' },
    { key: 'status', label: 'Status', render: (q) => <Badge status={q.status}>{q.status}</Badge> },
    { key: 'updatedAt', label: 'Last Updated', render: (q) => new Date(q.updatedAt).toLocaleDateString() },
  ]

  return (
    <div className="app-shell">
      <header className="top-nav">
        <span className="brand">DealFlow360 — Customer Portal</span>
        <div className="nav-right" style={{ marginLeft: 'auto' }}>
          {user && <span>{user.name || user.email}</span>}
          <button className="logout-btn" onClick={handleLogout}>Log Out</button>
        </div>
      </header>

      <main className="page">
        <div className="page-header">
          <div className="titles">
            <h1>My Quotations</h1>
            <div className="subtitle">Every quotation we've sent you - open one to view details, ask a question, or negotiate.</div>
          </div>
        </div>

        {error && <div className="error-text">{error}</div>}

        <div className="card">
          {quotations === null ? (
            <div className="loading-state">Loading your quotations…</div>
          ) : (
            <DataTable
              columns={columns}
              rows={quotations}
              onRowClick={(q) => navigate(`/portal/quotations/${q._id}`)}
              emptyMessage="You don't have any quotations yet - your sales rep will send one here once it's ready."
            />
          )}
        </div>
      </main>
    </div>
  )
}
