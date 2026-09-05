import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../components/DataTable.jsx'
import Badge from '../components/Badge.jsx'
import StatCard from '../components/StatCard.jsx'
import { getInvoices } from '../api/invoices.js'
import { mockInvoices } from '../mockData.js'

export default function InvoicesList() {
  const [invoices, setInvoices] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await getInvoices()
        const mapped = (res.data || []).map((inv, index) => ({
          _id: inv._id,
          number: inv.number || `Invoice ${index + 1}`,
          customer: inv.customerId?.name || inv.customer,
          amount: inv.amount,
          status: inv.status,
          dueDate: inv.dueDate,
        }))
        if (mapped.length === 0) throw new Error('empty invoices from API, use mock')
        if (!cancelled) setInvoices(mapped)
      } catch (err) {
        console.warn('Falling back to mock invoices list.', err?.message)
        if (!cancelled) setInvoices(mockInvoices)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const columns = [
    { key: 'number', label: 'Invoice #' },
    { key: 'customer', label: 'Customer' },
    { key: 'amount', label: 'Amount', render: (r) => `$${r.amount.toLocaleString()}` },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status}>{r.status}</Badge> },
    { key: 'dueDate', label: 'Due Date', render: (r) => r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—' },
  ]

  const paidCount = invoices.filter((invoice) => invoice.status?.toLowerCase() === 'paid').length
  const unpaidCount = invoices.filter((invoice) => ['unpaid', 'sent', 'partially paid', 'overdue'].includes(invoice.status?.toLowerCase())).length

  return (
    <div>
      <div className="page-header">
        <div className="titles">
          <h1>Invoices</h1>
          <div className="subtitle">One-time and recurring billing across all customers.</div>
        </div>
      </div>

      <div className="stat-grid invoice-status-grid">
        <StatCard label="Paid" value={paidCount} accent="green" icon="fa-solid fa-circle-check" sub="Paid invoices" />
        <StatCard label="Unpaid" value={unpaidCount} accent="red" icon="fa-solid fa-circle-exclamation" sub="Outstanding invoices" />
      </div>

      <div className="card">
        <div className="card-title-row">
          <div><h3>Invoice List</h3><span className="card-subtitle">Click an invoice to open payment and reconciliation detail.</span></div>
        </div>
        <DataTable columns={columns} rows={invoices} onRowClick={(r) => navigate(`/invoices/${r._id}`)} />
      </div>
    </div>
  )
}
