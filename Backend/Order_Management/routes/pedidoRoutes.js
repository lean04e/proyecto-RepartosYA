const express = require('express');
const router = express.Router();
const { crearPedido, obtenerPedidos, modificarPedido, cancelarPedido, eliminarPedido } = require('../pedidoController');

router.post('/cargar', crearPedido);
router.get('/', obtenerPedidos);
router.put('/modificar/:id', modificarPedido); 
router.put('/cancelar/:id', cancelarPedido);
router.delete('/:id', eliminarPedido);

module.exports = router;