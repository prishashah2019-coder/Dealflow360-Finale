import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../components/DataTable.jsx'
import Badge from '../components/Badge.jsx'
import StatCard from '../components/StatCard.jsx'
import { getQuotations } from '../api/quotations.js'
import { mockApprovals } from '../mockData.js'

export default function ApprovalsList() {
  const [rows, setRows] = useState([])
  const [pendingOnly, setPendingOnly] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await getQuotations()
        // Any quotation that ever went through the approval chain, not just
        // the ones currently pending - so Rejected/Approved counts above the
        // table reflect real history instead of always reading 0.
        const everApproved = (res.data || []).filter((q) => (q.approvals || []).length > 0)
        if (everApproved.length === 0) throw new Error('no approval history from API, use mock')
        const mapped = everApproved.map((q) => {
          const currentStep = (q.approvals || []).find((a) => a.status === 'pending')
          const stageLabel = currentStep
            ? (currentStep.approverRole === 'finance' ? 'Finance' : 'Sales Manager')
            : (q.status === 'Rejected' ? 'Rejected' : 'Confirmed')
          return {
            _id: q._id,
            quotationId: q._id,
            customer: q.customerId?.name || q.customer,
            discountPct: Math.round(q.maxLineDiscountPct ?? 0),
            limitPct: q.maxLineLimitPct,
            riskLevel: q.blendedRiskScore > 10 ? 'High' : q.blendedRiskScore > 3 ? 'Medium' : 'Low',
            stage: stageLabel,
            assignedTo: currentStep ? '—' : (q.approvals[q.approvals.length - 1]?.approverRole === 'finance' ? 'Finance' : 'Sales Manager'),
            status: q.status === 'Rejected' ? 'rejected' : q.status === 'Pending Approval' ? 'pending' : 'approved',
          }
        })
        if (!cancelled) setRows(mapped)
      } catch (err) {
        console.warn('Falling back to mock approvals list.', err?.message)
        if (!cancelled) setRows(mockApprovals)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const counts = useMemo(() => ({
    pending: rows.filter((r) => r.status === 'pending').length,
    rejected: rows.filter((r) => r.status === 'rejected').length,
    approved: rows.filter((r) => r.status === 'approved').length,
  }), [rows])

  const visibleRows = pendingOnly ? rows.filter((r) => r.status === 'pending') : rows

  const columns = [
    { key: 'quotationId', label: 'Quotation' },
    { key: 'customer', label: 'Customer' },
    { key: 'discountPct', label: 'Discount %', render: (r) => `${r.discountPct}%` },
    { key: 'limitPct', label: 'Limit %', render: (r) => r.limitPct != null ? (
      <span className={`limit-pill${r.discountPct > r.limitPct ? ' over' : ''}`}>{r.limitPct}%</span>
    ) : '—' },
    { key: 'riskLevel', label: 'Risk Level', render: (r) => (
      <Badge color={r.riskLevel === 'High' ? 'red' : r.riskLevel === 'Medium' ? 'amber' : 'green'}>{r.riskLevel}</Badge>
    ) },
    { key: 'stage', label: 'Stage' },
    { key: 'assignedTo', label: 'Assigned To' },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="titles">
          <h1>Approvals</h1>
          <div className="subtitle">Discount overages awaiting sign-off.</div>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="Pending" value={counts.pending} accent="amber" />
        <StatCard label="Rejected" value={counts.rejected} accent="red" />
        <StatCard label="Approved" value={counts.approved} accent="green" />
      </div>

      <div className="card">
        <div className="card-title-row">
          <h3>Approval Queue</h3>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, fontWeight: 600 }}>
            <input type="checkbox" checked={pendingOnly} onChange={(e) => setPendingOnly(e.target.checked)} />
            Filter: Pending Only
          </label>
        </div>
        <DataTable columns={columns} rows={visibleRows} onRowClick={(r) => navigate(`/approvals/${r.quotationId}`)} />
      </div>
    </div>
  )
}
