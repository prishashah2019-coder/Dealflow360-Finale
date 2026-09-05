import { useEffect, useState } from 'react'
import DataTable from '../components/DataTable.jsx'
import { getCreditNotes } from '../api/creditNotes.js'

export default function CreditNotes() {
  const [notes, setNotes] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await getCreditNotes()
        if (!cancelled) setNotes(res.data || [])
      } catch (err) {
        if (!cancelled) {
          setError('Could not load credit notes.')
          setNotes([])
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const columns = [
    { key: 'createdAt', label: 'Date', render: (n) => new Date(n.createdAt).toLocaleDateString() },
    { key: 'customer', label: 'Customer' },
    { key: 'source', label: 'Source' },
    { key: 'amount', label: 'Amount', render: (n) => `$${n.amount.toLocaleString()}` },
    { key: 'reason', label: 'Reason' },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="titles">
          <h1>Credit Notes</h1>
          <div className="subtitle">Refunds and proration credits issued from subscription changes and cancellations.</div>
        </div>
      </div>
      {error && <div className="error-text">{error}</div>}
      <div className="card">
        {notes === null ? (
          <div className="loading-state">Loading credit notes…</div>
        ) : (
          <DataTable columns={columns} rows={notes} emptyMessage="No credit notes issued yet." />
        )}
      </div>
    </div>
  )
}
