const express = require('express');
const { requireAuth, requireInternal } = require('../middleware/auth');
const { getReports } = require('../controllers/reportController');

const router = express.Router();
router.use(requireAuth, requireInternal);

router.get('/', getReports);

module.exports = router;
