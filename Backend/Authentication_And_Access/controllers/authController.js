const Admin = require('../../Models/Admin');
const Repartidor = require('../../Models/Repartidor');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendRecoveryEmail } = require('../services/emailService');

/**
 * Autenticación de usuarios (Admin y Repartidores)
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Buscamos si es un Administrador
    let usuarioEncontrado = await Admin.findOne({ 
      $or: [{ email: username }, { nombre: username }] 
    });
    let rol = 'admin';

    // 2. Si no es admin, buscamos en los Repartidores por email o legajo (ej: 0001)
    if (!usuarioEncontrado) {
      usuarioEncontrado = await Repartidor.findOne({ 
        $or: [{ email: username }, { legajo: username }] 
      });
      rol = 'repartidor';
    }

    if (!usuarioEncontrado) {
      return res.status(401).json({ message: 'Usuario o credenciales incorrectas.' });
    }

    // 3. Validar la contraseña
    const passwordValid = password === usuarioEncontrado.password;
    
    if (!passwordValid) {
      return res.status(401).json({ message: 'Contraseña incorrecta.' });
    }

    // 4. Generar el Token JWT
    const token = jwt.sign(
      { id: usuarioEncontrado._id, role: rol },
      process.env.JWT_SECRET || 'CLAVE_SECRETA_SUPER_SEGURA',
      { expiresIn: '8h' }
    );

    // 5. Responder al frontend
    res.json({
      token,
      user: {
        name: usuarioEncontrado.nombre,
        role: rol
      }
    });

  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/**
 * HISTORIA DE USUARIO: Recuperación de clave de acceso (EXCLUSIVO PARA EL MODELO ADMIN)
 * Criterios de Aplicación:
 * - Escenario 1: Se ingresa email -> si coincide con un Admin en la base de datos,
 *   se genera y envía correo/enlace de recuperación con validez temporal.
 * - Escenario 2: Se ingresa email -> si NO coincide con la base de datos de Admin,
 *   NO se envía ningún mail pero NO se le hace saber al admin/usuario (retorna 200 genérico).
 */
const forgotPassword = async (req, res) => {
  try {
    const inputIdentifier = req.body.email || req.body.identifier;

    if (!inputIdentifier || !inputIdentifier.trim()) {
      return res.status(400).json({ message: 'Debes ingresar un correo electrónico.' });
    }

    const cleanIdentifier = inputIdentifier.trim().toLowerCase();

    // 1. Buscar ÚNICAMENTE en el modelo Admin
    const adminEncontrado = await Admin.findOne({
      $or: [
        { email: new RegExp(`^${cleanIdentifier}$`, 'i') },
        { nombre: new RegExp(`^${cleanIdentifier}$`, 'i') }
      ]
    });

    // =========================================================================
    // ESCENARIO 2: El correo NO coincide con ningún Admin registrado
    // "no se enviará ningun mail pero no se lo hará saber al admin"
    // =========================================================================
    if (!adminEncontrado) {
      console.log(`ℹ️ [Recuperación Admin] El correo "${cleanIdentifier}" no pertenece a un Administrador. No se envía correo.`);
      return res.status(200).json({
        message: 'Si el correo electrónico coincide con una cuenta registrada, se enviará un enlace de recuperación.'
      });
    }

    // =========================================================================
    // ESCENARIO 1: El correo coincide con un Admin en la base de datos
    // Generar token seguro, guardar expiración (1 hora) y despachar email/enlace
    // =========================================================================
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hora de validez

    adminEncontrado.resetPasswordToken = resetToken;
    adminEncontrado.resetPasswordExpires = resetTokenExpires;
    await adminEncontrado.save();

    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendBaseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(adminEncontrado.email)}`;

    await sendRecoveryEmail({
      to: adminEncontrado.email,
      name: adminEncontrado.nombre,
      resetLink,
      resetToken
    });

    return res.status(200).json({
      message: 'Si el correo electrónico coincide con una cuenta registrada, se enviará un enlace de recuperación.',
      token: resetToken,
      resetLink
    });

  } catch (error) {
    console.error('Error en forgotPassword (Admin):', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/**
 * HISTORIA DE USUARIO: Restablecer contraseña y acceder con las nuevas credenciales
 * (EXCLUSIVO PARA EL MODELO ADMIN)
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, username, email } = req.body;

    if (!newPassword || newPassword.trim().length === 0) {
      return res.status(400).json({ message: 'Debes ingresar una nueva contraseña.' });
    }

    if (newPassword.length < 4 || newPassword.length > 20) {
      return res.status(400).json({ message: 'La contraseña debe tener entre 4 y 20 caracteres.' });
    }

    let adminEncontrado = null;

    // 1. Buscar en Admin por token vigente
    if (token) {
      adminEncontrado = await Admin.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      });
    }

    // 2. Fallback de compatibilidad por email o nombre en Admin
    if (!adminEncontrado && (username || email)) {
      const target = (username || email).trim().toLowerCase();
      adminEncontrado = await Admin.findOne({
        $or: [
          { email: new RegExp(`^${target}$`, 'i') },
          { nombre: new RegExp(`^${target}$`, 'i') }
        ]
      });
    }

    if (!adminEncontrado) {
      return res.status(400).json({ message: 'El enlace de recuperación es inválido o ha expirado.' });
    }

    // 3. Actualizar la contraseña del Administrador y limpiar el token
    adminEncontrado.password = newPassword;
    adminEncontrado.resetPasswordToken = undefined;
    adminEncontrado.resetPasswordExpires = undefined;
    await adminEncontrado.save();

    // 4. Generar credencial de sesión para acceder inmediatamente al sistema (Escenario 1)
    const sessionToken = jwt.sign(
      { id: adminEncontrado._id, role: 'admin' },
      process.env.JWT_SECRET || 'CLAVE_SECRETA_SUPER_SEGURA',
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      message: 'Contraseña actualizada correctamente.',
      token: sessionToken,
      user: {
        id: adminEncontrado._id,
        name: adminEncontrado.nombre,
        role: 'admin'
      }
    });

  } catch (error) {
    console.error('Error en resetPassword (Admin):', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/**
 * Validador de token para la vista del Administrador
 */
const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ valid: false, message: 'Token no proporcionado.' });
    }

    const admin = await Admin.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({ valid: false, message: 'El enlace de recuperación es inválido o ha expirado.' });
    }

    return res.status(200).json({
      valid: true,
      email: admin.email
    });

  } catch (error) {
    console.error('Error al verificar token (Admin):', error);
    return res.status(500).json({ valid: false, message: 'Error interno del servidor.' });
  }
};

module.exports = {
  login,
  forgotPassword,
  resetPassword,
  verifyResetToken
};
