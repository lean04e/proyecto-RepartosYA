const Pedido = require('../Models/Pedido'); 
const Repartidor = require('../Models/Repartidor');
const Comercio = require('../Models/Comercio');
const Deposito = require('../Models/Deposito');
const Comprobante = require('../Models/Comprobante');

const EXTENSIONES_COMPROBANTE = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_COMPROBANTE_BYTES = 6 * 1024 * 1024;
const DEMO_ETA_SECONDS = 15;


function getOrderTimestamp(order) {
    const timestamp = Date.parse(order.updatedAt || order.createdAt || '');
    return Number.isFinite(timestamp) ? timestamp : 0;
}

function getOrderStatusTimestamp(order, status) {
    for (let index = (order.historialEstados || []).length - 1; index >= 0; index -= 1) {
        const event = order.historialEstados[index];
        if (String(event.estadoNuevo || '').toUpperCase() === status) {
            const timestamp = Date.parse(event.fecha || '');
            if (Number.isFinite(timestamp)) {
                return timestamp;
            }
        }
    }

    return getOrderTimestamp(order);
}

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

// Busca un deposito por _id o por nombre
async function obtenerDeposito(id) {
    if (!id) return null;
    const input = String(id).trim();
    if (input.match(/^[0-9a-fA-F]{24}$/)) {
        return await Deposito.findById(input).lean();
    }
    return await Deposito.findOne({ nombre: new RegExp(`^${input}$`, 'i') }).lean();
}

// Activa automáticamente el siguiente pedido en cola (ASIGNADO) para el repartidor dado, pasándolo a EN_CAMINO
async function activarSiguientePedidoRepartidor(repartidorInput) {
    if (!repartidorInput) return null;
    const repartidorId = await resolverIdRepartidor(repartidorInput);

    const filtroRepartidor = {
        $or: [
            { repartidor: repartidorId },
            { repartidor: String(repartidorInput) }
        ]
    };

    // 1. Verificar si el repartidor ya tiene algún pedido EN_CAMINO activo
    const tieneEnCamino = await Pedido.findOne({
        ...filtroRepartidor,
        estado: 'EN_CAMINO',
        borrado: { $ne: true }
    });
    if (tieneEnCamino) {
        return null;
    }

    // 2. Buscar el siguiente pedido ASIGNADO más antiguo (orden cronológico)
    const siguientePedido = await Pedido.findOne({
        ...filtroRepartidor,
        estado: 'ASIGNADO',
        borrado: { $ne: true }
    }).sort({ createdAt: 1, _id: 1 });

    if (!siguientePedido) {
        return null;
    }

    // 3. Pasar el siguiente pedido a EN_CAMINO y registrar el cambio en su historial
    const estadoAnterior = siguientePedido.estado;
    siguientePedido.estado = 'EN_CAMINO';
    siguientePedido.historialEstados.push({
        fecha: new Date().toISOString(),
        estadoAnterior,
        estadoNuevo: 'EN_CAMINO'
    });

    await siguientePedido.save();
    return siguientePedido;
}

