import { useEffect, useState } from 'react'
import DataTable from '../components/DataTable.jsx'
import { getDiscountConfig, updateDiscountConfig } from '../api/discountConfig.js'
import { mockDiscountConfig } from '../mockData.js'

export default function DiscountConfig() {
  const [config, setConfig] = useState(mockDiscountConfig)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await getDiscountConfig()
        if (!cancelled) setConfig(res.data)
      } catch (err) {
        console.warn('Falling back to mock discount config.', err?.message)
        if (!cancelled) setConfig(mockDiscountConfig)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSavedMsg('')
    try {
      await updateDiscountConfig(config)
      setSavedMsg('Configuration saved.')
    } catch (err) {
      console.warn('Update-discount-config API unavailable (demo mode).', err?.message)
      setSavedMsg('Saved locally (demo mode — backend not connected).')
    } finally {
      setSaving(false)
    }
  }

  const tierColumns = [
    { key: 'tierName', label: 'Tier' },
    { key: 'maxDiscountPct', label: 'Max Discount %', render: (r) => `${r.maxDiscountPct}%` },
  ]

  const categoryColumns = [
    { key: 'category', label: 'Category' },
    { key: 'maxDiscountPct', label: 'Max Discount %', render: (r) => `${r.maxDiscountPct}%` },
  ]

  const chainColumns = [
    { key: 'range', label: 'Discount Range', render: (r) => `${r.minScore}% – ${r.maxScore}%` },
    { key: 'requiredRoles', label: 'Required Approval Level', render: (r) => (
      r.requiredRoles.length === 0 ? 'Auto-approved' : r.requiredRoles.map((role) => role.replace('_', ' ')).join(' → ')
    ) },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="titles">
          <h1>Discount Tiers &amp; Approval Chains</h1>
          <div className="subtitle">Admin configuration for discount ceilings and approval routing.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>Save Configuration</button>
        </div>
      </div>

      {savedMsg && <div className="note-banner" style={{ background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid rgba(22,163,74,0.25)' }}>{savedMsg}</div>}

      <div className="card">
        <div className="card-title-row">
          <h3>Tier Discount Ceilings</h3>
        </div>
        <DataTable columns={tierColumns} rows={config.tierCeilings || []} />
      </div>

      <div className="card">
        <div className="card-title-row">
          <h3>Category Discount Ceilings</h3>
        </div>
        <DataTable columns={categoryColumns} rows={config.categoryCeilings || []} />
      </div>

      <div className="card">
        <div className="card-title-row">
          <h3>Approval Chain</h3>
        </div>
        <DataTable columns={chainColumns} rows={config.approvalChainRules || []} />
      </div>
    </div>
  )
}
