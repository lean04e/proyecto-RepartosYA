const Comercio = require('../Models/Comercio');

// Obtener todos los comercios activos para mostrarlos en la tabla
const obtenerComercios = async (req, res) => {
    try {
        const comercios = await Comercio.find({ borrado: false })
            .sort({ cantPedidos: -1 });

        res.status(200).json(comercios);
    } catch (error) {
        res.status(500).json({ 
            mensaje: 'Error al obtener los comercios', 
            error: error.message 
        });
    }
};

// Obtener un comercio por su ID
const obtenerComercioPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const comercio = await Comercio.findById(id);
        if (!comercio) {
            return res.status(404).json({ mensaje: 'Comercio no encontrado' });
        }
        res.status(200).json(comercio);
    } catch (error) {
        res.status(500).json({ 
            mensaje: 'Error al obtener el comercio', 
            error: error.message 
        });
    }
};

// Crear un nuevo comercio
const crearComercio = async (req, res) => {
    try {
        const nuevoComercio = new Comercio(req.body);
        await nuevoComercio.save();
        res.status(201).json(nuevoComercio);
    } catch (error) {
        res.status(400).json({ 
            mensaje: 'Error al crear el comercio', 
            error: error.message 
        });
    }
};

// Borrado lógico de un comercio
const eliminarComercio = async (req, res) => {
    try {
        const { id } = req.params;
        
        const comercioBorrado = await Comercio.findByIdAndUpdate(
            id, 
            { borrado: true }, 
            { new: true }
        );

        if (!comercioBorrado) {
            return res.status(404).json({ mensaje: 'Comercio no encontrado' });
        }

        res.status(200).json({ mensaje: 'Comercio eliminado correctamente', comercio: comercioBorrado });
    } catch (error) {
        res.status(500).json({ 
            mensaje: 'Error al eliminar el comercio', 
            error: error.message 
        });
    }
};

// Actualizar un comercio existente
const actualizarComercio = async (req, res) => {
    try {
        const { id } = req.params;
        
        const comercioActualizado = await Comercio.findByIdAndUpdate(
            id, 
            req.body, 
            { new: true, runValidators: true }
        );

        if (!comercioActualizado) {
            return res.status(404).json({ mensaje: 'Comercio no encontrado' });
        }

        res.status(200).json(comercioActualizado);
    } catch (error) {
        res.status(400).json({ 
            mensaje: 'Error al actualizar el comercio', 
            error: error.message 
        });
    }
};

module.exports = {
    obtenerComercios,
    obtenerComercioPorId,
    crearComercio,
    eliminarComercio,
    actualizarComercio
};
