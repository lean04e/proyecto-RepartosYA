const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Conectando a MongoDB Atlas con tus datos reales y la base 'repartosya'
    await mongoose.connect('mongodb+srv://mateodibastiano_db_user:Jqol4bEYIuDIMYvY@cluster0.xqvkqv6.mongodb.net/repartosya?retryWrites=true&w=majority');
    console.log('📦 Conectado a MongoDB Atlas con éxito en la nube ☁️');
  } catch (error) {
    console.error(`Error al conectar a MongoDB: ${error.message}`);
    process.exit(1); // Detiene la aplicación si la conexión falla
  }
};

connectDB(); // Fíjate también que acá llamabas a 'conectarDB' pero la función se llamaba 'connectDB', lo unificamos.