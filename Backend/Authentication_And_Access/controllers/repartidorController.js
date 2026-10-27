const Repartidor = require('../../Models/Repartidor');
const bcrypt = require('bcrypt');

const cargarRepartidor = async (req, res) => {
    try {
        const { nombre, apellido, email, password, telefono } = req.body;

        // Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crear y guardar en MongoDB
        const nuevoRepartidor = new Repartidor({
            nombre,
            apellido,
            email,
            password: hashedPassword,
            telefono
        });
        
        await nuevoRepartidor.save();
        res.status(201).json({ mensaje: 'Repartidor creado con éxito' });
        
    } catch (error) {
        res.status(400).json({ error: 'Error al cargar el repartidor', detalle: error.message });
    }
};

// Función nueva para obtener los repartidores
const obtenerRepartidores = async (req, res) => {
    try {
        const repartidores = await Repartidor.find(); // Busca todos en MongoDB
        res.status(200).json(repartidores);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los repartidores' });
    }
};

const modificarRepartidor = async (req, res) => {
    try {
        const { id } = req.params; // El ID que manda el frontend
        const { nombre, apellido, email, telefono, status, password } = req.body;

        let actualizacion = { nombre, apellido, email, telefono, status };

        // Si el admin escribió una nueva contraseña, la encriptamos antes de guardar
        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            actualizacion.password = await bcrypt.hash(password, salt);
        }

        // Buscamos y actualizamos por _id de MongoDB
        const repartidorActualizado = await Repartidor.findByIdAndUpdate(id, actualizacion, { new: true });

        if (!repartidorActualizado) {
            return res.status(404).json({ error: 'Repartidor no encontrado' });
        }

        res.status(200).json({ mensaje: 'Repartidor modificado con éxito', repartidor: repartidorActualizado });
    } catch (error) {
        res.status(500).json({ error: 'Error al modificar el repartidor', detalle: error.message });
    }
};

const borrarRepartidor = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Busca y elimina el documento en MongoDB por su _id
        const repartidorBorrado = await Repartidor.findByIdAndDelete(id);

        if (!repartidorBorrado) {
            return res.status(404).json({ error: 'Repartidor no encontrado' });
        }

        res.status(200).json({ mensaje: 'Repartidor eliminado con éxito' });
    } catch (error) {
        res.status(500).json({ error: 'Error al borrar el repartidor', detalle: error.message });
    }
};


module.exports = { cargarRepartidor, obtenerRepartidores, modificarRepartidor, borrarRepartidor };