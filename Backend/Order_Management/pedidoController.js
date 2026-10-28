const Pedido = require('../Models/Pedido'); 

const crearPedido = async (req, res) => {
    try {
        const { origen, destino, destinatario, contacto, email , repartidor} = req.body;

        const nuevoPedido = new Pedido({
            origen,
            destino,
            destinatario,
            contacto,
            email,
            repartidor
        });
        
        await nuevoPedido.save();
        res.status(201).json({ mensaje: 'Pedido creado exitosamente', pedido: nuevoPedido });
    } catch (error) {
        res.status(400).json({ error: 'Error al crear el pedido', detalle: error.message });
    }
};

const obtenerPedidos = async (req, res) => {
    try {
        const pedidos = await Pedido.find().sort({ _id: -1 }); // Ordena mostrando los más nuevos primero
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
            { origen, destino },
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

        // Busca el pedido por su ID y le cambia el estado a 'cancelado'
        const pedidoCancelado = await Pedido.findOneAndUpdate(
            { ID: id },
            { estado: 'cancelado' },
            { new: true }
        );

        if (!pedidoCancelado) {
            return res.status(404).json({ error: 'Pedido no encontrado en la base de datos' });
        }

        res.status(200).json({ mensaje: 'Pedido cancelado exitosamente', pedido: pedidoCancelado });
    } catch (error) {
        res.status(400).json({ error: 'Error al cancelar el pedido', detalle: error.message });
    }
};

module.exports = { crearPedido, obtenerPedidos, modificarPedido, cancelarPedido };