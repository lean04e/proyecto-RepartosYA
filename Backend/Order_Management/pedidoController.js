const Pedido = require('../Models/Pedido'); 
const Repartidor = require('../Models/Repartidor');
const Comercio = require('../Models/Comercio');
const fs = require('fs');
const path = require('path');

const EXTENSIONES_COMPROBANTE = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_COMPROBANTE_BYTES = 6 * 1024 * 1024;

// Función auxiliar para resolver el _id de Mongo de Repartidor
async function resolverIdRepartidor(repartidorInput) {
    if (!repartidorInput) return null;
    
    const inputStr = String(repartidorInput).trim();

    if (inputStr.match(/^[0-9a-fA-F]{24}$/)) {
        return inputStr;
    }

    const parts = inputStr.split(' ').filter(Boolean);
    const primerNombre = parts[0] || '';
    const apellido = parts.slice(1).join(' ') || '';

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

    const repEncontrado = await Repartidor.findOne({ $or: orConditions });
    return repEncontrado ? repEncontrado._id.toString() : inputStr;
}

// Función para obtener todos los datos de un comercio por su ID
async function obtenerComercio(id) {
    if (!id) return null;
    const input = String(id).trim();

    // 1. Si es el ObjectId de MongoDB (24 caracteres hexadecimales)
    if (input.match(/^[0-9a-fA-F]{24}$/)) {
        return await Comercio.findById(input).lean();
    }

    // 2. Si viene el nombre del comercio (por compatibilidad si el frontend manda el nombre)
    return await Comercio.findOne({
        nombre: new RegExp(`^${input}$`, 'i'),
        borrado: { $ne: true }
    }).lean();
}

