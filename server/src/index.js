require('dotenv').config();
require('express-async-errors'); // lets thrown/rejected errors in async route handlers reach the error middleware below
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const portalRoutes = require('./routes/portalRoutes');
const dealHealthRoutes = require('./routes/dealHealthRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

// More specific mounts must be registered before the generic '/api' catalog
// router below - catalogRoutes applies requireInternal via router.use() with
// no path filter, so it would otherwise intercept every /api/* request
// (including customer-only /api/portal/* calls) before they reach their
// intended router.
app.use('/api/auth', authRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/deal-health', dealHealthRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api', catalogRoutes); // /customers, /products, /warehouses, /stocks, /price-lists, /discount-config, /subscription-plans, /upsell

// Centralized error handler so async controller errors don't crash the process
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 6000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`DealFlow360 API listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });
