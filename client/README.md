# DealFlow360 — Client (Frontend)

Vite + React 18 + React Router v6 frontend for DealFlow360, a B2B sales-ops SaaS
(quotations, discount approval routing, warehouse fulfillment, hybrid billing,
customer negotiation portal, deal health dashboard). Plain hand-written CSS
implementing a slight-glassmorphism design system — no Tailwind, no MUI.

This folder is the frontend only. It talks to a separate Node/Express + MongoDB
backend (built independently) over the REST API described in `../SPEC.md`
section 4.

## Getting started

```
cd client
npm install
npm run dev
```

The dev server runs on http://localhost:5173 by default.

## Environment variables

Create a `.env` file in `client/` (see `.env.example`):

```
VITE_API_URL=http://localhost:5000/api
```

If unset, the API client defaults to `http://localhost:5000/api`.

## Build

```
npm run build
```

Outputs a production build to `client/dist/`. `npm run preview` serves that
build locally for a final check.

## Notes for backend integration

- `src/api/client.js` is the single Axios instance. It reads a JWT from
  `localStorage` (key `df360_token`) and attaches
  `Authorization: Bearer <token>` to every request.
- Each `src/api/*.js` module (`auth`, `quotations`, `approvals`, `fulfillment`,
  `subscriptions`, `invoices`, `products`, `dealHealth`, `reports`,
  `discountConfig`, `portal`) exports one function per endpoint in SPEC.md
  section 4, named and parameterized to match the contract as closely as
  possible — wiring against the real backend should be close to a non-event.
- Screens fetch real data first; if a call fails (backend not running yet,
  endpoint not implemented yet, etc.) they fall back to sample data from
  `src/mockData.js` so the UI stays demoable end-to-end. Once the backend is
  live, these fallbacks simply stop triggering.
- Auth/session state lives in `src/context/AuthContext.jsx`. `ProtectedRoute`
  guards the internal app; a `customer`-role user is redirected straight to
  the portal negotiation screen and never sees the internal top nav.
