const express = require('express');
const router = express.Router();
const { crearPedido, obtenerPedidos, modificarPedido, cancelarPedido } = require('../pedidoController');

router.post('/cargar', crearPedido);
router.get('/', obtenerPedidos);
router.put('/modificar/:id', modificarPedido); 
router.put('/cancelar/:id', cancelarPedido);

module.exports = router;