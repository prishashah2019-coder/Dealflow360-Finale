// Colored status badge. `color` can be passed explicitly, or omitted to
// auto-map common status strings to a sensible color.
const STATUS_COLOR_MAP = {
  // quotations / approvals
  draft: 'gray',
  'pending approval': 'amber',
  pending: 'amber',
  approved: 'green',
  'under negotiation': 'blue',
  negotiation: 'blue',
  confirmed: 'green',
  rejected: 'red',
  returned: 'amber',
  // subscriptions
  active: 'green',
  paused: 'amber',
  trial: 'blue',
  cancelled: 'red',
  // invoices
  sent: 'blue',
  unpaid: 'amber',
  'partially paid': 'amber',
  paid: 'green',
  overdue: 'red',
  // fulfillment / deal health
  backorder: 'red',
  'split pending': 'amber',
  fulfilled: 'green',
  suggested: 'amber',
  stalled: 'amber',
  'discount anomaly': 'red',
  'delivery slippage': 'red',
}

export default function Badge({ children, color, status }) {
  const key = (status ?? children ?? '').toString().trim().toLowerCase()
  const resolved = color || STATUS_COLOR_MAP[key] || 'gray'
  return <span className={`badge badge-${resolved}`}>{children}</span>
}
