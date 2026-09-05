import { useEffect, useState } from 'react'
import DataTable from '../components/DataTable.jsx'
import Badge from '../components/Badge.jsx'
import { getDiscountConfig, updateDiscountConfig } from '../api/discountConfig.js'
import { getUsers, createUser } from '../api/users.js'
import { useAuth } from '../context/AuthContext.jsx'
import { mockDiscountConfig } from '../mockData.js'

const ROLE_LABEL = { sales_rep: 'Sales Rep', sales_manager: 'Sales Manager', finance: 'Finance', admin: 'Admin' }

export default function DiscountConfig() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [config, setConfig] = useState(mockDiscountConfig)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const [users, setUsers] = useState([])
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'sales_manager' })
  const [creatingUser, setCreatingUser] = useState(false)
  const [userMsg, setUserMsg] = useState('')

  const loadUsers = async () => {
    try {
      const res = await getUsers()
      setUsers(res.data || [])
    } catch (err) {
      console.warn('Could not load team accounts.', err?.message)
    }
  }

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
    loadUsers()
    return () => { cancelled = true }
  }, [])

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setCreatingUser(true)
    setUserMsg('')
    try {
      await createUser(newUser)
      setUserMsg(`${ROLE_LABEL[newUser.role]} account created for ${newUser.name}.`)
      setNewUser({ name: '', email: '', password: '', role: 'sales_manager' })
      await loadUsers()
    } catch (err) {
      setUserMsg(err?.response?.data?.error || 'Could not create account.')
    } finally {
      setCreatingUser(false)
    }
  }

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
          <div className="subtitle">Configure discount ceilings and approval routing (Sales Manager and Admin).</div>
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

      {isAdmin && (
        <>
          <div className="card">
            <div className="card-title-row">
              <h3>Team Accounts</h3>
            </div>
            <DataTable
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'role', label: 'Role', render: (u) => <Badge color="blue">{ROLE_LABEL[u.role] || u.role}</Badge> },
              ]}
              rows={users}
              emptyMessage="No internal accounts yet."
            />
          </div>

          <div className="card">
            <div className="card-title-row">
              <h3>Provision a Team Account</h3>
            </div>
            <div className="subtitle" style={{ marginBottom: 14 }}>
              Public sign-up only ever creates a Sales Rep - use this to grant Sales Manager, Finance, or Admin access.
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="form-row">
                <div className="form-field">
                  <label>Name</label>
                  <input value={newUser.name} onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))} required />
                </div>
                <div className="form-field">
                  <label>Email</label>
                  <input type="email" value={newUser.email} onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Password</label>
                  <input type="password" value={newUser.password} onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))} required />
                </div>
                <div className="form-field">
                  <label>Role</label>
                  <select value={newUser.role} onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))}>
                    <option value="sales_manager">Sales Manager</option>
                    <option value="finance">Finance</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              {userMsg && <div className="note-banner note-banner-success" style={{ marginBottom: 14 }}>{userMsg}</div>}
              <button className="btn btn-primary" type="submit" disabled={creatingUser}>{creatingUser ? 'Creating…' : 'Create Account'}</button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
