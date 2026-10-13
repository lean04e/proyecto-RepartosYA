const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Intenta conectar a MongoDB local en la base "repartosya"
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/repartosya');
    console.log(`MongoDB Conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error al conectar a MongoDB: ${error.message}`);
    process.exit(1); // Detiene la aplicación si la conexión falla
  }
};

module.exports = connectDB;