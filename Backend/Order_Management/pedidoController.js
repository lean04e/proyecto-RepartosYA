const Pedido = require('../Models/Pedido'); 

const crearPedido = async (req, res) => {
    try {
        const { origen, destino, destinatario, contacto, email, repartidor } = req.body;

        const nuevoPedido = new Pedido({
            origen,
            destino,
            destinatario,
            contacto,
            email,
            repartidor,
            // Agregamos el historial inicial al crear el pedido
            historialEstados: [{
                fecha: new Date().toISOString(),
                estadoAnterior: null,
                estadoNuevo: 'REGISTRADO'
            }]
        });
        
        await nuevoPedido.save();
        res.status(201).json({ mensaje: 'Pedido creado exitosamente', pedido: nuevoPedido });
    } catch (error) {
        res.status(400).json({ error: 'Error al crear el pedido', detalle: error.message });
    }
};

const obtenerPedidos = async (req, res) => {
    try {
        const pedidos = await Pedido.find({ borrado: { $ne: true } }).sort({ _id: -1 }); // Ordena mostrando los más nuevos primero
        res.status(200).json(pedidos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los pedidos' });
    }
};

const modificarPedido = async (req, res) => {
    try {
        const { id } = req.params;
        const { origen, destino } = req.body;

        // Busca el pedido por tu campo de UUID "ID" y actualiza los datos
        const pedidoActualizado = await Pedido.findOneAndUpdate(
            { ID: id },
            { origen, destino, repartidor },
            { new: true } // Esto devuelve el documento ya actualizado
        );

        if (!pedidoActualizado) {
            return res.status(404).json({ error: 'Pedido no encontrado en la base de datos' });
        }

        res.status(200).json({ mensaje: 'Pedido modificado exitosamente', pedido: pedidoActualizado });
    } catch (error) {
        res.status(400).json({ error: 'Error al modificar el pedido', detalle: error.message });
    }
};

const cancelarPedido = async (req, res) => {
    try {
        const { id } = req.params;

        const pedido = await Pedido.findOne({ ID: id });
        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado en la base de datos' });
        }

        const estadoAnterior = pedido.estado;
        pedido.estado = 'cancelado';
        
        // Registramos el cambio de estado en el historial
        pedido.historialEstados.push({
            fecha: new Date().toISOString(),
            estadoAnterior: estadoAnterior,
            estadoNuevo: 'cancelado'
        });

        await pedido.save();

        res.status(200).json({ mensaje: 'Pedido cancelado exitosamente', pedido });
    } catch (error) {
        res.status(400).json({ error: 'Error al cancelar el pedido', detalle: error.message });
    }
};

const eliminarPedido = async (req, res) => {
    try {
        const { id } = req.params;

        // Borrado lógico: se marca como borrado en lugar de eliminarlo físicamente
        const pedidoBorrado = await Pedido.findOneAndUpdate(
            { ID: id, borrado: { $ne: true } },
            { borrado: true },
            { new: true }
        );

        if (!pedidoBorrado) {
            return res.status(404).json({ error: 'Pedido no encontrado en la base de datos' });
        }

        res.status(200).json({ mensaje: 'Pedido borrado exitosamente', pedido: pedidoBorrado });
    } catch (error) {
        res.status(400).json({ error: 'Error al borrar el pedido', detalle: error.message });
    }
};

const asignarRepartidor = async (req, res) => {
    try {
        const { id } = req.params;
        const { repartidor } = req.body;

        const pedido = await Pedido.findOne({ ID: id });
        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        const estadoAnterior = pedido.estado;
        
        // Actualizamos los datos
        pedido.repartidor = repartidor;
        pedido.estado = 'EN_CAMINO';

        // Registramos el cambio en la cronología
        pedido.historialEstados.push({
            fecha: new Date().toISOString(),
            estadoAnterior: estadoAnterior,
            estadoNuevo: 'EN_CAMINO'
        });

        await pedido.save();

        res.status(200).json({ mensaje: 'Repartidor asignado exitosamente', pedido });
    } catch (error) {
        res.status(400).json({ error: 'Error al asignar el repartidor', detalle: error.message });
    }
};

const desasignarRepartidor = async (req, res) => {
    try {
        const { id } = req.params;

        const pedido = await Pedido.findOne({ ID: id });
        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        const estadoAnterior = pedido.estado;
        
        // Volvemos el pedido a su estado original
        pedido.repartidor = null;
        pedido.estado = 'REGISTRADO';

        // Registramos que se canceló la asignación
        pedido.historialEstados.push({
            fecha: new Date().toISOString(),
            estadoAnterior: estadoAnterior,
            estadoNuevo: 'REGISTRADO'
        });

        await pedido.save();

        res.status(200).json({ mensaje: 'Repartidor desasignado exitosamente', pedido });
    } catch (error) {
        res.status(400).json({ error: 'Error al desasignar el repartidor', detalle: error.message });
    }
};

const obtenerPedidosEntregadosPorRepartidor = async (req, res) => {
    try {
        const { nombreRepartidor } = req.params;

        // Busca los pedidos de este repartidor que estén en estado ENTREGADO
        const pedidosEntregados = await Pedido.find({
            repartidor: nombreRepartidor,
            estado: { $in: ['ENTREGADO', 'entregado'] }
        }).sort({ _id: -1 }); // Los más recientes primero

        res.status(200).json(pedidosEntregados);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los pedidos del repartidor', detalle: error.message });
    }
};

module.exports = { crearPedido, obtenerPedidos, modificarPedido, cancelarPedido, eliminarPedido, asignarRepartidor, desasignarRepartidor, obtenerPedidosEntregadosPorRepartidor };
