/**
 * Mock data para el listado de pedidos del panel de Gestión de Pedidos.
 *
 * Modelo (mapeable a la colección 'Order'):
 *   id: Identificador del pedido (ej: PED-4290)
 *   createdAt: Fecha y hora de carga del pedido (ISO 8601, hora local)
 *   driver: Nombre del repartidor asignado o null si todavía no tiene
 *   destination: Nombre del comercio que realizó el pedido
 *   status: 'pendiente' | 'en-curso' | 'entregado' | 'cancelado'
 *
 * Los datos están desordenados a propósito para poder probar el ordenamiento.
 */

export const initialOrdersData = [
  { id: 'PED-4281', createdAt: '2026-10-20T09:15:00', driver: 'Lucas Fernández', destination: 'Mercado Central', status: 'en-curso' },
  { id: 'PED-4290', createdAt: '2026-10-20T11:42:00', driver: null, destination: 'Punto Fresco', status: 'pendiente' },
  { id: 'PED-4275', createdAt: '2026-10-19T18:05:00', driver: 'Martina Gómez', destination: 'Almacen La Esquina', status: 'entregado' },
  { id: 'PED-4288', createdAt: '2026-10-20T10:30:00', driver: 'Ana Rodríguez', destination: 'Verde Natural', status: 'en-curso' },
  { id: 'PED-4262', createdAt: '2026-10-18T13:20:00', driver: 'Lucas Fernández', destination: 'Casa del Sabor', status: 'cancelado' },
  { id: 'PED-4292', createdAt: '2026-10-20T12:10:00', driver: null, destination: 'Dulce Momento', status: 'pendiente' },
  { id: 'PED-4269', createdAt: '2026-10-19T09:45:00', driver: 'Bruno Sosa', destination: 'Panaderia Norte', status: 'entregado' },
  { id: 'PED-4285', createdAt: '2026-10-20T08:00:00', driver: 'Martina Gómez', destination: 'Bodega del Sur', status: 'entregado' },
  { id: 'PED-4257', createdAt: '2026-10-17T20:35:00', driver: 'Ana Rodríguez', destination: 'Comer Bien', status: 'entregado' },
  { id: 'PED-4291', createdAt: '2026-10-20T12:01:00', driver: 'Bruno Sosa', destination: 'Rincon Organico', status: 'en-curso' },
  { id: 'PED-4278', createdAt: '2026-10-19T14:50:00', driver: null, destination: 'Mercado Central', status: 'cancelado' },
  { id: 'PED-4251', createdAt: '2026-10-16T19:10:00', driver: 'Lucas Fernández', destination: 'Punto Fresco', status: 'entregado' },
  { id: 'PED-4293', createdAt: '2026-10-20T12:25:00', driver: null, destination: 'Almacen La Esquina', status: 'pendiente' },
  { id: 'PED-4283', createdAt: '2026-10-19T21:15:00', driver: 'Ana Rodríguez', destination: 'Casa del Sabor', status: 'entregado' },
  { id: 'PED-4270', createdAt: '2026-10-18T16:40:00', driver: 'Bruno Sosa', destination: 'Verde Natural', status: 'entregado' },
  { id: 'PED-4294', createdAt: '2026-10-20T12:40:00', driver: 'Martina Gómez', destination: 'Bodega del Sur', status: 'en-curso' },
]
