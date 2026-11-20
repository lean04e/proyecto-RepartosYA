// Migra a MongoDB las imagenes de comprobante que estaban en uploads/comprobantes (una sola vez, idempotente)
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const Pedido = require('./Models/Pedido');
const Comprobante = require('./Models/Comprobante');

const TIPOS = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const pedidos = await Pedido.find({ 'comprobante.imagen': /^\/uploads\// });
    for (const p of pedidos) {
        const archivo = path.join(__dirname, p.comprobante.imagen);
        if (!fs.existsSync(archivo)) {
            console.log(`FALTA  ${p.comprobante.imagen} (pedido ${p.ID}) - no se migra`);
            continue;
        }
        const tipo = TIPOS[path.extname(archivo).slice(1)];
        await Comprobante.updateOne({ pedido: p._id }, { data: fs.readFileSync(archivo), tipo }, { upsert: true });
        p.comprobante.imagen = `/api/pedidos/${p._id}/comprobante`;
        await p.save();
        console.log(`OK     ${path.basename(archivo)} -> MongoDB`);
    }
    await mongoose.disconnect();
})();
