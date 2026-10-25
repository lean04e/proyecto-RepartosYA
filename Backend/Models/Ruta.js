const mongoose = require('mongoose');

const rutaSchema = new mongoose.Schema({
    repartidor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Repartidor', // Conecta con tu modelo de Repartidor
        required: true
    },
    pedidos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pedido' // Conecta con el modelo de Pedido
        // El orden de los elementos en este array define el orden de la ruta
    }],
    estado: {
        type: String,
        enum: ['pendiente', 'en_curso', 'completada'],
        default: 'pendiente'
    },
    fechaAsignacion: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Ruta', rutaSchema);