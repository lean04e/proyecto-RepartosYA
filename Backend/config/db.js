const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Conectando a MongoDB Atlas con tus datos nuevos y reales
    await mongoose.connect('mongodb+srv://mateodibastiano_db_user:Jqol4bEYIuDIMYvY@cluster0.2a4xehf.mongodb.net/repartosya?retryWrites=true&w=majority');
    console.log('📦 Conectado a MongoDB Atlas con éxito en la nube ☁️');
  } catch (error) {
    console.error(`Error al conectar a MongoDB: ${error.message}`);
    process.exit(1); // Detiene la aplicación si la conexión falla
  }
};

connectDB();