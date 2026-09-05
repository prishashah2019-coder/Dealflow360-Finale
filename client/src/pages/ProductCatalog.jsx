import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../components/DataTable.jsx'
import StatCard from '../components/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import { getProducts, getPriceLists, createProduct } from '../api/products.js'
import { mockProducts } from '../mockData.js'

export default function ProductCatalog() {
  const [products, setProducts] = useState([])
  const [priceLists, setPriceLists] = useState([])
  const navigate = useNavigate()

  const [showNewProduct, setShowNewProduct] = useState(false)
  const [showPriceFields, setShowPriceFields] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: '', category: '', basePrice: '', unit: 'unit', taxPct: '', isSubscription: false })
  const [savingProduct, setSavingProduct] = useState(false)
  const [productMsg, setProductMsg] = useState('')

  const loadCatalog = async () => {
    try {
      const res = await getProducts()
      if (!Array.isArray(res.data) || res.data.length === 0) throw new Error('empty products from API, use mock')
      setProducts(res.data)
    } catch (err) {
      console.warn('Falling back to mock product catalog.', err?.message)
      setProducts(mockProducts)
    }
    try {
      const res = await getPriceLists()
      setPriceLists(res.data || [])
    } catch (err) {
      console.warn('Price lists unavailable.', err?.message)
    }
  }

  useEffect(() => {
    let cancelled = false
    loadCatalog().then(() => {
      if (cancelled) return
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalVariants = products.reduce((sum, p) => sum + (p.variants?.length || 0), 0)

  const handleCreateProduct = async (e) => {
    e.preventDefault()
    setSavingProduct(true)
    setProductMsg('')
    try {
      const res = await createProduct({
        ...newProduct,
        basePrice: Number(newProduct.basePrice) || 0,
        taxPct: Number(newProduct.taxPct) || 0,
      })
      setProducts((p) => [...p, res.data])
      setNewProduct({ name: '', category: '', basePrice: '', unit: 'unit', taxPct: '', isSubscription: false })
      setShowNewProduct(false)
    } catch (err) {
      setProductMsg(err?.response?.data?.error || 'Could not create product - check the API server.')
    } finally {
      setSavingProduct(false)
    }
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    { key: 'basePrice', label: 'Base Price', render: (r) => `$${r.basePrice.toLocaleString()}` },
    { key: 'unit', label: 'Unit' },
    { key: 'isSubscription', label: 'Type', render: (r) => (
      <Badge color={r.isSubscription ? 'blue' : 'gray'}>{r.isSubscription ? 'Subscription' : 'One-Time'}</Badge>
    ) },
  ]

  const priceListColumns = [
    { key: 'name', label: 'Name' },
    { key: 'customerTier', label: 'Tier' },
    { key: 'currency', label: 'Currency' },
    { key: 'items', label: 'Products', render: (r) => r.items?.length ?? 0 },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="titles">
          <h1>Product Catalog</h1>
          <div className="subtitle">Products, price lists, and variants.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => { setShowNewProduct((v) => !v); setShowPriceFields(false) }}>
            {showNewProduct ? 'Cancel' : '+ New Product'}
          </button>
          <button className="btn btn-secondary" onClick={() => { setShowPriceFields((v) => !v); setShowNewProduct(false) }}>
            {showPriceFields ? 'Hide Price Fields' : 'Manage Price Fields'}
          </button>
        </div>
      </div>

      {showNewProduct && (
        <div className="card">
          <div className="card-title-row"><h3>New Product</h3></div>
          <form onSubmit={handleCreateProduct}>
            <div className="form-row">
              <div className="form-field">
                <label>Name</label>
                <input value={newProduct.name} onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="form-field">
                <label>Category</label>
                <input value={newProduct.category} onChange={(e) => setNewProduct((p) => ({ ...p, category: e.target.value }))} placeholder="Hardware / Services" required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Base Price</label>
                <input type="number" value={newProduct.basePrice} onChange={(e) => setNewProduct((p) => ({ ...p, basePrice: e.target.value }))} required />
              </div>
              <div className="form-field">
                <label>Unit</label>
                <input value={newProduct.unit} onChange={(e) => setNewProduct((p) => ({ ...p, unit: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>Tax %</label>
                <input type="number" value={newProduct.taxPct} onChange={(e) => setNewProduct((p) => ({ ...p, taxPct: e.target.value }))} />
              </div>
            </div>
            <label className="form-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={newProduct.isSubscription} onChange={(e) => setNewProduct((p) => ({ ...p, isSubscription: e.target.checked }))} />
              <span style={{ fontWeight: 500 }}>Subscription product (recurring)</span>
            </label>
            {productMsg && <div className="error-text">{productMsg}</div>}
            <button className="btn btn-primary" type="submit" disabled={savingProduct}>{savingProduct ? 'Saving…' : 'Create Product'}</button>
          </form>
        </div>
      )}

      {showPriceFields && (
        <div className="card">
          <div className="card-title-row"><h3>Price Lists</h3></div>
          <DataTable columns={priceListColumns} rows={priceLists} emptyMessage="No price lists defined yet." />
        </div>
      )}

      <div className="stat-grid">
        <StatCard label="Total Products" value={products.length} />
        <StatCard label="Price Lists" value={priceLists.length} />
        <StatCard label="Variants" value={totalVariants} />
      </div>

      <div className="card">
        <DataTable columns={columns} rows={products} onRowClick={(r) => navigate(`/products/${r._id}`)} />
      </div>
    </div>
  )
}
