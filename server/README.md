# DealFlow360 API (server)

Node.js + Express + MongoDB (Mongoose) + JWT.

## Run

```bash
npm install
cp .env.example .env      # adjust MONGO_URI / JWT_SECRET if needed
npm run seed               # wipes and re-seeds sample data
npm run dev                 # nodemon on http://localhost:5000
```

## Seed logins (password: `password123` for all)

| Role | Email |
|---|---|
| Sales Rep | rep@dealflow360.com |
| Sales Manager | manager@dealflow360.com |
| Finance | finance@dealflow360.com |
| Admin | admin@dealflow360.com |
| Customer (Acme Corp, Gold tier) | buyer@acme.com |

Internal users log in via `POST /api/auth/login`; the customer portal uses
`POST /api/auth/customer/login` — separate token `type` (`internal` vs
`customer`), enforced by `requireInternal` / `requireCustomer` middleware so a
customer token can never touch an internal endpoint (verified).

See `../SPEC.md` for the full schema, API contract, and business-logic
description (blended risk score, approval routing, warehouse split,
subscription billing, negotiation re-trigger, deal health).

## Sample products/warehouses seeded

- Laptop Pro 14, Wireless Mouse, Docking Station (Hardware, 15% category ceiling)
- Onsite Setup Service (Services, 10% category ceiling)
- Care Plan 2yr (Services, subscription/monthly)
- Main Warehouse, East Depot with split stock on Laptop Pro 14 (good for
  testing multi-warehouse split)

## Manually verified end-to-end (via REST calls)

- Discount over a line's own category limit auto-routes to Sales Manager
  approval, even when the overall order-level discount looks fine.
- Sequential approval chain (Sales Manager → Finance) enforced by step order.
- Warehouse split suggestion allocates from best-stocked warehouse first and
  flags remainder as backorder; accepting it decrements `stocks`.
- Confirming a quotation with mixed one-time + recurring lines produces two
  separate invoices and a `Subscription` doc with a correctly computed
  `nextBillingDate`.
- Recording a payment moves invoice status Unpaid → Paid.
- Customer portal: counter-discount beyond the customer's tier limit
  automatically re-enters the approval flow on `Confirm Quotation`.
- A customer JWT is rejected by every internal-only route (403).
