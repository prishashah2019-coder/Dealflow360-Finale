import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import DataTable from '../components/DataTable.jsx'
import { getProduct } from '../api/products.js'
import { mockProductDetail } from '../mockData.js'

export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await getProduct(id)
        if (!cancelled) setProduct(res.data)
      } catch (err) {
        console.warn('Falling back to mock product detail.', err?.message)
        if (!cancelled) setProduct({ ...mockProductDetail, _id: id })
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (!product) return <div className="loading-state">Loading product…</div>

  const variantColumns = [
    { key: 'attributeName', label: 'Attribute' },
    { key: 'attributeValue', label: 'Values' },
    { key: 'extraPrice', label: 'Extra Price', render: (r) => `$${r.extraPrice.toLocaleString()}` },
  ]

  const priceListColumns = [
    { key: 'tier', label: 'Tier' },
    { key: 'currency', label: 'Currency' },
    { key: 'priceRule', label: 'Price Rule' },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="titles">
          <h1>{product.name}</h1>
          <div className="subtitle">{product.category}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title-row">
          <h3>General Info</h3>
        </div>
        <div className="info-grid">
          <div className="info-item"><div className="info-label">Name</div><div className="info-value">{product.name}</div></div>
          <div className="info-item"><div className="info-label">Category</div><div className="info-value">{product.category}</div></div>
          <div className="info-item"><div className="info-label">Price</div><div className="info-value">${product.basePrice?.toLocaleString()}</div></div>
          <div className="info-item"><div className="info-label">Unit</div><div className="info-value">{product.unit}</div></div>
          <div className="info-item"><div className="info-label">Tax %</div><div className="info-value">{product.taxPct}%</div></div>
          <div className="info-item"><div className="info-label">Subscription</div><div className="info-value">{product.isSubscription ? 'Yes' : 'No'}</div></div>
          <div className="info-item"><div className="info-label">Recurring Cycle</div><div className="info-value">{product.recurringCycle || '—'}</div></div>
          <div className="info-item"><div className="info-label">Qty on Hand</div><div className="info-value">{product.qtyOnHand ?? '—'}</div></div>
        </div>
      </div>

      <div className="card">
        <div className="card-title-row">
          <h3>Variants</h3>
        </div>
        <DataTable columns={variantColumns} rows={product.variants || []} emptyMessage="No variants defined." />
      </div>

      <div className="card">
        <div className="card-title-row">
          <h3>Price Lists</h3>
        </div>
        <DataTable columns={priceListColumns} rows={product.priceLists || []} emptyMessage="No price lists defined." />
      </div>
    </div>
  )
}
