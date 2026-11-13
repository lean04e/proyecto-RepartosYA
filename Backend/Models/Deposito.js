const mongoose = require('mongoose');

// Depositos: unicos origenes disponibles para un pedido. No son comercios.
const depositoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true },
  direccion: { type: String, required: true },
  telefono: { type: String, default: 'Sin especificar' }
});

const DEPOSITOS_BASE = [
  { nombre: 'Depósito Norte', direccion: 'Calle 13 y 528, La Plata' },
  { nombre: 'Depósito Este', direccion: 'Calle 1 y 60, La Plata' },
  { nombre: 'Depósito Sur', direccion: 'Calle 143 y 44, La Plata' },
  { nombre: 'Depósito Oeste', direccion: 'Calle 7 y 520, La Plata' }
];

const Deposito = mongoose.model('Deposito', depositoSchema);

// Crea los 4 depositos base si todavia no existen (idempotente)
Deposito.sembrarBase = async () => {
  for (const d of DEPOSITOS_BASE) {
    await Deposito.updateOne({ nombre: d.nombre }, { $setOnInsert: d }, { upsert: true });
  }
};

module.exports = Deposito;
