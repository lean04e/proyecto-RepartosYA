const express = require('express');
const router = express.Router();
const { crearPedido, obtenerPedidos, modificarPedido } = require('../pedidoController');

router.post('/cargar', crearPedido);
router.get('/', obtenerPedidos);
router.put('/modificar/:id', modificarPedido); 

module.exports = router;