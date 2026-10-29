const Admin = require('../../Models/Admin');
const Repartidor = require('../../Models/Repartidor');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'CLAVE_SECRETA_SUPER_SEGURA';

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Buscamos si es un Administrador (no se toca absolutamente nada)
    let usuarioEncontrado = await Admin.findOne({ 
      $or: [{ email: username }, { nombre: username }] 
    });
    let rol = 'admin';

    // 2. Si no es admin, buscamos en los Repartidores por email
    if (!usuarioEncontrado) {
      usuarioEncontrado = await Repartidor.findOne({ 
        email: new RegExp(`^${username.trim()}$`, 'i') 
      });
      rol = 'repartidor';
    }

    if (!usuarioEncontrado) {
      return res.status(401).json({ message: 'Usuario o credenciales incorrectas.' });
    }

    // 3. Validar la contraseña (soporta contraseñas con hash bcrypt o texto plano)
    let passwordValid = false;
    try {
      passwordValid = await bcrypt.compare(password, usuarioEncontrado.password);
    } catch {
      passwordValid = false;
    }
    // Fallback por si la contraseña en la BD está en texto plano (como en el seed)
    if (!passwordValid) {
      passwordValid = (password === usuarioEncontrado.password);
    }
    
    if (!passwordValid) {
      return res.status(401).json({ message: 'Contraseña incorrecta.' });
    }

    // 4. Generar el Token JWT
    const token = jwt.sign(
      { id: usuarioEncontrado._id, role: rol },
      JWT_SECRET,
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

const mobileLogin = async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!username || !password) {
      return res.status(400).json({ message: 'Ingresa tu correo electrónico y contraseña.' });
    }

    if (password.length < 4 || password.length > 20) {
      return res.status(400).json({ message: 'La contraseña debe tener entre 4 y 20 caracteres.' });
    }

    // En la app mobile se busca por el email creado por el admin (o por legajo si es del seed)
    const repartidor = await Repartidor.findOne({
      $or: [
        { email: new RegExp(`^${username}$`, 'i') },
        { legajo: username }
      ]
    });

    if (!repartidor) {
      return res.status(404).json({
        message: `El usuario ${username} no está en el sistema.`,
      });
    }

    let passwordMatches = false;
    try {
      passwordMatches = await bcrypt.compare(password, repartidor.password);
    } catch {
      passwordMatches = false;
    }
    if (!passwordMatches) {
      passwordMatches = (password === repartidor.password);
    }

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Credenciales Invalidas. Por favor, verifique sus credenciales.' });
    }

    const token = jwt.sign(
      { id: repartidor._id, role: 'repartidor' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      token,
      user: {
        _id: repartidor._id.toString(),
        id: repartidor._id.toString(),
        email: repartidor.email,
        name: repartidor.nombre,
        surname: repartidor.apellido,
        role: 'repartidor',
      },
    });
  } catch (error) {
    console.error('Error en el login móvil:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

const getMobileDemoCourier = async (_req, res) => {
  try {
    const repartidor = await Repartidor.findOne({
      email: { $exists: true, $ne: '' }
    })
      .sort({ _id: 1 })
      .select({ _id: 0, email: 1 })
      .lean();

    return res.json({
      user: repartidor ? { id: repartidor.email } : null,
    });
  } catch (error) {
    console.error('Error al buscar el usuario de demostración móvil:', error);
    return res.status(500).json({ message: 'No se pudo consultar el usuario de demostración.' });
  }
};

module.exports = { login, mobileLogin, getMobileDemoCourier };
