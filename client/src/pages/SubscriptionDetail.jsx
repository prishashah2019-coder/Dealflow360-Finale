import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DataTable from '../components/DataTable.jsx'
import { getSubscription, modifySubscription, cancelSubscription } from '../api/subscriptions.js'
import { mockSubscriptionDetail } from '../mockData.js'

export default function SubscriptionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState(null)
  const [busy, setBusy] = useState(false)

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
    try {
      await modifySubscription(id, {})
    } catch (err) {
      console.warn('Modify-subscription API unavailable (demo mode).', err?.message)
    } finally {
      setBusy(false)
    }
  }

  const handleCancel = async () => {
    setBusy(true)
    try {
      await cancelSubscription(id)
      navigate('/subscriptions')
    } catch (err) {
      console.warn('Cancel-subscription API unavailable (demo mode).', err?.message)
      navigate('/subscriptions')
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
        <div className="page-actions">
          <button className="btn btn-secondary" disabled={busy} onClick={handleModify}>Modify Subscription</button>
          <button className="btn btn-danger" disabled={busy} onClick={handleCancel}>Cancel Subscription</button>
        </div>
      </div>

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
    </div>
  )
}
