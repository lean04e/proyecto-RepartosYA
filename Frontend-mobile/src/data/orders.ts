import AsyncStorage from '@react-native-async-storage/async-storage';
import database from './db.json';

export type OrderStatus =
  | 'PENDIENTE'
  | 'ASIGNADO'
  | 'MODIFICADO'
  | 'EN_CURSO'
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

const STORAGE_KEY = 'repartosya_mobile_orders';
const seedOrders = database.pedidos as DeliveryOrder[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDeliveryOrder(value: unknown): value is DeliveryOrder {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string'
    && typeof value.codigo === 'string'
    && typeof value.repartidorId === 'string'
    && typeof value.origen === 'string'
    && typeof value.destino === 'string'
    && typeof value.destinatario === 'string'
    && typeof value.contacto === 'string'
    && (value.comercioOrigen === undefined || typeof value.comercioOrigen === 'string')
    && (value.distancia === undefined
      || ((typeof value.distancia === 'number' || typeof value.distancia === 'string')
        && Number.isFinite(Number(value.distancia))
        && Number(value.distancia) >= 0))
    && (value.fechaEstado === undefined
      || (typeof value.fechaEstado === 'string' && !Number.isNaN(Date.parse(value.fechaEstado))))
    && (value.estado === 'PENDIENTE'
      || value.estado === 'ASIGNADO'
      || value.estado === 'MODIFICADO'
      || value.estado === 'EN_CURSO'
      || value.estado === 'CANCELADO'
      || value.estado === 'ENTREGADO')
  );
}

export async function getOrders(): Promise<DeliveryOrder[]> {
  const savedOrders = await AsyncStorage.getItem(STORAGE_KEY);
  if (savedOrders === null) {
    const initialOrders = seedOrders.map((order) => {
      if (order.estado === 'CANCELADO' || order.estado === 'ENTREGADO') {
        return { ...order, fechaEstado: new Date().toISOString() };
      }

      if (order.estado === 'EN_CURSO' && !order.fechaEstado) {
        return { ...order, fechaEstado: new Date().toISOString() };
      }

      return order;
    });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initialOrders));
    return initialOrders;
  }

  const parsedOrders: unknown = JSON.parse(savedOrders);
  if (!Array.isArray(parsedOrders) || !parsedOrders.every(isDeliveryOrder)) {
    throw new Error('Los pedidos guardados localmente tienen un formato inválido.');
  }

  let migratedOrders = false;
  const today = new Date().toDateString();
  const ordersWithStatusDates = parsedOrders.map((order): DeliveryOrder => {
    const seedOrder = seedOrders.find((item) => item.id === order.id);
    const seededDistance = seedOrder?.distancia;
    const distance = order.distancia === undefined ? seededDistance : Number(order.distancia);
    if (order.distancia !== distance && distance !== undefined) {
      migratedOrders = true;
    }
    const originParts = order.origen.split(',');
    const comercioOrigen = seedOrder?.comercioOrigen
      ?? order.comercioOrigen
      ?? (seedOrder && originParts.length > 1 ? originParts[0] : undefined);
    const origen = seedOrder?.origen
      ?? (seedOrder && !order.comercioOrigen && originParts.length > 1
        ? originParts.slice(1).join(',').trim()
        : order.origen);
    const destino = seedOrder?.destino ?? order.destino;
    const destinatario = seedOrder?.destinatario ?? order.destinatario;
    if (
      order.comercioOrigen !== comercioOrigen
      || order.origen !== origen
      || order.destino !== destino
      || order.destinatario !== destinatario
    ) {
      migratedOrders = true;
    }

    if (
      order.estado === 'EN_CURSO'
      && order.fechaEstado
      && new Date(order.fechaEstado).toDateString() !== today
    ) {
      migratedOrders = true;
      return {
        ...order,
        comercioOrigen,
        origen,
        destino,
        destinatario,
        distancia: distance,
        estado: 'PENDIENTE',
        fechaEstado: undefined,
      };
    }

    if (
      (order.estado === 'EN_CURSO' || order.estado === 'CANCELADO' || order.estado === 'ENTREGADO')
      && !order.fechaEstado
    ) {
      migratedOrders = true;
      return {
        ...order,
        comercioOrigen,
        origen,
        destino,
        destinatario,
        distancia: distance,
        fechaEstado: new Date().toISOString(),
      };
    }

    return { ...order, comercioOrigen, origen, destino, destinatario, distancia: distance };
  });

  if (migratedOrders) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ordersWithStatusDates));
  }

  return ordersWithStatusDates;
}

export async function updateOrderStatus(
  orderId: string,
  estado: OrderStatus,
): Promise<DeliveryOrder[]> {
  const orders = await getOrders();
  if (!orders.some((order) => order.id === orderId)) {
    throw new Error('No se encontró el pedido que intentas actualizar.');
  }

  const updatedOrders = orders.map((order) => (
    order.id === orderId
      ? {
        ...order,
        estado,
        fechaEstado: estado === 'EN_CURSO' || estado === 'CANCELADO' || estado === 'ENTREGADO'
          ? new Date().toISOString()
          : undefined,
      }
      : order
  ));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
  return updatedOrders;
}
