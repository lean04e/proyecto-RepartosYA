export type OrderStatus =
  | 'PENDIENTE'
  | 'ASIGNADO'
  | 'MODIFICADO'
  | 'EN_CAMINO'
  | 'CANCELADO'
  | 'ENTREGADO';

export type DeliveryOrder = {
  id: string;
  codigo: string;
  repartidorId: string;
  comercioOrigen?: string;
  origen: string;
  destino: string;
  destinatario: string;
  contacto: string;
  estado: OrderStatus;
  distancia?: number;
  fechaEstado?: string;
};

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export async function getOrders(): Promise<DeliveryOrder[]> {
  try {
    const response = await fetch(`${API_URL}/api/pedidos`);
    if (!response.ok) throw new Error('Error al obtener pedidos del servidor');

    const data = await response.json();

    return data.map((pedido: any): DeliveryOrder => ({
      id: pedido._id || pedido.ID,
      codigo: pedido.codigo || String(pedido._id || '').slice(0, 8),
      repartidorId: pedido.repartidor?._id ? String(pedido.repartidor._id) : String(pedido.repartidor || ''),
      // Nombre del comercio de origen
      comercioOrigen: pedido.comercioOrigen || pedido.comercio?.nombre || 'Comercio no especificado',
      // Dirección física real de origen
      origen: pedido.direccionOrigen || pedido.comercio?.direccion || pedido.origen || 'Dirección no especificada',
      // Dirección física real de entrega
      destino: pedido.direccionDestino || pedido.comercioDestino?.direccion || pedido.destino || 'Sin destino',
      // Nombre del comercio de destino (destinatario)
      destinatario: pedido.nombreDestino || pedido.comercioDestino?.nombre || (pedido.destinatario && pedido.destinatario !== 'Consumidor Final' ? pedido.destinatario : (pedido.comercioDestino?.nombre || pedido.destinatario || 'Consumidor Final')),
      contacto: pedido.contacto || pedido.comercioDestino?.telefono || 'Sin especificar',
      estado: (pedido.estado || 'PENDIENTE').toUpperCase() as OrderStatus,
      distancia: pedido.distancia ?? 3.0,
      fechaEstado: pedido.updatedAt || pedido.createdAt || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error al conectar con el backend:', error);
    return [];
  }
}

export async function updateOrderStatus(
  orderId: string,
  estado: OrderStatus,
): Promise<DeliveryOrder[]> {
  try {
    // Enviamos la actualización directamente a la base de datos
    await fetch(`${API_URL}/api/pedidos/asignar/${orderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ estado }),
    });

    // Retornamos la lista actualizada desde la BD
    return await getOrders();
  } catch (error) {
    console.error('Error al actualizar estado en el servidor:', error);
    throw error;
  }
}
