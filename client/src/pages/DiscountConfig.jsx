import { useEffect, useState } from 'react'
import NoteBanner from '../components/NoteBanner.jsx'
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

  const updateCeiling = (key, index, value) => setConfig((current) => ({
    ...current,
    [key]: current[key].map((row, rowIndex) => rowIndex === index ? { ...row, maxDiscountPct: Number(value) || 0 } : row),
  }))

  const approvalDescription = (rule, index) => index === 0
    ? 'Within tier/category limit'
    : index === 1
      ? 'Over limit, blended risk medium'
      : 'Over limit, blended high risk'

  const approvalLevel = (rule) => rule.requiredRoles.length === 0
    ? 'No approval needed'
    : rule.requiredRoles.map((role) => role.replace('_', ' ')).join(' then ')

  return (
    <div>
      <div className="page-header">
        <div className="titles">
          <h1>Discount Tiers &amp; Approval Chains</h1>
          <div className="subtitle">Admin configuration for discount ceilings and approval routing.</div>
        </div>
      </div>

      <div className="discount-config-top-grid">
        <div className="discount-config-section">
          <h3>Tier Discount Ceilings</h3>
          <div className="discount-config-table">
            <div className="discount-config-header"><span>Tier</span><span>Max Discount</span></div>
            {(config.tierCeilings || []).map((row, index) => <div className="discount-config-row" key={row.tierName}><span>{row.tierName}</span><label><input type="number" min="0" max="100" value={row.maxDiscountPct} onChange={(e) => updateCeiling('tierCeilings', index, e.target.value)} /> percent</label></div>)}
          </div>
        </div>

        <div className="discount-config-section">
          <h3>Category Discount Ceilings</h3>
          <div className="discount-config-table">
            <div className="discount-config-header"><span>Category</span><span>Max Discount</span></div>
            {(config.categoryCeilings || []).map((row, index) => <div className="discount-config-row" key={row.category}><span>{row.category}</span><label><input type="number" min="0" max="100" value={row.maxDiscountPct} onChange={(e) => updateCeiling('categoryCeilings', index, e.target.value)} /> percent</label></div>)}
          </div>
        </div>
      </div>

      <div className="discount-config-section approval-chain-section">
        <h3>Approval Chain Rules</h3>
        <div className="discount-config-table">
          <div className="discount-config-header"><span>Discount Range</span><span>Required Approval</span></div>
          {(config.approvalChainRules || []).map((rule, index) => <div className="discount-config-row" key={`${rule.minScore}-${rule.maxScore}`}><span>{approvalDescription(rule, index)}</span><strong>{approvalLevel(rule)}</strong></div>)}
        </div>
      </div>

      <div className="discount-config-actions"><button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? 'Saving…' : 'Save Configuration'}</button></div>
      {savedMsg && <NoteBanner tone="success">{savedMsg}</NoteBanner>}
      <NoteBanner>When a quote mixes categories with different ceilings, the system computes a blended risk score and routes to the highest required level. All approvals, rejections, and edits must be logged with user, timestamp, and reason.</NoteBanner>
    </div>
  )
}
