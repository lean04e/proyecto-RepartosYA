const Pedido = require('../Models/Pedido'); 

const crearPedido = async (req, res) => {
    try {
        const { origen, destino, destinatario, contacto, email } = req.body;

        const nuevoPedido = new Pedido({
            origen,
            destino,
            destinatario,
            contacto,
            email
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

module.exports = { crearPedido, obtenerPedidos };