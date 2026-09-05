// Sample/mocked fallback data used when the real API isn't reachable yet,
// so the UI stays demoable. Shapes mirror the Mongoose schema field names
// from SPEC.md section 2 as closely as possible.

export const mockQuotations = [
  {
    _id: 'q1001',
    customerId: { _id: 'c1', name: 'Acme Retail Co.' },
    salesRepId: { _id: 'u1', name: 'Priya Nair' },
    status: 'Draft',
    blendedRiskScore: 0,
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-28T09:00:00Z',
    amount: 12400,
    lines: [
      { _id: 'l1', productId: { _id: 'p1', name: 'Industrial Sensor Kit', category: 'Hardware' }, variant: 'Standard', quantity: 10, unitPrice: 800, discountPct: 5, lineType: 'one_time' },
      { _id: 'l2', productId: { _id: 'p2', name: 'Cloud Monitoring Suite', category: 'Software' }, variant: 'Pro', quantity: 1, unitPrice: 4400, discountPct: 0, lineType: 'recurring', subscriptionPlanId: 'plan1' },
    ],
  },
  {
    _id: 'q1002',
    customerId: { _id: 'c2', name: 'Blue Ridge Manufacturing' },
    salesRepId: { _id: 'u1', name: 'Priya Nair' },
    status: 'Pending Approval',
    blendedRiskScore: 8.4,
    createdAt: '2026-08-15T10:00:00Z',
    updatedAt: '2026-08-30T09:00:00Z',
    amount: 58200,
    lines: [
      { _id: 'l1', productId: { _id: 'p3', name: 'Conveyor Belt Unit', category: 'Hardware' }, variant: 'Heavy Duty', quantity: 6, unitPrice: 9200, discountPct: 18, lineType: 'one_time' },
    ],
  },
  {
    _id: 'q1003',
    customerId: { _id: 'c3', name: 'Northwind Traders' },
    salesRepId: { _id: 'u2', name: 'Jordan Lee' },
    status: 'Approved',
    blendedRiskScore: 3.1,
    createdAt: '2026-08-10T10:00:00Z',
    updatedAt: '2026-08-29T09:00:00Z',
    amount: 21750,
    lines: [
      { _id: 'l3', productId: { _id: 'p1', name: 'Industrial Sensor Kit', category: 'Hardware' }, variant: 'Standard', quantity: 15, unitPrice: 800, discountPct: 0, lineType: 'one_time' },
      { _id: 'l4', productId: { _id: 'p2', name: 'Cloud Monitoring Suite', category: 'Software' }, variant: 'Pro', quantity: 1, unitPrice: 9750, discountPct: 0, lineType: 'recurring', subscriptionPlanId: 'plan1' },
    ],
  },
  {
    _id: 'q1004',
    customerId: { _id: 'c4', name: 'Summit Logistics' },
    salesRepId: { _id: 'u2', name: 'Jordan Lee' },
    status: 'Under Negotiation',
    blendedRiskScore: 5.6,
    createdAt: '2026-08-05T10:00:00Z',
    updatedAt: '2026-08-25T09:00:00Z',
    amount: 33900,
    lines: [
      { _id: 'l5', productId: { _id: 'p2', name: 'Cloud Monitoring Suite', category: 'Software' }, variant: 'Enterprise', quantity: 3, unitPrice: 11000, discountPct: 5, lineType: 'recurring', subscriptionPlanId: 'plan1' },
      { _id: 'l6', productId: { _id: 'p3', name: 'Conveyor Belt Unit', category: 'Hardware' }, variant: 'Standard', quantity: 1, unitPrice: 4500, discountPct: 0, lineType: 'one_time' },
    ],
  },
  {
    _id: 'q1005',
    customerId: { _id: 'c5', name: 'Harborline Foods' },
    salesRepId: { _id: 'u1', name: 'Priya Nair' },
    status: 'Confirmed',
    blendedRiskScore: 0,
    createdAt: '2026-07-28T10:00:00Z',
    updatedAt: '2026-08-02T09:00:00Z',
    amount: 15300,
  },
  {
    _id: 'q1006',
    customerId: { _id: 'c6', name: 'Green Valley Farms' },
    salesRepId: { _id: 'u2', name: 'Jordan Lee' },
    status: 'Draft',
    blendedRiskScore: 0,
    createdAt: '2026-08-27T10:00:00Z',
    updatedAt: '2026-09-01T09:00:00Z',
    amount: 20000,
    lines: [
      { _id: 'l7', productId: { _id: 'p1', name: 'Industrial Sensor Kit', category: 'Hardware' }, variant: 'Standard', quantity: 20, unitPrice: 1000, discountPct: 0, lineType: 'one_time' },
    ],
  },
  {
    _id: 'q1007',
    customerId: { _id: 'c7', name: 'Delta Airlines Supply' },
    salesRepId: { _id: 'u1', name: 'Priya Nair' },
    status: 'Approved',
    blendedRiskScore: 2.4,
    createdAt: '2026-08-22T10:00:00Z',
    updatedAt: '2026-09-02T09:00:00Z',
    amount: 30000,
    lines: [
      { _id: 'l8', productId: { _id: 'p3', name: 'Conveyor Belt Unit', category: 'Hardware' }, variant: 'Heavy Duty', quantity: 3, unitPrice: 10000, discountPct: 0, lineType: 'one_time' },
    ],
  },
  {
    _id: 'q1008',
    customerId: { _id: 'c8', name: 'Union Steelworks' },
    salesRepId: { _id: 'u2', name: 'Jordan Lee' },
    status: 'Confirmed',
    blendedRiskScore: 0,
    createdAt: '2026-08-18T10:00:00Z',
    updatedAt: '2026-09-03T09:00:00Z',
    amount: 40000,
    lines: [
      { _id: 'l9', productId: { _id: 'p3', name: 'Conveyor Belt Unit', category: 'Hardware' }, variant: 'Heavy Duty', quantity: 4, unitPrice: 10000, discountPct: 0, lineType: 'one_time' },
    ],
  },
  {
    _id: 'q1009',
    customerId: { _id: 'c9', name: 'Cascade Retailers' },
    salesRepId: { _id: 'u1', name: 'Priya Nair' },
    status: 'Confirmed',
    blendedRiskScore: 0,
    createdAt: '2026-08-12T10:00:00Z',
    updatedAt: '2026-09-04T09:00:00Z',
    amount: 52450,
    lines: [
      { _id: 'l10', productId: { _id: 'p1', name: 'Industrial Sensor Kit', category: 'Hardware' }, variant: 'Industrial', quantity: 25, unitPrice: 1500, discountPct: 0, lineType: 'one_time' },
      { _id: 'l11', productId: { _id: 'p2', name: 'Cloud Monitoring Suite', category: 'Software' }, variant: 'Pro', quantity: 1, unitPrice: 14950, discountPct: 0, lineType: 'recurring', subscriptionPlanId: 'plan1' },
    ],
  },
]

export const mockApprovals = [
  {
    _id: 'a1', quotationId: 'q1002', customer: 'Blue Ridge Manufacturing', discountPct: 18,
    riskLevel: 'High', stage: 'Sales Manager', assignedTo: 'Marcus Webb', limitPct: 12, status: 'pending',
  },
  {
    _id: 'a2', quotationId: 'q1006', customer: 'Green Valley Farms', discountPct: 22,
    riskLevel: 'High', stage: 'Finance', assignedTo: 'Rita Chen', limitPct: 15, status: 'pending',
  },
  {
    _id: 'a3', quotationId: 'q1007', customer: 'Delta Airlines Supply', discountPct: 9,
    riskLevel: 'Medium', stage: 'Sales Manager', assignedTo: 'Marcus Webb', limitPct: 12, status: 'approved',
  },
  {
    _id: 'a4', quotationId: 'q1008', customer: 'Union Steelworks', discountPct: 27,
    riskLevel: 'High', stage: 'Finance', assignedTo: 'Rita Chen', limitPct: 15, status: 'rejected',
  },
]

export const mockApprovalDetail = {
  _id: 'q1002',
  customerId: { _id: 'c2', name: 'Blue Ridge Manufacturing', tier: 'Gold' },
  blendedRiskScore: 8.4,
  lines: [
    { _id: 'l1', productName: 'Conveyor Belt Unit', discountPct: 18, limitAllowed: 12, givenBy: 'Priya Nair' },
  ],
  approvals: [
    { _id: 'ap1', approverRole: 'sales_manager', approverName: 'Marcus Webb', stepOrder: 1, status: 'pending', comment: '', decidedAt: null },
    { _id: 'ap2', approverRole: 'finance', approverName: 'Rita Chen', stepOrder: 2, status: 'pending', comment: '', decidedAt: null },
  ],
  auditLog: [
    { user: 'Priya Nair', role: 'sales_rep', action: 'Submitted for Approval', date: '2026-08-30T09:00:00Z', note: 'Customer requested extra 6% off list' },
  ],
}

