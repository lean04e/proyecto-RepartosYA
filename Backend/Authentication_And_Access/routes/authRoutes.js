const express = require('express');
const router = express.Router();
const {
  login,
  mobileLogin,
  getMobileDemoCourier,
  forgotPassword,
  resetPassword,
  verifyResetToken
} = require('../controllers/authController');

// Rutas de inicio de sesión
router.post('/login', login);
router.post('/mobile/login', mobileLogin);
router.get('/mobile/demo-user', getMobileDemoCourier);

// Rutas de Recuperación de Contraseña (Admin)
router.post('/forgot-password', forgotPassword);
router.post('/recuperar-contrasena', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/restablecer-contrasena', resetPassword);
router.get('/verify-reset-token/:token', verifyResetToken);

module.exports = router;
