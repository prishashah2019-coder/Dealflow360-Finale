import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Each internal role sees a genuinely different nav, matching its actual
// responsibilities per the problem statement - not just the same 9 links
// for everyone with different data underneath.
const NAV_BY_ROLE = {
  sales_rep: [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Quotations', to: '/quotations' },
    { label: 'Approvals', to: '/approvals' },
    { label: 'Fulfillment', to: '/fulfillment' },
    { label: 'Subscriptions', to: '/subscriptions' },
    { label: 'Invoices', to: '/invoices' },
    { label: 'Deal Health', to: '/deal-health' },
    { label: 'Product', to: '/products' },
  ],
  sales_manager: [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Quotations', to: '/quotations' },
    { label: 'Approvals', to: '/approvals' },
    { label: 'Deal Health', to: '/deal-health' },
    { label: 'Discount Config', to: '/admin/discount-config' },
    { label: 'Reports', to: '/reports' },
  ],
  finance: [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Fulfillment', to: '/fulfillment' },
    { label: 'Subscriptions', to: '/subscriptions' },
    { label: 'Invoices', to: '/invoices' },
    { label: 'Credit Notes', to: '/credit-notes' },
    { label: 'Approvals', to: '/approvals' },
    { label: 'Reports', to: '/reports' },
  ],
  admin: [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Product', to: '/products' },
    { label: 'Warehouses', to: '/admin/warehouses' },
    { label: 'Discount Config', to: '/admin/discount-config' },
    { label: 'Reports', to: '/reports' },
    { label: 'Audit Log', to: '/admin/audit-log' },
  ],
}

export default function Layout({ children }) {
  const { user, logout, isCustomer } = useAuth()
  const navigate = useNavigate()
  const navItems = NAV_BY_ROLE[user?.role] || NAV_BY_ROLE.sales_rep

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      {!isCustomer && (
        <header className="top-nav">
          <span className="brand">DealFlow360</span>
          <nav className="nav-links">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="nav-right">
            {user && <span>{user.name || user.email} · {user.role}</span>}
            <button className="logout-btn" onClick={handleLogout}>Log Out</button>
          </div>
        </header>
      )}
      <main className="page">{children}</main>
    </div>
  )
}
