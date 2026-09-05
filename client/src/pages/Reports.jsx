import { useEffect, useState } from 'react'
import StatCard from '../components/StatCard.jsx'
import PieChart from '../components/PieChart.jsx'
import { getReports } from '../api/reports.js'
import { getUsers } from '../api/users.js'
import { getProducts } from '../api/products.js'
import { mockReports, mockProducts, mockQuotations } from '../mockData.js'

const STATUS_COLORS = {
  'Draft': '#6f6559',
  'Pending Approval': '#b45309',
  'Approved': '#3d5a80',
  'Under Negotiation': '#b5652f',
  'Confirmed': '#16a34a',
  'Rejected': '#b3401f',
}

const mockReps = [
  { _id: 'u1', name: 'Priya Nair', role: 'sales_rep' },
  { _id: 'u2', name: 'Jordan Lee', role: 'sales_rep' },
]

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function Reports() {
  const [filters, setFilters] = useState({ period: '30d', repId: '', status: '', productId: '' })
  const [report, setReport] = useState(mockReports)
  const [reps, setReps] = useState([])
  const [products, setProducts] = useState([])

  useEffect(() => {
    let cancelled = false
    async function loadOptions() {
      try {
        const res = await getUsers()
        if (!cancelled) setReps((res.data || []).filter((u) => u.role === 'sales_rep'))
      } catch (err) {
        console.warn('Rep list unavailable for filter.', err?.message)
        if (!cancelled) setReps(mockReps)
      }
      try {
        const res = await getProducts()
        if (!cancelled) setProducts(res.data || [])
      } catch (err) {
        console.warn('Product list unavailable for filter.', err?.message)
        if (!cancelled) setProducts(mockProducts)
      }
    }
    loadOptions()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await getReports(filters)
        if (!cancelled) setReport(res.data)
      } catch (err) {
        console.warn('Falling back to mock reports data.', err?.message)
        if (!cancelled) setReport({ ...mockReports, quotations: mockQuotations })
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const update = (field) => (e) => setFilters((f) => ({ ...f, [field]: e.target.value }))
  const reportQuotations = report.quotations || mockQuotations

  // Prefer the server's real per-status counts; only derive from the visible
  // quotation rows (e.g. when running on mock data) if the API didn't send one.
  const statusBreakdown = report.statusBreakdown || Object.keys(STATUS_COLORS).map((label) => ({
    label,
    value: reportQuotations.filter((q) => q.status === label).length,
  }))
  const pieData = statusBreakdown.map((s) => ({ ...s, color: STATUS_COLORS[s.label] || '#6f6559' }))
  const netRevenue = report.netRevenue != null
    ? Number(report.netRevenue)
    : reportQuotations.reduce((sum, quotation) => {
      if (quotation.amount != null) return sum + (Number(quotation.amount) || 0)
      return sum + (quotation.lines || []).reduce((lineSum, line) => {
        const quantity = Number(line.quantity) || 0
        const unitPrice = Number(line.unitPrice) || 0
        const discount = (Number(line.discountPct) || 0) / 100
        return lineSum + quantity * unitPrice * (1 - discount)
      }, 0)
    }, 0)

  const handleExportXls = () => {
    const rows = report.quotations || mockQuotations
    const header = 'Quotation,Customer,Status,Blended Risk Score,Created'
    const lines = rows.map((q) => [
      q._id,
      (q.customerId?.name || '').replace(/,/g, ' '),
      q.status,
      q.blendedRiskScore ?? 0,
      new Date(q.createdAt).toLocaleDateString(),
    ].join(','))
    const csv = [header, ...lines].join('\n') || header
    downloadFile(`dealflow360-report-${Date.now()}.csv`, csv, 'text/csv')
  }

  const handleExportPdf = () => {
    // No PDF library wired up for a hackathon-scope report - the browser's
    // print-to-PDF covers the same need without extra dependencies.
    window.print()
  }

  return (
    <div>
      <div className="page-header">
        <div className="titles">
          <h1>Admin / Reporting Dashboard</h1>
          <div className="subtitle">Pipeline performance across reps, products, and approval stages.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={handleExportPdf}>Export PDF</button>
          <button className="btn btn-secondary" onClick={handleExportXls}>Export XLS</button>
        </div>
      </div>

      <div className="filter-bar">
        <select value={filters.period} onChange={update('period')}>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="ytd">Year to date</option>
        </select>
        <select value={filters.repId} onChange={update('repId')}>
          <option value="">All Sales Teams</option>
          {reps.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
        </select>
        <select value={filters.status} onChange={update('status')}>
          <option value="">Any Approval Status</option>
          <option value="Pending Approval">Pending Approval</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
        <select value={filters.productId} onChange={update('productId')}>
          <option value="">All Products</option>
          {products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
      </div>

      <div className="stat-grid">
        <StatCard label="Quotes Created" value={report.quotesCreated} />
        <StatCard label="Net Revenue" value={`$${netRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} accent="blue" sub={`${reportQuotations.length} quotation records`} />
        <StatCard label="Avg Approval Time" value={report.avgApprovalTime != null ? String(report.avgApprovalTime).replace(/\s*h(?:rs?)?$/i, ' hrs') : '—'} />
        <StatCard label="Top Upsold Product" value={report.topUpsoldProduct} />
      </div>

      <div className="card">
        <div className="card-title-row">
          <div><h3>Pipeline by Stage</h3><span className="card-subtitle">Every quotation in the current filter, broken down by status.</span></div>
        </div>
        <PieChart data={pieData} emptyMessage="No quotations match these filters yet." />
      </div>
    </div>
  )
}
