const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const pedidoSchema = new mongoose.Schema({
    ID: {
        type: String,
        default: uuidv4, // Se rellena solo con un código único automáticamente
        unique: true     // Garantiza que no se repita en la base de datos
    },
    origen: {
        type: String,
        required: true // Corregido aquí
    },
    destino: {
        type: String,
        required: true // Corregido aquí
    },
    destinatario: {
        type: String,
        required: true // Corregido aquí
    },
    contacto: {
        type: String,
        required: true // Corregido aquí
    },
    email: {
        type: String,
        required: false // Corregido aquí
    },
    repartidor: {
        type: String,
        required: false,
        default: null
    },
    estado: {
        type: String,
        enum: ['REGISTRADO', 'ASIGNADO', 'EN_CAMINO', 'ENTREGADO', 'RECHAZADO', 'CANCELADO'],
        default: 'REGISTRADO'
    },
    borrado: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('Pedido', pedidoSchema);