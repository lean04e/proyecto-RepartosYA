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
        required: true
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
        enum: ['REGISTRADO', 'ASIGNADO', 'EN_CAMINO', 'ENTREGADO', 'RECHAZADO', 'CANCELADO'],
        default: 'REGISTRADO'
    },
    borrado: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Pedido', pedidoSchema);
