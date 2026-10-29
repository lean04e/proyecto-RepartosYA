const Pedido = require('../Models/Pedido'); 
const Repartidor = require('../Models/Repartidor');

// Función auxiliar con logs para resolver el _id de Mongo
async function resolverIdRepartidor(repartidorInput) {
    if (!repartidorInput) return null;
    
    const inputStr = String(repartidorInput).trim();

    // 1. Si ya es un ObjectId hexadecimal de 24 caracteres, se devuelve tal cual
    if (inputStr.match(/^[0-9a-fA-F]{24}$/)) {
        console.log(`✅ [RESOLVER REPARTIDOR] Recibido _id directo: ${inputStr}`);
        return inputStr;
    }

    console.log(`🔍 [RESOLVER REPARTIDOR] Se recibió texto/legajo ("${inputStr}"), buscando en MongoDB...`);

    // 2. Extraemos partes por si enviaron "Nombre Apellido"
    const parts = inputStr.split(' ').filter(Boolean);
    const primerNombre = parts[0] || '';
    const apellido = parts.slice(1).join(' ') || '';

    // Condicionales de búsqueda
    const orConditions = [
        { legajo: inputStr },
        { email: inputStr },
        { nombre: new RegExp(`^${inputStr}$`, 'i') }
    ];

    if (primerNombre && apellido) {
        orConditions.push({
            $and: [
                { nombre: new RegExp(primerNombre, 'i') }, 
                { apellido: new RegExp(apellido, 'i') }
            ]
        });
    } else if (primerNombre) {
        orConditions.push({ nombre: new RegExp(primerNombre, 'i') });
    }

    // 3. Buscamos en la colección de repartidores
    const repEncontrado = await Repartidor.findOne({ $or: orConditions });

    if (repEncontrado) {
        console.log(`✅ [RESOLVER REPARTIDOR] Encontrado "${repEncontrado.nombre} ${repEncontrado.apellido}" -> _id: ${repEncontrado._id}`);
        return repEncontrado._id.toString();
    }

    console.warn(`⚠️ [RESOLVER REPARTIDOR] No se encontró repartidor para "${inputStr}". Se guardará el texto original.`);
    return inputStr;
}

const crearPedido = async (req, res) => {
    try {
        const { origen, destino, destinatario, contacto, email, repartidor, comercioOrigen } = req.body;

        const repartidorId = await resolverIdRepartidor(repartidor);

        const nuevoPedido = new Pedido({
            comercioOrigen: comercioOrigen || origen,
            origen,
            destino,
            destinatario,
            contacto,
            email,
            repartidor: repartidorId,
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
        const pedidos = await Pedido.find({ borrado: { $ne: true } }).sort({ _id: -1 });
        res.status(200).json(pedidos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los pedidos' });
    }
};

const modificarPedido = async (req, res) => {
    try {
        const { id } = req.params;
        const { origen, destino } = req.body;

        const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { ID: id };

        const pedidoActualizado = await Pedido.findOneAndUpdate(
            query,
            { origen, destino },
            { new: true }
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
        const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { ID: id };

        const pedido = await Pedido.findOne(query);
        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado en la base de datos' });
        }

        const estadoAnterior = pedido.estado;
        pedido.estado = 'CANCELADO';
        
        pedido.historialEstados.push({
            fecha: new Date().toISOString(),
            estadoAnterior: estadoAnterior,
            estadoNuevo: 'CANCELADO'
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
        const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { ID: id };

        const pedidoBorrado = await Pedido.findOneAndUpdate(
            { ...query, borrado: { $ne: true } },
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
        const { repartidor, estado } = req.body;

        const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { ID: id };
        const pedido = await Pedido.findOne(query);
        
        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        const estadoAnterior = pedido.estado;
        
        if (estado) {
            pedido.estado = estado.toUpperCase();
        } else {
            pedido.estado = 'EN_CAMINO';
        }

        if (repartidor) {
            pedido.repartidor = await resolverIdRepartidor(repartidor);
        }

        pedido.historialEstados.push({
            fecha: new Date().toISOString(),
            estadoAnterior: estadoAnterior,
            estadoNuevo: pedido.estado
        });

        await pedido.save();
        res.status(200).json({ mensaje: 'Pedido actualizado exitosamente', pedido });
    } catch (error) {
        res.status(400).json({ error: 'Error al asignar el repartidor o actualizar estado', detalle: error.message });
    }
};

const desasignarRepartidor = async (req, res) => {
    try {
        const { id } = req.params;
        const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { ID: id };

        const pedido = await Pedido.findOne(query);
        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        const estadoAnterior = pedido.estado;
        
        pedido.repartidor = null;
        pedido.estado = 'REGISTRADO';

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

        const repartidorId = await resolverIdRepartidor(nombreRepartidor);

        const pedidosEntregados = await Pedido.find({
            $or: [
                { repartidor: repartidorId },
                { repartidor: nombreRepartidor }
            ],
            estado: { $in: ['ENTREGADO', 'entregado'] }
        }).sort({ _id: -1 });

        res.status(200).json(pedidosEntregados);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los pedidos del repartidor', detalle: error.message });
    }
};

module.exports = { 
    crearPedido, 
    obtenerPedidos, 
    modificarPedido, 
    cancelaPedido: cancelarPedido, 
    cancelarPedido, 
    eliminarPedido, 
    asignarRepartidor, 
    desasignarRepartidor, 
    obtenerPedidosEntregadosPorRepartidor 
};