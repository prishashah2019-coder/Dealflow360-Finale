# DealFlow360

A self-governing B2B sales-ops platform: quotation building with live upsell
suggestions, multi-tier discount governance with automated approval routing,
multi-warehouse fulfillment splitting, hybrid one-time + subscription billing,
a real customer-facing negotiation portal, and a live deal-health dashboard.

Stack: **MongoDB + Node.js/Express (JWT auth)** backend, **React (Vite)** frontend,
slight glassmorphism UI matching the provided wireframe.

See [SPEC.md](SPEC.md) for the full schema, API contract, and business-logic spec.

## Run it

Two terminals, from this folder:

```bash
cd server
npm install
cp .env.example .env
npm run seed
npm run dev
```

```bash
cd client
npm install
npm run dev
```

Backend: http://localhost:5000 · Frontend: http://localhost:5173

## Demo logins (password: `password123`)

| Role | Email |
|---|---|
| Sales Rep | rep@dealflow360.com |
| Sales Manager | manager@dealflow360.com |
| Finance | finance@dealflow360.com |
| Admin | admin@dealflow360.com |
| Customer — Acme Corp, Gold (check "customer" box) | buyer@acme.com |
| Customer — Beta Industries, Silver | buyer@beta.com |
| Customer — Delta LLC, Bronze | buyer@delta.com |

The seed data is pre-populated across every pipeline stage (Draft, Pending
Approval, Approved, Under Negotiation, Confirmed+Paid) so every screen has
real data on first login — no need to build the flow live before demoing it.

## Suggested 5-minute demo script

1. **Log in as Sales Rep** → Quotations kanban already shows deals in every
   stage. Open the Beta Industries quote (Pending Approval) → note the
   per-line discount-vs-limit breakdown.
2. **Log in as Sales Manager**, then **Finance** → approve the two chained
   steps on that same quote; watch it move to Approved.
3. **Log in as Admin** → Discount Tiers & Approval Chains screen — this is
   the config driving step 2's routing.
4. **Log in as the Acme customer** (check the portal box) → the seeded quote
   is already "Under Negotiation" with a counter-discount on file; hit
   **Confirm Quotation** and show it auto-re-entering approval because the
   counter-offer exceeds Acme's Gold-tier limit.
5. **Fulfillment** screen → an Acme order already has a suggested
   multi-warehouse split (stock is intentionally spread thin to force a
   split).
6. **Subscriptions → Billing Detail** for Acme's Care Plan → shows the
   one-time laptop line and the recurring line on the same order together.
7. **Deal Health** dashboard → a live-computed discount anomaly for Beta
   Industries, with working Escalate/Nudge actions.

## What's next with more time

- Multi-currency/company support (bonus per the brief, not required)
- Real invoice numbering, PDF/XLS export for Reports, and a proper admin
  user-management screen (Reports' rep/product filters currently use
  placeholder dropdown options)
- Cron-based deal-health alerts (currently computed live on each dashboard
  load, which is correct but wouldn't scale past a demo-sized dataset)
