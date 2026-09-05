import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import DataTable from '../components/DataTable.jsx'
import StepTracker from '../components/StepTracker.jsx'
import Badge from '../components/Badge.jsx'
import { getInvoice, recordPayment } from '../api/invoices.js'
import { useAuth } from '../context/AuthContext.jsx'
import { mockInvoiceDetail } from '../mockData.js'

function buildSteps(status) {
  // Order Confirmed -> Shipped -> Invoiced -> Paid
  const stageForStatus = status === 'Paid' ? 3 : status === 'Partially Paid' ? 2 : status === 'Unpaid' || status === 'Sent' ? 2 : 1
  const labels = ['Order Confirmed', 'Shipped', 'Invoiced', 'Paid']
  return labels.map((label, idx) => ({
    key: label,
    label,
    state: idx < stageForStatus ? 'done' : idx === stageForStatus ? 'current' : 'pending',
  }))
}

export default function InvoiceDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const canRecordPayment = user?.role === 'finance' || user?.role === 'admin'
  const [invoice, setInvoice] = useState(null)
  const [payments, setPayments] = useState([])
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('card')
  const [busy, setBusy] = useState(false)
  const [payMsg, setPayMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // Backend returns { invoice, payments } - the invoice fields aren't
        // top-level on the response.
        const res = await getInvoice(id)
        if (!cancelled) {
          setInvoice(res.data.invoice)
          setPayments(res.data.payments || [])
        }
      } catch (err) {
        console.warn('Falling back to mock invoice detail.', err?.message)
        if (!cancelled) setInvoice({ ...mockInvoiceDetail, _id: id })
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (!invoice) return <div className="loading-state">Loading invoice…</div>

  const invoiceLabel = invoice.number && invoice.number !== invoice._id ? invoice.number : 'Invoice'

  const handleRecordPayment = async () => {
    setBusy(true)
    setPayMsg('')
    try {
      // Only merge the status back in - res.data.invoice here is the bare
      // Invoice document (no product-name decoration), and re-fetching the
      // fully decorated shape isn't worth a second round trip for a status flip.
      const res = await recordPayment(id, { amount: Number(amount) || invoice.amount, method })
      setInvoice((inv) => ({ ...inv, status: res.data.invoice.status }))
      setPayments((prev) => [...prev, res.data.payment])
    } catch (err) {
      // Don't pretend it worked on failure - that previously marked the
      // invoice "Paid" even when the request was rejected (e.g. wrong role).
      setPayMsg(err?.response?.data?.error || 'Could not record this payment.')
    } finally {
      setBusy(false)
    }
  }

  const handleDownloadSummary = () => {
    window.print()
  }

  const lineColumns = [
    { key: 'product', label: 'Product' },
    { key: 'amount', label: 'Amount', render: (r) => `$${r.amount.toLocaleString()}` },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="titles">
          <h1>{invoiceLabel} — {invoice.customer || invoice.customerId?.name || 'Customer'}</h1>
          <div className="subtitle"><Badge status={invoice.status}>{invoice.status}</Badge> Due {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={handleDownloadSummary}>Download Summary</button>
        </div>
      </div>

      <div className="card">
        <StepTracker steps={buildSteps(invoice.status)} />
      </div>

      <div className="card">
        <div className="card-title-row">
          <h3>Invoice Lines</h3>
        </div>
        <DataTable columns={lineColumns} rows={invoice.lines || []} emptyMessage="No lines on this invoice." />
      </div>

      {invoice.status !== 'Paid' && canRecordPayment && (
        <div className="card">
          <div className="card-title-row">
            <h3>Record Payment</h3>
          </div>
          {payMsg && <div className="error-text">{payMsg}</div>}
          <div className="form-row">
            <div className="form-field">
              <label>Amount</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(invoice.amount)} />
            </div>
            <div className="form-field">
              <label>Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="check">Check</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary" disabled={busy} onClick={handleRecordPayment}>Record Payment</button>
        </div>
      )}
      {invoice.status !== 'Paid' && !canRecordPayment && (
        <div className="note-banner">Only Finance/Admin can record a payment against this invoice.</div>
      )}
    </div>
  )
}
