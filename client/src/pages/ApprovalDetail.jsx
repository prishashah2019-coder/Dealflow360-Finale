import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Badge from '../components/Badge.jsx'
import DataTable from '../components/DataTable.jsx'
import StepTracker from '../components/StepTracker.jsx'
import NoteBanner from '../components/NoteBanner.jsx'
import { getQuotation } from '../api/quotations.js'
import { decideApproval } from '../api/approvals.js'
import { mockApprovalDetail } from '../mockData.js'

function buildSteps(approvals = []) {
  const ordered = [...approvals].sort((a, b) => a.stepOrder - b.stepOrder)
  const steps = [{ key: 'submitted', label: 'Submitted', state: 'done' }]

  let sawCurrent = false
  ordered.forEach((a) => {
    const label = a.approverRole === 'sales_manager' ? 'Sales Manager' : a.approverRole === 'finance' ? 'Finance' : a.approverRole
    let state = 'pending'
    if (a.status === 'approved') state = 'done'
    else if (a.status === 'rejected') state = 'rejected'
    else if (a.status === 'pending' && !sawCurrent) { state = 'current'; sawCurrent = true }
    steps.push({ key: label, label, state })
  })

  const allApproved = ordered.length > 0 && ordered.every((a) => a.status === 'approved')
  const anyRejected = ordered.some((a) => a.status === 'rejected')
  steps.push({ key: 'confirmed', label: 'Confirmed', state: anyRejected ? 'pending' : allApproved ? 'done' : 'pending' })

  return steps
}

export default function ApprovalDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState(null)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [decisionNotice, setDecisionNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await getQuotation(id)
        if (!cancelled) setDetail(res.data)
      } catch (err) {
        console.warn('Falling back to mock approval detail.', err?.message)
        if (!cancelled) setDetail({ ...mockApprovalDetail, _id: id })
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (!detail) return <div className="loading-state">Loading approval…</div>

  const approvals = detail.approvals || []
  const currentStep = approvals.find((a) => a.status === 'pending')
  const worstLine = (detail.lines || []).reduce((worst, line) => {
    const overBy = Number(line.discountPct || 0) - Number(line.limitAllowed || 0)
    return !worst || overBy > worst.overBy ? { ...line, overBy } : worst
  }, null)
  const riskLabel = Number(detail.blendedRiskScore || 0) > 10 ? 'HIGH' : Number(detail.blendedRiskScore || 0) > 3 ? 'MEDIUM' : 'LOW'

  const handleDecision = async (action) => {
    setBusy(true)
    setDecisionNotice('')
    try {
      await decideApproval(id, currentStep?._id || 'step1', action, comment)
      navigate('/approvals')
    } catch (err) {
      console.warn('Decide-approval API unavailable (demo mode).', err?.message)
      setDetail((current) => ({
        ...current,
        approvals: (current.approvals || []).map((approval, index) => (
          index === 0 && approval.status === 'pending'
            ? { ...approval, status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'returned' }
            : approval
        )),
      }))
      setDecisionNotice(`Demo decision saved: ${action}. Connect the API server to persist it.`)
    } finally {
      setBusy(false)
    }
  }

  const flagColumns = [
    { key: 'line', label: 'Line', render: (l) => l.productName || l.productId?.name || '—' },
    { key: 'discountPct', label: 'Discount Given', render: (l) => `${l.discountPct}%` },
    { key: 'limitAllowed', label: 'Limit Allowed', render: (l) => `${l.limitAllowed}%` },
    { key: 'overBy', label: 'Over By', render: (l) => {
      const overBy = Number(l.discountPct || 0) - Number(l.limitAllowed || 0)
      return overBy > 0 ? `${Math.round(overBy)} pt OVER` : '0 pt - OK'
    } },
  ]

  const auditColumns = [
    { key: 'user', label: 'User' },
    { key: 'role', label: 'Role' },
    { key: 'action', label: 'Action' },
    { key: 'date', label: 'Date', render: (r) => new Date(r.date).toLocaleString() },
    { key: 'note', label: 'Note' },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="titles">
          <h1>Approval Detail: {detail._id} ({detail.customerId?.name || detail.customer || 'Customer'})</h1>
          <div className="subtitle approval-summary">
            <span>Blended Risk</span><Badge color={riskLabel === 'HIGH' ? 'red' : riskLabel === 'MEDIUM' ? 'amber' : 'green'}>{riskLabel}</Badge>
            <span>Customer Tier</span><Badge color="blue">{detail.customerId?.tier || 'Gold'}</Badge>
          </div>
        </div>
      </div>

      {decisionNotice && <NoteBanner tone="success">{decisionNotice}</NoteBanner>}

      <div className="card">
        <StepTracker steps={buildSteps(approvals)} />
      </div>

      <div className="card">
        <div className="card-title-row">
          <h3>Why This Quote Was Flagged</h3>
        </div>
        <DataTable columns={flagColumns} rows={detail.lines || []} emptyMessage="No flagged lines." />
      </div>

      {worstLine && worstLine.overBy > 0 && <NoteBanner>
        Worst line ({Math.round(worstLine.overBy)}pt over) pulls overall pattern across the order sets the blended score. One bad line is enough to require approval.
      </NoteBanner>}

      <div className="card">
        <div className="card-title-row">
          <h3>Decision Comment</h3>
        </div>
        <div className="form-field">
          <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a note for this decision (optional)" />
        </div>
      </div>

      <div className="card">
        <div className="card-title-row">
          <h3>Audit Trail</h3>
        </div>
        <DataTable columns={auditColumns} rows={detail.auditLog || []} emptyMessage="No audit entries yet." />
      </div>

      <div className="approval-actions-bottom">
        <button className="btn btn-success" disabled={busy || !currentStep} onClick={() => handleDecision('approve')}>Approve</button>
        <button className="btn btn-warn" disabled={busy || !currentStep} onClick={() => handleDecision('return')}>Return for Revision</button>
        <button className="btn btn-danger" disabled={busy || !currentStep} onClick={() => handleDecision('reject')}>Reject</button>
      </div>
    </div>
  )
}
