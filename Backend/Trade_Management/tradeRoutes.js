const express = require('express');
const router = express.Router();

const { 
    obtenerComercios, 
    obtenerComercioPorId, 
    obtenerPedidosDeComercio, 
    crearComercio, 
    eliminarComercio, 
    actualizarComercio 
} = require('./tradeController');

// Ruta GET para obtener la lista de comercios
router.get('/', obtenerComercios);

// Ruta GET para obtener un comercio por su ID
router.get('/:id', obtenerComercioPorId);

// Ruta GET para obtener el historial de pedidos de un comercio (como destino)
router.get('/:id/pedidos', obtenerPedidosDeComercio);

// Ruta POST para registrar un nuevo comercio
router.post('/', crearComercio);

// Ruta DELETE para dar de baja un comercio por su ID
router.delete('/:id', eliminarComercio);

// Ruta PUT para actualizar un comercio por su ID
router.put('/:id', actualizarComercio);

module.exports = router;
