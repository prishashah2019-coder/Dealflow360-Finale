const express = require('express');
const { requireAuth, requireInternal } = require('../middleware/auth');
const ctrl = require('../controllers/quotationController');

const router = express.Router();
router.use(requireAuth, requireInternal);

router.get('/', ctrl.listQuotations);
router.post('/', ctrl.createQuotation);
router.get('/:id', ctrl.getQuotation);
router.put('/:id', ctrl.updateQuotation);
router.post('/:id/submit-for-approval', ctrl.submitForApproval);
router.post('/:id/approvals/:stepId/decide', ctrl.decideApprovalStep);
router.post('/:id/fulfillment/suggest', ctrl.suggestFulfillment);
router.post('/:id/fulfillment/accept', ctrl.acceptFulfillment);
router.post('/:id/fulfillment/override', ctrl.overrideFulfillment);
router.post('/:id/confirm', ctrl.confirmQuotation);

module.exports = router;
