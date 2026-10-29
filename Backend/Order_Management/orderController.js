const Pedido = require('../Models/Pedido');

// Obtener todos los pedidos
const obtenerPedidos = async (req, res) => {
    try {
        const pedidos = await Pedido.find();
        res.status(200).json(pedidos);
    } catch (error) {
        res.status(500).json({ 
            mensaje: 'Error al obtener los pedidos', 
            error: error.message 
        });
    }
};

// Crear un nuevo pedido
const crearPedido = async (req, res) => {
    try {
        // Creamos el pedido con los datos que llegan en el body (origen, destino, destinatario, etc.)
        const nuevoPedido = new Pedido(req.body);
        await nuevoPedido.save();
        
        res.status(201).json({
            mensaje: 'Pedido creado exitosamente',
            pedido: nuevoPedido
        });
    } catch (error) {
        res.status(400).json({ 
            mensaje: 'Error al crear el pedido', 
            error: error.message 
        });
    }
};

module.exports = {
    obtenerPedidos,
    crearPedido
};