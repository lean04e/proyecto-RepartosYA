const express = require('express');
const router = express.Router();
const { crearPedido, obtenerPedidos } = require('../pedidoController');

router.post('/cargar', crearPedido);
router.get('/', obtenerPedidos);

module.exports = router;