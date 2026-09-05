const express = require('express');
const { requireAuth, requireInternal, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/dealHealthController');

const router = express.Router();
router.use(requireAuth, requireInternal);

router.get('/', ctrl.getDealHealth);
router.get('/nudges-for-me', ctrl.getNudgesForMe);
// Escalating/nudging is a Sales Manager (or Admin) action - they're the
// ones who "monitor the deal health dashboard for at-risk deals".
router.post('/nudge', requireRole('sales_manager', 'admin'), ctrl.nudgeRep);
router.post('/escalate', requireRole('sales_manager', 'admin'), ctrl.escalate);

module.exports = router;
