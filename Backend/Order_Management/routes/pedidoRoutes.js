const express = require('express');
const router = express.Router();
const { 
    crearPedido, 
    obtenerPedidos, 
    modificarPedido, 
    cancelarPedido, 
    eliminarPedido, 
    obtenerPedidosEntregadosPorRepartidor,
    asignarRepartidor,
    desasignarRepartidor
} = require('../pedidoController');

router.post('/cargar', crearPedido);
router.get('/', obtenerPedidos);
router.put('/modificar/:id', modificarPedido); 
router.put('/cancelar/:id', cancelarPedido);
router.put('/asignar/:id', asignarRepartidor);
router.delete('/:id', eliminarPedido);
router.get('/repartidor/:nombreRepartidor/entregados', obtenerPedidosEntregadosPorRepartidor);
router.put('/desasignar/:id', desasignarRepartidor);

module.exports = router;