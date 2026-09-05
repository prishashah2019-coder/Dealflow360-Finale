import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Quotations', to: '/quotations' },
  { label: 'Approvals', to: '/approvals' },
  { label: 'Fulfillment', to: '/fulfillment' },
  { label: 'Subscriptions', to: '/subscriptions' },
  { label: 'Invoices', to: '/invoices' },
  { label: 'Deal Health', to: '/deal-health' },
  { label: 'Reports', to: '/reports' },
  { label: 'Product', to: '/products' },
]

export default function Layout({ children }) {
  const { user, logout, isCustomer } = useAuth()
  const navigate = useNavigate()

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
            {NAV_ITEMS.map((item) => (
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
