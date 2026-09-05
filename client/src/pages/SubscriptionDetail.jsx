import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DataTable from '../components/DataTable.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getSubscription, modifySubscription, cancelSubscription } from '../api/subscriptions.js'
import { mockSubscriptionDetail } from '../mockData.js'

export default function SubscriptionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  // Finance "reconciles recurring billing" - modifying/cancelling a live
  // subscription (with its proration/refund side effects) is Finance/Admin only.
  const canManage = user?.role === 'finance' || user?.role === 'admin'
  const [detail, setDetail] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const [modifyForm, setModifyForm] = useState({ nextBillingDate: '', prorationAmount: '', reason: '' })
  const [cancelForm, setCancelForm] = useState({ refundAmount: '', reason: '' })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await getSubscription(id)
        if (!cancelled) setDetail(res.data)
      } catch (err) {
        console.warn('Falling back to mock billing detail.', err?.message)
        if (!cancelled) setDetail({ ...mockSubscriptionDetail, _id: id })
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (!detail) return <div className="loading-state">Loading billing detail…</div>

  const handleModify = async () => {
    setBusy(true)
    setMsg('')
    try {
      await modifySubscription(id, {
        nextBillingDate: modifyForm.nextBillingDate || undefined,
        prorationAmount: modifyForm.prorationAmount ? Number(modifyForm.prorationAmount) : undefined,
        reason: modifyForm.reason || undefined,
      })
      setMsg('Subscription updated.')
    } catch (err) {
      setMsg(err?.response?.data?.error || 'Could not modify this subscription.')
    } finally {
      setBusy(false)
    }
  }

  const handleCancel = async () => {
    setBusy(true)
    setMsg('')
    try {
      await cancelSubscription(id, {
        refundAmount: cancelForm.refundAmount ? Number(cancelForm.refundAmount) : undefined,
        reason: cancelForm.reason || undefined,
      })
      navigate('/subscriptions')
    } catch (err) {
      // Only leave the page on real success.
      setMsg(err?.response?.data?.error || 'Could not cancel this subscription.')
    } finally {
      setBusy(false)
    }
  }

  const oneTimeColumns = [
    { key: 'product', label: 'Product' },
    { key: 'qty', label: 'Qty' },
    { key: 'price', label: 'Price', render: (r) => `$${r.price.toLocaleString()}` },
    { key: 'amount', label: 'Amount', render: (r) => `$${r.amount.toLocaleString()}` },
  ]

  const recurringColumns = [
    { key: 'plan', label: 'Plan' },
    { key: 'cycle', label: 'Cycle' },
    { key: 'nextBilling', label: 'Next Billing', render: (r) => r.nextBilling ? new Date(r.nextBilling).toLocaleDateString() : '—' },
    { key: 'amount', label: 'Amount', render: (r) => `$${r.amount.toLocaleString()}` },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="titles">
          <h1>Billing — {detail.customer || detail.customerId?.name || 'Customer'}</h1>
        </div>
      </div>

      {msg && <div className="error-text">{msg}</div>}

      <div className="card">
        <div className="card-title-row">
          <h3>One Time Lines</h3>
        </div>
        <DataTable columns={oneTimeColumns} rows={detail.oneTimeLines || []} emptyMessage="No one-time lines." />
      </div>

      <div className="card">
        <div className="card-title-row">
          <h3>Recurring Lines</h3>
        </div>
        <DataTable columns={recurringColumns} rows={detail.recurringLines || []} emptyMessage="No recurring lines." />
      </div>

      {canManage ? (
        <>
          <div className="card">
            <div className="card-title-row"><h3>Modify Subscription</h3></div>
            <div className="form-row">
              <div className="form-field">
                <label>New Next Billing Date</label>
                <input type="date" value={modifyForm.nextBillingDate} onChange={(e) => setModifyForm((f) => ({ ...f, nextBillingDate: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>Proration Credit ($)</label>
                <input type="number" value={modifyForm.prorationAmount} onChange={(e) => setModifyForm((f) => ({ ...f, prorationAmount: e.target.value }))} placeholder="e.g. 15" />
              </div>
              <div className="form-field">
                <label>Reason</label>
                <input value={modifyForm.reason} onChange={(e) => setModifyForm((f) => ({ ...f, reason: e.target.value }))} placeholder="e.g. mid-cycle plan downgrade" />
              </div>
            </div>
            <button className="btn btn-secondary" disabled={busy} onClick={handleModify}>Modify Subscription</button>
          </div>

          <div className="card">
            <div className="card-title-row"><h3>Cancel Subscription</h3></div>
            <div className="form-row">
              <div className="form-field">
                <label>Refund Amount ($, optional)</label>
                <input type="number" value={cancelForm.refundAmount} onChange={(e) => setCancelForm((f) => ({ ...f, refundAmount: e.target.value }))} placeholder="e.g. 25" />
              </div>
              <div className="form-field">
                <label>Reason</label>
                <input value={cancelForm.reason} onChange={(e) => setCancelForm((f) => ({ ...f, reason: e.target.value }))} placeholder="e.g. customer requested cancellation" />
              </div>
            </div>
            <button className="btn btn-danger" disabled={busy} onClick={handleCancel}>Cancel Subscription</button>
          </div>
        </>
      ) : (
        <div className="note-banner">Only Finance/Admin can modify or cancel a subscription.</div>
      )}
    </div>
  )
}
