const express = require('express');
const { requireAuth, requireInternal, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/subscriptionController');

const router = express.Router();
router.use(requireAuth, requireInternal);

router.get('/', ctrl.listSubscriptions);
router.get('/:id', ctrl.getSubscription);
// Finance "reconciles recurring billing" - modifying/cancelling a live
// subscription (with its proration/refund side effects) is Finance/Admin only.
router.post('/:id/modify', requireRole('finance', 'admin'), ctrl.modifySubscription);
router.post('/:id/cancel', requireRole('finance', 'admin'), ctrl.cancelSubscription);

module.exports = router;
