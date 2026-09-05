import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login as loginApi, signup as signupApi, customerSignup as customerSignupApi, customerLogin as customerLoginApi } from '../api/auth.js'
import { useAuth } from '../context/AuthContext.jsx'

const FEATURES = [
  { icon: 'fa-solid fa-shield', title: 'Discount governance', text: 'Every line is checked against its own tier and category limit, with automatic approval routing.' },
  { icon: 'fa-solid fa-box', title: 'Multi-warehouse fulfillment', text: 'Live stock splits orders across warehouses automatically, with manual override.' },
  { icon: 'fa-solid fa-repeat', title: 'Hybrid billing', text: 'One-time products and recurring subscriptions reconciled on a single order.' },
  { icon: 'fa-solid fa-comment', title: 'Customer negotiation portal', text: 'Customers counter-offer directly - terms beyond threshold re-enter approval automatically.' },
]

const SIGNUP_ROLES = [
  { value: 'sales_rep', label: 'Sales Rep' },
  { value: 'sales_manager', label: 'Sales Manager' },
  { value: 'finance', label: 'Finance' },
  { value: 'admin', label: 'Admin' },
  { value: 'customer', label: 'Customer' },
]

export default function Login() {
  const [tab, setTab] = useState('login') // 'login' | 'signup'
  const [asCustomer, setAsCustomer] = useState(false) // login tab only
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'sales_rep' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (tab === 'signup') {
        if (form.role === 'customer') {
          const res = await customerSignupApi({ name: form.name, email: form.email, password: form.password })
          const { token, customer } = res.data
          login(token, { ...customer, role: 'customer' })
          navigate('/portal')
        } else {
          const res = await signupApi({ name: form.name, email: form.email, password: form.password, role: form.role })
          const { token, user } = res.data
          login(token, user)
          navigate('/dashboard')
        }
        return
      }

      if (asCustomer) {
        const res = await customerLoginApi({ email: form.email, password: form.password })
        const { token, customer } = res.data
        login(token, { ...customer, role: 'customer' })
        navigate('/portal')
      } else {
        const res = await loginApi({ email: form.email, password: form.password })
        const { token, user } = res.data
        login(token, user)
        navigate('/dashboard')
      }
    } catch (err) {
      // Show the real reason (wrong credentials, backend unreachable, etc.)
      // instead of silently dropping the user into a fake session - that
      // masked real failures and made the app look broken.
      setError(err?.response?.data?.error || 'Could not sign in. Check your credentials and that the API server is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="landing-shell">
      <div className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-logo">DealFlow360</div>
          <h1>An intelligent, self-governing sales operations platform</h1>
          <br />
          <br />
          <ul className="landing-features">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <span className="ico" aria-hidden="true"><i className={f.icon} /></span>
                <div>
                  <div className="ft-title">{f.title}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="landing-hero-photo" aria-hidden="true" />
        <div className="landing-hero-glass" aria-hidden="true">
          <div className="pane p1" />
        </div>
      </div>

      <div className="landing-form-side">
        <div className="auth-card">
          <div className="glass-panel">
            <div className="auth-tabs">
              <button className={tab === 'login' ? 'active' : ''} onClick={() => setTab('login')} type="button">
                Log In
              </button>
              <button className={tab === 'signup' ? 'active' : ''} onClick={() => setTab('signup')} type="button">
                Sign Up
              </button>
            </div>

            <form key={tab} className="auth-form" onSubmit={handleSubmit}>
              {tab === 'signup' && (
                <div className="form-field">
                  <label>Name</label>
                  <input value={form.name} onChange={update('name')} placeholder="Jane Doe" required />
                </div>
              )}

              <div className="form-field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={update('email')} placeholder="you@company.com" required />
              </div>

              <div className="form-field">
                <label>Password</label>
                <input type="password" value={form.password} onChange={update('password')} placeholder="••••••••" required />
              </div>

              {tab === 'signup' ? (
                <div className="form-field">
                  <label>Role</label>
                  <select value={form.role} onChange={update('role')}>
                    {SIGNUP_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              ) : (
                <label className="form-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={asCustomer}
                    onChange={(e) => setAsCustomer(e.target.checked)}
                  />
                  <span style={{ fontWeight: 500, color: 'var(--text)' }}>I'm a customer logging into the portal</span>
                </label>
              )}

              {tab === 'login' && <span className="forgot-link">Forgot Password?</span>}
              {error && <div className="error-text">{error}</div>}

              <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                {loading
                  ? 'Please wait…'
                  : tab === 'login'
                    ? 'Log In'
                    : `Create ${SIGNUP_ROLES.find((r) => r.value === form.role)?.label} Account`}
              </button>
            </form>
          </div>

          <div className="auth-footnote">
            Pick any role to sign up with, or log in with an existing account.
            Customers land on their own Quotation Portal; every internal role lands on a dashboard tailored to it.
          </div>
        </div>
      </div>
    </div>
  )
}
