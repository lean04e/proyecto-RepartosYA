const mongoose = require('mongoose');
const pedidoSchema = new mongoose.Schema({
    codigo: {
        type: Integer,
        requiered: true
    },
    origen: {
        type: String,
        requiered: true
    },
    destino: {
        type: String,
        requiered: true
    },
    destinatario: {
        type: String,
        requiered: true
    },
    contacto: {
        type: String,
        requiered: true
    },
    email: {
        type: String,
        requiered: false
    },
    estado: {
        type: String,
        enum: ['REGISTRADO', 'ASIGNADO', 'EN_CAMINO', 'ENTREGADO', 'RECHAZADO'],
        default: 'REGISTRADO'
    },
})
module.exports = mongoose.model('Pedido', pedidoSchema);