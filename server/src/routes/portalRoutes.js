const express = require('express');
const { requireAuth, requireCustomer } = require('../middleware/auth');
const ctrl = require('../controllers/portalController');

const router = express.Router();
router.use(requireAuth, requireCustomer);

router.get('/quotations', ctrl.listOwnQuotations);
router.get('/quotations/:id', ctrl.getOwnQuotation);
router.post('/quotations/:id/comments', ctrl.addComment);
router.post('/quotations/:id/confirm', ctrl.confirmOwnQuotation);

module.exports = router;
