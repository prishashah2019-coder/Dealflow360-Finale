import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Layout from './components/Layout.jsx'
import { useAuth } from './context/AuthContext.jsx'

import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import QuotationsList from './pages/QuotationsList.jsx'
import QuotationDetail from './pages/QuotationDetail.jsx'
import ApprovalsList from './pages/ApprovalsList.jsx'
import ApprovalDetail from './pages/ApprovalDetail.jsx'
import FulfillmentList from './pages/FulfillmentList.jsx'
import FulfillmentDetail from './pages/FulfillmentDetail.jsx'
import SubscriptionsList from './pages/SubscriptionsList.jsx'
import SubscriptionDetail from './pages/SubscriptionDetail.jsx'
import InvoicesList from './pages/InvoicesList.jsx'
import InvoiceDetail from './pages/InvoiceDetail.jsx'
import DealHealth from './pages/DealHealth.jsx'
import Reports from './pages/Reports.jsx'
import ProductCatalog from './pages/ProductCatalog.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import DiscountConfig from './pages/DiscountConfig.jsx'
import PortalNegotiation from './pages/PortalNegotiation.jsx'

function withLayout(Component, props = {}) {
  return (
    <Layout>
      <Component {...props} />
    </Layout>
  )
}

export default function App() {
  const { isAuthenticated, isCustomer } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated
            ? <Navigate to={isCustomer ? '/portal/quotations/me' : '/dashboard'} replace />
            : <Login />
        }
      />

      <Route path="/dashboard" element={<ProtectedRoute>{withLayout(Dashboard)}</ProtectedRoute>} />

      <Route path="/quotations" element={<ProtectedRoute>{withLayout(QuotationsList)}</ProtectedRoute>} />
      <Route path="/quotations/:id" element={<ProtectedRoute>{withLayout(QuotationDetail)}</ProtectedRoute>} />

      <Route path="/approvals" element={<ProtectedRoute>{withLayout(ApprovalsList)}</ProtectedRoute>} />
      <Route path="/approvals/:id" element={<ProtectedRoute>{withLayout(ApprovalDetail)}</ProtectedRoute>} />

      <Route path="/fulfillment" element={<ProtectedRoute>{withLayout(FulfillmentList)}</ProtectedRoute>} />
      <Route path="/fulfillment/:id" element={<ProtectedRoute>{withLayout(FulfillmentDetail)}</ProtectedRoute>} />

      <Route path="/subscriptions" element={<ProtectedRoute>{withLayout(SubscriptionsList)}</ProtectedRoute>} />
      <Route path="/subscriptions/:id" element={<ProtectedRoute>{withLayout(SubscriptionDetail)}</ProtectedRoute>} />

      <Route path="/invoices" element={<ProtectedRoute>{withLayout(InvoicesList)}</ProtectedRoute>} />
      <Route path="/invoices/:id" element={<ProtectedRoute>{withLayout(InvoiceDetail)}</ProtectedRoute>} />

      <Route path="/deal-health" element={<ProtectedRoute>{withLayout(DealHealth)}</ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute>{withLayout(Reports)}</ProtectedRoute>} />

      <Route path="/products" element={<ProtectedRoute>{withLayout(ProductCatalog)}</ProtectedRoute>} />
      <Route path="/products/:id" element={<ProtectedRoute>{withLayout(ProductDetail)}</ProtectedRoute>} />

      <Route
        path="/admin/discount-config"
        element={<ProtectedRoute adminOnly>{withLayout(DiscountConfig)}</ProtectedRoute>}
      />

      {/* Customer portal: separate, restricted, customer-only. No top nav.
          Internal users are bounced to the dashboard rather than being able
          to view a customer's negotiation screen. */}
      <Route
        path="/portal/quotations/:id"
        element={
          !isAuthenticated ? <Navigate to="/login" replace />
          : !isCustomer ? <Navigate to="/dashboard" replace />
          : <PortalNegotiation />
        }
      />

      <Route path="/" element={<Navigate to={isAuthenticated ? (isCustomer ? '/portal/quotations/me' : '/dashboard') : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
