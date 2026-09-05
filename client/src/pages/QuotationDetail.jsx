import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Badge from '../components/Badge.jsx'
import DataTable from '../components/DataTable.jsx'
import NoteBanner from '../components/NoteBanner.jsx'
import { getQuotation, updateQuotation, submitForApproval, addNegotiationComment } from '../api/quotations.js'
import { getUpsell, getProducts } from '../api/products.js'
import { mockQuotations } from '../mockData.js'

const MOCK_UPSELL = [
  { _id: 'up1', product: 'Extended Warranty Plan', marginDelta: '+12%' },
  { _id: 'up2', product: 'Priority Support Add-on', marginDelta: '+8%' },
]

function getLineLimit(line) {
  if (line.limitAllowed != null) return Number(line.limitAllowed)
  return (line.productId?.category || line.category) === 'Software' ? 25 : 15
}

function getLineStatus(line) {
  const discount = Number(line.discountPct) || 0
  const limit = getLineLimit(line)
  return discount > limit
    ? { label: `OVER (+${Math.round(discount - limit)}pt)`, over: true }
    : { label: 'OK', over: false }
}

export default function QuotationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quotation, setQuotation] = useState(null)
  const [upsell, setUpsell] = useState([])
  const [dismissed, setDismissed] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [negotiation, setNegotiation] = useState({ lineId: '', message: '', discount: '', deliveryDate: '' })
  const [negotiationNotice, setNegotiationNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      let loaded = null
      try {
        const res = await getQuotation(id)
        loaded = res.data
        if (!cancelled) setQuotation(loaded)
      } catch (err) {
        console.warn('Falling back to mock quotation detail.', err?.message)
        loaded = mockQuotations.find((q) => q._id === id) || { ...mockQuotations[0], _id: id }
        if (!cancelled) setQuotation(loaded)
      }
      if (!cancelled) setLoading(false)

      // Use the just-fetched quotation, not the `quotation` state variable -
      // that's still null on first load in this same effect (setState above
      // hasn't re-rendered yet), which was silently defeating real upsell
      // lookups and always falling back to mock suggestions.
      try {
        const firstProductId = loaded?.lines?.[0]?.productId?._id
        if (!firstProductId) throw new Error('no product on this quotation to base upsell suggestions on')
        const res = await getUpsell(firstProductId)
        if (!cancelled) setUpsell(res.data?.length ? res.data : MOCK_UPSELL)
      } catch (err) {
        if (!cancelled) setUpsell(MOCK_UPSELL)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    getProducts().then((res) => setProducts(res.data || [])).catch(() => setProducts([]))
  }, [])

  // getQuotation decorates lines with display-only fields (limitAllowed,
  // overagePct, givenBy, a populated productId) that aren't part of the
  // schema - send back only the real fields, with productId reduced to its
  // raw id, and omit _id on lines that don't have a real one yet (added
  // locally via "Add" and never saved) so Mongoose assigns one.
  const buildCleanLines = () => (quotation.lines || []).map((l) => {
    const line = {
      productId: l.productId?._id || l.productId,
      variant: l.variant || '',
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPct: l.discountPct || 0,
      lineType: l.lineType || 'one_time',
      subscriptionPlanId: l.subscriptionPlanId?._id || l.subscriptionPlanId || null,
    }
    if (l._id && !String(l._id).startsWith('local-')) line._id = l._id
    return line
  })

  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      await updateQuotation(id, { lines: buildCleanLines() })
      // Re-fetch rather than use the PUT response directly - getQuotation
      // returns lines populated with product info and the limit/overage
      // decoration the table needs; the bare PUT response doesn't.
      const refreshed = await getQuotation(id)
      setQuotation(refreshed.data)
    } catch (err) {
      console.warn('Save draft API unavailable (demo mode).', err?.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      // Persist any locally-added lines (e.g. an upsell "Add" that hasn't
      // been saved yet) before computing the risk score against them,
      // otherwise a line added right before submitting would be silently
      // ignored by the approval routing.
      await updateQuotation(id, { lines: buildCleanLines() })
      const res = await submitForApproval(id)
      setQuotation(res.data)
      navigate('/approvals')
    } catch (err) {
      console.warn('Submit-for-approval API unavailable (demo mode).', err?.message)
      navigate('/approvals')
    } finally {
      setSaving(false)
    }
  }

  const updateLine = (index, field, value) => {
    setQuotation((current) => ({
      ...current,
      lines: (current.lines || []).map((line, lineIndex) => lineIndex === index
        ? { ...line, [field]: ['quantity', 'unitPrice', 'discountPct'].includes(field) ? Number(value) : value }
        : line),
    }))
  }

  const handleNegotiation = async (event) => {
    event.preventDefault()
    setSaving(true)
    setNegotiationNotice('')
    const payload = {
      lineId: negotiation.lineId || quotation.lines?.[0]?._id,
      commentText: negotiation.message,
      counterDiscountPct: negotiation.discount === '' ? undefined : Number(negotiation.discount),
      requestedDeliveryDate: negotiation.deliveryDate || undefined,
    }
    try {
      const res = await addNegotiationComment(id, payload)
      setQuotation(res.data)
      setNegotiation({ lineId: '', message: '', discount: '', deliveryDate: '' })
      setNegotiationNotice('Negotiation response sent to the customer.')
    } catch (err) {
      setQuotation((current) => ({
        ...current,
        status: 'Under Negotiation',
        negotiationComments: [...(current.negotiationComments || []), { ...payload, authorType: 'rep', createdAt: new Date().toISOString() }],
      }))
      setNegotiationNotice('Negotiation response saved in demo mode. Connect the API server to send it.')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !quotation) return <div className="loading-state">Loading quotation…</div>

  const lines = quotation.lines || []

  const lineColumns = [
    { key: 'product', label: 'Product', render: (l) => l.productId?.name || l.product || '—' },
    { key: 'quantity', label: 'Qty' },
    { key: 'unitPrice', label: 'Price', render: (l) => `$${l.unitPrice?.toLocaleString?.() ?? l.unitPrice}` },
    { key: 'discountPct', label: 'Discount', render: (l) => `${l.discountPct || 0}%` },
    { key: 'limitAllowed', label: 'Limit', render: (l) => <span className="limit-pill">{getLineLimit(l)}%</span> },
    { key: 'status', label: 'Status', render: (l) => { const status = getLineStatus(l); return <span className={`line-status${status.over ? ' line-status-over' : ''}`}>{status.label}</span> } },
  ]

  const handleAddUpsell = (u) => {
    const product = u.product || u.suggestedProductId
    if (!product?._id) return // mock/no-price suggestion - nothing real to add as a line
    setQuotation((q) => ({
      ...q,
      lines: [
        ...(q.lines || []),
        {
          // No _id yet - Mongoose assigns a real ObjectId on save. A
          // client-made-up string here would fail the schema's ObjectId
          // cast when this gets persisted via Save Draft.
          productId: product,
          quantity: 1,
          unitPrice: product.basePrice ?? 0,
          discountPct: 0,
          lineType: product.isSubscription ? 'recurring' : 'one_time',
        },
      ],
    }))
    setDismissed((d) => [...d, u._id])
  }

  return (
    <div>
      <div className="page-header">
        <div className="titles">
          <h1>Quotation Detail: {quotation._id} ({quotation.customerId?.name || quotation.customer || 'Customer'})</h1>
          <div className="subtitle">Opened from the quotation list. Add products, apply discounts, and review upsells.</div>
          <div className="quotation-status"><Badge status={quotation.status}>{quotation.status}</Badge></div>
        </div>
      </div>

      <div className="quotation-meta-fields">
        <label><span>Customer</span><input value={quotation.customerId?.name || quotation.customer || 'Customer'} readOnly /></label>
        <label><span>Price List</span><input value={quotation.customerId?.tier ? `${quotation.customerId.tier} Price List` : quotation.priceList || 'Standard Price List'} readOnly /></label>
      </div>

      <NoteBanner>
        Per-line discounts are checked against the customer tier ceiling and the product
        category ceiling. Any line above its limit raises the quotation's blended risk score
        and may trigger manager/finance approval.
      </NoteBanner>

      <div className="card">
        <div className="card-title-row">
          <h3>Quotation Lines</h3>
        </div>
        {quotation.status === 'Draft' ? (
          <div className="editable-lines quotation-lines-grid">
            <div className="quotation-line-header"><span>Product</span><span>Qty</span><span>Price</span><span>Discount</span><span>Limit</span><span>Status</span></div>
            {lines.map((line, index) => (
              <div className="quotation-line-form" key={line._id || `line-${index}`}>
                <div className="form-field"><label>Product</label><select value={line.productId?._id || line.productId || ''} onChange={(e) => updateLine(index, 'productId', products.find((product) => product._id === e.target.value) || e.target.value)}><option value="">Select product</option>{products.map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}</select></div>
                <div className="form-field"><label>Qty</label><input type="number" min="1" value={line.quantity || 1} onChange={(e) => updateLine(index, 'quantity', e.target.value)} /></div>
                <div className="form-field"><label>Unit Price</label><input type="number" min="0" value={line.unitPrice || 0} onChange={(e) => updateLine(index, 'unitPrice', e.target.value)} /></div>
                <div className="form-field"><label>Discount %</label><input type="number" min="0" max="100" value={line.discountPct || 0} onChange={(e) => updateLine(index, 'discountPct', e.target.value)} /></div>
                <div className="quotation-line-status"><span>{getLineLimit(line)}%</span></div>
                <div className="quotation-line-status"><strong className={getLineStatus(line).over ? 'line-status-over' : ''}>{getLineStatus(line).label}</strong></div>
              </div>
            ))}
            {lines.length === 0 && <div className="empty-row">No lines added yet. Add an upsell below or create the quotation with line items.</div>}
          </div>
        ) : <DataTable columns={lineColumns} rows={lines} emptyMessage="No lines added yet." />}
      </div>

      {['Draft', 'Approved', 'Pending Approval', 'Under Negotiation'].includes(quotation.status) && (
        <div className="card negotiation-card">
          <div className="card-title-row"><div><h3>Negotiate This Deal</h3><span className="card-subtitle">Send revised terms or a response to the customer portal.</span></div></div>
          {negotiationNotice && <NoteBanner tone="success">{negotiationNotice}</NoteBanner>}
          <form onSubmit={handleNegotiation}>
            <div className="form-row">
              <div className="form-field"><label>Line</label><select value={negotiation.lineId} onChange={(e) => setNegotiation((current) => ({ ...current, lineId: e.target.value }))}><option value="">Select line</option>{lines.map((line) => <option key={line._id} value={line._id}>{line.productId?.name || line.product || 'Quotation line'}</option>)}</select></div>
              <div className="form-field"><label>Revised Discount %</label><input type="number" min="0" max="100" value={negotiation.discount} onChange={(e) => setNegotiation((current) => ({ ...current, discount: e.target.value }))} placeholder="Optional" /></div>
              <div className="form-field"><label>Delivery Date</label><input type="date" value={negotiation.deliveryDate} onChange={(e) => setNegotiation((current) => ({ ...current, deliveryDate: e.target.value }))} /></div>
            </div>
            <div className="form-field"><label>Message</label><textarea rows="3" value={negotiation.message} onChange={(e) => setNegotiation((current) => ({ ...current, message: e.target.value }))} placeholder="Explain the revised terms..." /></div>
            <button className="btn btn-primary" type="submit" disabled={saving}>Send Negotiation Response</button>
          </form>
        </div>
      )}

      <div className="card upsell-suggestions-card">
        <div className="card-title-row">
          <h3>Upsell and Cross-Sell Suggestions</h3>
        </div>
        <div className="upsell-card-grid">
              {upsell.filter((u) => !dismissed.includes(u._id)).map((u) => (
                <div className="upsell-suggestion" key={u._id}>
                  <strong>+ {u.product?.name || (typeof u.product === 'string' ? u.product : u.suggestedProductId?.name) || 'Suggested product'}</strong>
                  <span>{u.marginDelta || (u.minMarginThreshold != null ? `min margin ${u.minMarginThreshold}%` : 'Recommended add-on')}{u.isPromoted ? ' 🔥' : ''}</span>
                  <div><button className="btn btn-primary btn-sm" onClick={() => handleAddUpsell(u)}>Add</button><button className="btn btn-secondary btn-sm" onClick={() => setDismissed((d) => [...d, u._id])}>Dismiss</button></div>
                </div>
              ))}
              {upsell.filter((u) => !dismissed.includes(u._id)).length === 0 && (
                <div className="empty-row">No suggestions right now.</div>
              )}
        </div>
      </div>

      <div className="quotation-actions-bottom">
        <button className="btn btn-secondary" onClick={handleSaveDraft} disabled={saving}>Save Draft</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>Submit for Approval</button>
      </div>
    </div>
  )
}
