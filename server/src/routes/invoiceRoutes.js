const express = require('express');
const { requireAuth, requireInternal } = require('../middleware/auth');
const ctrl = require('../controllers/invoiceController');

const router = express.Router();
router.use(requireAuth, requireInternal);

router.get('/', ctrl.listInvoices);
router.get('/:id', ctrl.getInvoice);
router.post('/:id/payments', ctrl.recordPayment);

module.exports = router;
