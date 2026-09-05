const express = require('express');
const { requireAuth, requireInternal } = require('../middleware/auth');
const ctrl = require('../controllers/subscriptionController');

const router = express.Router();
router.use(requireAuth, requireInternal);

router.get('/', ctrl.listSubscriptions);
router.get('/:id', ctrl.getSubscription);
router.post('/:id/modify', ctrl.modifySubscription);
router.post('/:id/cancel', ctrl.cancelSubscription);

module.exports = router;
