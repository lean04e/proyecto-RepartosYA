const Admin = require('../../Models/Admin');
const Repartidor = require('../../Models/Repartidor');
const jwt = require('jsonwebtoken');

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

    // 3. Validar la contraseña (comparación directa con los datos del seed)
    const passwordValid = password === usuarioEncontrado.password;
    
    if (!passwordValid) {
      return res.status(401).json({ message: 'Contraseña incorrecta.' });
    }

    // 4. Generar el Token JWT
    const token = jwt.sign(
      { id: usuarioEncontrado._id, role: rol },
      'CLAVE_SECRETA_SUPER_SEGURA',
      { expiresIn: '8h' }
    );

    // 5. Responder con la estructura que exige el frontend
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

module.exports = { login };