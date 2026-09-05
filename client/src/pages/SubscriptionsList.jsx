import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../components/DataTable.jsx'
import Badge from '../components/Badge.jsx'
import StatCard from '../components/StatCard.jsx'
import { getSubscriptions } from '../api/subscriptions.js'
import { createSubscriptionPlan } from '../api/products.js'
import { useAuth } from '../context/AuthContext.jsx'
import { mockSubscriptions } from '../mockData.js'

export default function SubscriptionsList() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [subs, setSubs] = useState([])
  const [showNewPlan, setShowNewPlan] = useState(false)
  const [newPlan, setNewPlan] = useState({ name: '', billingCycle: 'monthly' })
  const [savingPlan, setSavingPlan] = useState(false)
  const [planMsg, setPlanMsg] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await getSubscriptions()
        const mapped = (res.data || []).map((s) => ({
          _id: s._id,
          customer: s.customerId?.name || s.customer,
          plan: s.planId?.name || s.plan,
          cycle: s.planId?.billingCycle || s.cycle,
          nextBill: s.nextBillingDate || s.nextBill,
          status: s.status,
        }))
        if (!cancelled) setSubs(mapped)
      } catch (err) {
        console.warn('Falling back to mock subscriptions list.', err?.message)
        if (!cancelled) setSubs(mockSubscriptions)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleCreatePlan = async (e) => {
    e.preventDefault()
    setSavingPlan(true)
    setPlanMsg('')
    try {
      await createSubscriptionPlan(newPlan)
      setPlanMsg(`Plan "${newPlan.name}" created - it's now selectable when building a quotation.`)
      setNewPlan({ name: '', billingCycle: 'monthly' })
    } catch (err) {
      setPlanMsg(err?.response?.data?.error || 'Could not create plan - check the API server.')
    } finally {
      setSavingPlan(false)
    }
  }

  const columns = [
    { key: 'customer', label: 'Customer' },
    { key: 'plan', label: 'Plan' },
    { key: 'cycle', label: 'Cycle' },
    { key: 'nextBill', label: 'Next Bill', render: (r) => r.nextBill ? new Date(r.nextBill).toLocaleDateString() : '—' },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status}>{r.status}</Badge> },
  ]

  const activeCount = subs.filter((subscription) => subscription.status?.toLowerCase() === 'active').length
  const pausedCount = subs.filter((subscription) => subscription.status?.toLowerCase() === 'paused').length
  const cancelledCount = subs.filter((subscription) => ['cancelled', 'canceled'].includes(subscription.status?.toLowerCase())).length

  return (
    <div>
      <div className="page-header">
        <div className="titles">
          <h1>Subscriptions</h1>
          <div className="subtitle">Recurring plans across all customers.</div>
        </div>
        {isAdmin && (
          <div className="page-actions">
            <button className="btn btn-primary" onClick={() => setShowNewPlan((v) => !v)}>
              {showNewPlan ? 'Cancel' : '+ New Plan'}
            </button>
          </div>
        )}
      </div>

      {isAdmin && showNewPlan && (
        <div className="card">
          <div className="card-title-row"><h3>New Subscription Plan</h3></div>
          <form onSubmit={handleCreatePlan}>
            <div className="form-row">
              <div className="form-field">
                <label>Plan Name</label>
                <input value={newPlan.name} onChange={(e) => setNewPlan((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Priority Support" required />
              </div>
              <div className="form-field">
                <label>Billing Cycle</label>
                <select value={newPlan.billingCycle} onChange={(e) => setNewPlan((p) => ({ ...p, billingCycle: e.target.value }))}>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
            {planMsg && <div className="note-banner note-banner-success" style={{ marginBottom: 14 }}>{planMsg}</div>}
            <button className="btn btn-primary" type="submit" disabled={savingPlan}>{savingPlan ? 'Saving…' : 'Create Plan'}</button>
          </form>
        </div>
      )}

      <div className="stat-grid subscription-status-grid">
        <StatCard label="Active" value={activeCount} accent="green" icon="fa-solid fa-circle-check" sub="Live subscriptions" />
        <StatCard label="Paused" value={pausedCount} accent="amber" icon="fa-solid fa-circle-pause" sub="Temporarily paused" />
        <StatCard label="Canceled" value={cancelledCount} accent="red" icon="fa-solid fa-circle-xmark" sub="Ended subscriptions" />
      </div>

      <div className="card">
        <div className="card-title-row">
          <div><h3>Subscription List</h3><span className="card-subtitle">Click any subscription to open its billing detail.</span></div>
        </div>
        <DataTable columns={columns} rows={subs} onRowClick={(r) => navigate(`/subscriptions/${r._id}`)} />
      </div>
    </div>
  )
}
