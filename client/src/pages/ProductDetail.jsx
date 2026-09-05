import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import DataTable from '../components/DataTable.jsx'
import NoteBanner from '../components/NoteBanner.jsx'
import { getProduct, updateProduct } from '../api/products.js'
import { useAuth } from '../context/AuthContext.jsx'
import { mockProductDetail, mockProducts } from '../mockData.js'

const DEFAULT_VARIANTS = [
  { attributeName: 'Color', attributeValue: 'Blue, Black', extraPrice: 0 },
  { attributeName: 'RAM', attributeValue: '4GB, 8GB', extraPrice: 30 },
  { attributeName: 'Manufacturer', attributeValue: 'Dell, HP', extraPrice: 10 },
]

const DEFAULT_PRICE_LISTS = [
  { tier: 'Bronze', currency: 'USD', priceRule: 'Price, no adjustment' },
  { tier: 'Gold', currency: 'USD/EUR', priceRule: 'Price minus 10 percent base' },
]

function fillProductDetails(product, id) {
  return {
    ...product,
    _id: id || product._id,
    name: product.name || 'Product',
    category: product.category || 'General',
    unit: product.unit || 'unit',
    basePrice: Number(product.basePrice) || 0,
    taxPct: product.taxPct ?? 0,
    description: product.description || 'Product details and commercial terms.',
    recurringCycle: product.recurringCycle || (product.isSubscription ? 'Monthly / Yearly / Weekly' : 'Not applicable'),
    qtyOnHand: product.qtyOnHand ?? 0,
    variants: product.variants?.length ? product.variants : DEFAULT_VARIANTS,
    priceLists: product.priceLists?.length ? product.priceLists : DEFAULT_PRICE_LISTS,
  }
}

export default function ProductDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [product, setProduct] = useState(null)
  const [draft, setDraft] = useState(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await getProduct(id)
        if (!cancelled) setProduct(fillProductDetails(res.data, id))
      } catch (err) {
        console.warn('Falling back to mock product detail.', err?.message)
        const baseProduct = mockProducts.find((item) => item._id === id) || mockProducts[0]
        if (!cancelled) setProduct(fillProductDetails({
          ...mockProductDetail,
          ...baseProduct,
          description: baseProduct.isSubscription ? 'Recurring software service for connected sales operations.' : 'Reliable equipment for daily customer operations.',
        }, id))
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (!product) return <div className="loading-state">Loading product…</div>

  const startEditing = () => {
    setDraft({
      name: product.name,
      category: product.category,
      basePrice: product.basePrice,
      unit: product.unit,
      taxPct: product.taxPct,
      description: product.description,
      isSubscription: product.isSubscription,
    })
    setMessage('')
    setEditing(true)
  }

  const updateDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }))

  const saveProduct = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    const payload = {
      ...draft,
      basePrice: Number(draft.basePrice) || 0,
      taxPct: Number(draft.taxPct) || 0,
    }
    try {
      const res = await updateProduct(id, payload)
      setProduct(fillProductDetails({ ...product, ...res.data }, id))
      setEditing(false)
      setMessage('Product details updated successfully.')
    } catch (err) {
      setProduct((current) => fillProductDetails({ ...current, ...payload }, id))
      setEditing(false)
      setMessage('Product details updated in demo mode. Connect the API server to persist changes.')
    } finally {
      setSaving(false)
    }
  }

  const variantColumns = [
    { key: 'attributeName', label: 'Attribute' },
    { key: 'attributeValue', label: 'Values' },
    { key: 'extraPrice', label: 'Extra Price', render: (r) => r.extraPrice ? `+$${Number(r.extraPrice).toLocaleString()}` : '$0' },
  ]

  const priceListColumns = [
    { key: 'tier', label: 'Tier' },
    { key: 'currency', label: 'Currency' },
    { key: 'priceRule', label: 'Price Rule' },
  ]

  return (
    <div>
      <div className="page-header product-detail-header">
        <div className="titles">
          <h1>Product and Pricelist</h1>
          <div className="subtitle">{product.name} · {product.category}</div>
        </div>
        {isAdmin && <div className="page-actions">
          <button className="btn btn-primary" type="button" onClick={editing ? () => setEditing(false) : startEditing}>
            {editing ? 'Cancel Edit' : 'Edit Product'}
          </button>
        </div>}
      </div>

      {message && <NoteBanner tone="success">{message}</NoteBanner>}

      <div className="card product-general-card">
        <div className="card-title-row">
          <h3>General Info</h3>
        </div>
        <form className="product-general-grid" onSubmit={saveProduct}>
          <div className="product-fields-column">
            <label>Product name<input value={editing ? draft.name : product.name || 'Unnamed Product'} readOnly={!editing} onChange={(e) => updateDraft('name', e.target.value)} /></label>
            <label>Category<input value={editing ? draft.category : product.category || 'General'} readOnly={!editing} onChange={(e) => updateDraft('category', e.target.value)} /></label>
            <label>Price<input type={editing ? 'number' : 'text'} value={editing ? draft.basePrice : `$${Number(product.basePrice || 0).toLocaleString()}`} readOnly={!editing} onChange={(e) => updateDraft('basePrice', e.target.value)} /></label>
            <label>Unit<input value={editing ? draft.unit : product.unit || 'unit'} readOnly={!editing} onChange={(e) => updateDraft('unit', e.target.value)} /></label>
            <label>Description<textarea value={editing ? draft.description : product.description || 'Product details and commercial terms.'} readOnly={!editing} rows={2} onChange={(e) => updateDraft('description', e.target.value)} /></label>
          </div>
          <div className="product-fields-column">
            <label>Tax %<input type={editing ? 'number' : 'text'} value={editing ? draft.taxPct : `${product.taxPct ?? 0}%`} readOnly={!editing} onChange={(e) => updateDraft('taxPct', e.target.value)} /></label>
            <label>Subscription{editing ? <select value={draft.isSubscription ? 'yes' : 'no'} onChange={(e) => updateDraft('isSubscription', e.target.value === 'yes')}><option value="yes">Yes</option><option value="no">No</option></select> : <input value={product.isSubscription ? 'Yes' : 'No'} readOnly />}</label>
            <label>Recurring<input value={product.recurringCycle || 'Not applicable'} readOnly /></label>
            <label>Quantity on hand<input value={product.qtyOnHand ?? 0} readOnly /></label>
          </div>
          {editing && <div className="product-edit-actions"><button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Product Details'}</button></div>}
        </form>
      </div>

      <div className="card">
        <div className="card-title-row">
          <h3>Product Variants</h3>
        </div>
        <DataTable columns={variantColumns} rows={product.variants || []} emptyMessage="No variants defined." />
      </div>

      <div className="card">
        <div className="card-title-row">
          <h3>Price Lists</h3>
        </div>
        <DataTable columns={priceListColumns} rows={product.priceLists || []} emptyMessage="No price lists defined." />
      </div>

      <NoteBanner>Product details should be filled. Recurring orders with this product will be invoiced at the beginning of the period.</NoteBanner>
    </div>
  )
}
