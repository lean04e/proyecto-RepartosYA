require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db'); // Asumiendo que tu archivo de conexión a Mongo está acá

const app = express();

// Middlewares para poder leer JSON desde el frontend
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conectar a la base de datos
connectDB();

// Ruta de prueba para verificar que el servidor responde
app.get('/', (req, res) => {
  res.send('Servidor de RepartosYA funcionando correctamente');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo exitosamente en el puerto ${PORT}`);
});