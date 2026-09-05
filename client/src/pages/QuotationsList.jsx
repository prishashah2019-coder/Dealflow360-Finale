import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Kanban from '../components/Kanban.jsx'
import DataTable from '../components/DataTable.jsx'
import Badge from '../components/Badge.jsx'
import { getQuotations, createQuotation } from '../api/quotations.js'
import { getCustomers } from '../api/customers.js'
import { mockQuotations } from '../mockData.js'

const COLUMNS = [
  { key: 'Draft', label: 'Draft' },
  { key: 'Pending Approval', label: 'Pending Approval' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Under Negotiation', label: 'Negotiation' },
  { key: 'Confirmed', label: 'Confirmed' },
]

function fmtAmount(q) {
  const amount = q.amount ?? (q.lines || []).reduce((sum, l) => sum + l.quantity * l.unitPrice * (1 - (l.discountPct || 0) / 100), 0)
  return `$${Math.round(amount).toLocaleString()}`
}

export default function QuotationsList() {
  const [quotations, setQuotations] = useState([])
  const [view, setView] = useState('kanban') // 'kanban' | 'table'
  const [customers, setCustomers] = useState([])
  const [showPicker, setShowPicker] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await getQuotations()
        if (!cancelled) setQuotations(res.data)
      } catch (err) {
        console.warn('Falling back to mock quotations list.', err?.message)
        if (!cancelled) setQuotations(mockQuotations)
      }
      try {
        const res = await getCustomers()
        if (!cancelled) setCustomers(res.data || [])
      } catch (err) {
        console.warn('Could not load customers for the new-quotation picker.', err?.message)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const cardsByColumn = useMemo(() => {
    const byCol = {}
    COLUMNS.forEach((c) => { byCol[c.key] = [] })
    quotations.forEach((q) => {
      const col = byCol[q.status] ? q.status : 'Draft'
      byCol[col].push({
        id: q._id,
        title: `${q.customerId?.name || q.customer || 'Unknown Customer'} — ${fmtAmount(q)}`,
        meta: q.salesRepId?.name ? `Rep: ${q.salesRepId.name}` : '',
      })
    })
    return byCol
  }, [quotations])

  // A quotation always belongs to a customer (the schema requires it) - the
  // button previously created one with no customerId at all, which the
  // backend rejected every time, then silently bounced to a route that
  // doesn't exist. Collect the customer first.
  const handleCreate = async (e) => {
    e.preventDefault()
    if (!selectedCustomerId) return
    setCreating(true)
    setCreateErr('')
    try {
      const res = await createQuotation({ customerId: selectedCustomerId, lines: [] })
      navigate(`/quotations/${res.data._id}`)
    } catch (err) {
      setCreateErr(err?.response?.data?.error || 'Could not create a new quotation.')
    } finally {
      setCreating(false)
    }
  }

  const columns = [
    { key: 'customer', label: 'Customer', render: (r) => r.customerId?.name || r.customer || '—' },
    { key: 'amount', label: '$ Amount', render: (r) => fmtAmount(r) },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status}>{r.status}</Badge> },
    { key: 'rep', label: 'Sales Rep', render: (r) => r.salesRepId?.name || '—' },
    { key: 'updatedAt', label: 'Updated', render: (r) => r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : '—' },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="titles">
          <h1>Quotations</h1>
          <div className="subtitle">Track every deal from draft to confirmed.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowPicker((v) => !v)}>
            {showPicker ? 'Cancel' : '+ New Quotation'}
          </button>
          <button className="btn btn-secondary" onClick={() => setView(view === 'kanban' ? 'table' : 'kanban')}>
            Switch to {view === 'kanban' ? 'Table' : 'Kanban'} View
          </button>
        </div>
      </div>

      {showPicker && (
        <div className="card">
          <div className="card-title-row"><h3>New Quotation</h3></div>
          <form onSubmit={handleCreate}>
            <div className="form-field">
              <label>Customer</label>
              <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} required>
                <option value="">Select a customer…</option>
                {customers.map((c) => <option key={c._id} value={c._id}>{c.name} ({c.tier})</option>)}
              </select>
            </div>
            {createErr && <div className="error-text">{createErr}</div>}
            <button className="btn btn-primary" type="submit" disabled={creating || !selectedCustomerId}>
              {creating ? 'Creating…' : 'Create Draft Quotation'}
            </button>
          </form>
        </div>
      )}

      {view === 'kanban' ? (
        <Kanban columns={COLUMNS} cardsByColumn={cardsByColumn} onCardClick={(card) => navigate(`/quotations/${card.id}`)} />
      ) : (
        <div className="card">
          <DataTable columns={columns} rows={quotations} onRowClick={(r) => navigate(`/quotations/${r._id}`)} />
        </div>
      )}
    </div>
  )
}
