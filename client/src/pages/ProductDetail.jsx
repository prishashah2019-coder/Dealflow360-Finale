import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import DataTable from '../components/DataTable.jsx'
import { getProduct, updateProduct } from '../api/products.js'
import { useAuth } from '../context/AuthContext.jsx'
import { mockProductDetail } from '../mockData.js'

export default function ProductDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [product, setProduct] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

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

  const startEdit = () => {
    setForm({
      name: product.name,
      category: product.category,
      basePrice: product.basePrice,
      unit: product.unit,
      taxPct: product.taxPct,
      isSubscription: product.isSubscription,
    })
    setMsg('')
    setEditing(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    try {
      const res = await updateProduct(id, {
        ...form,
        basePrice: Number(form.basePrice) || 0,
        taxPct: Number(form.taxPct) || 0,
      })
      setProduct((p) => ({ ...p, ...res.data }))
      setEditing(false)
    } catch (err) {
      setMsg(err?.response?.data?.error || 'Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

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
        {isAdmin && (
          <div className="page-actions">
            <button className="btn btn-secondary" onClick={() => (editing ? setEditing(false) : startEdit())}>
              {editing ? 'Cancel' : 'Edit Product'}
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="card">
          <div className="card-title-row"><h3>Edit General Info</h3></div>
          <form onSubmit={handleSave}>
            <div className="form-row">
              <div className="form-field">
                <label>Name</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-field">
                <label>Category</label>
                <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Price</label>
                <input type="number" value={form.basePrice} onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))} required />
              </div>
              <div className="form-field">
                <label>Unit</label>
                <input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>Tax %</label>
                <input type="number" value={form.taxPct} onChange={(e) => setForm((f) => ({ ...f, taxPct: e.target.value }))} />
              </div>
            </div>
            <label className="form-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={form.isSubscription} onChange={(e) => setForm((f) => ({ ...f, isSubscription: e.target.checked }))} />
              <span style={{ fontWeight: 500 }}>Subscription product (recurring)</span>
            </label>
            {msg && <div className="error-text">{msg}</div>}
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </form>
        </div>
      ) : (
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
      )}

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
