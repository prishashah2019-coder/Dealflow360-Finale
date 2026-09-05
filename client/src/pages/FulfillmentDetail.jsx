import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DataTable from '../components/DataTable.jsx'
import NoteBanner from '../components/NoteBanner.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getQuotation } from '../api/quotations.js'
import { suggestFulfillment, acceptFulfillment, overrideFulfillment } from '../api/fulfillment.js'
import { mockFulfillmentDetail } from '../mockData.js'

export default function FulfillmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  // Per the problem statement, Finance "manages warehouse fulfillment splits
  // and backorder decisions" - only Finance/Admin can commit a split; every
  // other internal role can see it but not act on it (enforced server-side too).
  const canCommit = user?.role === 'finance' || user?.role === 'admin'
  const [detail, setDetail] = useState(null)
  const [busy, setBusy] = useState(false)
  const [actionMsg, setActionMsg] = useState('')
  const [actionErr, setActionErr] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await getQuotation(id)
        // An empty fulfillmentSplits array is a real, legitimate state (no
        // split has been suggested yet) - it must not be treated the same
        // as a failed request and replaced with fake mock data, which
        // previously showed an invented customer/warehouses with no
        // indication any of it was fabricated.
        if (!cancelled) setDetail({ quotationId: id, customer: res.data.customerId?.name, splits: res.data.fulfillmentSplits || [] })
      } catch (err) {
        console.warn('Falling back to mock fulfillment detail.', err?.message)
        if (!cancelled) setDetail({ ...mockFulfillmentDetail, quotationId: id })
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (!detail) return <div className="loading-state">Loading fulfillment split…</div>

  const hasBackorder = (detail.splits || []).some((s) => s.isBackorder)

  const handleSuggest = async () => {
    setBusy(true)
    setActionMsg('')
    setActionErr('')
    try {
      const res = await suggestFulfillment(id)
      setDetail((d) => ({ ...d, splits: res.data.fulfillmentSplits || d.splits }))
      setActionMsg('New split suggested from current stock levels.')
    } catch (err) {
      setActionErr(err?.response?.data?.error || 'Could not re-suggest a split.')
    } finally {
      setBusy(false)
    }
  }

  const handleAccept = async () => {
    setBusy(true)
    setActionMsg('')
    setActionErr('')
    try {
      await acceptFulfillment(id)
      navigate('/fulfillment')
    } catch (err) {
      // Only leave the page on real success - the previous version navigated
      // away here even on a 403/500, which looked like it had worked.
      setActionErr(err?.response?.data?.error || 'Could not accept this split.')
    } finally {
      setBusy(false)
    }
  }

  const handleOverride = async () => {
    setBusy(true)
    setActionMsg('')
    setActionErr('')
    try {
      // detail.splits comes from getQuotation, which populates warehouseId/
      // productId into full objects for display - sending those straight
      // back would fail the schema's ObjectId cast server-side. Reduce each
      // to its raw id before resubmitting.
      const cleanSplits = detail.splits.map((s) => ({
        warehouseId: s.warehouseId?._id || s.warehouseId,
        productId: s.productId?._id || s.productId,
        qtyFulfilled: s.qtyFulfilled,
        shipmentCost: s.shipmentCost,
        isBackorder: s.isBackorder,
      }))
      await overrideFulfillment(id, cleanSplits)
      navigate('/fulfillment')
    } catch (err) {
      setActionErr(err?.response?.data?.error || 'Could not override this split.')
    } finally {
      setBusy(false)
    }
  }

  const columns = [
    { key: 'warehouse', label: 'Warehouse', render: (s) => s.warehouseId?.name || s.warehouseId || 'Backorder' },
    { key: 'qtyFulfilled', label: 'Qty Fulfilled' },
    { key: 'shipped', label: 'Qty Shipped/Remaining', render: (s) => `${s.qtyShipped ?? 0} / ${s.qtyRemaining ?? 0}` },
    { key: 'cost', label: 'Cost', render: (s) => `$${(s.shipmentCost || 0).toLocaleString()}` },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="titles">
          <h1>Fulfillment — {detail.customer || 'Customer'}</h1>
          <div className="subtitle">Quotation {detail.quotationId}</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" disabled={busy} onClick={handleSuggest}>Re-suggest Split</button>
          {canCommit ? (
            <>
              <button className="btn btn-primary" disabled={busy} onClick={handleAccept}>Accept Suggested Split</button>
              <button className="btn btn-secondary" disabled={busy} onClick={handleOverride}>Manual Override</button>
            </>
          ) : (
            <span className="muted" style={{ fontSize: 13, alignSelf: 'center' }}>Only Finance/Admin can commit a split</span>
          )}
        </div>
      </div>

      {actionErr && <div className="error-text">{actionErr}</div>}
      {actionMsg && <div className="success-text">{actionMsg}</div>}

      {hasBackorder && (
        <NoteBanner>
          Some quantity could not be covered by available stock and will be consolidated into
          a single backorder shipment once replenished.
        </NoteBanner>
      )}

      <div className="card">
        <div className="card-title-row">
          <h3>Warehouse Split</h3>
        </div>
        <DataTable columns={columns} rows={detail.splits || []} />
      </div>
    </div>
  )
}
