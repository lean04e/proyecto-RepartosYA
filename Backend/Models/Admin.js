const mongoose = require('mongoose');

// Definimos la estructura exacta que tendrá el Administrador en MongoDB
const adminSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true
  },
  apellido: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true // Para evitar duplicados de correo
  },
  password: {
    type: String,
    required: true // Se guardará encriptada con bcrypt
  },
  telefono: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Admin', adminSchema);