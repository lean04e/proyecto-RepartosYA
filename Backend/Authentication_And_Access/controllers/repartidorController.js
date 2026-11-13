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

module.exports = { cargarRepartidor, obtenerRepartidores, modificarRepartidor, borrarRepartidor };
