import { useEffect, useState } from 'react'
import StatCard from '../components/StatCard.jsx'
import { getReports } from '../api/reports.js'
import { getUsers } from '../api/users.js'
import { getProducts } from '../api/products.js'
import { mockReports } from '../mockData.js'

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
      }
      try {
        const res = await getProducts()
        if (!cancelled) setProducts(res.data || [])
      } catch (err) {
        console.warn('Product list unavailable for filter.', err?.message)
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
        if (!cancelled) setReport(mockReports)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const update = (field) => (e) => setFilters((f) => ({ ...f, [field]: e.target.value }))

  const handleExportXls = () => {
    const rows = report.quotations || []
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
        <StatCard label="Avg Approval Time" value={report.avgApprovalTime != null ? `${report.avgApprovalTime}h` : '—'} />
        <StatCard label="Top Upsold Product" value={report.topUpsoldProduct} />
      </div>
    </div>
  )
}
