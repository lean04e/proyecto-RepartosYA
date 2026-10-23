import AsyncStorage from '@react-native-async-storage/async-storage';
import database from './db.json';

export type OrderStatus = 'PENDIENTE' | 'ASIGNADO' | 'MODIFICADO' | 'CANCELADO' | 'ENTREGADO';

export type DeliveryOrder = {
  id: string;
  codigo: string;
  repartidorId: string;
  origen: string;
  destino: string;
  destinatario: string;
  contacto: string;
  estado: OrderStatus;
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
    && (value.estado === 'PENDIENTE'
      || value.estado === 'ASIGNADO'
      || value.estado === 'MODIFICADO'
      || value.estado === 'CANCELADO'
      || value.estado === 'ENTREGADO')
  );
}

export async function getOrders(): Promise<DeliveryOrder[]> {
  const savedOrders = await AsyncStorage.getItem(STORAGE_KEY);
  if (savedOrders === null) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seedOrders));
    return seedOrders;
  }

  const parsedOrders: unknown = JSON.parse(savedOrders);
  if (!Array.isArray(parsedOrders) || !parsedOrders.every(isDeliveryOrder)) {
    throw new Error('Los pedidos guardados localmente tienen un formato inválido.');
  }

  return parsedOrders;
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
    order.id === orderId ? { ...order, estado } : order
  ));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
  return updatedOrders;
}
