const express = require('express');
const { requireAuth, requireInternal } = require('../middleware/auth');
const ctrl = require('../controllers/dealHealthController');

const router = express.Router();
router.use(requireAuth, requireInternal);

router.get('/', ctrl.getDealHealth);
router.post('/nudge', ctrl.nudgeRep);
router.post('/escalate', ctrl.escalate);

module.exports = router;
