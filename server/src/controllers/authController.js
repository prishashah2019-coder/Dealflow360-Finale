const bcrypt = require('bcryptjs');
const { User, Customer } = require('../models');
const { signToken } = require('../middleware/auth');

// Demo/hackathon setting: public sign-up lets the user pick any internal
// role directly (sales_rep/sales_manager/finance/admin), so every role's
// screens are reachable without a separate admin having to provision them.
// (A real production deployment would gate manager/finance/admin behind
// admin-provisioning instead - see POST /api/users, which still exists for
// that flow.) Still validated against the fixed role enum.
async function signup(req, res) {
  const { name, email, password, role } = req.body;
  const allowedRoles = ['sales_rep', 'sales_manager', 'finance', 'admin'];
  const resolvedRole = allowedRoles.includes(role) ? role : 'sales_rep';
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, password are required' });
  }
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, role: resolvedRole });
  const token = signToken({ sub: user._id, type: 'internal', role: user.role, name: user.name });
  res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signToken({ sub: user._id, type: 'internal', role: user.role, name: user.name });
  res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
}

async function customerSignup(req, res) {
  const { name, email, password, tier, currency } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, password are required' });
  }
  const existing = await Customer.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 10);
  const customer = await Customer.create({
    name,
    email,
    passwordHash,
    tier: ['Bronze', 'Silver', 'Gold'].includes(tier) ? tier : 'Bronze',
    currency: currency || 'USD',
    portalLoginType: 'password',
  });
  const token = signToken({ sub: customer._id, type: 'customer', role: 'customer', name: customer.name });
  res.status(201).json({ token, customer: { id: customer._id, name: customer.name, email: customer.email, tier: customer.tier } });
}

async function customerLogin(req, res) {
  const { email, password } = req.body;
  const customer = await Customer.findOne({ email: (email || '').toLowerCase() });
  if (!customer) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, customer.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signToken({ sub: customer._id, type: 'customer', role: 'customer', name: customer.name });
  res.json({ token, customer: { id: customer._id, name: customer.name, email: customer.email, tier: customer.tier } });
}

module.exports = { signup, login, customerSignup, customerLogin };