export const mockStocks = [
  { warehouse: 'Main Warehouse', product: 'Laptop Pro 14', inStock: 40, reserved: 18, available: 22 },
  { warehouse: 'East Depot', product: 'Laptop Pro 14', inStock: 10, reserved: 6, available: 4 },
  { warehouse: 'Main Warehouse', product: 'Docking Station', inStock: 65, reserved: 12, available: 53 },
]

export const mockFulfillmentOrders = [
  { _id: 'q1002', order: 'Q-1042', customer: 'Acme Corp', status: 'Split Pending', warehouse: 'Main + East Depot' },
  { _id: 'q1009', order: 'Q-1030', customer: 'Zenith Co', status: 'Backorder', warehouse: 'East Depot' },
]

export const mockFulfillmentDetail = {
  quotationId: 'q1003',
  customer: 'Northwind Traders',
  splits: [
    { _id: 'f1', warehouseId: { name: 'North DC' }, productId: { name: 'Industrial Sensor Kit' }, qtyFulfilled: 40, qtyShipped: 30, qtyRemaining: 10, shipmentCost: 220, isBackorder: false },
    { _id: 'f2', warehouseId: { name: 'West Coast Hub' }, productId: { name: 'Industrial Sensor Kit' }, qtyFulfilled: 0, qtyShipped: 0, qtyRemaining: 10, shipmentCost: 0, isBackorder: true },
  ],
}

export const mockSubscriptions = [
  { _id: 's1', customer: 'Acme Retail Co.', plan: 'Cloud Monitoring Suite - Pro', cycle: 'monthly', nextBill: '2026-09-15', status: 'active' },
  { _id: 's2', customer: 'Summit Logistics', plan: 'Fleet Tracker - Standard', cycle: 'yearly', nextBill: '2027-01-02', status: 'paused' },
  { _id: 's3', customer: 'Delta Airlines Supply', plan: 'Analytics Add-on', cycle: 'quarterly', nextBill: '2026-10-01', status: 'cancelled' },
]

export const mockSubscriptionDetail = {
  _id: 's1',
  customer: 'Acme Retail Co.',
  oneTimeLines: [
    { product: 'Industrial Sensor Kit', qty: 10, price: 800, amount: 7600 },
  ],
  recurringLines: [
    { plan: 'Cloud Monitoring Suite - Pro', cycle: 'monthly', nextBilling: '2026-09-15', amount: 4400 },
  ],
}

export const mockInvoices = [
  { _id: 'inv1', number: 'INV-2026-1001', customer: 'Acme Retail Co.', amount: 12400, status: 'Unpaid', dueDate: '2026-09-20' },
  { _id: 'inv2', number: 'INV-2026-1002', customer: 'Harborline Foods', amount: 15300, status: 'Paid', dueDate: '2026-08-15' },
  { _id: 'inv3', number: 'INV-2026-1003', customer: 'Northwind Traders', amount: 21750, status: 'Partially Paid', dueDate: '2026-09-05' },
  { _id: 'inv4', number: 'INV-2026-1004', customer: 'Blue Ridge Manufacturing', amount: 58200, status: 'Sent', dueDate: '2026-09-28' },
]

export const mockInvoiceDetail = {
  _id: 'inv1',
  number: 'INV-2026-1001',
  customer: 'Acme Retail Co.',
  status: 'Unpaid',
  dueDate: '2026-09-20',
  amount: 12400,
  lines: [
    { product: 'Industrial Sensor Kit', amount: 7600 },
    { product: 'Cloud Monitoring Suite - Pro (month 1)', amount: 4800 },
  ],
}

