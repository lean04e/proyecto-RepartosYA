const mongoose = require('mongoose');

// Definimos la estructura exacta que tendrá el Administrador en MongoDB
const comercioSchema = new mongoose.Schema({
  cantPedidos: {
    type: Number,
    default: 0
  },
  telefono: {
    type: String,
    required: true
  },
  direccion: {
    type: String,
    required: true
  },
  nombre: {
    type: String,
    required: true
  },
  rubro: {
    type: String,
    required: true
  },
  borrado: {
    type: Boolean,
    default: false
  },

});

module.exports = mongoose.model('Comercio', comercioSchema);