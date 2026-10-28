const express = require('express');
const router = express.Router();

// Importamos los controladores (incluyendo eliminarComercio)
const { obtenerComercios, crearComercio, eliminarComercio, actualizarComercio } = require('./tradeController');

// Ruta GET para obtener la lista de comercios
router.get('/', obtenerComercios);

// Ruta POST para registrar un nuevo comercio
router.post('/', crearComercio);

// Ruta DELETE para dar de baja un comercio por su ID
router.delete('/:id', eliminarComercio);

// Ruta PUT para actualizar un comercio por su ID
router.put('/:id', actualizarComercio);

module.exports = router;