const mongoose = require('mongoose');
const Repartidor = require('../../Models/Repartidor');
const bcrypt = require('bcrypt');

const cargarRepartidor = async (req, res) => {
    try {
        const { nombre, apellido, email, password, telefono, legajo } = req.body;

        if (!email || !password || !nombre || !apellido || !telefono) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }

        // Validar si el email ya existe
        const emailExiste = await Repartidor.findOne({ 
            email: new RegExp(`^${email.trim()}$`, 'i') 
        });
        if (emailExiste) {
            return res.status(400).json({ error: 'Ya existe un repartidor con ese correo electrónico' });
        }

        // Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crear y guardar en MongoDB sin requerir legajo generado
        const nuevoRepartidor = new Repartidor({
            legajo: legajo ? legajo.trim() : undefined,
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            telefono: telefono.trim()
        });
        
        await nuevoRepartidor.save();
        res.status(201).json({ mensaje: 'Repartidor creado con éxito', repartidor: nuevoRepartidor });
        
    } catch (error) {
        res.status(400).json({ error: 'Error al cargar el repartidor', detalle: error.message });
    }
};

// Función para obtener todos los repartidores
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
        const { id } = req.params;
        const { nombre, apellido, email, telefono, status, password, legajo } = req.body;

        let actualizacion = { nombre, apellido, email, telefono, status };
        if (legajo !== undefined) actualizacion.legajo = legajo;

        // Si se envió una nueva contraseña, la encriptamos antes de guardar
        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            actualizacion.password = await bcrypt.hash(password, salt);
        }

        const repartidorActualizado = await Repartidor.findByIdAndUpdate(id, actualizacion, { new: true });

        if (!repartidorActualizado) {
            return res.status(404).json({ error: 'Repartidor no encontrado' });
        }

        res.status(200).json({ mensaje: 'Repartidor modificado con éxito', repartidor: repartidorActualizado });
    } catch (error) {
        res.status(500).json({ error: 'Error al modificar el repartidor', detalle: error.message });
    }
};

// Función para obtener el perfil de un repartidor (sin password)
const obtenerPerfilRepartidor = async (req, res) => {
    try {
        const { id } = req.params;
        const query = mongoose.Types.ObjectId.isValid(id)
            ? { _id: id }
            : { $or: [{ ID: id }, { legajo: id }, { email: id }] };

        const repartidor = await Repartidor.findOne(query).select('-password');
        if (!repartidor) {
            return res.status(404).json({ error: 'Repartidor no encontrado' });
        }

        res.status(200).json(repartidor);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el perfil del repartidor', detalle: error.message });
    }
};

// Función para modificar únicamente el perfil del repartidor (nombre, apellido, telefono, fotoPerfil)
const modificarPerfilRepartidor = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, apellido, telefono, fotoPerfil } = req.body;

        // Validar que nombre, apellido y telefono existan y no estén vacíos
        if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
            return res.status(400).json({ error: 'El nombre es obligatorio' });
        }
        if (!apellido || typeof apellido !== 'string' || !apellido.trim()) {
            return res.status(400).json({ error: 'El apellido es obligatorio' });
        }
        if (!telefono || typeof telefono !== 'string' || !telefono.trim()) {
            return res.status(400).json({ error: 'El teléfono es obligatorio' });
        }

        // Construir actualización SOLO con los campos permitidos
        // Bloquea explícitamente cualquier cambio a ID, legajo, email, status, destination o password
        const actualizacion = {
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            telefono: telefono.trim()
        };

        if (fotoPerfil !== undefined) {
            actualizacion.fotoPerfil = typeof fotoPerfil === 'string' ? fotoPerfil.trim() : '';
        }

        const query = mongoose.Types.ObjectId.isValid(id)
            ? { _id: id }
            : { $or: [{ ID: id }, { legajo: id }, { email: id }] };

        const repartidorActualizado = await Repartidor.findOneAndUpdate(
            query,
            { $set: actualizacion },
            { new: true, runValidators: true }
        ).select('-password');

        if (!repartidorActualizado) {
            return res.status(404).json({ error: 'Repartidor no encontrado' });
        }

        res.status(200).json({
            mensaje: 'Perfil actualizado con éxito',
            repartidor: repartidorActualizado
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el perfil del repartidor', detalle: error.message });
    }
};

const borrarRepartidor = async (req, res) => {
    try {
        const { id } = req.params;
        
        const repartidorBorrado = await Repartidor.findByIdAndDelete(id);

        if (!repartidorBorrado) {
            return res.status(404).json({ error: 'Repartidor no encontrado' });
        }

        res.status(200).json({ mensaje: 'Repartidor eliminado con éxito' });
    } catch (error) {
        res.status(500).json({ error: 'Error al borrar el repartidor', detalle: error.message });
    }
};

module.exports = {
    cargarRepartidor,
    obtenerRepartidores,
    modificarRepartidor,
    borrarRepartidor,
    obtenerPerfilRepartidor,
    modificarPerfilRepartidor
};
