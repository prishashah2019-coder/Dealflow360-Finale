import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../components/DataTable.jsx'
import Badge from '../components/Badge.jsx'
import { getStocks, getWarehouses, getQuotations } from '../api/fulfillment.js'
import { getProducts } from '../api/products.js'
import { mockStocks, mockFulfillmentOrders } from '../mockData.js'

export default function FulfillmentList() {
  const [stocks, setStocks] = useState([])
  const [orders, setOrders] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [stockRes, whRes, prodRes] = await Promise.all([getStocks(), getWarehouses(), getProducts()])
        const warehousesById = Object.fromEntries((whRes.data || []).map((w) => [w._id, w.name]))
        const productsById = Object.fromEntries((prodRes.data || []).map((p) => [p._id, p.name]))
        // An empty stocks list is a legitimate state (no stock levels set
        // yet, e.g. a fresh warehouse) - it must not be swapped for fake
        // mock rows, which previously hid that nothing had actually loaded.
        const mapped = (stockRes.data || []).map((s) => ({
          product: productsById[s.productId] || s.productId,
          warehouse: warehousesById[s.warehouseId] || s.warehouseId,
          qtyFulfilled: s.qtyFulfilled ?? 0,
          inStock: s.qtyAvailable,
          reserved: s.reserved ?? 0,
          available: s.qtyAvailable - (s.reserved ?? 0),
        }))
        if (!cancelled) setStocks(mapped)
      } catch (err) {
        console.warn('Falling back to mock stock table.', err?.message)
        if (!cancelled) setStocks(mockStocks)
      }

      try {
        const res = await getQuotations()
        const relevant = (res.data || []).filter((q) => ['Approved', 'Confirmed'].includes(q.status))
        const mapped = relevant.map((q) => ({
          order: q._id,
          customer: q.customerId?.name || q.customer,
          status: q.fulfillmentSplits?.some((s) => s.isBackorder) ? 'backorder' : 'suggested',
          warehouse: q.fulfillmentSplits?.[0]?.warehouseId?.name || '—',
        }))
        if (!cancelled) setOrders(mapped)
      } catch (err) {
        console.warn('Falling back to mock fulfillment orders.', err?.message)
        if (!cancelled) setOrders(mockFulfillmentOrders)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const stockColumns = [
    { key: 'product', label: 'Product' },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'qtyFulfilled', label: 'Qty Fulfilled' },
    { key: 'inStock', label: 'In Stock' },
    { key: 'reserved', label: 'Reserved' },
    { key: 'available', label: 'Available' },
  ]

  const orderColumns = [
    { key: 'order', label: 'Order' },
    { key: 'customer', label: 'Customer' },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status}>{r.status}</Badge> },
    { key: 'warehouse', label: 'Warehouse' },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="titles">
          <h1>Fulfillment</h1>
          <div className="subtitle">Warehouse stock levels and orders awaiting fulfillment.</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title-row">
          <h3>Warehouse Stock</h3>
        </div>
        <DataTable columns={stockColumns} rows={stocks} />
      </div>

      <div className="card">
        <div className="card-title-row">
          <h3>Orders Awaiting Fulfillment</h3>
        </div>
        <DataTable columns={orderColumns} rows={orders} onRowClick={(r) => navigate(`/fulfillment/${r.order}`)} />
      </div>
    </div>
  )
}
