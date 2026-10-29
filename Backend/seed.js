const mongoose = require('mongoose');
const Admin = require('./Models/Admin');
const Repartidor = require('./Models/Repartidor');
const Comercio = require('./Models/Comercio');
const Pedido = require('./Models/Pedido');

// Conexión directa a MongoDB Atlas
const MONGO_URI = 'mongodb+srv://mateodibastiano_db_user:Jqol4bEYIuDIMYvY@cluster0.2a4xehf.mongodb.net/repartosya?retryWrites=true&w=majority';

async function cargarDatosBase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('📦 Conectado a MongoDB Atlas para cargar datos base...');

    // Limpiar colecciones anteriores para reiniciar de cero
    await Admin.deleteMany({});
    await Repartidor.deleteMany({});
    await Comercio.deleteMany({});
    await Pedido.deleteMany({}); // Borra absolutamente todos los pedidos
    console.log('🧹 Colección de pedidos limpiada por completo.');

    // 1. Crear el Admin predeterminado
    const adminBase = new Admin({
      nombre: 'AdminMartin',
      apellido: 'Principal',
      email: 'admin@repartosya.com',
      password: 'SoyElAdmin',
      telefono: '2214444444'
    });
    await adminBase.save();
    console.log('✅ Administrador base creado.');

    // 2. Crear el Repartidor predeterminado
    const repartidorBase = new Repartidor({
      legajo: '0001',
      nombre: 'Carlos',
      apellido: 'Gómez',
      email: 'carlos@repartosya.com',
      password: 'RepartidorNro1SoyYo',
      telefono: '2211111111',
      vehiculo: 'Moto',
      estado: 'DISPONIBLE'
    });
    await repartidorBase.save();
    console.log('✅ Repartidor base creado.');

    // 3. Crear los comercios de prueba
    const comerciosMock = [
      {
        nombre: 'pepe',
        cantPedidos: 428,
        telefono: '+54 11 4582 1900',
        direccion: 'Av. Corrientes 1842, CABA',
        rubro: 'Supermercado'
      },
      {
        nombre: 'juan',
        cantPedidos: 376,
        telefono: '+54 11 4771 8032',
        direccion: 'Calle Honduras 5210, CABA',
        rubro: 'Gastronomía'
      },
      {
        nombre: 'sandia',
        cantPedidos: 312,
        telefono: '+54 11 4890 2245',
        direccion: 'Av. Santa Fe 3268, CABA',
        rubro: 'Alimentos Saludables'
      },
      {
        nombre: 'pedrito',
        cantPedidos: 284,
        telefono: '+54 11 4307 6619',
        direccion: 'Defensa 735, CABA',
        rubro: 'Almacén'
      },
      {
        nombre: '41231',
        cantPedidos: 241,
        telefono: '+54 11 4555 0921',
        direccion: 'Av. Cabildo 2180, CABA',
        rubro: 'Panadería'
      },
      {
        nombre: 'x2',
        cantPedidos: 198,
        telefono: '+54 11 4826 7310',
        direccion: 'Gorriti 4932, CABA',
        rubro: 'Verdulería'
      },
      {
        nombre: 'xdd',
        cantPedidos: 164,
        telefono: '+54 11 4862 5104',
        direccion: 'Malabia 1624, CABA',
        rubro: 'Confitería'
      }
    ];

    await Comercio.insertMany(comerciosMock);
    console.log('✅ Comercios de prueba creados exitosamente.');

    // Cerrar la conexión al terminar
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada con éxito.');
  } catch (error) {
    console.error('❌ Error al cargar los datos base:', error);
  }
}

cargarDatosBase();