const crearPedido = async (req, res) => {
    try {
        const { origen, destino, depositoOrigen, comercioDestino, repartidor } = req.body;

        const repartidorId = await resolverIdRepartidor(repartidor);

        // Obtenemos los datos de ambos comercios usando la función obtenerComercio
        const depositoOrigenDoc = await obtenerDeposito(depositoOrigen || origen);
        const comercioDestinoDoc = await obtenerComercio(comercioDestino || destino);

        if (!depositoOrigenDoc || !comercioDestinoDoc) {
            return res.status(400).json({ error: 'Depósito de origen o comercio de destino inválido' });
        }

        // Guardamos ÚNICAMENTE las 2 IDs de los comercios en el pedido (cero datos duplicados)
        const nuevoPedido = new Pedido({
            depositoOrigen: depositoOrigenDoc._id,
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
            ? { $or: [{ borrado: { $ne: true } }, { estado: { $in: ['ENTREGADO', 'FALLIDO'] } }] }
            : { borrado: { $ne: true } };

        // Traemos los pedidos de la base de datos
        const pedidos = await Pedido.find(filtro)
            .populate('comercioOrigen')
            .populate('depositoOrigen')
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
            // El origen es un deposito; los pedidos viejos conservan su comercio de origen
            const origenDoc = p.depositoOrigen && p.depositoOrigen.nombre
                ? p.depositoOrigen
                : (p.comercioOrigen && p.comercioOrigen.nombre
                    ? p.comercioOrigen
                    : await obtenerComercio(p.comercioOrigen || p.origen));

            const destinoDoc = p.comercioDestino && p.comercioDestino.nombre
                ? p.comercioDestino
                : await obtenerComercio(p.comercioDestino || p.destino);

            return {
                ...p,
                repartidorNombre: nombresRepartidores.get(String(p.repartidor)) || null,
                // Datos del origen obtenidos directamente de Comercio
                comercioOrigen: origenDoc ? origenDoc.nombre : 'Origen no especificado',
                depositoOrigen: undefined,
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

const obtenerSeguimientoPedido = async (req, res) => {
    try {
        const { id } = req.params;
        const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { ID: id };
        const pedido = await Pedido.findOne({
            ...query,
            borrado: { $ne: true }
        })
            .select('ID estado repartidor updatedAt createdAt historialEstados comercioOrigen depositoOrigen comercioDestino')
            .populate('comercioOrigen', 'nombre')
            .populate('depositoOrigen', 'nombre')
            .populate('comercioDestino', 'nombre')
            .lean();

        if (!pedido) {
            return res.status(404).json({ message: 'Pedido no encontrado.' });
        }

        const estadoActual = String(pedido.estado || '').trim().toUpperCase();
        if (['FALLIDO', 'CANCELADO', 'RECHAZADO'].includes(estadoActual)) {
            return res.status(404).json({ message: 'Seguimiento no encontrado.' });
        }

        let timerStartedAt = null;
        let timerDurationSeconds = null;
        if (estadoActual === 'EN_CAMINO') {
            const startTimestamp = getOrderStatusTimestamp(pedido, 'EN_CAMINO');
            timerStartedAt = startTimestamp ? new Date(startTimestamp).toISOString() : null;
            timerDurationSeconds = DEMO_ETA_SECONDS;
        }

        const repartidorId = await resolverIdRepartidor(pedido.repartidor);
        const repartidor = repartidorId && /^[0-9a-fA-F]{24}$/.test(String(repartidorId))
            ? await Repartidor.findById(repartidorId).select('nombre apellido').lean()
            : null;

        return res.status(200).json({
            id: pedido.ID,
            driver: repartidor ? `${repartidor.nombre || ''} ${repartidor.apellido || ''}`.trim() : null,
            status: pedido.estado,
            origin: pedido.depositoOrigen?.nombre || pedido.comercioOrigen?.nombre || null,
            destination: pedido.comercioDestino?.nombre || null,
            timerStartedAt,
            timerDurationSeconds
        });
    } catch (error) {
        console.error('Error al obtener el seguimiento del pedido:', error);
        return res.status(500).json({ message: 'No se pudo cargar el seguimiento del pedido.' });
    }
};

const modificarPedido = async (req, res) => {
    try {
        const { id } = req.params;
        const { origen, destino, depositoOrigen, comercioDestino } = req.body;

        const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { ID: id };
        const updateData = {};

        if (depositoOrigen || origen) {
            const origenDoc = await obtenerDeposito(depositoOrigen || origen);
            if (origenDoc) {
                updateData.depositoOrigen = origenDoc._id;
                updateData.comercioOrigen = null;
            }
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

        if (pedido.estado === 'CANCELADO' || pedido.estado === 'FALLIDO' || pedido.estado === 'RECHAZADO') {
            return res.status(409).json({ error: 'El pedido ya fue cancelado o rechazado' });
        }

        // Cancelado: se corta antes de salir. Fallido: ya estaba en camino o entregado.
        const estadoAnterior = pedido.estado;
        const repartidorAsignado = pedido.repartidor;
        const estadoNuevo = ['EN_CAMINO', 'ENTREGADO'].includes(estadoAnterior) ? 'FALLIDO' : 'CANCELADO';
        pedido.estado = estadoNuevo;

        pedido.historialEstados.push({
            fecha: new Date().toISOString(),
            estadoAnterior: estadoAnterior,
            estadoNuevo
        });

        await pedido.save();

        // Si el pedido finalizado estaba en camino, activar el siguiente pedido en cola del repartidor
        if (repartidorAsignado && estadoAnterior === 'EN_CAMINO') {
            await activarSiguientePedidoRepartidor(repartidorAsignado);
        }

        res.status(200).json({
            mensaje: estadoNuevo === 'FALLIDO' ? 'Pedido marcado como fallido' : 'Pedido cancelado exitosamente',
            pedido
        });
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

        // Si el pedido borrado estaba en camino, activar el siguiente pedido en cola
        if (pedidoBorrado.repartidor && pedidoBorrado.estado === 'EN_CAMINO') {
            await activarSiguientePedidoRepartidor(pedidoBorrado.repartidor);
        }

        res.status(200).json({ mensaje: 'Pedido borrado exitosamente', pedido: pedidoBorrado });
    } catch (error) {
        res.status(400).json({ error: 'Error al borrar el pedido', detalle: error.message });
    }
};

const asignarRepartidor = async (req, res) => {
    try {
        const { id } = req.params;
        const { repartidor, estado, motivoIncidencia, observacionIncidencia } = req.body;

        const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { ID: id };
        const pedido = await Pedido.findOne(query);
        
        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        const estadoAnterior = pedido.estado;
        let nuevoEstado = estado ? estado.toUpperCase() : null;

        let repartidorDestino = pedido.repartidor;
        if (repartidor) {
            repartidorDestino = await resolverIdRepartidor(repartidor);
            pedido.repartidor = repartidorDestino;
        }

        const esEstadoFinal = ['ENTREGADO', 'CANCELADO', 'FALLIDO', 'RECHAZADO'].includes(nuevoEstado);

        if (!esEstadoFinal) {
            if (repartidorDestino) {
                // Verificar si el repartidor ya tiene algún pedido EN_CAMINO activo (excluyendo este pedido)
                const tieneEnCamino = await Pedido.findOne({
                    $or: [
                        { repartidor: repartidorDestino },
                        { repartidor: repartidor }
                    ],
                    estado: 'EN_CAMINO',
                    borrado: { $ne: true },
                    _id: { $ne: pedido._id }
                });

                if (tieneEnCamino) {
                    // Si ya tiene un pedido en camino, el nuevo pedido queda como ASIGNADO
                    nuevoEstado = 'ASIGNADO';
                } else {
                    // Si no tiene ninguno en camino, este pedido pasa a EN_CAMINO
                    nuevoEstado = (nuevoEstado && nuevoEstado !== 'REGISTRADO') ? nuevoEstado : 'EN_CAMINO';
                }
            } else {
                nuevoEstado = nuevoEstado || 'REGISTRADO';
            }
        }

        pedido.estado = nuevoEstado;

        pedido.historialEstados.push({
            fecha: new Date().toISOString(),
            estadoAnterior: estadoAnterior,
            estadoNuevo: pedido.estado
        });
        const entradaHistorial = {
            fecha: new Date().toISOString(),
            estadoAnterior: estadoAnterior,
            estadoNuevo: pedido.estado
        };

        if (pedido.estado === 'RECHAZADO') {
            const motivoLimpio = typeof motivoIncidencia === 'string' ? motivoIncidencia.trim() : '';
            const obsLimpia = typeof observacionIncidencia === 'string' ? observacionIncidencia.trim() : '';

            pedido.incidencia = {
                motivo: motivoLimpio || null,
                observacion: obsLimpia || null,
                fecha: new Date()
            };

            if (motivoLimpio) entradaHistorial.motivo = motivoLimpio;
            if (obsLimpia) entradaHistorial.observacion = obsLimpia;
        }

        pedido.historialEstados.push(entradaHistorial);

        await pedido.save();

        // Cuenta un pedido entregado para el comercio destino (solo en la transición a ENTREGADO)
        if (pedido.estado === 'ENTREGADO' && estadoAnterior !== 'ENTREGADO') {
            await Comercio.findByIdAndUpdate(pedido.comercioDestino, { $inc: { cantPedidos: 1 } });
        }

        // Si este pedido finalizó (o dejó de estar EN_CAMINO) y tiene repartidor, activar el siguiente pedido en cola
        if (repartidorDestino && (esEstadoFinal || (estadoAnterior === 'EN_CAMINO' && pedido.estado !== 'EN_CAMINO'))) {
            await activarSiguientePedidoRepartidor(repartidorDestino);
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

        // La imagen se guarda en MongoDB, asi se ve desde cualquier backend/red
        await Comprobante.findOneAndUpdate(
            { pedido: pedido._id },
            { data: imagen, tipo: mimeType },
            { upsert: true }
        );

        const estadoAnterior = pedido.estado;
        pedido.estado = 'ENTREGADO';
        pedido.comprobante = {
            imagen: `/api/pedidos/${pedido._id}/comprobante`,
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

        // Activar automáticamente el siguiente pedido asignado en cola para este repartidor
        if (pedido.repartidor) {
            await activarSiguientePedidoRepartidor(pedido.repartidor);
        }

        res.status(200).json({ mensaje: 'Pedido entregado exitosamente', pedido });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar la entrega', detalle: error.message });
    }
};

// Devuelve la imagen del comprobante guardada en MongoDB
const obtenerComprobante = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(404).json({ error: 'Comprobante no encontrado' });
        }
        const comprobante = await Comprobante.findOne({ pedido: id }).lean();
        if (!comprobante) {
            return res.status(404).json({ error: 'Comprobante no encontrado' });
        }
        res.set('Content-Type', comprobante.tipo);
        res.send(comprobante.data.buffer ? Buffer.from(comprobante.data.buffer) : comprobante.data);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el comprobante', detalle: error.message });
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
        const repartidorAnterior = pedido.repartidor;
        
        pedido.repartidor = null;
        pedido.estado = 'REGISTRADO';

        pedido.historialEstados.push({
            fecha: new Date().toISOString(),
            estadoAnterior: estadoAnterior,
            estadoNuevo: 'REGISTRADO'
        });

        await pedido.save();

        // Si el pedido desasignado estaba EN_CAMINO, activar el siguiente pedido en cola del repartidor
        if (repartidorAnterior && estadoAnterior === 'EN_CAMINO') {
            await activarSiguientePedidoRepartidor(repartidorAnterior);
        }

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

/**
 * HISTORIA DE USUARIO #11: Ver Detalle Entrega
 * Permite al administrador ver los detalles de un pedido que ya fue entregado.
 * 
 * Regla: Debe de aplicarse sobre un pedido ya entregado
 * - Escenario 1: Sobre pedido ya entregado -> Devuelve ID, origen, destino, precio, repartidor, método de pago e imagen.
 * - Escenario 2: Sobre pedido no entregado -> Devuelve 400 con mensaje "El pedido no ha sido entregado".
 */
const obtenerDetalleEntrega = async (req, res) => {
    try {
        const { id } = req.params;
        const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { ID: id };

        const pedido = await Pedido.findOne(query)
            .populate('comercioOrigen')
            .populate('depositoOrigen')
            .populate('comercioDestino');

        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado en la base de datos' });
        }

        // =========================================================================
        // ESCENARIO 2: El pedido no figura como entregado
        // =========================================================================
        if (pedido.estado !== 'ENTREGADO') {
            return res.status(400).json({ 
                mensaje: 'El pedido no ha sido entregado',
                entregado: false,
                estadoActual: pedido.estado 
            });
        }

        // =========================================================================
        // ESCENARIO 1: El pedido ya fue entregado -> Resolver datos
        // =========================================================================

        // 1. Origen (depósito o comercio)
        const origenDoc = pedido.depositoOrigen || pedido.comercioOrigen 
            || (await obtenerComercio(pedido.origen));
        const origenNombre = origenDoc ? origenDoc.nombre : 'Origen no especificado';
        const origenDireccion = origenDoc ? origenDoc.direccion : 'Dirección no especificada';

        // 2. Destino (comercio de destino)
        const destinoDoc = pedido.comercioDestino 
            || (await obtenerComercio(pedido.destino));
        const destinoNombre = destinoDoc ? destinoDoc.nombre : 'Destino no especificado';
        const destinoDireccion = destinoDoc ? destinoDoc.direccion : 'Dirección no especificada';

        // 3. Repartidor que lo entregó
        let repartidorNombre = 'Sin repartidor registrado';
        if (pedido.repartidor) {
            const repartidorId = await resolverIdRepartidor(pedido.repartidor);
            const rep = await Repartidor.findById(repartidorId).select('nombre apellido legajo').lean();
            if (rep) {
                repartidorNombre = `${rep.nombre || ''} ${rep.apellido || ''}`.trim() || `Legajo ${rep.legajo}`;
            } else {
                repartidorNombre = String(pedido.repartidor);
            }
        }

        // 4. Retornar los campos requeridos
        return res.status(200).json({
            id: pedido.ID,
            _id: pedido._id,
            origen: {
                nombre: origenNombre,
                direccion: origenDireccion
            },
            destino: {
                nombre: destinoNombre,
                direccion: destinoDireccion
            },
            precio: pedido.comprobante?.precio ?? 0,
            repartidor: repartidorNombre,
            metodoPago: pedido.comprobante?.metodoPago || 'No especificado',
            imagen: pedido.comprobante?.imagen || null
        });

    } catch (error) {
        console.error('Error al obtener el detalle de la entrega:', error);
        return res.status(500).json({ 
            error: 'Error interno del servidor al consultar el detalle de entrega',
            detalle: error.message 
        });
    }
};

module.exports = { 
    crearPedido, 
    obtenerPedidos, 
    obtenerSeguimientoPedido,
    obtenerComercio,
    modificarPedido, 
    cancelaPedido: cancelarPedido, 
    cancelarPedido, 
    eliminarPedido, 
    asignarRepartidor, 
    entregarPedido,
    obtenerComprobante,
    desasignarRepartidor, 
    obtenerPedidosEntregadosPorRepartidor,
    obtenerDetalleEntrega
};

