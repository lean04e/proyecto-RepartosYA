const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const pedidoSchema = new mongoose.Schema({
    ID: {
        type: String,
        default: uuidv4,
        unique: true
    },
    comercioOrigen: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comercio',
        required: false // pedidos viejos: el origen era un comercio
    },
    depositoOrigen: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Deposito',
        required: false
    },
    comercioDestino: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comercio',
        required: true
    },
    repartidor: {
        type: String,
        required: false,
        default: null
    },
    historialEstados: {
        type: Array,
        default: []
    },
    estado: {
        type: String,
        enum: ['REGISTRADO', 'ASIGNADO', 'EN_CAMINO', 'ENTREGADO', 'CANCELADO', 'FALLIDO'],
        default: 'REGISTRADO'
    },
    comprobante: {
        imagen: { type: String, default: null },
        metodoPago: { type: String, default: null },
        precio: { type: Number, default: null }
    },
    borrado: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Pedido', pedidoSchema);
