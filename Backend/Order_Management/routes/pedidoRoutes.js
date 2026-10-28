const express = require('express');
const router = express.Router();
const { crearPedido, obtenerPedidos, modificarPedido, cancelarPedido, eliminarPedido, asignarPedidos, desasignarPedido } = require('../pedidoController');

router.post('/cargar', crearPedido);
router.get('/', obtenerPedidos);
router.put('/modificar/:id', modificarPedido); 
router.put('/cancelar/:id', cancelarPedido);
router.put('/asignar', asignarPedidos);
router.put('/desasignar/:id', desasignarPedido);
router.delete('/:id', eliminarPedido);

module.exports = router;