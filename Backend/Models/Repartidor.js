const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
// Definimos la estructura exacta que tendrá el Administrador en MongoDB
const repartidorSchema = new mongoose.Schema({
    ID: {
        type: String,
        default: uuidv4, // Se rellena solo con un código único automáticamente
        unique: true     // Garantiza que no se repita en la base de datos
    },
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
        unique: true 
    },
    password: {
        type: String,
        required: true // Se guardará encriptada con bcrypt
    },
    telefono: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: 'Activo'
    },
    destination: {
        type: String,
        default: 'En base'
    }

});

module.exports = mongoose.model('Repartidor', repartidorSchema);