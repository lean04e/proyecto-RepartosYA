const mongoose = require('mongoose');
const Admin = require('./Models/Admin');
const Repartidor = require('./Models/Repartidor');

// Conexión directa a MongoDB Atlas
const MONGO_URI = 'mongodb+srv://mateodibastiano_db_user:Jqol4bEYIuDIMYvY@cluster0.2a4xehf.mongodb.net/repartosya?retryWrites=true&w=majority';
async function cargarDatosBase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('📦 Conectado a MongoDB Atlas para cargar datos base...');

    // Limpiar colecciones anteriores para evitar duplicados al reiniciar
    await Admin.deleteMany({});
    await Repartidor.deleteMany({});

    // 1. Crear el Admin predeterminado del Frontend
    const adminBase = new Admin({
      nombre: 'AdminMartin',
      apellido: 'Principal',
      email: 'admin@repartosya.com',
      password: 'SoyElAdmin',
      telefono: '2214444444'
    });
    await adminBase.save();
    console.log('✅ Administrador base creado (AdminMartin / SoyElAdmin).');

    // 2. Crear el Repartidor predeterminado del Frontend
    const repartidorBase = new Repartidor({
      legajo: '0001',
      nombre: 'Carlos',
      apellido: 'Gómez',
      email: 'carlos@repartosya.com',
      password: 'RepartidorNro1',
      telefono: '2211111111',
      vehiculo: 'Moto',
      estado: 'DISPONIBLE'
    });
    await repartidorBase.save();
    console.log('✅ Repartidor base creado (0001 / RepartidorNro1).');

    // Cerrar la conexión al terminar
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada con éxito.');
  } catch (error) {
    console.error('❌ Error al cargar los datos base:', error);
  }
}

cargarDatosBase();