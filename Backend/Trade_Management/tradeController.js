const Comercio = require('../Models/Comercio');

// Obtener todos los comercios activos para mostrarlos en la tabla
const obtenerComercios = async (req, res) => {
    try {
        // Buscamos los que no estén borrados y los ordenamos del que más pedidos tiene al que menos
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

module.exports = {
    obtenerComercios,
    crearComercio
};