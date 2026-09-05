import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Badge from '../components/Badge.jsx'
import DataTable from '../components/DataTable.jsx'
import NoteBanner from '../components/NoteBanner.jsx'
import { getQuotation, updateQuotation, submitForApproval } from '../api/quotations.js'
import { getUpsell } from '../api/products.js'
import { mockQuotations } from '../mockData.js'

const MOCK_UPSELL = [
  { _id: 'up1', product: 'Extended Warranty Plan', marginDelta: '+12%' },
  { _id: 'up2', product: 'Priority Support Add-on', marginDelta: '+8%' },
]

export default function QuotationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quotation, setQuotation] = useState(null)
  const [upsell, setUpsell] = useState([])
  const [dismissed, setDismissed] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

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

  if (loading || !quotation) return <div className="loading-state">Loading quotation…</div>

  const lines = quotation.lines || []

  const lineColumns = [
    { key: 'product', label: 'Product', render: (l) => l.productId?.name || l.product || '—' },
    { key: 'quantity', label: 'Qty' },
    { key: 'unitPrice', label: 'Price', render: (l) => `$${l.unitPrice?.toLocaleString?.() ?? l.unitPrice}` },
    { key: 'discountPct', label: 'Discount', render: (l) => `${l.discountPct || 0}%` },
    { key: 'limitAllowed', label: 'Limit %', render: (l) => l.limitAllowed != null ? (
      <span className={`limit-pill${(l.discountPct || 0) > l.limitAllowed ? ' over' : ''}`}>{l.limitAllowed}%</span>
    ) : '—' },
    { key: 'list', label: 'List', render: (l) => `$${(l.quantity * l.unitPrice).toLocaleString()}` },
    { key: 'other', label: 'Other', render: (l) => `$${(l.quantity * l.unitPrice * (1 - (l.discountPct || 0) / 100)).toLocaleString()}` },
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
          <h1>{quotation.customerId?.name || quotation.customer || 'Customer'}</h1>
          <div className="subtitle">
            <Badge status={quotation.status}>{quotation.status}</Badge>
            {'  '}Quotation {quotation._id}
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={handleSaveDraft} disabled={saving}>Save Draft</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>Submit for Approval</button>
        </div>
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
        <DataTable columns={lineColumns} rows={lines} emptyMessage="No lines added yet." />
      </div>

      <div className="card">
        <div className="card-title-row">
          <h3>Upsell and Cross-Sell Suggestions</h3>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Margin Delta</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {upsell.filter((u) => !dismissed.includes(u._id)).map((u) => (
                <tr key={u._id}>
                  <td>{u.product?.name || (typeof u.product === 'string' ? u.product : u.suggestedProductId?.name) || 'Suggested product'}</td>
                  <td>{u.marginDelta || (u.minMarginThreshold != null ? `min margin ${u.minMarginThreshold}%` : '+—')}{u.isPromoted ? ' 🔥' : ''}</td>
                  <td className="text-right">
                    <button className="btn btn-primary btn-sm" style={{ marginRight: 8 }} onClick={() => handleAddUpsell(u)}>Add</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setDismissed((d) => [...d, u._id])}>Dismiss</button>
                  </td>
                </tr>
              ))}
              {upsell.filter((u) => !dismissed.includes(u._id)).length === 0 && (
                <tr className="empty-row"><td colSpan={3}>No suggestions right now.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
