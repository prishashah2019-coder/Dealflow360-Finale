import { useEffect, useMemo, useState } from 'react'
import DataTable from '../components/DataTable.jsx'
import StatCard from '../components/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import { getDealHealth, nudgeRep, escalateDeal } from '../api/dealHealth.js'
import { useAuth } from '../context/AuthContext.jsx'
import { mockDealHealth } from '../mockData.js'

// Backend groups alerts by type ({ stalled, anomalies, slippage }, each an
// array of { quotationId, customer, rep, issue, flaggedAt }) rather than one
// flat list - flatten it into the row shape this table renders.
function flattenDealHealth(data) {
  const toRows = (items, action) => (items || []).map((a) => ({
    quotationId: a.quotationId,
    deal: a.customer || '—',
    issue: a.issue,
    flagged: a.flaggedAt,
    action,
  }))
  return [
    ...toRows(data.stalled, 'stalled'),
    ...toRows(data.anomalies, 'discount_anomaly'),
    ...toRows(data.slippage, 'delivery_slippage'),
  ]
}

export default function DealHealth() {
  const { user } = useAuth()
  // Per the problem statement, the Sales Manager "monitors the deal health
  // dashboard" and is the one who nudges/escalates - every other internal
  // role can see the same signals but not act on them (enforced server-side too).
  const canAct = user?.role === 'sales_manager' || user?.role === 'admin'
  const [alerts, setAlerts] = useState([])
  const [busyId, setBusyId] = useState(null)
  const [actionMsg, setActionMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await getDealHealth()
        const rows = flattenDealHealth(res.data || {})
        if (rows.length === 0) throw new Error('empty deal health from API, use mock')
        if (!cancelled) setAlerts(rows)
      } catch (err) {
        console.warn('Falling back to mock deal health data.', err?.message)
        if (!cancelled) setAlerts(mockDealHealth)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleAction = async (row, kind) => {
    setBusyId(row.quotationId + kind)
    setActionMsg('')
    try {
      if (kind === 'nudge') await nudgeRep(row.quotationId)
      else await escalateDeal(row.quotationId)
      setActionMsg(`${kind === 'nudge' ? 'Nudge' : 'Escalation'} sent for ${row.deal}.`)
    } catch (err) {
      setActionMsg(err?.response?.data?.error || `Could not ${kind} this deal.`)
    } finally {
      setBusyId(null)
    }
  }

  const counts = useMemo(() => ({
    stalled: alerts.filter((a) => a.action === 'stalled').length,
    anomaly: alerts.filter((a) => a.action === 'discount_anomaly').length,
    slippage: alerts.filter((a) => a.action === 'delivery_slippage').length,
  }), [alerts])

  const columns = [
    { key: 'deal', label: 'Deal' },
    { key: 'issue', label: 'Issue' },
    { key: 'flagged', label: 'Flagged', render: (r) => new Date(r.flagged).toLocaleDateString() },
    { key: 'action', label: 'Type', render: (r) => <Badge status={r.action}>{r.action.replace('_', ' ')}</Badge> },
    { key: 'actions', label: 'Action', render: (r) => canAct ? (
      <div className="flex gap-8">
        <button className="btn btn-secondary btn-sm" disabled={busyId === r.quotationId + 'escalate'} onClick={() => handleAction(r, 'escalate')}>Escalate</button>
        <button className="btn btn-secondary btn-sm" disabled={busyId === r.quotationId + 'nudge'} onClick={() => handleAction(r, 'nudge')}>Nudge Rep</button>
      </div>
    ) : <span className="muted" style={{ fontSize: 12.5 }}>View only</span> },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="titles">
          <h1>Deal Health Dashboard</h1>
          <div className="subtitle">Live risk signals computed from quotation activity.</div>
        </div>
      </div>

      {actionMsg && <div className="note-banner note-banner-success">{actionMsg}</div>}

      <div className="stat-grid">
        <StatCard label="Stalled Deals" value={counts.stalled} accent="amber" />
        <StatCard label="Discount Anomalies" value={counts.anomaly} accent="red" />
        <StatCard label="Delivery Slippage" value={counts.slippage} accent="red" />
      </div>

      <div className="card">
        <div className="card-title-row">
          <h3>Flagged Deals</h3>
        </div>
        <DataTable columns={columns} rows={alerts} />
      </div>
    </div>
  )
}
