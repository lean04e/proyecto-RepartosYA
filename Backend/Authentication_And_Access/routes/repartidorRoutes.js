const express = require('express');
const router = express.Router(); // Esta es la línea que faltaba

// Importación del controlador con todas las funciones
const { 
    cargarRepartidor, 
    obtenerRepartidores, 
    modificarRepartidor, 
    borrarRepartidor,
    obtenerPerfilRepartidor,
    modificarPerfilRepartidor
} = require('../controllers/repartidorController');

// Definición de las rutas
router.post('/cargar', cargarRepartidor);
router.get('/', obtenerRepartidores);
router.get('/:id/perfil', obtenerPerfilRepartidor);
router.put('/:id/perfil', modificarPerfilRepartidor);
router.get('/:id', obtenerPerfilRepartidor);
router.put('/:id', modificarRepartidor);
router.delete('/:id', borrarRepartidor);

module.exports = router;