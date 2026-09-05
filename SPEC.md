# DealFlow360 — Build Spec (MERN + JWT)

Single source of truth shared between backend and frontend work so both sides integrate
without drift. Stack: MongoDB (Mongoose), Node.js, Express.js, React (Vite), JWT auth.

## 1. Roles
`sales_rep`, `sales_manager`, `finance`, `admin`, `customer` (portal user, separate auth flow).

## 2. Mongoose collections (document-oriented, embeds sub-docs that are always
accessed together with their parent; keeps separate collections for things queried
independently across quotations)

### users
```
name, email, passwordHash, role: enum[sales_rep,sales_manager,finance,admin], createdAt
```

### customers
```
name, email, passwordHash, tier: enum[Bronze,Silver,Gold], portalLoginType: enum[magic_link,password],
currency, createdAt
```

### products
```
name, category, basePrice, unit, taxPct, description, isSubscription: bool,
variants: [{ attributeName, attributeValue, extraPrice }]
```

### warehouses
```
name, shippingCostWeight
```

### stocks
```
productId (ref Product), warehouseId (ref Warehouse), qtyAvailable, replenishmentRule
```

### priceLists
```
name, customerTier, currency, items: [{ productId, price }]
```

### discountTiers
```
tierName: enum[Bronze,Silver,Gold], maxDiscountPct
```

### categoryCeilings
```
category, maxDiscountPct
```

### approvalChainRules  (ordered ranges, admin-configurable)
```
minScore, maxScore, requiredRoles: [ 'sales_manager' ] | [ 'sales_manager','finance' ] | []
```

### subscriptionPlans
```
name, billingCycle: enum[monthly,quarterly,yearly], prorationRule, cancellationRule
```

### upsellRules
```
sourceProductId, suggestedProductId, minMarginThreshold, isPromoted: bool
```

### quotations  (the core aggregate — embeds lines/approvals/splits/comments/alerts)
```
customerId, salesRepId, status: enum[Draft,Pending Approval,Approved,Under Negotiation,Confirmed,Rejected],
blendedRiskScore, createdAt, updatedAt,
lines: [{ _id, productId, variant, quantity, unitPrice, discountPct,
          lineType: enum[one_time,recurring], subscriptionPlanId }],
approvals: [{ approverId, stepOrder, approverRole, status: enum[pending,approved,rejected,returned],
              comment, decidedAt }],
fulfillmentSplits: [{ warehouseId, productId, qtyFulfilled, shipmentCost, status, isBackorder }],
negotiationComments: [{ authorType: enum[customer,rep], lineId, commentText, counterDiscountPct, createdAt }],
dealHealthAlerts: [{ alertType: enum[stalled,discount_anomaly,delivery_slippage], detectedAt, status }]
```

### subscriptions
```
customerId, planId, quotationId, quotationLineId, startDate, status: enum[active,cancelled],
nextBillingDate
```

### invoices
```
quotationId, customerId, type: enum[one_time,recurring], amount, status: enum[Draft,Sent,Unpaid,Partially Paid,Paid],
dueDate, lines: [{ quotationLineId, amount }]
```

### payments
```
invoiceId, amount, method, paidAt, status
```

### creditNotes
```
subscriptionId, invoiceId, amount, reason
```

### auditLogs
```
entityType, entityId, action, userId, timestamp, reason
```

## 3. Core business logic (must be real code, not hardcoded)

**Blended discount risk score** (on submit-for-approval):
- effectiveLimit(line) = min(customerTier.maxDiscountPct, categoryCeiling[line.product.category].maxDiscountPct)
- overagePct(line) = max(0, line.discountPct - effectiveLimit(line))
- blendedRiskScore = Σ(overagePct(line) * lineSubtotal) / Σ(lineSubtotal)  — value-weighted average overage
- Any line with overagePct > 0 already makes blendedRiskScore > 0, so a single bad line always flags.

