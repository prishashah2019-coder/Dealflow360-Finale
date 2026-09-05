import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StatCard from '../components/StatCard.jsx'
import NoteBanner from '../components/NoteBanner.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getQuotations } from '../api/quotations.js'
import { getDealHealth, getNudgesForMe } from '../api/dealHealth.js'
import { getInvoices } from '../api/invoices.js'
import { getSubscriptions } from '../api/subscriptions.js'
import { getUsers } from '../api/users.js'
import { getProducts } from '../api/products.js'
import { mockQuotations } from '../mockData.js'

const ROLE_TITLES = {
  sales_rep: ['Sales Dashboard', 'Your quotation pipeline at a glance.'],
  sales_manager: ['Manager Dashboard', "Your team's pipeline, approvals, and risk signals."],
  finance: ['Finance Dashboard', 'Approvals awaiting Finance, billing, and subscriptions.'],
  admin: ['Admin Dashboard', 'Platform-wide activity, team accounts, and catalog.'],
}

function hasPendingStepFor(quotation, role) {
  return (quotation.approvals || []).some((a) => a.status === 'pending' && a.approverRole === role)
}

export default function Dashboard() {
  const { user } = useAuth()
  const role = user?.role || 'sales_rep'
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [quotations, setQuotations] = useState([])
  const [dealHealthCount, setDealHealthCount] = useState(0)
  const [extra, setExtra] = useState({}) // role-specific secondary stat
  const [nudges, setNudges] = useState([]) // cross-role: manager nudges/escalations aimed at my deals

  useEffect(() => {
    let cancelled = false
    async function load() {
      let quotes = mockQuotations
      try {
        const res = await getQuotations()
        quotes = res.data
      } catch (err) {
        console.warn('Falling back to mock quotations on dashboard.', err?.message)
      }

      try {
        const res = await getDealHealth()
        const d = res.data || {}
        setDealHealthCount((d.stalled?.length || 0) + (d.anomalies?.length || 0) + (d.slippage?.length || 0))
      } catch (err) {
        console.warn('Deal health unavailable on dashboard.', err?.message)
      }

      if (role === 'sales_rep') {
        try {
          const res = await getNudgesForMe()
          if (!cancelled) setNudges(res.data || [])
        } catch (err) {
          console.warn('Nudges unavailable on dashboard.', err?.message)
        }
      }

      if (role === 'finance') {
        try {
          const [invRes, subRes] = await Promise.all([getInvoices(), getSubscriptions()])
          const unpaid = (invRes.data || []).filter((i) => i.status !== 'Paid').length
          const active = (subRes.data || []).filter((s) => s.status === 'active').length
          if (!cancelled) setExtra({ unpaidInvoices: unpaid, activeSubscriptions: active })
        } catch (err) {
          console.warn('Finance stats unavailable on dashboard.', err?.message)
        }
      } else if (role === 'admin') {
        try {
          const [usersRes, productsRes] = await Promise.all([getUsers(), getProducts()])
          if (!cancelled) setExtra({ teamAccounts: (usersRes.data || []).length, totalProducts: (productsRes.data || []).length })
        } catch (err) {
          console.warn('Admin stats unavailable on dashboard.', err?.message)
        }
      }

      if (!cancelled) {
        setQuotations(quotes)
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [role])

  const openQuotations = quotations.filter((q) => !['Confirmed', 'Rejected'].includes(q.status)).length
  const pendingApprovalsMine = role === 'sales_rep'
    ? quotations.filter((q) => q.status === 'Pending Approval').length
    : quotations.filter((q) => hasPendingStepFor(q, role)).length

  const [title, subtitle] = ROLE_TITLES[role] || ROLE_TITLES.sales_rep

  const recent = [...quotations]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5)
    .map((q) => ({
      text: `${q.customerId?.name || q.customer || 'A customer'} — ${q.status}`,
      time: q.updatedAt,
    }))

  return (
    <div>
      <div className="page-header">
        <div className="titles">
          <h1>{title}</h1>
          <div className="subtitle">{subtitle}</div>
        </div>
        <div className="page-actions">
          {role === 'sales_rep' && (
            <>
              <button className="btn btn-primary" onClick={() => navigate('/quotations')}>+ New Quotation</button>
              <button className="btn btn-secondary" onClick={() => navigate('/approvals')}>View Approvals</button>
            </>
          )}
          {role === 'sales_manager' && (
            <>
              <button className="btn btn-primary" onClick={() => navigate('/approvals')}>View Approvals</button>
              <button className="btn btn-secondary" onClick={() => navigate('/deal-health')}>Deal Health</button>
            </>
          )}
          {role === 'finance' && (
            <>
              <button className="btn btn-primary" onClick={() => navigate('/invoices')}>View Invoices</button>
              <button className="btn btn-secondary" onClick={() => navigate('/approvals')}>View Approvals</button>
            </>
          )}
          {role === 'admin' && (
            <>
              <button className="btn btn-primary" onClick={() => navigate('/admin/discount-config')}>Manage Team &amp; Config</button>
              <button className="btn btn-secondary" onClick={() => navigate('/reports')}>View Reports</button>
            </>
          )}
        </div>
      </div>

      {role === 'sales_rep' && nudges.length > 0 && (
        <NoteBanner icon="👋">
          {nudges.map((n, i) => (
            <div key={i}>
              {n.by} {n.action === 'escalated' ? 'escalated' : 'nudged you about'} the <strong>{n.customer}</strong> deal
              {' '}({new Date(n.timestamp).toLocaleDateString()}).
            </div>
          ))}
        </NoteBanner>
      )}

      <div className="stat-grid">
        {role === 'sales_rep' && (
          <>
            <StatCard label="Pending Approvals" value={loading ? '…' : pendingApprovalsMine} accent="amber" />
            <StatCard label="Open Quotations" value={loading ? '…' : openQuotations} accent="green" />
            <StatCard label="At-Risk Deals" value={loading ? '…' : dealHealthCount} accent="red" />
          </>
        )}
        {role === 'sales_manager' && (
          <>
            <StatCard label="Awaiting My Approval" value={loading ? '…' : pendingApprovalsMine} accent="amber" />
            <StatCard label="Team Open Quotations" value={loading ? '…' : openQuotations} accent="green" />
            <StatCard label="At-Risk Deals" value={loading ? '…' : dealHealthCount} accent="red" />
          </>
        )}
        {role === 'finance' && (
          <>
            <StatCard label="Awaiting My Approval" value={loading ? '…' : pendingApprovalsMine} accent="amber" />
            <StatCard label="Unpaid Invoices" value={loading ? '…' : (extra.unpaidInvoices ?? '—')} accent="red" />
            <StatCard label="Active Subscriptions" value={loading ? '…' : (extra.activeSubscriptions ?? '—')} accent="green" />
          </>
        )}
        {role === 'admin' && (
          <>
            <StatCard label="Platform Quotations" value={loading ? '…' : quotations.length} accent="green" />
            <StatCard label="Team Accounts" value={loading ? '…' : (extra.teamAccounts ?? '—')} />
            <StatCard label="Total Products" value={loading ? '…' : (extra.totalProducts ?? '—')} />
          </>
        )}
      </div>

      <div className="card">
        <div className="card-title-row">
          <h3>Recent Activity</h3>
        </div>
        <ul className="activity-feed">
          {recent.length === 0 && <li>No recent quotation activity yet.</li>}
          {recent.map((item, idx) => (
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
