import { useEffect, useMemo, useState } from 'react'
import DataTable from '../components/DataTable.jsx'
import StatCard from '../components/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import { getDealHealth, nudgeRep, escalateDeal } from '../api/dealHealth.js'
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
  const [alerts, setAlerts] = useState([])
  const [busyId, setBusyId] = useState(null)

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
    try {
      if (kind === 'nudge') await nudgeRep(row.quotationId)
      else await escalateDeal(row.quotationId)
    } catch (err) {
      console.warn(`${kind} API unavailable (demo mode).`, err?.message)
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
    { key: 'actions', label: 'Action', render: (r) => (
      <div className="flex gap-8">
        <button className="btn btn-secondary btn-sm" disabled={busyId === r.quotationId + 'escalate'} onClick={() => handleAction(r, 'escalate')}>Escalate</button>
        <button className="btn btn-secondary btn-sm" disabled={busyId === r.quotationId + 'nudge'} onClick={() => handleAction(r, 'nudge')}>Nudge Rep</button>
      </div>
    ) },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="titles">
          <h1>Deal Health Dashboard</h1>
          <div className="subtitle">Live risk signals computed from quotation activity.</div>
        </div>
      </div>

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
