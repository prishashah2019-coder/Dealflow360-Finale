const jwt = require('jsonwebtoken');

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2d' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Forbidden for this role' });
    }
    next();
  };
}

// Any authenticated internal user (not a customer)
function requireInternal(req, res, next) {
  if (!req.auth || req.auth.type !== 'internal') {
    return res.status(403).json({ error: 'Internal users only' });
  }
  next();
}

function requireCustomer(req, res, next) {
  if (!req.auth || req.auth.type !== 'customer') {
    return res.status(403).json({ error: 'Customers only' });
  }
  next();
}

module.exports = { signToken, requireAuth, requireRole, requireInternal, requireCustomer };
