const express = require('express');
const router = express.Router();
const { crearPedido, obtenerPedidos, modificarPedido, cancelarPedido, eliminarPedid, eliminarPedido, obtenerPedidosEntregadosPorRepartidor } = require('../pedidoController');

router.post('/cargar', crearPedido);
router.get('/', obtenerPedidos);
router.put('/modificar/:id', modificarPedido); 
router.put('/cancelar/:id', cancelarPedido);
router.delete('/:id', eliminarPedido);
router.get('/repartidor/:nombreRepartidor/entregados', obtenerPedidosEntregadosPorRepartidor);
module.exports = router;