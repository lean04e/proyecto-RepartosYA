const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); 

const app = express();

// 1. MIDDLEWARES GLOBALES (Siempre van primero)
app.use(cors()); // Habilita la conexión con el frontend (Vite)
app.use(express.json()); // Permite que Express entienda JSON


// 2. RUTAS
// Rutas de Repartidores
app.use('/api/repartidores', require('./Authentication_And_Access/routes/repartidorRoutes'));

// Rutas de Autenticación
const authRoutes = require('./Authentication_And_Access/routes/authRoutes');
app.use('/auth', authRoutes);

// Rutas de Comercios
const tradeRoutes = require('./Trade_Management/tradeRoutes');
app.use('/comercios', tradeRoutes);

// Rutas de Pedidos 
const pedidoRoutes = require('./Order_Management/Routes/pedidoRoutes'); // Ajustá la ruta a tu carpeta
app.use('/api/pedidos', pedidoRoutes);

app.get('/', (req, res) => {
  res.send('¡El servidor de RepartosYA está funcionando al 100%!');
});

// 3. CONEXIÓN A BASE DE DATOS
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mateodibastiano_db_user:Jqol4bEYIuDIMYvY@cluster0.2a4xehf.mongodb.net/repartosya?retryWrites=true&w=majority';
mongoose.connect(MONGO_URI)
  .then(() => console.log('📦 Conectado exitosamente a MongoDB Atlas en la nube ☁️'))
  .catch((err) => console.error('❌ Error al conectar a MongoDB:', err));

// 4. INICIO DEL SERVIDOR
const PORT = process.env.PORT || 3001; 
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

