import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DataTable from '../components/DataTable.jsx'
import Badge from '../components/Badge.jsx'
import NoteBanner from '../components/NoteBanner.jsx'
import { getPortalQuotation, addPortalComment, confirmPortalQuotation } from '../api/portal.js'
import { useAuth } from '../context/AuthContext.jsx'
import { mockPortalQuotation } from '../mockData.js'

export default function PortalNegotiation() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [quotation, setQuotation] = useState(null)
  const [selectedLineId, setSelectedLineId] = useState('')
  const [counterDiscountPct, setCounterDiscountPct] = useState('')
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('')
  const [commentText, setCommentText] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmNotice, setConfirmNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await getPortalQuotation(id)
        if (!cancelled) setQuotation(res.data)
      } catch (err) {
        console.warn('Falling back to mock portal quotation.', err?.message)
        if (!cancelled) setQuotation(mockPortalQuotation)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (!quotation) return <div className="loading-state">Loading your quotation…</div>

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSubmitRequest = async () => {
    setBusy(true)
    setConfirmNotice('')
    try {
      const res = await addPortalComment(id, {
        lineId: selectedLineId || quotation.lines?.[0]?._id,
        commentText,
        counterDiscountPct: counterDiscountPct ? Number(counterDiscountPct) : undefined,
      })
      // Backend returns the full updated quotation (new comment + adjusted
      // line discount + status flip to Under Negotiation) - reflect that
      // instead of only clearing the form, so the comment table and status
      // badge update without a manual reload.
      setQuotation(res.data)
      setCommentText('')
      setCounterDiscountPct('')
    } catch (err) {
      console.warn('Add-portal-comment API unavailable (demo mode).', err?.message)
    } finally {
      setBusy(false)
    }
  }

  const handleConfirm = async () => {
    setBusy(true)
    try {
      const res = await confirmPortalQuotation(id)
      // The backend may send the quote back into approval instead of
      // confirming it outright, if the negotiated terms now exceed the
      // customer's discount threshold - reflect whatever it actually did,
      // never assume "Confirmed".
      setQuotation(res.data.quotation)
      setConfirmNotice(
        res.data.reEnteredApproval
          ? 'These terms need another round of internal approval before the order can proceed - we’ll notify you once it’s reviewed.'
          : 'Quotation confirmed! Fulfillment and billing are now underway.'
      )
    } catch (err) {
      console.warn('Confirm-portal-quotation API unavailable.', err?.message)
      setConfirmNotice('Something went wrong confirming this quotation. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const commentColumns = [
    { key: 'authorType', label: 'From', render: (c) => (c.authorType === 'customer' ? 'You' : 'Sales Rep') },
    { key: 'lineId', label: 'Line', render: (c) => quotation.lines?.find((l) => l._id === c.lineId)?.productId?.name || '—' },
    { key: 'commentText', label: 'Comment / Question' },
    { key: 'counterDiscountPct', label: 'Counter Discount %', render: (c) => c.counterDiscountPct != null ? `${c.counterDiscountPct}%` : '—' },
    { key: 'createdAt', label: 'Date', render: (c) => new Date(c.createdAt).toLocaleDateString() },
  ]

  return (
    <div className="app-shell">
      <header className="top-nav">
        <span className="brand">DealFlow360 — Customer Portal</span>
        <div className="nav-right" style={{ marginLeft: 'auto' }}>
          {user && <span>{user.name || user.email}</span>}
          <button className="logout-btn" onClick={handleLogout}>Log Out</button>
        </div>
      </header>

      <main className="page">
        <div className="page-header">
          <div className="titles">
            <h1>Your Quotation</h1>
            <div className="subtitle"><Badge status={quotation.status}>{quotation.status}</Badge></div>
          </div>
          <div className="page-actions">
            <button className="btn btn-secondary" disabled={busy} onClick={handleSubmitRequest}>Submit Request</button>
            <button className="btn btn-primary" disabled={busy} onClick={handleConfirm}>Confirm Quotation</button>
          </div>
        </div>

        <NoteBanner>
          Submitting a counter-discount request re-triggers our approval process automatically
          if it changes the deal's risk profile — you'll see the updated status here.
        </NoteBanner>

        {confirmNotice && <NoteBanner tone={confirmNotice.startsWith('Quotation confirmed') ? 'success' : 'warning'}>{confirmNotice}</NoteBanner>}

        <div className="card">
          <div className="card-title-row">
            <h3>Line Comments &amp; Questions</h3>
          </div>
          <DataTable columns={commentColumns} rows={quotation.negotiationComments || []} emptyMessage="No comments yet." />
        </div>

        <div className="card">
          <div className="card-title-row">
            <h3>Add a Request</h3>
          </div>
          <div className="form-field">
            <label>Line</label>
            <select value={selectedLineId} onChange={(e) => setSelectedLineId(e.target.value)}>
              <option value="">Select a line…</option>
              {(quotation.lines || []).map((l) => (
                <option key={l._id} value={l._id}>{l.product || l.productId?.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Counter Discount %</label>
              <input type="number" value={counterDiscountPct} onChange={(e) => setCounterDiscountPct(e.target.value)} placeholder="e.g. 15" />
            </div>
            <div className="form-field">
              <label>Requested Delivery Date</label>
              <input type="date" value={requestedDeliveryDate} onChange={(e) => setRequestedDeliveryDate(e.target.value)} />
            </div>
          </div>
          <div className="form-field">
            <label>Comment / Question</label>
            <textarea rows={3} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Ask a question or explain your request…" />
          </div>
        </div>
      </main>
    </div>
  )
}
