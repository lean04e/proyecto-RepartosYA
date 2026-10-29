const Admin = require('../../Models/Admin');
const Repartidor = require('../../Models/Repartidor');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'CLAVE_SECRETA_SUPER_SEGURA';

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
      return res.status(400).json({ message: 'Ingresa tu número de repartidor y contraseña.' });
    }

    if (password.length < 4 || password.length > 20) {
      return res.status(400).json({ message: 'La contraseña debe tener entre 4 y 20 caracteres.' });
    }

    const repartidor = await Repartidor.findOne({ legajo: username });

    if (!repartidor) {
      return res.status(404).json({
        message: `El usuario ${username} no está en el sistema.`,
      });
    }

    const passwordMatches = await bcrypt.compare(password, repartidor.password)
      || password === repartidor.password;
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
        // ✅ CORREGIDO: Devolvemos siempre el _id de Mongo en id
        _id: repartidor._id.toString(),
        id: repartidor._id.toString(),
        legajo: repartidor.legajo,
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
      legajo: { $exists: true, $ne: '' },
    })
      .sort({ _id: 1 })
      .select({ _id: 0, legajo: 1 })
      .lean();

    return res.json({
      user: repartidor ? { id: repartidor.legajo } : null,
    });
  } catch (error) {
    console.error('Error al buscar el usuario de demostración móvil:', error);
    return res.status(500).json({ message: 'No se pudo consultar el usuario de demostración.' });
  }
};

module.exports = { login, mobileLogin, getMobileDemoCourier };