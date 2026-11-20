export type OrderStatus =
  | 'PENDIENTE'
  | 'ASIGNADO'
  | 'MODIFICADO'
  | 'EN_CAMINO'
  | 'CANCELADO'
  | 'FALLIDO'
  | 'RECHAZADO'
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
  fechaEstado?: string;
  timerReferenceAt?: string;
  createdAt?: string;
  // Momento en que se le asigno el repartidor (sirve para detectar pedidos cargados juntos)
  asignadoEn?: string;
  metodoPago?: string;
  precio?: number;
  comprobanteUrl?: string;
  incidenciaMotivo?: string;
  incidenciaObservacion?: string;
};

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

function getStatusTimestamp(pedido: any): string | undefined {
  const estado = String(pedido.estado || '').toUpperCase();
  const history = Array.isArray(pedido.historialEstados) ? pedido.historialEstados : [];
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const event = history[index];
    if (String(event.estadoNuevo || '').toUpperCase() === estado && event.fecha) {
      return String(event.fecha);
    }
  }
  return pedido.updatedAt || pedido.createdAt;
}

// Igual que getOrders pero propaga el error: sirve para refrescar sin vaciar la lista si falla la red
export async function fetchOrders(): Promise<DeliveryOrder[]> {
  const response = await fetch(`${API_URL}/api/pedidos?incluirEntregadosBorrados=true`);
  if (!response.ok) throw new Error('Error al obtener pedidos del servidor');

  const data = await response.json();

  return data.map((pedido: any): DeliveryOrder => ({
    id: pedido._id || pedido.ID,
    codigo: pedido.codigo || String(pedido._id || '').slice(0, 8),
    repartidorId: pedido.repartidor?._id ? String(pedido.repartidor._id) : String(pedido.repartidor || ''),
    // Nombre del depósito de origen
    comercioOrigen: pedido.comercioOrigen || pedido.comercio?.nombre || 'Depósito no especificado',
    // Dirección física real de origen
    origen: pedido.direccionOrigen || pedido.comercio?.direccion || pedido.origen || 'Dirección no especificada',
    // Dirección física real de entrega
    destino: pedido.direccionDestino || pedido.comercioDestino?.direccion || pedido.destino || 'Sin destino',
    // Nombre del comercio de destino (destinatario)
    destinatario: pedido.nombreDestino || pedido.comercioDestino?.nombre || (pedido.destinatario && pedido.destinatario !== 'Consumidor Final' ? pedido.destinatario : (pedido.comercioDestino?.nombre || pedido.destinatario || 'Consumidor Final')),
    contacto: pedido.contacto || pedido.comercioDestino?.telefono || 'Sin especificar',
    estado: (pedido.estado || 'PENDIENTE').toUpperCase() as OrderStatus,
    fechaEstado: pedido.updatedAt || pedido.createdAt || new Date().toISOString(),
    timerReferenceAt: getStatusTimestamp(pedido),
    createdAt: pedido.createdAt,
    asignadoEn: pedido.historialEstados?.find((h: any) => h.estadoNuevo === 'ASIGNADO' || h.estadoNuevo === 'EN_CAMINO')?.fecha,
    metodoPago: pedido.comprobante?.metodoPago ?? undefined,
    precio: pedido.comprobante?.precio ?? undefined,
    comprobanteUrl: pedido.comprobante?.imagen ? `${API_URL}${pedido.comprobante.imagen}` : undefined,
    incidenciaMotivo: pedido.incidencia?.motivo ?? undefined,
    incidenciaObservacion: pedido.incidencia?.observacion ?? undefined,
  }));
}

export async function getOrders(): Promise<DeliveryOrder[]> {
  try {
    return await fetchOrders();
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

// Cancela el pedido: el backend lo deja CANCELADO, o FALLIDO si ya estaba en camino
export async function cancelOrder(orderId: string): Promise<DeliveryOrder[]> {
  const response = await fetch(`${API_URL}/api/pedidos/cancelar/${orderId}`, { method: 'PUT' });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? 'No se pudo cancelar el pedido.');
  }

  return await getOrders();
}

export type DeliveryReceipt = {
  imagenBase64: string;
  mimeType: string;
  metodoPago: string;
  precio: number;
};

export async function deliverOrder(
  orderId: string,
  receipt: DeliveryReceipt,
): Promise<DeliveryOrder[]> {
  const response = await fetch(`${API_URL}/api/pedidos/entregar/${orderId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(receipt),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? 'No se pudo registrar la entrega.');
  }

  return await getOrders();
}


export type FailedDeliveryPayload = {
  motivo: string;
  observacion: string;
  estado?: OrderStatus;
};

export async function reportFailedOrder(
  orderId: string,
  payload: FailedDeliveryPayload,
): Promise<DeliveryOrder[]> {
  // Si tenés una ruta específica en el backend (ej. /api/pedidos/incidencia/:id o /api/pedidos/:id/rechazar),
  // ajustá el path aquí; de lo contrario enviamos estado: 'RECHAZADO' + motivo/observacion
  const response = await fetch(`${API_URL}/api/pedidos/asignar/${orderId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      estado: payload.estado ?? 'RECHAZADO',
      motivoIncidencia: payload.motivo,
      observacionIncidencia: payload.observacion,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? 'No se pudo registrar la entrega fallida.');
  }

  return await getOrders();
}