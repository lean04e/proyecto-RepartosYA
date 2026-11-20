const express = require('express');
const router = express.Router();
const Deposito = require('../Models/Deposito');

// Lista de depositos (origenes disponibles para los pedidos)
router.get('/', async (req, res) => {
    try {
        res.status(200).json(await Deposito.find().sort({ nombre: 1 }));
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los depositos', detalle: error.message });
    }
});

module.exports = router;
