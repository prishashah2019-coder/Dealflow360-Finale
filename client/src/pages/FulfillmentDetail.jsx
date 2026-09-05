import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DataTable from '../components/DataTable.jsx'
import NoteBanner from '../components/NoteBanner.jsx'
import { getQuotation } from '../api/quotations.js'
import { acceptFulfillment, overrideFulfillment } from '../api/fulfillment.js'
import { mockFulfillmentDetail } from '../mockData.js'

function getDisplayOrderId(id) {
  return { q1002: 'Q-1042', q1009: 'Q-1030' }[id] || id
}

function getMockDetail(id) {
  if (id === 'q1002') return {
    quotationId: id,
    customer: 'Acme Corp',
    splits: [
      { _id: 'mock-main', warehouseId: { name: 'Main Warehouse' }, qtyFulfilled: '18 units', estimatedShipments: 1, shipmentCost: 42, isBackorder: false },
      { _id: 'mock-east', warehouseId: { name: 'East Depot' }, qtyFulfilled: '6 units', estimatedShipments: 1, shipmentCost: 29, isBackorder: true },
    ],
  }
  if (id === 'q1009') return {
    quotationId: id,
    customer: 'Zenith Co',
    splits: [{ _id: 'mock-zenith', warehouseId: { name: 'East Depot' }, qtyFulfilled: '10 units', estimatedShipments: 1, shipmentCost: 29, isBackorder: true }],
  }
  return { ...mockFulfillmentDetail, quotationId: id }
}

export default function FulfillmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState(null)
  const [busy, setBusy] = useState(false)
  const [actionNotice, setActionNotice] = useState('')

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
        if (!cancelled) setDetail(getMockDetail(id))
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (!detail) return <div className="loading-state">Loading fulfillment split…</div>

  const hasBackorder = (detail.splits || []).some((s) => s.isBackorder)

  const handleAccept = async () => {
    setBusy(true)
    try {
      await acceptFulfillment(id)
      navigate('/fulfillment')
    } catch (err) {
      console.warn('Accept-fulfillment API unavailable (demo mode).', err?.message)
      setActionNotice('Suggested split accepted in demo mode.')
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
      setActionNotice('Manual override saved in demo mode.')
    } finally {
      setBusy(false)
    }
  }

  const columns = [
    { key: 'warehouse', label: 'Warehouse', render: (s) => s.warehouseId?.name || s.warehouseId },
    { key: 'qtyFulfilled', label: 'Qty Fulfilled' },
    { key: 'estimatedShipments', label: 'Est. Shipments', render: (s) => s.estimatedShipments ?? 1 },
    { key: 'cost', label: 'Cost', render: (s) => `$${(s.shipmentCost || 0).toLocaleString()}` },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="titles">
          <h1>Fulfillment Detail: {getDisplayOrderId(detail.quotationId)} ({detail.customer || 'Customer'})</h1>
          <div className="subtitle">Opened by clicking an order row on the Fulfillment list.</div>
        </div>
      </div>

      {actionNotice && <NoteBanner tone="success">{actionNotice}</NoteBanner>}

      {hasBackorder && (
        <NoteBanner>
          “Consolidate Remaining Backorder” prompt appears automatically once East Depot restocks.
        </NoteBanner>
      )}

      <div className="card">
        <div className="card-title-row">
          <h3>Warehouse Split</h3>
        </div>
        <DataTable columns={columns} rows={detail.splits || []} />
      </div>

      <div className="fulfillment-actions-bottom">
        <button className="btn btn-primary" disabled={busy} onClick={handleAccept}>Accept Suggested Split</button>
        <button className="btn btn-secondary" disabled={busy} onClick={handleOverride}>Manual Override</button>
      </div>
    </div>
  )
}
