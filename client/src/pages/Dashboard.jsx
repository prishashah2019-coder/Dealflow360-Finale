import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StatCard from '../components/StatCard.jsx'
import { getQuotations } from '../api/quotations.js'
import { getDealHealth } from '../api/dealHealth.js'
import { mockQuotations, mockDealHealth, mockActivity } from '../mockData.js'

export default function Dashboard() {
  const [quotations, setQuotations] = useState([])
  const [alertCount, setAlertCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

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
  const openQuotations = quotations.filter((q) => !['Confirmed', 'Rejected'].includes(q.status)).length

  return (
    <div>
      <div className="page-header">
        <div className="titles">
          <h1>Sales Dashboard</h1>
          <div className="subtitle">Your quotation pipeline at a glance.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('/quotations')}>+ New Quotation</button>
          <button className="btn btn-secondary" onClick={() => navigate('/approvals')}>View Approvals</button>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="Pending Approvals" value={loading ? '…' : pendingApprovals} accent="amber" />
        <StatCard label="Open Quotations" value={loading ? '…' : openQuotations} accent="green" />
        <StatCard label="At-Risk Deals" value={loading ? '…' : alertCount} accent="red" />
      </div>

      <div className="card">
        <div className="card-title-row">
          <h3>Recent Activity</h3>
        </div>
        <ul className="activity-feed">
          {mockActivity.map((item, idx) => (
            <li key={idx}>
              {item.text}
              <span className="activity-time">{new Date(item.time).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
