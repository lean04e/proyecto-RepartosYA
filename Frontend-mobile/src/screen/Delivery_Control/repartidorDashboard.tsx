import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getOrders, updateOrderStatus, type DeliveryOrder } from '../../data/orders';
import { useAppTheme } from '../../hooks/app-theme';
import { APP_THEMES, DELIVERY_DASHBOARD_STYLES as styles } from '../../theme/theme';

type ActiveModal = 'orderDetails' | 'completion' | null;
const DEMO_ETA_SECONDS = 4 * 60;
const MAX_VISIBLE_ORDERS = 4;

function formatEta(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function formatDistance(distance?: number) {
  return typeof distance === 'number' && Number.isFinite(distance)
    ? `${distance.toFixed(1)} km`
    : 'Distancia sin estimar';
}

export default function RepartidorDashboard() {
  const { id, nombre, apellido } = useLocalSearchParams<{
    id?: string;
    nombre?: string;
    apellido?: string;
  }>();
  const { isDarkMode, toggleTheme } = useAppTheme();
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [clock, setClock] = useState(0);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [completedOrder, setCompletedOrder] = useState<DeliveryOrder | null>(null);
  const [isStartingOrder, setIsStartingOrder] = useState(false);
  const [isCompletingOrder, setIsCompletingOrder] = useState(false);
  const palette = APP_THEMES[isDarkMode ? 'dark' : 'light'];
  const courierOrders = orders.filter((order) => order.repartidorId === id);
  const activeOrder = courierOrders.find((order) => order.estado === 'EN_CAMINO');

  // La cola incluye todos los pedidos asignados/en camino EXCEPTO el activo de arriba
  const queuedOrders = courierOrders
    .filter((order) => 
      order.id !== activeOrder?.id && (
        order.estado === 'PENDIENTE'
        || order.estado === 'ASIGNADO'
        || order.estado === 'MODIFICADO'
        || order.estado === 'EN_CAMINO' 
      )
    )
    .sort((first, second) => (
      (first.distancia ?? Number.POSITIVE_INFINITY) - (second.distancia ?? Number.POSITIVE_INFINITY)
      || first.codigo.localeCompare(second.codigo)
    ));
  const today = new Date().toDateString();
  const historicalOrders = courierOrders
    .filter((order) => (
      (order.estado === 'CANCELADO' || order.estado === 'ENTREGADO')
      && order.fechaEstado
      && new Date(order.fechaEstado).toDateString() === today
    ))
    .sort((first, second) => (
      Date.parse(second.fechaEstado ?? '') - Date.parse(first.fechaEstado ?? '')
    ));
  const elapsedSeconds = activeOrder?.fechaEstado
    ? Math.max(0, Math.floor((clock - Date.parse(activeOrder.fechaEstado)) / 1000))
    : 0;
  const etaSeconds = activeOrder ? Math.max(0, DEMO_ETA_SECONDS - elapsedSeconds) : 0;
  const activeOrderId = activeOrder?.id;
  const canStartSelected = Boolean(
    selectedOrder
    && !activeOrder
    && queuedOrders[0]?.id === selectedOrder.id
    && !isStartingOrder,
  );
  const isSelectedActiveOrder = Boolean(activeOrder && selectedOrder?.id === activeOrder.id);
  const canCompleteSelected = isSelectedActiveOrder && etaSeconds === 0 && !isCompletingOrder;
  const visibleHistory = showAllHistory
    ? historicalOrders
    : historicalOrders.slice(0, MAX_VISIBLE_ORDERS);

  useEffect(() => {
    if (!activeOrderId) {
      return undefined;
    }

    const intervalId = setInterval(() => setClock(Date.now()), 1000);

    return () => clearInterval(intervalId);
  }, [activeOrderId]);

  useEffect(() => {
    let isMounted = true;

    getOrders()
      .then((loadedOrders) => {
        if (isMounted) {
          setOrders(loadedOrders);
          setOrdersError(null);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setOrdersError(error instanceof Error ? error.message : 'No se pudieron cargar los pedidos.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingOrders(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleStartOrder = async () => {
    if (
      !selectedOrder
      || activeOrder
      || queuedOrders[0]?.id !== selectedOrder.id
      || isStartingOrder
    ) {
      return;
    }

    try {
      setIsStartingOrder(true);
      const updatedOrders = await updateOrderStatus(selectedOrder.id, 'EN_CAMINO');
      setOrders(updatedOrders);
      setOrdersError(null);
      setActiveModal(null);
      setSelectedOrder(null);
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : 'No se pudo iniciar la entrega.');
    } finally {
      setIsStartingOrder(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (!activeOrder || etaSeconds > 0 || isCompletingOrder) {
      return;
    }

    try {
      setIsCompletingOrder(true);
      setCompletedOrder(activeOrder);
      const updatedOrders = await updateOrderStatus(activeOrder.id, 'ENTREGADO');
      setOrders(updatedOrders);
      setOrdersError(null);
      setActiveModal('completion');
    } catch (error) {
      setCompletedOrder(null);
      setOrdersError(error instanceof Error ? error.message : 'No se pudo completar el pedido.');
    } finally {
      setIsCompletingOrder(false);
    }
  };

  const openOrderDetails = (order: DeliveryOrder) => {
    setSelectedOrder(order);
    setOrdersError(null);
    setActiveModal('orderDetails');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={[styles.header, { backgroundColor: palette.header }]}>
          <Image
            source={
              isDarkMode
                ? require('../../../assets/images/repartosYA-version-Osc.png')
                : require('../../../assets/images/repartosYA-logo.png')
            }
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="RepartosYa"
          />
        </View>

        <View style={styles.content}>
          <ScrollView
            contentContainerStyle={styles.dashboardContent}
            showsVerticalScrollIndicator={false}>
            <View style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: palette.heading }]}>PEDIDO PENDIENTE</Text>
                {activeOrder && (
                  <Text style={[styles.sectionBadge, { backgroundColor: palette.successSurface, color: '#047857' }]}>
                    En curso
                  </Text>
                )}
              </View>
              {isLoadingOrders ? (
                <Text style={[styles.inlineEmpty, { color: palette.secondary }]}>Cargando pedidos...</Text>
              ) : activeOrder ? (
                <Pressable
                  style={({ pressed }) => pressed && styles.buttonPressed}
                  onPress={() => openOrderDetails(activeOrder)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver detalles del pedido ${activeOrder.codigo}`}>
                <View style={[styles.activeOrderCard, { backgroundColor: palette.backgroundElement, borderColor: palette.border }]}>
                  <View style={styles.orderRowHeader}>
                    <Text style={[styles.queueOrderCode, { color: palette.text }]}>#{activeOrder.codigo}</Text>
                    <Text style={styles.etaValue}>Tiempo Restante: {formatEta(etaSeconds)}</Text>
                  </View>
                  <Text style={[styles.queueRecipient, { color: palette.text }]}>{activeOrder.destinatario}</Text>
                  <Text style={[styles.orderFieldValue, { color: palette.secondary }]} numberOfLines={2}>
                    {activeOrder.destino}
                  </Text>
                  <View style={styles.orderCardFooter}>
                    <Text style={[styles.queueAddress, { color: palette.secondary }]}>
                      {formatDistance(activeOrder.distancia)}
                    </Text>
                    <Text style={[styles.sectionAction, { color: palette.primary }]}>Ver detalle ›</Text>
                  </View>
                </View>
                </Pressable>
              ) : (
                <Text style={[styles.inlineEmpty, { color: palette.secondary }]}>
                  No hay pedidos en curso.
                </Text>
              )}
            </View>

            <View style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeadingGroup}>
                  <Text style={[styles.sectionTitle, { color: palette.heading }]}>COLA DE PEDIDOS</Text>
                  <Text
                    style={[
                      styles.sectionCount,
                      { backgroundColor: palette.countBadge, color: palette.countBadgeText },
                    ]}>
                    {queuedOrders.length}
                  </Text>
                </View>
              </View>
              {isLoadingOrders ? (
                <Text style={[styles.inlineEmpty, { color: palette.secondary }]}>Cargando pedidos...</Text>
              ) : queuedOrders.length > 0 ? (
                queuedOrders.map((order, index) => {
                  const orderCard = (
                    <View style={[
                      styles.queueCard,
                      {
                        backgroundColor: index === 0 ? palette.background : palette.backgroundElement,
                        borderColor: palette.border,
                      },
                    ]}>
                      <View style={styles.queueCardText}>
                        <Text style={[styles.queueOrderCode, { color: palette.primary }]}>#{order.codigo}</Text>
                        <Text style={[styles.queueRecipient, { color: palette.text }]} numberOfLines={1}>
                          {order.destinatario}
                        </Text>
                        <Text style={[styles.queueAddress, { color: palette.secondary }]} numberOfLines={1}>
                          {order.destino}
                        </Text>
                      </View>
                      <View style={styles.queueCardTrailing}>
                        <Text style={[styles.distanceBadge, { color: palette.primary, borderColor: palette.border }]}>
                          {formatDistance(order.distancia)}
                        </Text>
                      <Text style={[styles.queueChevron, { color: index === 0 ? palette.primary : palette.secondary }]}>
                        ›
                      </Text>
                      </View>
                    </View>
                  );

                  return (
                    <Pressable
                      key={order.id}
                      onPress={() => openOrderDetails(order)}
                      accessibilityRole="button"
                      accessibilityLabel={`Ver pedido ${order.codigo}, ${order.destinatario}`}>
                      {orderCard}
                    </Pressable>
                  );
                })
              ) : (
                <Text style={[styles.inlineEmpty, { color: palette.secondary }]}>No hay pedidos en la cola.</Text>
              )}
            </View>

            <View style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeadingGroup}>
                  <Text style={[styles.sectionTitle, { color: palette.heading }]}>
                    ENTREGADOS / CANCELADOS
                  </Text>
                  <Text
                    style={[
                      styles.sectionCount,
                      { backgroundColor: palette.countBadge, color: palette.countBadgeText },
                    ]}>
                    {historicalOrders.length}
                  </Text>
                </View>
                <Text style={[styles.historyDate, { color: palette.primary }]}>
                  {new Date().toLocaleDateString('es-AR')}
                </Text>
              </View>
              {isLoadingOrders ? (
                <Text style={[styles.inlineEmpty, { color: palette.secondary }]}>Cargando pedidos...</Text>
              ) : visibleHistory.length > 0 ? (
                visibleHistory.map((order) => (
                  <View
                    key={order.id}
                    style={[styles.historyRow, { borderBottomColor: palette.border }]}>
                    <View style={styles.queueCardText}>
                      <Text style={[styles.queueOrderCode, { color: palette.text }]}>#{order.codigo}</Text>
                      <Text style={[styles.queueRecipient, { color: palette.text }]} numberOfLines={1}>
                        {order.destinatario}
                      </Text>
                      <Text style={[styles.queueAddress, { color: palette.secondary }]} numberOfLines={1}>
                        {order.destino}
                      </Text>
                    </View>
                    <Text style={[
                      styles.historyStatus,
                      { backgroundColor: order.estado === 'ENTREGADO' ? palette.successSurface : '#FEE2E2',
                        color: order.estado === 'ENTREGADO' ? '#047857' : '#B91C1C' },
                    ]}>
                      {order.estado === 'ENTREGADO' ? 'Entregado' : 'Cancelado'}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.inlineEmpty, { color: palette.secondary }]}>
                  No hay pedidos entregados o cancelados hoy.
                </Text>
              )}
              {historicalOrders.length > MAX_VISIBLE_ORDERS && (
                <Pressable
                  style={styles.showMoreButton}
                  onPress={() => setShowAllHistory((visible) => !visible)}
                  accessibilityRole="button">
                  <Text style={styles.showMoreText}>
                    {showAllHistory ? 'Ver menos' : 'Ver todos'}
                  </Text>
                </Pressable>
              )}
            </View>
            {ordersError && <Text style={styles.orderError} accessibilityRole="alert">{ordersError}</Text>}
          </ScrollView>
        </View>

        <View style={[styles.bottomMenu, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Pressable
            style={({ pressed }) => [styles.menuButton, pressed && styles.buttonPressed]}
            onPress={toggleTheme}
            accessibilityRole="button"
            accessibilityState={{ checked: isDarkMode }}
            accessibilityLabel={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}>
            <Text style={[styles.menuIcon, { color: palette.text }]}>{isDarkMode ? '☀' : '☾'}</Text>
            <Text style={[styles.menuLabel, { color: palette.secondary }]}>
              {isDarkMode ? 'Modo claro' : 'Modo oscuro'}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.menuButton, pressed && styles.buttonPressed]}
            onPress={() => router.push({
              pathname: '/options',
              params: {
                id: id ?? '',
                nombre: nombre ?? '',
                apellido: apellido ?? '',
              },
            })}
            accessibilityRole="button"
            accessibilityLabel="Opciones">
            <Text style={[styles.menuIcon, { color: palette.text }]}>☰</Text>
            <Text style={[styles.menuLabel, { color: palette.secondary }]}>Opciones</Text>
          </Pressable>
        </View>

        <Modal
          visible={activeModal === 'orderDetails'}
          transparent
          animationType="fade"
          onRequestClose={() => setActiveModal(null)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.startDialog, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: palette.text }]}>
                    {isSelectedActiveOrder ? 'Pedido pendiente' : 'Detalle del pedido'}
                  </Text>
                  <Text style={[styles.startSubtitle, { color: palette.secondary }]}>
                    {isSelectedActiveOrder ? 'Entrega en curso' : 'Cola de reparto'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setActiveModal(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar">
                  <Text style={[styles.modalClose, { color: palette.secondary }]}>×</Text>
                </Pressable>
              </View>
              <ScrollView
                style={styles.orderDetailScroll}
                showsVerticalScrollIndicator={false}>
                {selectedOrder && (
                  <>
                    <View style={[
                      styles.startOrderSummary,
                      { backgroundColor: palette.background, borderColor: palette.border },
                    ]}>
                      <View style={styles.orderRowHeader}>
                        <Text style={[styles.queueOrderCode, { color: palette.text }]}>
                          Pedido #{selectedOrder.codigo}
                        </Text>
                        <Text style={[styles.distanceBadge, { color: palette.primary, borderColor: palette.border }]}>
                          {formatDistance(selectedOrder.distancia)}
                        </Text>
                      </View>
                      {isSelectedActiveOrder && (
                        <Text style={[styles.etaValue, styles.detailEta]}>Tiempo Restante: {formatEta(etaSeconds)}</Text>
                      )}
                      <Text style={[styles.orderFieldLabel, { color: palette.secondary }]}>COMERCIO DE ORIGEN</Text>
                      <Text style={[styles.orderFieldValue, { color: palette.text }]}>
                        {selectedOrder.comercioOrigen ?? 'Comercio de origen'}
                      </Text>
                      <Text style={[styles.orderFieldLabel, { color: palette.secondary }]}>DIRECCIÓN DE ORIGEN</Text>
                      <Text style={[styles.orderFieldValue, { color: palette.text }]}>{selectedOrder.origen}</Text>
                      <Text style={[styles.orderFieldLabel, { color: palette.secondary }]}>COMERCIO DESTINO</Text>
                      <Text style={[styles.orderFieldValue, { color: palette.text }]}>{selectedOrder.destinatario}</Text>
                      <Text style={[styles.orderFieldLabel, { color: palette.secondary }]}>DIRECCIÓN DE ENTREGA</Text>
                      <Text style={[styles.orderFieldValue, { color: palette.text }]}>{selectedOrder.destino}</Text>
                      <Text style={[styles.orderFieldLabel, { color: palette.secondary }]}>CONTACTO</Text>
                      <Text style={[styles.orderFieldValue, { color: palette.text }]}>{selectedOrder.contacto}</Text>
                    </View>

                    <Text style={[styles.orderFieldLabel, styles.mapSectionLabel, { color: palette.secondary }]}>
                      RUTA SUGERIDA (ESQUEMÁTICA)
                    </Text>
                    <View
                      style={[styles.mapPreview, { backgroundColor: isDarkMode ? '#435347' : '#DCE8D5' }]}
                      accessibilityLabel={`Ruta sugerida de ${selectedOrder.origen} a ${selectedOrder.destino}`}>
                      <View style={styles.mapRoadHorizontal} />
                      <View style={styles.mapRoadVertical} />
                      <View style={styles.mapRoadDiagonal} />
                      <View style={styles.mapRouteFirst} />
                      <View style={styles.mapRouteSecond} />
                      <View style={styles.mapRouteThird} />
                      <View style={styles.mapOriginMarker}>
                        <Text style={styles.mapMarkerDot}>●</Text>
                        <Text style={styles.mapMarkerLabel}>ORIGEN</Text>
                      </View>
                      <View style={styles.mapDestinationMarker}>
                        <Text style={[styles.mapMarkerDot, styles.mapDestinationDot]}>●</Text>
                        <Text style={styles.mapMarkerLabel}>DESTINO</Text>
                      </View>
                      <View style={styles.mapAddressBadge}>
                        <Text style={styles.mapAddressLabel}>DISTANCIA ESTIMADA</Text>
                        <Text style={styles.mapAddress}>
                          {formatDistance(selectedOrder.distancia)} · Ruta ilustrativa
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </ScrollView>
              {isSelectedActiveOrder && (
                <View style={styles.startWarning}>
                  <Text style={styles.startWarningText}>
                    El tiempo estimado llegará a cero antes de habilitar la confirmación.
                  </Text>
                </View>
              )}
              {!isSelectedActiveOrder && !activeOrder && selectedOrder && queuedOrders[0]?.id !== selectedOrder.id && (
                <View style={styles.startWarning}>
                  <Text style={styles.startWarningText}>
                    {queuedOrders[0]
                      ? `Primero debes completar el pedido #${queuedOrders[0].codigo} (${formatDistance(queuedOrders[0].distancia)}).`
                      : 'Este pedido ya no está en la cola.'}
                  </Text>
                </View>
              )}
              {ordersError && <Text style={styles.orderError} accessibilityRole="alert">{ordersError}</Text>}
              {isSelectedActiveOrder ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.startButton,
                    { backgroundColor: canCompleteSelected ? '#00ffd1' : palette.border },
                    !canCompleteSelected && { opacity: 0.7 },
                    pressed && canCompleteSelected && styles.buttonPressed,
                  ]}
                  onPress={handleCompleteOrder}
                  disabled={!canCompleteSelected}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canCompleteSelected }}>
                  <Text style={[styles.startButtonText, { color: canCompleteSelected ? palette.text : palette.secondary }]}>
                    {isCompletingOrder ? 'Guardando...' : etaSeconds > 0 ? 'Entrega en curso' : '✓  Pedido completado'}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.startButton,
                    { backgroundColor: canStartSelected ? '#00ffd1' : palette.border },
                    !canStartSelected && { opacity: 0.7 },
                    pressed && canStartSelected && styles.buttonPressed,
                  ]}
                  onPress={handleStartOrder}
                  disabled={!canStartSelected}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canStartSelected }}>
                  <Text style={[styles.startButtonText, { color: canStartSelected ? palette.text : palette.secondary }]}>
                    {isStartingOrder ? 'Iniciando...' : '✓  Comenzar entrega'}
                  </Text>
                </Pressable>
              )}
              <Pressable
                style={styles.cancelStartButton}
                onPress={() => setActiveModal(null)}
                accessibilityRole="button">
                <Text style={[styles.cancelStartText, { color: palette.secondary }]}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={activeModal === 'completion'}
          transparent
          animationType="fade"
          onRequestClose={() => setActiveModal(null)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalDialog, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: palette.text }]}>Pedido completado</Text>
                <Pressable onPress={() => setActiveModal(null)} accessibilityRole="button" accessibilityLabel="Cerrar">
                  <Text style={[styles.modalClose, { color: palette.secondary }]}>×</Text>
                </Pressable>
              </View>
              <Text style={[styles.modalEmpty, { color: palette.secondary }]}>
                {completedOrder
                  ? `El pedido #${completedOrder.codigo} fue marcado como entregado. La ventana a mostrarse debería ser la de los pasos a seguir para la entrega final, junto con un comprobante fotografico. Aún no esta disponible.`
                  : 'El pedido fue marcado como entregado.'}
              </Text>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
