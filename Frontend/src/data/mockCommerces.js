/**
 * Mock data para comercios y sus pedidos asociados.
 *
 * NOTA DE ARQUITECTURA / INTEGRACIÓN CON BASE DE DATOS:
 * Este modelo está estructurado para mapearse de forma directa con:
 * - Colección 'Trade' o tabla 'Trades':
 *     _id / id: Identificador único del comercio
 *     name: Nombre o razón social
 *     phone: Teléfono de contacto
 *     address: Dirección física
 *     orders: Cantidad calculada de pedidos en el último mes
 *     historicalOrders: Total histórico de pedidos acumulados
 * - Colección 'Order' o tabla 'Orders' (referenciada o subdocumento):
 *     _id / id: Identificador único del pedido (ej: PED-4281)
 *     tradeId: Referencia al comercio
 *     date: Fecha de creación / entrega (ISO 8601 o DD/MM/AAAA)
 *     status: 'entregado' | 'pendiente' | 'cancelado'
 */

export const initialCommerceData = [
  {
    id: 1,
    name: 'Mercado Central',
    orders: 428,
    historicalOrders: 3840,
    phone: '+54 11 4582 1900',
    address: 'Av. Corrientes 1842, CABA',
    recentOrders: [
      { id: 'PED-4281', date: '16/10/2026', status: 'pendiente' },
      { id: 'PED-4278', date: '16/10/2026', status: 'entregado' },
      { id: 'PED-4275', date: '15/10/2026', status: 'entregado' },
      { id: 'PED-4269', date: '15/10/2026', status: 'entregado' },
      { id: 'PED-4262', date: '14/10/2026', status: 'cancelado' },
      { id: 'PED-4257', date: '14/10/2026', status: 'entregado' },
      { id: 'PED-4251', date: '13/10/2026', status: 'entregado' },
      { id: 'PED-4246', date: '12/10/2026', status: 'pendiente' },
      { id: 'PED-4240', date: '11/10/2026', status: 'entregado' },
      { id: 'PED-4235', date: '10/10/2026', status: 'entregado' },
    ],
  },
  {
    id: 2,
    name: 'Casa del Sabor',
    orders: 376,
    historicalOrders: 2950,
    phone: '+54 11 4771 8032',
    address: 'Calle Honduras 5210, CABA',
    recentOrders: [
      { id: 'PED-3761', date: '16/10/2026', status: 'pendiente' },
      { id: 'PED-3759', date: '15/10/2026', status: 'entregado' },
      { id: 'PED-3754', date: '15/10/2026', status: 'entregado' },
      { id: 'PED-3748', date: '14/10/2026', status: 'cancelado' },
      { id: 'PED-3742', date: '14/10/2026', status: 'entregado' },
      { id: 'PED-3739', date: '13/10/2026', status: 'entregado' },
      { id: 'PED-3735', date: '12/10/2026', status: 'entregado' },
      { id: 'PED-3729', date: '11/10/2026', status: 'pendiente' },
      { id: 'PED-3721', date: '11/10/2026', status: 'entregado' },
      { id: 'PED-3715', date: '10/10/2026', status: 'entregado' },
    ],
  },
  {
    id: 3,
    name: 'Verde Natural',
    orders: 312,
    historicalOrders: 2180,
    phone: '+54 11 4890 2245',
    address: 'Av. Santa Fe 3268, CABA',
    recentOrders: [
      { id: 'PED-3120', date: '16/10/2026', status: 'entregado' },
      { id: 'PED-3118', date: '16/10/2026', status: 'pendiente' },
      { id: 'PED-3112', date: '15/10/2026', status: 'entregado' },
      { id: 'PED-3105', date: '14/10/2026', status: 'entregado' },
      { id: 'PED-3098', date: '13/10/2026', status: 'cancelado' },
      { id: 'PED-3092', date: '13/10/2026', status: 'entregado' },
      { id: 'PED-3087', date: '12/10/2026', status: 'entregado' },
      { id: 'PED-3081', date: '11/10/2026', status: 'entregado' },
      { id: 'PED-3075', date: '10/10/2026', status: 'pendiente' },
      { id: 'PED-3069', date: '09/10/2026', status: 'entregado' },
    ],
  },
  {
    id: 4,
    name: 'Almacen La Esquina',
    orders: 284,
    historicalOrders: 1940,
    phone: '+54 11 4307 6619',
    address: 'Defensa 735, CABA',
    recentOrders: [
      { id: 'PED-2840', date: '16/10/2026', status: 'pendiente' },
      { id: 'PED-2836', date: '15/10/2026', status: 'entregado' },
      { id: 'PED-2831', date: '15/10/2026', status: 'entregado' },
      { id: 'PED-2827', date: '14/10/2026', status: 'entregado' },
      { id: 'PED-2820', date: '13/10/2026', status: 'entregado' },
      { id: 'PED-2815', date: '12/10/2026', status: 'cancelado' },
      { id: 'PED-2809', date: '12/10/2026', status: 'entregado' },
      { id: 'PED-2804', date: '11/10/2026', status: 'pendiente' },
      { id: 'PED-2798', date: '10/10/2026', status: 'entregado' },
      { id: 'PED-2791', date: '09/10/2026', status: 'entregado' },
    ],
  },
  {
    id: 5,
    name: 'Panaderia Norte',
    orders: 241,
    historicalOrders: 1620,
    phone: '+54 11 4555 0921',
    address: 'Av. Cabildo 2180, CABA',
    recentOrders: [
      { id: 'PED-2412', date: '16/10/2026', status: 'entregado' },
      { id: 'PED-2408', date: '15/10/2026', status: 'pendiente' },
      { id: 'PED-2401', date: '15/10/2026', status: 'entregado' },
      { id: 'PED-2396', date: '14/10/2026', status: 'entregado' },
      { id: 'PED-2391', date: '13/10/2026', status: 'cancelado' },
      { id: 'PED-2385', date: '13/10/2026', status: 'entregado' },
      { id: 'PED-2379', date: '12/10/2026', status: 'entregado' },
      { id: 'PED-2373', date: '11/10/2026', status: 'pendiente' },
      { id: 'PED-2368', date: '10/10/2026', status: 'entregado' },
      { id: 'PED-2361', date: '09/10/2026', status: 'entregado' },
    ],
  },
  {
    id: 6,
    name: 'Punto Fresco',
    orders: 198,
    historicalOrders: 1350,
    phone: '+54 11 4826 7310',
    address: 'Gorriti 4932, CABA',
    recentOrders: [
      { id: 'PED-1983', date: '16/10/2026', status: 'entregado' },
      { id: 'PED-1979', date: '15/10/2026', status: 'pendiente' },
      { id: 'PED-1972', date: '14/10/2026', status: 'entregado' },
      { id: 'PED-1968', date: '14/10/2026', status: 'entregado' },
      { id: 'PED-1961', date: '13/10/2026', status: 'entregado' },
      { id: 'PED-1955', date: '12/10/2026', status: 'cancelado' },
      { id: 'PED-1949', date: '11/10/2026', status: 'entregado' },
      { id: 'PED-1943', date: '11/10/2026', status: 'entregado' },
      { id: 'PED-1938', date: '10/10/2026', status: 'pendiente' },
      { id: 'PED-1931', date: '08/10/2026', status: 'entregado' },
    ],
  },
  {
    id: 7,
    name: 'Dulce Momento',
    orders: 164,
    historicalOrders: 1100,
    phone: '+54 11 4862 5104',
    address: 'Malabia 1624, CABA',
    recentOrders: [
      { id: 'PED-1644', date: '16/10/2026', status: 'pendiente' },
      { id: 'PED-1639', date: '15/10/2026', status: 'entregado' },
      { id: 'PED-1632', date: '14/10/2026', status: 'entregado' },
      { id: 'PED-1628', date: '13/10/2026', status: 'cancelado' },
      { id: 'PED-1621', date: '13/10/2026', status: 'entregado' },
      { id: 'PED-1616', date: '12/10/2026', status: 'entregado' },
      { id: 'PED-1610', date: '11/10/2026', status: 'entregado' },
      { id: 'PED-1604', date: '10/10/2026', status: 'pendiente' },
      { id: 'PED-1598', date: '09/10/2026', status: 'entregado' },
      { id: 'PED-1591', date: '08/10/2026', status: 'entregado' },
    ],
  },
  {
    id: 8,
    name: 'Bodega del Sur',
    orders: 139,
    historicalOrders: 940,
    phone: '+54 11 4301 8827',
    address: 'Brasil 1198, CABA',
    recentOrders: [
      { id: 'PED-1392', date: '16/10/2026', status: 'entregado' },
      { id: 'PED-1388', date: '15/10/2026', status: 'pendiente' },
      { id: 'PED-1383', date: '14/10/2026', status: 'entregado' },
      { id: 'PED-1377', date: '14/10/2026', status: 'entregado' },
      { id: 'PED-1372', date: '13/10/2026', status: 'cancelado' },
      { id: 'PED-1366', date: '12/10/2026', status: 'entregado' },
      { id: 'PED-1361', date: '11/10/2026', status: 'entregado' },
      { id: 'PED-1355', date: '10/10/2026', status: 'pendiente' },
      { id: 'PED-1349', date: '09/10/2026', status: 'entregado' },
      { id: 'PED-1342', date: '07/10/2026', status: 'entregado' },
    ],
  },
  {
    id: 9,
    name: 'Comer Bien',
    orders: 116,
    historicalOrders: 780,
    phone: '+54 11 4804 6432',
    address: 'Juramento 2741, CABA',
    recentOrders: [
      { id: 'PED-1164', date: '16/10/2026', status: 'pendiente' },
      { id: 'PED-1159', date: '15/10/2026', status: 'entregado' },
      { id: 'PED-1153', date: '14/10/2026', status: 'entregado' },
      { id: 'PED-1148', date: '13/10/2026', status: 'entregado' },
      { id: 'PED-1142', date: '12/10/2026', status: 'cancelado' },
      { id: 'PED-1137', date: '11/10/2026', status: 'entregado' },
      { id: 'PED-1131', date: '10/10/2026', status: 'entregado' },
      { id: 'PED-1125', date: '09/10/2026', status: 'pendiente' },
      { id: 'PED-1119', date: '08/10/2026', status: 'entregado' },
      { id: 'PED-1112', date: '07/10/2026', status: 'entregado' },
    ],
  },
  {
    id: 10,
    name: 'Rincon Organico',
    orders: 87,
    historicalOrders: 560,
    phone: '+54 11 4788 3046',
    address: 'Arce 735, CABA',
    recentOrders: [
      { id: 'PED-871', date: '16/10/2026', status: 'entregado' },
      { id: 'PED-868', date: '15/10/2026', status: 'pendiente' },
      { id: 'PED-863', date: '14/10/2026', status: 'entregado' },
      { id: 'PED-859', date: '13/10/2026', status: 'entregado' },
      { id: 'PED-854', date: '12/10/2026', status: 'cancelado' },
      { id: 'PED-849', date: '11/10/2026', status: 'entregado' },
      { id: 'PED-843', date: '10/10/2026', status: 'entregado' },
      { id: 'PED-838', date: '09/10/2026', status: 'pendiente' },
      { id: 'PED-832', date: '08/10/2026', status: 'entregado' },
      { id: 'PED-825', date: '07/10/2026', status: 'entregado' },
    ],
  },
]

/**
 * Generador de pedidos de ejemplo para comercios nuevos dados de alta en el frontend
 */
export function generateDefaultOrders(commerceId) {
  const statuses = ['entregado', 'pendiente', 'cancelado', 'entregado', 'entregado']
  const today = new Date()

  return Array.from({ length: 10 }, (_, index) => {
    const orderDate = new Date(today)
    orderDate.setDate(today.getDate() - index)
    const day = String(orderDate.getDate()).padStart(2, '0')
    const month = String(orderDate.getMonth() + 1).padStart(2, '0')
    const year = orderDate.getFullYear()

    return {
      id: `PED-${commerceId * 100 + (10 - index)}`,
      date: `${day}/${month}/${year}`,
      status: statuses[index % statuses.length],
    }
  })
}
