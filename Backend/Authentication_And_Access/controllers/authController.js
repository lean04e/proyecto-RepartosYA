// Importamos el modelo que acabamos de simplificar
const Admin = require('../../../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Esta es la función que procesa el intento de inicio de sesión
const loginAdmin = async (req, res) => {
  try {
    // 1. Extraemos el email y la password que envió la página web
    const { email, password } = req.body;

    // 2. Validamos que no hayan enviado campos vacíos
    if (!email || !password) {
      return res.status(400).json({ mensaje: 'Debes completar el email y la contraseña' });
    }

    // 3. Buscamos en MongoDB si existe el Administrador con ese email
    const adminEncontrado = await Admin.findOne({ email });

    // Si no existe ningún admin con ese correo:
    if (!adminEncontrado) {
      return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
    }

    // 4. Comparamos la contraseña tipeada con la encriptada en la BD
    const esPasswordCorrecta = await bcrypt.compare(password, adminEncontrado.password);

    // Si la contraseña no coincide:
    if (!esPasswordCorrecta) {
      return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
    }

    // 5. Si todo está bien, generamos una credencial digital (Token JWT) para la sesión
    const token = jwt.sign(
      { id: adminEncontrado._id, email: adminEncontrado.email },
      'CLAVE_SECRETA_DEL_SERVIDOR',
      { expiresIn: '8h' } // Expira en 8 horas (la jornada de trabajo)
    );

    // 6. Respondemos al Frontend confirmando el éxito y devolviendo el token
    return res.status(200).json({
      mensaje: '¡Bienvenido Martín!',
      token,
      preferenciaModoOscuro: adminEncontrado.preferenciaModoOscuro
    });

  } catch (error) {
    console.error('Error en el servidor:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = {
  loginAdmin
};