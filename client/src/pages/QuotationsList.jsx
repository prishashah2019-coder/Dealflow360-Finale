import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Kanban from '../components/Kanban.jsx'
import DataTable from '../components/DataTable.jsx'
import Badge from '../components/Badge.jsx'
import { getQuotations, createQuotation } from '../api/quotations.js'
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

  const handleNewQuotation = async () => {
    try {
      const res = await createQuotation({ status: 'Draft', lines: [] })
      navigate(`/quotations/${res.data._id}`)
    } catch (err) {
      console.warn('Create quotation API unavailable, opening a demo draft.', err?.message)
      navigate('/quotations/new')
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
          <button className="btn btn-primary" onClick={handleNewQuotation}>+ New Quotation</button>
          <button className="btn btn-secondary" onClick={() => setView(view === 'kanban' ? 'table' : 'kanban')}>
            Switch to {view === 'kanban' ? 'Table' : 'Kanban'} View
          </button>
        </div>
      </div>

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