export const mockDealHealth = [
  { deal: 'q1004', issue: 'Stalled 14 days', flagged: '2026-08-30', action: 'stalled' },
  { deal: 'q1002', issue: 'Discount 18% vs rep avg 7%', flagged: '2026-08-29', action: 'discount_anomaly' },
  { deal: 'q1009', issue: 'Shipment 6 days past expected date', flagged: '2026-08-27', action: 'delivery_slippage' },
]

export const mockReports = {
  quotesCreated: 142,
  avgApprovalTime: '6.4 hrs',
  topUpsoldProduct: 'Cloud Monitoring Suite',
}

export const mockProducts = [
  { _id: 'p1', name: 'Industrial Sensor Kit', category: 'Hardware', basePrice: 800, unit: 'unit', taxPct: 8, isSubscription: false },
  { _id: 'p2', name: 'Cloud Monitoring Suite', category: 'Software', basePrice: 4400, unit: 'seat', taxPct: 0, isSubscription: true },
  { _id: 'p3', name: 'Conveyor Belt Unit', category: 'Hardware', basePrice: 9200, unit: 'unit', taxPct: 8, isSubscription: false },
]

export const mockProductDetail = {
  _id: 'p1',
  name: 'Industrial Sensor Kit',
  category: 'Hardware',
  basePrice: 800,
  unit: 'unit',
  taxPct: 8,
  isSubscription: false,
  recurringCycle: '—',
  qtyOnHand: 340,
  variants: [
    { attributeName: 'Color', attributeValue: 'Black', extraPrice: 0 },
    { attributeName: 'Color', attributeValue: 'Industrial Yellow', extraPrice: 25 },
  ],
  priceLists: [
    { tier: 'Gold', currency: 'USD', priceRule: '15% off base' },
    { tier: 'Silver', currency: 'USD', priceRule: '8% off base' },
    { tier: 'Bronze', currency: 'USD', priceRule: 'List price' },
  ],
}

export const mockDiscountConfig = {
  tierCeilings: [
    { tierName: 'Bronze', maxDiscountPct: 5 },
    { tierName: 'Silver', maxDiscountPct: 10 },
    { tierName: 'Gold', maxDiscountPct: 15 },
  ],
  categoryCeilings: [
    { category: 'Hardware', maxDiscountPct: 15 },
    { category: 'Services', maxDiscountPct: 10 },
  ],
  approvalChainRules: [
    { minScore: 0, maxScore: 0, requiredRoles: [] },
    { minScore: 0.01, maxScore: 10, requiredRoles: ['sales_manager'] },
    { minScore: 10.01, maxScore: 100, requiredRoles: ['sales_manager', 'finance'] },
  ],
}

export const mockPortalQuotation = {
  _id: 'q1004',
  customer: 'Summit Logistics',
  status: 'Under Negotiation',
  lines: [
    { _id: 'l1', product: 'Fleet Tracker Devices', quantity: 25, unitPrice: 240, discountPct: 10 },
    { _id: 'l2', product: 'Analytics Add-on', quantity: 1, unitPrice: 1200, discountPct: 5 },
  ],
  negotiationComments: [
    { authorType: 'rep', lineId: 'l1', commentText: 'Can offer 10% given order volume.', counterDiscountPct: null, createdAt: '2026-08-20T10:00:00Z' },
    { authorType: 'customer', lineId: 'l1', commentText: 'Requesting 15% to match competitor quote.', counterDiscountPct: 15, createdAt: '2026-08-22T14:00:00Z' },
  ],
}

export const mockActivity = [
  { text: 'Priya Nair submitted Quotation q1002 for approval.', time: '2026-09-05T08:10:00Z', to: '/approvals/q1002' },
  { text: 'Marcus Webb approved Quotation q1007 (Sales Manager step).', time: '2026-09-04T16:40:00Z', to: '/quotations/q1007' },
  { text: 'Fulfillment split suggested for Quotation q1003.', time: '2026-09-04T11:05:00Z', to: '/fulfillment/q1003' },
  { text: 'Customer Summit Logistics submitted a counter-discount on q1004.', time: '2026-09-03T09:22:00Z', to: '/quotations/q1004' },
]
