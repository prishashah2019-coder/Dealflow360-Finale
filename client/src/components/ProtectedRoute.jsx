import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Guards internal-app routes. Internal roles (sales_rep, sales_manager,
// finance, admin) share the internal app; a `customer` role is bounced to
// the customer portal and never sees the internal nav/routes.
// `allowRoles` restricts a route to specific internal roles (e.g. only
// finance/admin can reach Credit Notes) - omit it for routes every internal
// role can view. `adminOnly` is kept as shorthand for allowRoles={['admin']}.
export default function ProtectedRoute({ children, adminOnly = false, allowRoles }) {
  const { isAuthenticated, isCustomer, user } = useAuth()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (isCustomer) return <Navigate to="/portal" replace />

  const roles = allowRoles || (adminOnly ? ['admin'] : null)
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />

  return children
}
