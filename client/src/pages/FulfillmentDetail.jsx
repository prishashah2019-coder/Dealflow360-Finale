import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DataTable from '../components/DataTable.jsx'
import NoteBanner from '../components/NoteBanner.jsx'
import { getQuotation } from '../api/quotations.js'
import { suggestFulfillment, acceptFulfillment, overrideFulfillment } from '../api/fulfillment.js'
import { mockFulfillmentDetail } from '../mockData.js'

export default function FulfillmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await getQuotation(id)
        const splits = res.data.fulfillmentSplits || []
        if (splits.length === 0) throw new Error('no splits yet, suggest fresh split')
        if (!cancelled) setDetail({ quotationId: id, customer: res.data.customerId?.name, splits })
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
    try {
      const res = await suggestFulfillment(id)
      setDetail((d) => ({ ...d, splits: res.data.fulfillmentSplits || d.splits }))
    } catch (err) {
      console.warn('Suggest-fulfillment API unavailable (demo mode).', err?.message)
    } finally {
      setBusy(false)
    }
  }

  const handleAccept = async () => {
    setBusy(true)
    try {
      await acceptFulfillment(id)
      navigate('/fulfillment')
    } catch (err) {
      console.warn('Accept-fulfillment API unavailable (demo mode).', err?.message)
      navigate('/fulfillment')
    } finally {
      setBusy(false)
    }
  }

  const handleOverride = async () => {
    setBusy(true)
    try {
      await overrideFulfillment(id, detail.splits)
      navigate('/fulfillment')
    } catch (err) {
      console.warn('Override-fulfillment API unavailable (demo mode).', err?.message)
    } finally {
      setBusy(false)
    }
  }

  const columns = [
    { key: 'warehouse', label: 'Warehouse', render: (s) => s.warehouseId?.name || s.warehouseId },
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
          <button className="btn btn-primary" disabled={busy} onClick={handleAccept}>Accept Suggested Split</button>
          <button className="btn btn-secondary" disabled={busy} onClick={handleOverride}>Manual Override</button>
        </div>
      </div>

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
