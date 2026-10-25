const express = require('express');
const router = express.Router();
// CÓMO DEBE QUEDAR (buscando dentro de la misma carpeta)
const { obtenerComercios, crearComercio } = require('./tradeController');

// Ruta GET para obtener la lista de comercios (ideal para la tabla)
router.get('/', obtenerComercios);

// Ruta POST para registrar un nuevo comercio
router.post('/', crearComercio);

module.exports = router;