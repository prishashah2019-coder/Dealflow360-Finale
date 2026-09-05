const express = require('express');
const { requireAuth, requireInternal, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/invoiceController');

const router = express.Router();
router.use(requireAuth, requireInternal);

router.get('/', ctrl.listInvoices);
router.get('/:id', ctrl.getInvoice);
// Recording a payment is a Finance/Admin action.
router.post('/:id/payments', requireRole('finance', 'admin'), ctrl.recordPayment);

module.exports = router;
