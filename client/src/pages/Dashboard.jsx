import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StatCard from '../components/StatCard.jsx'
import { getQuotations } from '../api/quotations.js'
import { getDealHealth } from '../api/dealHealth.js'
import { mockQuotations, mockDealHealth, mockActivity } from '../mockData.js'
import { useAuth } from '../context/AuthContext.jsx'

function quotationTotal(quotation) {
  if (quotation.amount != null) return Number(quotation.amount) || 0
  return (quotation.lines || []).reduce((sum, line) => {
    const quantity = Number(line.quantity) || 0
    const unitPrice = Number(line.unitPrice) || 0
    const discount = (Number(line.discountPct) || 0) / 100
    return sum + quantity * unitPrice * (1 - discount)
  }, 0)
}

function formatRevenue(amount) {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `$${Math.round(amount / 1000)}K`
  return `$${Math.round(amount).toLocaleString()}`
}

function getIstGreeting() {
  const hour = Number(new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(new Date()))

  if (hour < 5) return 'GOOD NIGHT,'
  if (hour < 12) return 'GOOD MORNING,'
  if (hour < 17) return 'GOOD AFTERNOON,'
  if (hour < 21) return 'GOOD EVENING,'
  return 'GOOD NIGHT,'
}

export default function Dashboard() {
  const [quotations, setQuotations] = useState([])
  const [alertCount, setAlertCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    let cancelled = false

    async function load() {
      let quotes = mockQuotations
      let alerts = mockDealHealth.length

      try {
        const res = await getQuotations()
        quotes = res.data
      } catch (err) {
        console.warn('Falling back to mock quotations on dashboard.', err?.message)
      }

      try {
        const res = await getDealHealth()
        alerts = Array.isArray(res.data) ? res.data.length : alerts
      } catch (err) {
        console.warn('Falling back to mock deal health count on dashboard.', err?.message)
      }

      if (!cancelled) {
        setQuotations(quotes)
        setAlertCount(alerts)
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const pendingApprovals = quotations.filter((q) => q.status === 'Pending Approval').length
  const openQuotations = quotations.filter((q) => ['Draft', 'Pending Approval', 'Under Negotiation'].includes(q.status)).length
  const totalRevenue = quotations.reduce((sum, quotation) => sum + quotationTotal(quotation), 0)
  const pipelineStatuses = ['Draft', 'Pending Approval', 'Approved', 'Under Negotiation', 'Confirmed']

  return (
    <div>
      <div className="page-header dashboard-welcome">
        <div className="titles">
          <span className="eyebrow">{getIstGreeting()}</span>
          <h1>{user?.name || 'Alex Admin'} <span className="welcome-wave">👋</span></h1>
          <div className="subtitle">Here’s what’s happening across your sales pipeline today.</div>
        </div>
        <div className="dashboard-quote">“Smarter deals.<br />Stronger relationships.”</div>
        <div className="dashboard-date"><i className="fa-regular fa-calendar" /> <span>Friday<strong>Sep 5, 2026</strong></span></div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('/quotations')}>+ New Quotation</button>
          <button className="btn btn-secondary" onClick={() => navigate('/approvals')}>View Approvals</button>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="Pending Approvals" value={loading ? '…' : pendingApprovals} accent="amber" icon="fa-solid fa-file-lines" sub="View approval queue" onClick={() => navigate('/approvals')} />
        <StatCard label="Open Quotations" value={loading ? '…' : openQuotations} accent="green" icon="fa-solid fa-file-invoice" sub="View active quotations" onClick={() => navigate('/quotations')} />
        <StatCard label="At-Risk Deals" value={loading ? '…' : alertCount} accent="red" icon="fa-solid fa-triangle-exclamation" sub="View deal health" onClick={() => navigate('/deal-health')} />
        <StatCard label="Total Revenue" value={loading ? '…' : formatRevenue(totalRevenue)} accent="blue" icon="fa-solid fa-chart-column" sub="View net revenue report" onClick={() => navigate('/reports?metric=revenue')} />
      </div>

      <div className="dashboard-grid">
      <div className="card activity-card">
        <div className="card-title-row">
          <div><h3>Recent Activity</h3><span className="card-subtitle">Latest updates from your team</span></div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/deal-health')}>View All Activity <span>›</span></button>
        </div>
        <ul className="activity-feed">
          {mockActivity.map((item, idx) => (
            <li key={idx}>
              <button className="activity-item-action" type="button" onClick={() => navigate(item.to)}>
              {item.text}
              <span className="activity-time">{new Date(item.time).toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="card pipeline-card">
        <div className="card-title-row"><div><h3>Quotation Pipeline</h3><span className="card-subtitle">Deals across all stages</span></div><button className="btn btn-secondary btn-sm" onClick={() => navigate('/quotations')}>View All</button></div>
        <div className="pipeline-list">
          {pipelineStatuses.map((status) => {
            const count = quotations.filter((quotation) => quotation.status === status).length
            return <div className="pipeline-row" key={status}><span>{status}</span><div className="pipeline-track"><i style={{ width: `${Math.max(count * 24, 10)}%` }} /></div><strong>{count}</strong></div>
          })}
        </div>
      </div>
      <div className="card quick-actions-card">
        <div className="card-title-row"><div><h3>Quick Actions</h3><span className="card-subtitle">Jump to what you need</span></div></div>
        <button className="quick-action primary" onClick={() => navigate('/quotations')}><i className="fa-solid fa-plus" /> New Quotation <span>→</span></button>
        <button className="quick-action" onClick={() => navigate('/approvals')}><i className="fa-solid fa-users" /> Manage Approvals <span>→</span></button>
        <button className="quick-action" onClick={() => navigate('/fulfillment')}><i className="fa-solid fa-cube" /> View Fulfillment <span>→</span></button>
        <button className="quick-action" onClick={() => navigate('/reports')}><i className="fa-solid fa-chart-column" /> View Reports <span>→</span></button>
      </div>
      </div>
    </div>
  )
}
