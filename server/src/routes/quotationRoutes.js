const express = require('express');
const { requireAuth, requireInternal, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/quotationController');

const router = express.Router();
router.use(requireAuth, requireInternal);

router.get('/', ctrl.listQuotations);
router.post('/', ctrl.createQuotation);
router.get('/:id', ctrl.getQuotation);
router.put('/:id', ctrl.updateQuotation);
router.post('/:id/negotiation/comments', ctrl.addNegotiationComment);
router.post('/:id/submit-for-approval', ctrl.submitForApproval);
router.post('/:id/approvals/:stepId/decide', ctrl.decideApprovalStep);
router.post('/:id/fulfillment/suggest', ctrl.suggestFulfillment);
// Per the problem statement, Finance "manages warehouse fulfillment splits
// and backorder decisions" - only Finance/Admin can commit a split, anyone
// internal can still see the suggestion.
router.post('/:id/fulfillment/accept', requireRole('finance', 'admin'), ctrl.acceptFulfillment);
router.post('/:id/fulfillment/override', requireRole('finance', 'admin'), ctrl.overrideFulfillment);
router.post('/:id/confirm', ctrl.confirmQuotation);

module.exports = router;
