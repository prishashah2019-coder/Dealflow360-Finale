import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Guards internal-app routes. Internal roles (sales_rep, sales_manager,
// finance, admin) share the internal app; a `customer` role is bounced to
// the portal negotiation screen and never sees the internal nav/routes.
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isCustomer, user } = useAuth()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (isCustomer) return <Navigate to="/portal/quotations/me" replace />
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/dashboard" replace />

  return children
}
