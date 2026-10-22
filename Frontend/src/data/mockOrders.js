/**
 * Mock data para el listado de pedidos del panel de Gestión de Pedidos.
 *
 * Modelo (mapeable a la colección 'Order'):
 *   id: Identificador del pedido (ej: PED-4290)
 *   createdAt: Fecha y hora de carga del pedido (ISO 8601, hora local)
 *   driver: Nombre del repartidor asignado o null si todavía no tiene
 *   origin: Nombre del comercio de origen del pedido
 *   destination: Nombre del comercio que realizó el pedido
 *   statusHistory: Cambios de estado { at (ISO 8601), from (null al crearse), to }, del más antiguo al más reciente
 *   status: 'registrado' | 'en-curso' | 'entregado' | 'cancelado'
 *
 * Los datos están desordenados a propósito para poder probar el ordenamiento.
 */

const rawOrders = [
  { id: 'PED-4281', createdAt: '2026-10-20T09:15:00', driver: 'Lucas Fernández', origin: 'Bodega del Sur', destination: 'Mercado Central', status: 'en-camino' },
  { id: 'PED-4290', createdAt: '2026-10-20T11:42:00', driver: null, origin: 'Mercado Central', destination: 'Punto Fresco', status: 'registrado' },
  { id: 'PED-4275', createdAt: '2026-10-19T18:05:00', driver: 'Martina Gómez', origin: 'Verde Natural', destination: 'Almacen La Esquina', status: 'entregado' },
  { id: 'PED-4288', createdAt: '2026-10-20T10:30:00', driver: 'Ana Rodríguez', origin: 'Punto Fresco', destination: 'Verde Natural', status: 'en-camino' },
  { id: 'PED-4262', createdAt: '2026-10-18T13:20:00', driver: 'Lucas Fernández', origin: 'Bodega del Sur', destination: 'Casa del Sabor', status: 'cancelado' },
  { id: 'PED-4292', createdAt: '2026-10-20T12:10:00', driver: null, origin: 'Panaderia Norte', destination: 'Dulce Momento', status: 'registrado' },
  { id: 'PED-4269', createdAt: '2026-10-19T09:45:00', driver: 'Bruno Sosa', origin: 'Comer Bien', destination: 'Panaderia Norte', status: 'entregado' },
  { id: 'PED-4285', createdAt: '2026-10-20T08:00:00', driver: 'Martina Gómez', origin: 'Dulce Momento', destination: 'Bodega del Sur', status: 'entregado' },
  { id: 'PED-4257', createdAt: '2026-10-17T20:35:00', driver: 'Ana Rodríguez', origin: 'Rincon Organico', destination: 'Comer Bien', status: 'entregado' },
  { id: 'PED-4291', createdAt: '2026-10-20T12:01:00', driver: 'Bruno Sosa', origin: 'Almacen La Esquina', destination: 'Rincon Organico', status: 'en-camino' },
  { id: 'PED-4278', createdAt: '2026-10-19T14:50:00', driver: null, origin: 'Bodega del Sur', destination: 'Mercado Central', status: 'cancelado' },
  { id: 'PED-4251', createdAt: '2026-10-16T19:10:00', driver: 'Lucas Fernández', origin: 'Mercado Central', destination: 'Punto Fresco', status: 'entregado' },
  { id: 'PED-4293', createdAt: '2026-10-20T12:25:00', driver: null, origin: 'Verde Natural', destination: 'Almacen La Esquina', status: 'registrado' },
  { id: 'PED-4283', createdAt: '2026-10-19T21:15:00', driver: 'Ana Rodríguez', origin: 'Punto Fresco', destination: 'Casa del Sabor', status: 'entregado' },
  { id: 'PED-4270', createdAt: '2026-10-18T16:40:00', driver: 'Bruno Sosa', origin: 'Casa del Sabor', destination: 'Verde Natural', status: 'entregado' },
  { id: 'PED-4294', createdAt: '2026-10-20T12:40:00', driver: 'Martina Gómez', origin: 'Panaderia Norte', destination: 'Bodega del Sur', status: 'asignado' },
]

// Recorrido de estados que tuvo cada pedido hasta llegar a su estado actual.
const STATUS_PATHS = {
  registrado: ['registrado'],
  asignado: ['registrado', 'asignado'],
  'en-camino': ['registrado', 'asignado', 'en-camino'],
  entregado: ['registrado', 'asignado', 'en-camino', 'entregado'],
  cancelado: ['registrado', 'cancelado'],
}

const HISTORY_STEP_MS = 12 * 60 * 1000

// TEMPORAL: el historial lo aportará la base de datos; aquí se genera a partir del estado actual.
export const initialOrdersData = rawOrders.map((order) => {
  const path = STATUS_PATHS[order.status]
  const createdAt = new Date(order.createdAt).getTime()

  return {
    ...order,
    // El primer registro es la creación del pedido, sin estado anterior (from: null).
    statusHistory: path.map((to, index) => ({
      at: new Date(createdAt + index * HISTORY_STEP_MS).toISOString(),
      from: index === 0 ? null : path[index - 1],
      to,
    })),
  }
})