**Approval routing**: look up blendedRiskScore in `approvalChainRules` ranges → build
`approvals[]` with one entry per required role in order. Steps execute sequentially:
only the first `pending` step is actionable; approving it unlocks the next.

**Warehouse split**: for each line, greedily allocate from the warehouse with the most
available stock first, splitting across warehouses if one can't cover the full qty;
unmet qty → `isBackorder: true`. Decrement `stocks` on accept.

**Subscription + billing**: on quotation confirm, for every `recurring` line create a
`subscriptions` doc with `nextBillingDate` computed from the plan's billing cycle; for
`one_time` lines (and the first period of recurring lines) create an `invoices` doc.

**Negotiation re-trigger**: customer counter-proposals update `line.discountPct`;
`Confirm Quotation` recomputes blendedRiskScore — if it now requires approval, status
goes back to `Pending Approval` with a fresh `approvals[]`; otherwise straight to `Confirmed`.

**Deal health** (computed live, not cron): stalled = status not in
[Confirmed,Rejected] and `updatedAt` older than N days; discount anomaly = quotation's
avg line discount vs. that sales rep's historical average on past quotations; delivery
slippage = fulfillment split still `suggested`/unfulfilled past an expected ship date.

## 4. REST API (JWT bearer auth, `Authorization: Bearer <token>`)

```
POST   /api/auth/signup              { name, email, password, role }
POST   /api/auth/login               { email, password } -> { token, user }
POST   /api/auth/customer/login      { email, password } -> { token, customer }

GET    /api/customers
GET    /api/products            POST /api/products           GET/PUT /api/products/:id
GET    /api/warehouses          POST /api/warehouses
GET    /api/stocks
GET    /api/discount-config     PUT  /api/discount-config     (tiers + category ceilings + approval chain rules)
GET    /api/subscription-plans  POST /api/subscription-plans
GET    /api/upsell/:productId

GET    /api/quotations          POST /api/quotations
GET    /api/quotations/:id      PUT  /api/quotations/:id            (edit lines while Draft)
POST   /api/quotations/:id/submit-for-approval
POST   /api/quotations/:id/approvals/:stepId/decide   { action: approve|reject|return, comment }
POST   /api/quotations/:id/fulfillment/suggest
POST   /api/quotations/:id/fulfillment/accept
POST   /api/quotations/:id/fulfillment/override       { splits: [...] }
POST   /api/quotations/:id/confirm

GET    /api/subscriptions       POST /api/subscriptions/:id/modify   POST /api/subscriptions/:id/cancel
GET    /api/invoices            GET /api/invoices/:id
POST   /api/invoices/:id/payments

# Customer portal (separate auth/role guard)
GET    /api/portal/quotations                   (list own, excludes Draft)
GET    /api/portal/quotations/:id               (:id may be the literal "me" -> most recently
                                                  updated non-Draft quotation for this customer)
POST   /api/portal/quotations/:id/comments      { lineId, commentText, counterDiscountPct }
POST   /api/portal/quotations/:id/confirm

GET    /api/deal-health
GET    /api/reports?period=&repId=&status=&productId=
```

## 5. Frontend screens (must match the reference wireframe layout/labels exactly)

Top nav (internal app): `Dashboard | Quotations | Approvals | Fulfillment | Subscriptions
| Invoices | Deal Health | Reports | Product`

1. **Login / Signup** — tabs Log In / Sign Up, Email + Password fields, "Forgot Password?",
   note: internal users land on Dashboard, customers land on their Quotation Portal.
2. **Sales Dashboard** — 3 stat cards (Pending Approvals, Open Quotations, At-Risk Deals),
   buttons "+ New Quotation" / "View Approvals", "Recent Activity" feed.
3. **Quotations List** — kanban columns Draft / Pending Approval / Approved / Negotiation /
   Confirmed, deal cards "Customer — $Amount", "+ New Quotation", "Switch to Table View".
4. **Quotation Detail** (builder) — customer/status header, line table (Product, Qty, Price,
   Discount, List, Other), yellow note about per-line limit checks, "Upsell and Cross-Sell
   Suggestions" panel (product, margin delta, Add/Dismiss), "Save Draft" / "Submit for Approval".
