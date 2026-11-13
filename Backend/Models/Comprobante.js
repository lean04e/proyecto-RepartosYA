const mongoose = require('mongoose');

// Imagen del comprobante de entrega, guardada en MongoDB (no en el disco del servidor)
const comprobanteSchema = new mongoose.Schema({
    pedido: { type: mongoose.Schema.Types.ObjectId, ref: 'Pedido', required: true, unique: true },
    data: { type: Buffer, required: true },
    tipo: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Comprobante', comprobanteSchema);