const crearPedido = async (req, res) => {
    try {
        const { origen, destino, comercioOrigen, comercioDestino, repartidor } = req.body;

        const repartidorId = await resolverIdRepartidor(repartidor);

        // Obtenemos los datos de ambos comercios usando la función obtenerComercio
        const comercioOrigenDoc = await obtenerComercio(comercioOrigen || origen);
        const comercioDestinoDoc = await obtenerComercio(comercioDestino || destino);

        if (!comercioOrigenDoc || !comercioDestinoDoc) {
            return res.status(400).json({ error: 'Comercio de origen o destino inválido' });
        }

        // Guardamos ÚNICAMENTE las 2 IDs de los comercios en el pedido (cero datos duplicados)
        const nuevoPedido = new Pedido({
            comercioOrigen: comercioOrigenDoc._id,
            comercioDestino: comercioDestinoDoc._id,
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
        // Con ?incluirEntregadosBorrados=true también se devuelven los pedidos entregados que se borraron
        // de la lista (los usa el historial de los repartidores); el resto de los borrados siguen ocultos.
        const filtro = req.query.incluirEntregadosBorrados === 'true'
            ? { $or: [{ borrado: { $ne: true } }, { estado: 'ENTREGADO' }] }
            : { borrado: { $ne: true } };

        // Traemos los pedidos de la base de datos
        const pedidos = await Pedido.find(filtro)
            .populate('comercioOrigen')
            .populate('comercioDestino')
            .sort({ _id: -1 })
            .lean();

        // Enriquecemos cada pedido con los datos traídos desde el propio comercio mediante obtenerComercio
        // Resolvemos los nombres de los repartidores asignados (el pedido guarda solo el _id)
        const idsRepartidores = [...new Set(pedidos.map(p => p.repartidor).filter(r => /^[0-9a-fA-F]{24}$/.test(String(r || ''))))];
        const repartidores = await Repartidor.find({ _id: { $in: idsRepartidores } }).select('nombre apellido').lean();
        const nombresRepartidores = new Map(
            repartidores.map(r => [String(r._id), `${r.nombre || ''} ${r.apellido || ''}`.trim()])
        );

        const pedidosFormateados = await Promise.all(pedidos.map(async (p) => {
            const origenDoc = p.comercioOrigen && p.comercioOrigen.nombre
                ? p.comercioOrigen
                : await obtenerComercio(p.comercioOrigen || p.origen);

            const destinoDoc = p.comercioDestino && p.comercioDestino.nombre
                ? p.comercioDestino
                : await obtenerComercio(p.comercioDestino || p.destino);

            return {
                ...p,
                repartidorNombre: nombresRepartidores.get(String(p.repartidor)) || null,
                // Datos del origen obtenidos directamente de Comercio
                comercioOrigen: origenDoc ? origenDoc.nombre : 'Comercio no especificado',
                origen: origenDoc ? origenDoc.direccion : 'Dirección no especificada',

                // Datos del destino obtenidos directamente de Comercio
                comercioDestino: destinoDoc ? destinoDoc.nombre : 'Comercio no especificado',
                destinatario: destinoDoc ? destinoDoc.nombre : 'Comercio no especificado',
                destino: destinoDoc ? destinoDoc.direccion : 'Dirección no especificada',
                contacto: destinoDoc ? destinoDoc.telefono : 'Sin especificar'
            };
        }));

        res.status(200).json(pedidosFormateados);
    } catch (error) {
        console.error('Error al obtener los pedidos:', error);
        res.status(500).json({ error: 'Error al obtener los pedidos' });
    }
};

const modificarPedido = async (req, res) => {
    try {
        const { id } = req.params;
        const { origen, destino, comercioOrigen, comercioDestino } = req.body;

        const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { ID: id };
        const updateData = {};

        if (comercioOrigen || origen) {
            const origenDoc = await obtenerComercio(comercioOrigen || origen);
            if (origenDoc) updateData.comercioOrigen = origenDoc._id;
        }

        if (comercioDestino || destino) {
            const destinoDoc = await obtenerComercio(comercioDestino || destino);
            if (destinoDoc) updateData.comercioDestino = destinoDoc._id;
        }

        const pedidoActualizado = await Pedido.findOneAndUpdate(
            query,
            updateData,
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

        // Cuenta un pedido entregado para el comercio destino (solo en la transición a ENTREGADO)
        if (pedido.estado === 'ENTREGADO' && estadoAnterior !== 'ENTREGADO') {
            await Comercio.findByIdAndUpdate(pedido.comercioDestino, { $inc: { cantPedidos: 1 } });
        }

        res.status(200).json({ mensaje: 'Pedido actualizado exitosamente', pedido });
    } catch (error) {
        res.status(400).json({ error: 'Error al asignar el repartidor o actualizar estado', detalle: error.message });
    }
};

// Marca el pedido como ENTREGADO guardando el comprobante (imagen), metodo de pago y precio
const entregarPedido = async (req, res) => {
    try {
        const { id } = req.params;
        const { imagenBase64, mimeType, metodoPago, precio } = req.body;

        const extension = EXTENSIONES_COMPROBANTE[mimeType];
        const precioNumero = Number(precio);
        if (!extension) {
            return res.status(400).json({ error: 'El comprobante debe ser una imagen JPG, PNG o WEBP' });
        }
        if (typeof imagenBase64 !== 'string' || !imagenBase64) {
            return res.status(400).json({ error: 'Falta la imagen del comprobante' });
        }
        if (typeof metodoPago !== 'string' || !metodoPago.trim()) {
            return res.status(400).json({ error: 'Falta el metodo de pago' });
        }
        if (!Number.isFinite(precioNumero) || precioNumero <= 0) {
            return res.status(400).json({ error: 'El precio debe ser un numero mayor a 0' });
        }

        const imagen = Buffer.from(imagenBase64, 'base64');
        if (imagen.length === 0 || imagen.length > MAX_COMPROBANTE_BYTES) {
            return res.status(400).json({ error: 'La imagen esta vacia o supera los 6 MB' });
        }

        const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { ID: id };
        const pedido = await Pedido.findOne(query);
        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        if (pedido.estado === 'ENTREGADO') {
            return res.status(409).json({ error: 'El pedido ya fue entregado' });
        }

        // El nombre del archivo sale del _id del pedido, nunca de datos del cliente
        const carpeta = path.join(__dirname, '..', 'uploads', 'comprobantes');
        await fs.promises.mkdir(carpeta, { recursive: true });
        const nombreArchivo = `${pedido._id}.${extension}`;
        await fs.promises.writeFile(path.join(carpeta, nombreArchivo), imagen);

        const estadoAnterior = pedido.estado;
        pedido.estado = 'ENTREGADO';
        pedido.comprobante = {
            imagen: `/uploads/comprobantes/${nombreArchivo}`,
            metodoPago: metodoPago.trim(),
            precio: precioNumero
        };
        pedido.historialEstados.push({
            fecha: new Date().toISOString(),
            estadoAnterior,
            estadoNuevo: 'ENTREGADO'
        });
        await pedido.save();

        await Comercio.findByIdAndUpdate(pedido.comercioDestino, { $inc: { cantPedidos: 1 } });

        res.status(200).json({ mensaje: 'Pedido entregado exitosamente', pedido });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar la entrega', detalle: error.message });
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
    obtenerComercio,
    modificarPedido, 
    cancelaPedido: cancelarPedido, 
    cancelarPedido, 
    eliminarPedido, 
    asignarRepartidor, 
    entregarPedido,
    desasignarRepartidor, 
    obtenerPedidosEntregadosPorRepartidor 
};
