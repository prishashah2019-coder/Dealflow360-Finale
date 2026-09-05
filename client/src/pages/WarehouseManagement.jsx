import { useEffect, useState } from 'react'
import DataTable from '../components/DataTable.jsx'
import { getWarehouses, createWarehouse, getStocks, getProducts, upsertStock } from '../api/products.js'

export default function WarehouseManagement() {
  const [warehouses, setWarehouses] = useState([])
  const [stocks, setStocks] = useState([])
  const [products, setProducts] = useState([])

  const [showNewWarehouse, setShowNewWarehouse] = useState(false)
  const [newWarehouse, setNewWarehouse] = useState({ name: '', shippingCostWeight: '1' })
  const [warehouseMsg, setWarehouseMsg] = useState('')

  const [stockForm, setStockForm] = useState({ productId: '', warehouseId: '', qtyAvailable: '', replenishmentRule: '' })
  const [stockMsg, setStockMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const [whRes, stockRes, prodRes] = await Promise.all([getWarehouses(), getStocks(), getProducts()])
      setWarehouses(whRes.data || [])
      setStocks(stockRes.data || [])
      setProducts(prodRes.data || [])
    } catch (err) {
      console.warn('Could not load warehouse data.', err?.message)
    }
  }

  useEffect(() => { load() }, [])

  const productName = (id) => products.find((p) => String(p._id) === String(id))?.name || id
  const warehouseName = (id) => warehouses.find((w) => String(w._id) === String(id))?.name || id

  const handleCreateWarehouse = async (e) => {
    e.preventDefault()
    setWarehouseMsg('')
    try {
      await createWarehouse({ name: newWarehouse.name, shippingCostWeight: Number(newWarehouse.shippingCostWeight) || 1 })
      setNewWarehouse({ name: '', shippingCostWeight: '1' })
      setShowNewWarehouse(false)
      await load()
    } catch (err) {
      setWarehouseMsg(err?.response?.data?.error || 'Could not create warehouse.')
    }
  }

  const handleSetStock = async (e) => {
    e.preventDefault()
    setSaving(true)
    setStockMsg('')
    try {
      await upsertStock({
        productId: stockForm.productId,
        warehouseId: stockForm.warehouseId,
        qtyAvailable: Number(stockForm.qtyAvailable) || 0,
        replenishmentRule: stockForm.replenishmentRule,
      })
      setStockMsg('Stock level saved.')
      await load()
    } catch (err) {
      setStockMsg(err?.response?.data?.error || 'Could not save stock level - Admin/Finance only.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="titles">
          <h1>Warehouses &amp; Stock</h1>
          <div className="subtitle">Create warehouses and set per-product stock levels used by the fulfillment split engine.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowNewWarehouse((v) => !v)}>
            {showNewWarehouse ? 'Cancel' : '+ New Warehouse'}
          </button>
        </div>
      </div>

      {showNewWarehouse && (
        <div className="card">
          <div className="card-title-row"><h3>New Warehouse</h3></div>
          <form onSubmit={handleCreateWarehouse}>
            <div className="form-row">
              <div className="form-field">
                <label>Name</label>
                <input value={newWarehouse.name} onChange={(e) => setNewWarehouse((w) => ({ ...w, name: e.target.value }))} placeholder="e.g. North Depot" required />
              </div>
              <div className="form-field">
                <label>Shipping Cost Weight</label>
                <input type="number" step="0.1" value={newWarehouse.shippingCostWeight} onChange={(e) => setNewWarehouse((w) => ({ ...w, shippingCostWeight: e.target.value }))} />
              </div>
            </div>
            {warehouseMsg && <div className="error-text">{warehouseMsg}</div>}
            <button className="btn btn-primary" type="submit">Create Warehouse</button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="card-title-row"><h3>Warehouses</h3></div>
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'shippingCostWeight', label: 'Shipping Cost Weight' },
          ]}
          rows={warehouses}
          emptyMessage="No warehouses yet."
        />
      </div>

      <div className="card">
        <div className="card-title-row"><h3>Set Stock Level</h3></div>
        <form onSubmit={handleSetStock}>
          <div className="form-row">
            <div className="form-field">
              <label>Product</label>
              <select value={stockForm.productId} onChange={(e) => setStockForm((s) => ({ ...s, productId: e.target.value }))} required>
                <option value="">Select a product…</option>
                {products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Warehouse</label>
              <select value={stockForm.warehouseId} onChange={(e) => setStockForm((s) => ({ ...s, warehouseId: e.target.value }))} required>
                <option value="">Select a warehouse…</option>
                {warehouses.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Qty Available</label>
              <input type="number" value={stockForm.qtyAvailable} onChange={(e) => setStockForm((s) => ({ ...s, qtyAvailable: e.target.value }))} required />
            </div>
            <div className="form-field">
              <label>Replenishment Rule</label>
              <input value={stockForm.replenishmentRule} onChange={(e) => setStockForm((s) => ({ ...s, replenishmentRule: e.target.value }))} placeholder="e.g. reorder at 5" />
            </div>
          </div>
          {stockMsg && <div className="note-banner note-banner-success" style={{ marginBottom: 14 }}>{stockMsg}</div>}
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Stock Level'}</button>
        </form>
      </div>

      <div className="card">
        <div className="card-title-row"><h3>Current Stock</h3></div>
        <DataTable
          columns={[
            { key: 'product', label: 'Product', render: (s) => productName(s.productId) },
            { key: 'warehouse', label: 'Warehouse', render: (s) => warehouseName(s.warehouseId) },
            { key: 'qtyAvailable', label: 'Qty Available' },
            { key: 'replenishmentRule', label: 'Replenishment Rule' },
          ]}
          rows={stocks}
          emptyMessage="No stock levels set yet."
        />
      </div>
    </div>
  )
}
