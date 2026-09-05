const express = require('express');
const { signup, login, customerSignup, customerLogin } = require('../controllers/authController');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/customer/signup', customerSignup);
router.post('/customer/login', customerLogin);

module.exports = router;
