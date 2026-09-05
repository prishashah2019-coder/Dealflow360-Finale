import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Kanban from '../components/Kanban.jsx'
import DataTable from '../components/DataTable.jsx'
import Badge from '../components/Badge.jsx'
import { getQuotations, createQuotation } from '../api/quotations.js'
import { getCustomers, getProducts } from '../api/products.js'
import { mockQuotations } from '../mockData.js'

const COLUMNS = [
  { key: 'Draft', label: 'Draft' },
  { key: 'Pending Approval', label: 'Pending Approval' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Under Negotiation', label: 'Negotiation' },
  { key: 'Confirmed', label: 'Confirmed' },
]

function fmtAmount(q) {
  const amount = q.amount ?? (q.lines || []).reduce((sum, l) => sum + l.quantity * l.unitPrice * (1 - (l.discountPct || 0) / 100), 0)
  return `$${Math.round(amount).toLocaleString()}`
}

export default function QuotationsList() {
  const [quotations, setQuotations] = useState([])
  const [view, setView] = useState('kanban') // 'kanban' | 'table'
  const [showCreate, setShowCreate] = useState(false)
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [newQuote, setNewQuote] = useState({ customerId: '', productId: '', quantity: 1, unitPrice: '', discountPct: 0, lineType: 'one_time' })
  const [createError, setCreateError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await getQuotations()
        if (!cancelled) setQuotations(res.data)
      } catch (err) {
        console.warn('Falling back to mock quotations list.', err?.message)
        if (!cancelled) setQuotations(mockQuotations)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    Promise.all([getCustomers(), getProducts()]).then(([customerRes, productRes]) => {
      setCustomers(customerRes.data || [])
      setProducts(productRes.data || [])
    }).catch(() => {
      setCustomers([
        { _id: 'c1', name: 'Acme Retail Co.' },
        { _id: 'c2', name: 'Blue Ridge Manufacturing' },
        { _id: 'c3', name: 'Northwind Traders' },
      ])
      setProducts([
        { _id: 'p1', name: 'Industrial Sensor Kit', basePrice: 800, isSubscription: false },
        { _id: 'p2', name: 'Cloud Monitoring Suite', basePrice: 4400, isSubscription: true },
      ])
    })
  }, [])

  const cardsByColumn = useMemo(() => {
    const byCol = {}
    COLUMNS.forEach((c) => { byCol[c.key] = [] })
    quotations.forEach((q) => {
      const col = byCol[q.status] ? q.status : 'Draft'
      byCol[col].push({
        id: q._id,
        title: `${q.customerId?.name || q.customer || 'Unknown Customer'} — ${fmtAmount(q)}`,
        meta: q.salesRepId?.name ? `Rep: ${q.salesRepId.name}` : '',
      })
    })
    return byCol
  }, [quotations])

  const handleNewQuotation = () => {
    setShowCreate((current) => !current)
    setCreateError('')
  }

  const selectedProduct = products.find((product) => product._id === newQuote.productId)
  const billing = useMemo(() => {
    const quantity = Number(newQuote.quantity) || 0
    const unitPrice = Number(newQuote.unitPrice || selectedProduct?.basePrice) || 0
    const discountPct = Math.min(100, Math.max(0, Number(newQuote.discountPct) || 0))
    const grossAmount = quantity * unitPrice
    const discountAmount = grossAmount * (discountPct / 100)
    return { grossAmount, discountAmount, netAmount: grossAmount - discountAmount, discountPct, quantity, unitPrice }
  }, [newQuote, selectedProduct])

  const handleCreateQuotation = async (event) => {
    event.preventDefault()
    setCreateError('')
    if (!newQuote.customerId || !newQuote.productId || !selectedProduct) {
      setCreateError('Choose a customer and product before creating the quotation.')
      return
    }
    try {
      const res = await createQuotation({
        customerId: newQuote.customerId,
        lines: [{
          productId: newQuote.productId,
          variant: '',
          quantity: billing.quantity || 1,
          unitPrice: billing.unitPrice,
          discountPct: billing.discountPct,
          lineType: newQuote.lineType,
          subscriptionPlanId: null,
        }],
      })
      navigate(`/quotations/${res.data._id}`)
    } catch (err) {
      console.warn('Create quotation API unavailable, opening a demo draft.', err?.message)
      const demoDraft = {
        _id: `demo-${Date.now()}`,
        customerId: { _id: newQuote.customerId, name: customers.find((customer) => customer._id === newQuote.customerId)?.name || 'Demo Customer' },
        salesRepId: { name: 'You' },
        status: 'Draft',
        amount: billing.netAmount,
        updatedAt: new Date().toISOString(),
        lines: [{
          _id: `local-line-${Date.now()}`,
          productId: selectedProduct,
          quantity: billing.quantity || 1,
          unitPrice: billing.unitPrice,
          discountPct: billing.discountPct,
          lineType: newQuote.lineType,
        }],
      }
      setQuotations((current) => [demoDraft, ...current])
      setView('table')
      setShowCreate(false)
      setCreateError('Demo quotation created locally. Connect the API server to persist it.')
    }
  }

  const columns = [
    { key: 'customer', label: 'Customer', render: (r) => r.customerId?.name || r.customer || '—' },
    { key: 'amount', label: '$ Amount', render: (r) => fmtAmount(r) },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status}>{r.status}</Badge> },
    { key: 'rep', label: 'Sales Rep', render: (r) => r.salesRepId?.name || '—' },
    { key: 'updatedAt', label: 'Updated', render: (r) => r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : '—' },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="titles">
          <h1>Quotations</h1>
          <div className="subtitle">Track every deal from draft to confirmed.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={handleNewQuotation}>{showCreate ? 'Cancel' : '+ New Quotation'}</button>
          <button className="btn btn-secondary" onClick={() => setView(view === 'kanban' ? 'table' : 'kanban')}>
            Switch to {view === 'kanban' ? 'Table' : 'Kanban'} View
          </button>
        </div>
      </div>

      {showCreate && <div className="card quotation-create-card">
        <div className="card-title-row"><div><h3>Create Quotation</h3><span className="card-subtitle">Set the customer and first deal line.</span></div></div>
        <form onSubmit={handleCreateQuotation}>
          <div className="form-row">
            <div className="form-field"><label>Customer</label><select value={newQuote.customerId} onChange={(e) => setNewQuote((current) => ({ ...current, customerId: e.target.value }))} required><option value="">Select customer</option>{customers.map((customer) => <option key={customer._id} value={customer._id}>{customer.name}</option>)}</select></div>
            <div className="form-field"><label>Product</label><select value={newQuote.productId} onChange={(e) => { const product = products.find((item) => item._id === e.target.value); setNewQuote((current) => ({ ...current, productId: e.target.value, unitPrice: product?.basePrice || '' })) }} required><option value="">Select product</option>{products.map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}</select></div>
            <div className="form-field"><label>Quantity</label><input type="number" min="1" value={newQuote.quantity} onChange={(e) => setNewQuote((current) => ({ ...current, quantity: e.target.value }))} required /></div>
          </div>
          <div className="form-row">
            <div className="form-field"><label>Unit Price</label><input type="number" min="0" value={newQuote.unitPrice} onChange={(e) => setNewQuote((current) => ({ ...current, unitPrice: e.target.value }))} required /></div>
            <div className="form-field"><label>Discount %</label><input type="number" min="0" max="100" value={newQuote.discountPct} onChange={(e) => setNewQuote((current) => ({ ...current, discountPct: e.target.value }))} /></div>
            <div className="form-field"><label>Line Type</label><select value={newQuote.lineType} onChange={(e) => setNewQuote((current) => ({ ...current, lineType: e.target.value }))}><option value="one_time">One-time</option><option value="recurring">Recurring</option></select></div>
          </div>
          <div className="billing-summary" aria-live="polite">
            <div><span>Bill before discount</span><strong>${billing.grossAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div>
            <div><span>Discount ({billing.discountPct}%)</span><strong className="billing-discount">-${billing.discountAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div>
            <div className="billing-net"><span>Net bill amount</span><strong>${billing.netAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div>
          </div>
          {createError && <div className="error-text">{createError}</div>}
          <button className="btn btn-primary" type="submit">Create Draft Quotation</button>
        </form>
      </div>}

      {view === 'kanban' ? (
        <Kanban columns={COLUMNS} cardsByColumn={cardsByColumn} onCardClick={(card) => navigate(`/quotations/${card.id}`)} />
      ) : (
        <div className="card">
          <DataTable columns={columns} rows={quotations} onRowClick={(r) => navigate(`/quotations/${r._id}`)} />
        </div>
      )}
    </div>
  )
}
