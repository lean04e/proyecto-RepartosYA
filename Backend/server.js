const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); 

const app = express();

// Middlewares
app.use(express.json()); 
app.use(cors());        

const authRoutes = require('./Authentication_And_Access/routes/authRoutes');
app.use('/auth', authRoutes);

// Conexión a MongoDB Atlas (Asegurate de poner tus datos reales acá también)
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mateodibastiano_db_user:Jqol4bEYIuDIMYvY@cluster0.xqvkqv6.mongodb.net/repartosya?retryWrites=true&w=majority';

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