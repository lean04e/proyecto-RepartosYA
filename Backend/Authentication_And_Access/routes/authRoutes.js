const express = require('express');
const router = express.Router();
const {
  login,
  mobileLogin,
  getMobileDemoCourier,
} = require('../controllers/authController');

router.post('/login', login);
router.post('/mobile/login', mobileLogin);
router.get('/mobile/demo-user', getMobileDemoCourier);

module.exports = router;