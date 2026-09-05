const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { listCreditNotes } = require('../controllers/creditNoteController');

const router = express.Router();
router.use(requireAuth, requireRole('finance', 'admin'));

router.get('/', listCreditNotes);

module.exports = router;