5. **Approvals List** — badge counts (Pending/Rejected/Approved), table (Quotation, Customer,
   Discount %, Risk Level, Stage, Assigned To), "Filter: Pending Only".
6. **Approval Detail** — Blended Risk badge, Customer Tier badge, "Why This Quote Was
   Flagged" table (Line, Discount Given, Limit Allowed, Given By), step tracker
   Submitted → Sales Manager → Finance → Confirmed, audit table (User, Role, Action, Date,
   Note), buttons Approve / Return for Revision / Reject.
7. **Fulfillment List** — stock table (Warehouse, Qty Fulfilled, In Stock, Reserved,
   Available), "Orders Awaiting Fulfillment" table (Order, Customer, Status, Warehouse).
8. **Fulfillment Detail** — per-warehouse split table (Warehouse, Qty Fulfilled, Qty
   Shipped/Remaining, Cost), auto "Consolidate Remaining Backorder" note, "Accept Suggested
   Split" / "Manual Override".
9. **Subscriptions List** — badges (Active/Trial/Cancelled), table (Customer, Plan, Cycle,
   Next Bill, Status), "+ New Plan (Admin)".
10. **Billing Detail** — "One Time Lines" table (Product, Qty, Price, Amount), "Recurring
    Lines" table (Plan, Cycle, Next Billing, Amount), "Modify Subscription" / "Cancel
    Subscription".
11. **Customer Portal Negotiation Screen** (separate, restricted, customer-only) — line
    comment/question table, Counter Discount % field, Requested Delivery Date field,
    "Submit Request" / "Confirm Quotation", note about auto re-entering approval.
12. **Invoices List** — badges (Unpaid/Paid), table (Invoice #, Customer, Amount, Status,
    Due Date).
13. **Invoice Detail** — status tracker Order Confirmed → Shipped → Invoiced → Paid, line
    table, "Record Payment" / "Download Summary".
14. **Deal Health Dashboard** — 3 cards (Stalled Deals, Discount Anomalies, Delivery
    Slippage), table (Deal, Issue, Flagged, Action), "Escalate" / "Nudge Rep".
15. **Admin / Reporting Dashboard** — filters (Period, Sales Team, Approval Status,
    Product), stat cards (Quotes Created, Avg Approval Time, Top Upsold Product),
    "Export PDF" / "Export XLS".
16. **Product Catalog** — stat cards (Total Products, Price Lists, Variants), product
    table, "+ New Product" / "Manage Price Fields".
17. **Product Detail** — General Info (Name, Category, Price, Unit, Tax %, Subscription
    Yes/No, Recurring cycle, Qty on hand), Variants table (Attribute, Values, Extra
    Price), Price Lists table (Tier, Currency, Price Rule).
18. **Discount Tiers & Approval Chains (Admin config)** — Tier Discount Ceilings table,
    Category Discount Ceilings table, Approval Chain table (discount range → required
    approval level), "Save Configuration".

## 6. Visual style — slight glassmorphism (enterprise/B2B tone, not flashy)
- Background: very light, subtle gradient (e.g. `#eef1fb` → `#f7f8fc`), not a loud
  colorful gradient — this is a B2B sales tool, keep it clean.
- Panels/cards: `background: rgba(255,255,255,0.55)`, `backdrop-filter: blur(12px)`,
  `border: 1px solid rgba(255,255,255,0.6)`, `border-radius: 14px`,
  `box-shadow: 0 4px 24px rgba(31,38,135,0.08)`.
- Keep the blur subtle — text must stay crisp and readable, no heavy frosted look.
- Accent color: indigo/blue (`#4f46e5` primary buttons), status colors: green
  (approved/paid), amber (pending/at-risk), red (rejected/overdue).
- Font: system-ui/Inter, dark slate (`#1e293b`) text on glass panels.
- Top nav bar itself: solid, not glass (matches wireframe's solid blue-ish header).
```
