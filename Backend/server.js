const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); 

const app = express();

// Middlewares
app.use(express.json()); 
app.use(cors());        

// 1. Tus rutas de autenticación existentes
const authRoutes = require('./Authentication_And_Access/routes/authRoutes');
app.use('/auth', authRoutes);

// 2. NUEVO: Agregamos las rutas de comercio que acabamos de crear
const tradeRoutes = require('./Trade_Management/tradeRoutes');
// AHORA (alineado con el api.js del front)
app.use('/comercios', tradeRoutes);

// Conexión a MongoDB Atlas
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mateodibastiano_db_user:Jqol4bEYIuDIMYvY@cluster0.2a4xehf.mongodb.net/repartosya?retryWrites=true&w=majority';
mongoose.connect(MONGO_URI)
  .then(() => console.log('📦 Conectado exitosamente a MongoDB Atlas en la nube ☁️'))
  .catch((err) => console.error('❌ Error al conectar a MongoDB:', err));

app.get('/', (req, res) => {
  res.send('¡El servidor de RepartosYA está funcionando al 100%!');
});

const PORT = process.env.PORT || 3001; 

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});