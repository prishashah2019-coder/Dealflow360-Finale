import { useEffect, useState } from 'react'
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
  { label: 'Discount Config', to: '/admin/discount-config', adminOnly: true },
]

export default function Layout({ children }) {
  const { user, logout, isCustomer } = useAuth()
  const navigate = useNavigate()
  const [isNavOpen, setIsNavOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsNavOpen(false)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  return (
    <div className="app-shell">
      {!isCustomer && (
        <header className="top-nav">
          <button
            className={`nav-toggle${isNavOpen ? ' open' : ''}`}
            type="button"
            aria-label={isNavOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={isNavOpen}
            onClick={() => setIsNavOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
          <button
            className="brand"
            type="button"
            aria-label="Open navigation"
            aria-expanded={isNavOpen}
            onClick={() => setIsNavOpen((open) => !open)}
          >
            DealFlow360
          </button>
          <nav className={`nav-links${isNavOpen ? ' open' : ''}`}>
            {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'admin').map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setIsNavOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="nav-right">
            <button className="nav-icon-btn" type="button" aria-label="Notifications" onClick={() => navigate('/deal-health')}>
              <i className="fa-regular fa-bell" aria-hidden="true" />
              <span className="notification-dot">3</span>
            </button>
            {user && (
              <div className="nav-user">
                <span className="nav-avatar">{(user.name || user.email || 'U').charAt(0).toUpperCase()}</span>
                <span className="nav-user-copy">
                  <strong>{user.name || user.email}</strong>
                  <small>{user.role?.replace('_', ' ')}</small>
                </span>
                <i className="fa-solid fa-chevron-down nav-chevron" aria-hidden="true" />
              </div>
            )}
            <button className="logout-btn" onClick={handleLogout}>Log Out</button>
          </div>
          <button
            className={`nav-backdrop${isNavOpen ? ' visible' : ''}`}
            type="button"
            aria-label="Close navigation"
            onClick={() => setIsNavOpen(false)}
          />
        </header>
      )}
      <main className="page">{children}</main>
    </div>
  )
}
