import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Badge from '../components/Badge.jsx'
import DataTable from '../components/DataTable.jsx'
import StepTracker from '../components/StepTracker.jsx'
import { getQuotation } from '../api/quotations.js'
import { decideApproval } from '../api/approvals.js'
import { useAuth } from '../context/AuthContext.jsx'
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
  const { user } = useAuth()
  const [detail, setDetail] = useState(null)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionMsg, setActionMsg] = useState('')

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
  // Only the role the current step actually requires (or an Admin, as a
  // break-glass override) can act - matches the server-side check exactly,
  // so the UI doesn't invite a click that's just going to 403.
  const canDecide = !!currentStep && (user?.role === currentStep.approverRole || user?.role === 'admin')

  const handleDecision = async (action) => {
    setBusy(true)
    setActionMsg('')
    try {
      await decideApproval(id, currentStep?._id, action, comment)
      navigate('/approvals')
    } catch (err) {
      // Only leave the page on real success - this previously navigated away
      // even when the backend rejected the request (e.g. wrong role, or no
      // pending step), which looked like the decision had gone through.
      setActionMsg(err?.response?.data?.error || 'Could not record this decision.')
    } finally {
      setBusy(false)
    }
  }

  const flagColumns = [
    { key: 'line', label: 'Line', render: (l) => l.productName || l.productId?.name || '—' },
    { key: 'discountPct', label: 'Discount Given', render: (l) => `${l.discountPct}%` },
    { key: 'limitAllowed', label: 'Limit Allowed', render: (l) => `${l.limitAllowed}%` },
    { key: 'givenBy', label: 'Given By' },
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
          <h1>Approval — {detail.customerId?.name || detail.customer || 'Customer'}</h1>
          <div className="subtitle flex gap-8">
            <span>Blended Risk:</span>
            <Badge color={detail.blendedRiskScore > 10 ? 'red' : detail.blendedRiskScore > 3 ? 'amber' : 'green'}>
              {Number(detail.blendedRiskScore || 0).toFixed(1)}
            </Badge>
            <span>Customer Tier:</span>
            <Badge color="blue">{detail.customerId?.tier || 'Silver'}</Badge>
          </div>
        </div>
        <div className="page-actions">
          {canDecide ? (
            <>
              <button className="btn btn-success" disabled={busy} onClick={() => handleDecision('approve')}>Approve</button>
              <button className="btn btn-warn" disabled={busy} onClick={() => handleDecision('return')}>Return for Revision</button>
              <button className="btn btn-danger" disabled={busy} onClick={() => handleDecision('reject')}>Reject</button>
            </>
          ) : (
            <span className="muted" style={{ fontSize: 13, alignSelf: 'center' }}>
              {currentStep ? `Waiting on ${currentStep.approverRole.replace('_', ' ')}` : 'No pending decision on this quote'}
            </span>
          )}
        </div>
      </div>

      {actionMsg && <div className="error-text">{actionMsg}</div>}

      <div className="card">
        <StepTracker steps={buildSteps(approvals)} />
      </div>

      <div className="card">
        <div className="card-title-row">
          <h3>Why This Quote Was Flagged</h3>
        </div>
        <DataTable columns={flagColumns} rows={detail.lines || []} emptyMessage="No flagged lines." />
      </div>

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
    </div>
  )
}
