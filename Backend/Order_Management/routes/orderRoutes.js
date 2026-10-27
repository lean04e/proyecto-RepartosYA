const express = require('express');
const router = express.Router();
const { obtenerPedidos, crearPedido } = require('../orderController');

// GET /pedidos -> Lista todos los pedidos
router.get('/', obtenerPedidos);

// POST /pedidos -> Da de alta un nuevo pedido
router.post('/', crearPedido);

module.exports = router;