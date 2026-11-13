import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  AppState, Image, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { deliverOrder, fetchOrders, getOrders, updateOrderStatus, type DeliveryOrder } from '../../data/orders';
import { useAppTheme } from '../../hooks/app-theme';
import { APP_THEMES, DELIVERY_DASHBOARD_STYLES as styles } from '../../theme/theme';

type ActiveModal = 'orderDetails' | 'receipt' | 'completion' | 'deliveredDetail' | null;
const DEMO_ETA_SECONDS = 30;
const MAX_VISIBLE_ORDERS = 4;
const POLL_INTERVAL_MS = 10000;

function formatEta(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

type Palette = (typeof APP_THEMES)['light'];
type Leg = 'origen' | 'destino';

const LEG_STEPS: { key: Leg; label: string }[] = [
  { key: 'origen', label: '1 · Retirar en origen' },
  { key: 'destino', label: '2 · Entregar en destino' },
];

// Dos pasos: retirar en el depósito de origen y entregar en el destino
function LegTracker({ leg, palette }: { leg: Leg; palette: Palette }) {
  return (
    <View style={styles.legTracker} accessibilityLabel={leg === 'origen' ? 'Paso 1 de 2: retirar en origen' : 'Paso 2 de 2: entregar en destino'}>
      {LEG_STEPS.map((step) => {
        const isCurrent = step.key === leg;
        const isDone = step.key === 'origen' && leg === 'destino';
        return (
          <View key={step.key} style={styles.legStep}>
            <View
              style={[
                styles.legBar,
                { backgroundColor: isCurrent || isDone ? palette.primary : palette.border },
                isDone && { opacity: 0.45 },
              ]}
            />
            <Text style={[
              styles.legLabel,
              { color: isCurrent ? palette.text : palette.secondary, fontWeight: isCurrent ? '800' : '600' },
            ]}>
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function LegGroup({ active, palette, children }: { active: boolean; palette: Palette; children: ReactNode }) {
  return (
    <View
      style={[
        styles.legGroup,
        active
          ? { backgroundColor: palette.focusSurface, borderColor: palette.primary }
          : { borderColor: palette.border },
      ]}>
      {active && (
        <Text style={[styles.legTag, { backgroundColor: palette.primary, color: palette.onPrimary }]}>
          Rumbo actual
        </Text>
      )}
      {children}
    </View>
  );
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deliveredOrder, setDeliveredOrder] = useState<DeliveryOrder | null>(null);
  const [receiptImageFailed, setReceiptImageFailed] = useState(false);
  const isBusyRef = useRef(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [price, setPrice] = useState('');
  const [receiptError, setReceiptError] = useState<string | null>(null);
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
    .sort((first, second) => first.codigo.localeCompare(second.codigo));
  const today = new Date().toDateString();
  const historicalOrders = courierOrders
    .filter((order) => (
      (order.estado === 'CANCELADO' || order.estado === 'FALLIDO' || order.estado === 'ENTREGADO')
      && order.fechaEstado
      && new Date(order.fechaEstado).toDateString() === today
    ))
    .sort((first, second) => (
      Date.parse(second.fechaEstado ?? '') - Date.parse(first.fechaEstado ?? '')
    ));
  // El timer arranca cuando se asignó el pedido o cuando se entregó el anterior, lo que ocurra último
  const lastDeliveredAt = courierOrders.reduce((latest, order) => (
    order.estado === 'ENTREGADO' && order.fechaEstado
      ? Math.max(latest, Date.parse(order.fechaEstado))
      : latest
  ), 0);
  const timerStartedAt = activeOrder?.fechaEstado
    ? Math.max(Date.parse(activeOrder.fechaEstado), lastDeliveredAt)
    : 0;
  const elapsedSeconds = activeOrder
    ? Math.max(0, Math.floor((clock - timerStartedAt) / 1000))
    : 0;
  const etaSeconds = activeOrder ? Math.max(0, DEMO_ETA_SECONDS - elapsedSeconds) : 0;
  const activeOrderId = activeOrder?.id;
  // Primera mitad del tiempo: rumbo al depósito de origen; segunda mitad: rumbo al destino
  const currentLeg: Leg = etaSeconds > DEMO_ETA_SECONDS / 2 ? 'origen' : 'destino';
  const canStartSelected = Boolean(
    selectedOrder
    && !activeOrder
    && queuedOrders[0]?.id === selectedOrder.id
    && !isStartingOrder,
  );
  const isSelectedActiveOrder = Boolean(activeOrder && selectedOrder?.id === activeOrder.id);
  const canCompleteSelected = isSelectedActiveOrder && etaSeconds === 0 && !isCompletingOrder;
  const parsedPrice = Number(price.replace(',', '.'));
  const canConfirmReceipt = Boolean(
    receiptData && paymentMethod.trim() && parsedPrice > 0 && !isCompletingOrder,
  );
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

  useEffect(() => {
    isBusyRef.current = isStartingOrder || isCompletingOrder;
  }, [isStartingOrder, isCompletingOrder]);

  // Refresco automatico: cada 10 s mientras la app esta en primer plano y al volver a ella.
  // Se omite mientras se inicia/completa un pedido para no pisar ese cambio con datos viejos.
  useEffect(() => {
    let isMounted = true;

    const refresh = async () => {
      if (isBusyRef.current) {
        return;
      }
      try {
        const freshOrders = await fetchOrders();
        if (isMounted && !isBusyRef.current) {
          setOrders(freshOrders);
        }
      } catch {
        // Falla silenciosa: se conserva la lista actual y se reintenta en el proximo ciclo
      }
    };

    const intervalId = setInterval(() => {
      if (AppState.currentState === 'active') {
        refresh();
      }
    }, POLL_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refresh();
      }
    });

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      subscription.remove();
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      setOrders(await fetchOrders());
      setOrdersError(null);
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : 'No se pudieron actualizar los pedidos.');
    } finally {
      setIsRefreshing(false);
    }
  };

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
    if (!activeOrder || etaSeconds > 0 || isCompletingOrder || !receiptData || !(parsedPrice > 0)) {
      return;
    }

    try {
      setIsCompletingOrder(true);
      setCompletedOrder(activeOrder);
      const updatedOrders = await deliverOrder(activeOrder.id, {
        imagenBase64: receiptData.base64,
        mimeType: receiptData.mimeType,
        metodoPago: paymentMethod.trim(),
        precio: parsedPrice,
      });
      setOrders(updatedOrders);
      setOrdersError(null);
      setReceiptUri(null);
      setReceiptData(null);
      setPaymentMethod('');
      setPrice('');
      setActiveModal('completion');
    } catch (error) {
      setCompletedOrder(null);
      setOrdersError(error instanceof Error ? error.message : 'No se pudo completar el pedido.');
    } finally {
      setIsCompletingOrder(false);
    }
  };

  const pickReceipt = async (source: 'library' | 'camera') => {
    try {
      setReceiptError(null);
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setReceiptError('Necesitas dar permiso para cargar el comprobante.');
        return;
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, base64: true };
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled) {
        const asset = result.assets[0];
        if (!asset.base64) {
          setReceiptError('No se pudo leer la imagen.');
          return;
        }
        setReceiptUri(asset.uri);
        setReceiptData({ base64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg' });
      }
    } catch {
      setReceiptError('No se pudo cargar la imagen.');
    }
  };

  const openReceipt = () => {
    setReceiptError(null);
    setOrdersError(null);
    setActiveModal('receipt');
  };

  const openDeliveredDetail = (order: DeliveryOrder) => {
    setDeliveredOrder(order);
    setReceiptImageFailed(false);
    setActiveModal('deliveredDetail');
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
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={palette.primary}
                colors={[palette.primary]}
              />
            }>
            <View style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
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
                  <LegTracker leg={currentLeg} palette={palette} />
                  <Text style={[styles.legHeadline, { color: palette.text }]}>
                    {etaSeconds === 0 ? 'Llegaste a ' : 'Dirigite a '}
                    {currentLeg === 'origen' ? activeOrder.comercioOrigen : activeOrder.destinatario}
                  </Text>
                  <Text style={[styles.legAddress, { color: palette.secondary }]} numberOfLines={2}>
                    {currentLeg === 'origen' ? activeOrder.origen : activeOrder.destino}
                  </Text>
                  {currentLeg === 'origen' && (
                    <Text style={[styles.legNext, { color: palette.secondary }]} numberOfLines={2}>
                      Después: {activeOrder.destinatario} · {activeOrder.destino}
                    </Text>
                  )}
                  <View style={[styles.orderCardFooter, { justifyContent: 'flex-end' }]}>
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
                    ENTREGADOS / CANCELADOS / FALLIDOS
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
                  <Pressable
                    key={order.id}
                    style={({ pressed }) => [
                      styles.historyRow,
                      { borderBottomColor: palette.border },
                      pressed && styles.buttonPressed,
                    ]}
                    disabled={order.estado !== 'ENTREGADO'}
                    onPress={() => openDeliveredDetail(order)}
                    accessibilityRole={order.estado === 'ENTREGADO' ? 'button' : undefined}
                    accessibilityLabel={
                      order.estado === 'ENTREGADO' ? `Ver detalle del pedido ${order.codigo}` : undefined
                    }>
                    <View style={styles.queueCardText}>
                      <Text style={[styles.queueOrderCode, { color: palette.text }]}>#{order.codigo}</Text>
                      <Text style={[styles.queueRecipient, { color: palette.text }]} numberOfLines={1}>
                        {order.destinatario}
                      </Text>
                      <Text style={[styles.queueAddress, { color: palette.secondary }]} numberOfLines={1}>
                        {order.destino}
                      </Text>
                    </View>
                    <View style={styles.historyTrailing}>
                      <Text style={[
                        styles.historyStatus,
                        { backgroundColor: order.estado === 'ENTREGADO' ? palette.successSurface : palette.dangerSurface,
                          color: order.estado === 'ENTREGADO' ? palette.successText : palette.dangerText },
                      ]}>
                        {order.estado === 'ENTREGADO' ? 'Entregado' : order.estado === 'FALLIDO' ? 'Fallido' : 'Cancelado'}
                      </Text>
                      {order.estado === 'ENTREGADO' && (
                        <Text style={[styles.sectionAction, { color: palette.primary }]}>Ver detalle ›</Text>
                      )}
                    </View>
                  </Pressable>
                ))
              ) : (
                <Text style={[styles.inlineEmpty, { color: palette.secondary }]}>
                  No hay pedidos entregados, cancelados o fallidos hoy.
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
                  <Text style={[styles.modalTitle, { color: palette.text }]}>Detalle del pedido</Text>
                  {!isSelectedActiveOrder && (
                    <Text style={[styles.startSubtitle, { color: palette.secondary }]}>Cola de reparto</Text>
                  )}
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
                        {isSelectedActiveOrder && (
                          <Text style={styles.etaValue}>Tiempo Restante: {formatEta(etaSeconds)}</Text>
                        )}
                      </View>
                      {isSelectedActiveOrder && <LegTracker leg={currentLeg} palette={palette} />}
                      <LegGroup active={isSelectedActiveOrder && currentLeg === 'origen'} palette={palette}>
                        <Text style={[styles.orderFieldLabel, styles.firstFieldLabel, { color: palette.secondary }]}>DEPÓSITO DE ORIGEN</Text>
                        <Text style={[styles.orderFieldValue, { color: palette.text }]}>
                          {selectedOrder.comercioOrigen ?? 'Depósito de origen'}
                        </Text>
                        <Text style={[styles.orderFieldLabel, { color: palette.secondary }]}>DIRECCIÓN DE ORIGEN</Text>
                        <Text style={[styles.orderFieldValue, { color: palette.text }]}>{selectedOrder.origen}</Text>
                      </LegGroup>
                      <LegGroup active={isSelectedActiveOrder && currentLeg === 'destino'} palette={palette}>
                        <Text style={[styles.orderFieldLabel, styles.firstFieldLabel, { color: palette.secondary }]}>COMERCIO DESTINO</Text>
                        <Text style={[styles.orderFieldValue, { color: palette.text }]}>{selectedOrder.destinatario}</Text>
                        <Text style={[styles.orderFieldLabel, { color: palette.secondary }]}>DIRECCIÓN DE ENTREGA</Text>
                        <Text style={[styles.orderFieldValue, { color: palette.text }]}>{selectedOrder.destino}</Text>
                        <Text style={[styles.orderFieldLabel, { color: palette.secondary }]}>CONTACTO</Text>
                        <Text style={[styles.orderFieldValue, { color: palette.text }]}>{selectedOrder.contacto}</Text>
                      </LegGroup>
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
                      ? `Primero debes completar el pedido #${queuedOrders[0].codigo}.`
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
                  onPress={openReceipt}
                  disabled={!canCompleteSelected}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canCompleteSelected }}>
                  <Text style={[styles.startButtonText, { color: canCompleteSelected ? palette.text : palette.secondary }]}>
                    {etaSeconds > 0 ? 'Entrega en curso' : '✓  Entregar pedido'}
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
          visible={activeModal === 'receipt'}
          transparent
          animationType="fade"
          onRequestClose={() => setActiveModal('orderDetails')}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.startDialog, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: palette.text }]}>Entregar pedido</Text>
                  <Text style={[styles.startSubtitle, { color: palette.secondary }]}>
                    Carga el comprobante de la compra
                  </Text>
                </View>
                <Pressable
                  onPress={() => setActiveModal('orderDetails')}
                  accessibilityRole="button"
                  accessibilityLabel="Volver">
                  <Text style={[styles.modalClose, { color: palette.secondary }]}>×</Text>
                </Pressable>
              </View>
              <ScrollView
                style={styles.orderDetailScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                {activeOrder && (
                  <View style={[
                    styles.startOrderSummary,
                    { backgroundColor: palette.background, borderColor: palette.border },
                  ]}>
                    <Text style={[styles.queueOrderCode, { color: palette.text }]}>Pedido #{activeOrder.codigo}</Text>
                    <Text style={[styles.orderFieldLabel, { color: palette.secondary }]}>DEPÓSITO DE ORIGEN</Text>
                    <Text style={[styles.orderFieldValue, { color: palette.text }]}>
                      {activeOrder.comercioOrigen ?? 'Depósito de origen'}
                    </Text>
                    <Text style={[styles.orderFieldLabel, { color: palette.secondary }]}>COMERCIO DESTINO</Text>
                    <Text style={[styles.orderFieldValue, { color: palette.text }]}>{activeOrder.destinatario}</Text>
                    <Text style={[styles.orderFieldLabel, { color: palette.secondary }]}>DIRECCIÓN DE ENTREGA</Text>
                    <Text style={[styles.orderFieldValue, { color: palette.text }]}>{activeOrder.destino}</Text>
                    <Text style={[styles.orderFieldLabel, { color: palette.secondary }]}>CONTACTO</Text>
                    <Text style={[styles.orderFieldValue, { color: palette.text }]}>{activeOrder.contacto}</Text>
                  </View>
                )}

                <Text style={[styles.orderFieldLabel, { color: palette.secondary }]}>COMPROBANTE / FACTURA</Text>
                <View style={[styles.receiptBox, { backgroundColor: palette.background, borderColor: palette.border }]}>
                  {receiptUri ? (
                    <Image
                      source={{ uri: receiptUri }}
                      style={styles.receiptImage}
                      resizeMode="contain"
                      accessibilityLabel="Comprobante cargado"
                    />
                  ) : (
                    <Text style={[styles.inlineEmpty, { color: palette.secondary }]}>
                      Aún no se cargó ninguna imagen
                    </Text>
                  )}
                </View>
                <View style={styles.receiptActions}>
                  <Pressable
                    style={[styles.receiptActionButton, { borderColor: palette.border }]}
                    onPress={() => pickReceipt('library')}
                    accessibilityRole="button">
                    <Text style={[styles.sectionAction, { color: palette.primary }]}>
                      {receiptUri ? 'Cambiar imagen' : 'Elegir imagen'}
                    </Text>
                  </Pressable>
                  {Platform.OS !== 'web' && (
                    <Pressable
                      style={[styles.receiptActionButton, { borderColor: palette.border }]}
                      onPress={() => pickReceipt('camera')}
                      accessibilityRole="button">
                      <Text style={[styles.sectionAction, { color: palette.primary }]}>Tomar foto</Text>
                    </Pressable>
                  )}
                </View>

                <Text style={[styles.orderFieldLabel, { color: palette.secondary }]}>MÉTODO DE PAGO</Text>
                <TextInput
                  style={[styles.receiptInput, { color: palette.text, borderColor: palette.border, backgroundColor: palette.background }]}
                  value={paymentMethod}
                  onChangeText={setPaymentMethod}
                  placeholder="Ej: Efectivo, Transferencia"
                  placeholderTextColor={palette.secondary}
                />
                <Text style={[styles.orderFieldLabel, { color: palette.secondary }]}>PRECIO</Text>
                <TextInput
                  style={[styles.receiptInput, { color: palette.text, borderColor: palette.border, backgroundColor: palette.background }]}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="Total según la factura"
                  placeholderTextColor={palette.secondary}
                  keyboardType="decimal-pad"
                />
              </ScrollView>
              {(receiptError || ordersError) && (
                <Text style={styles.orderError} accessibilityRole="alert">{receiptError ?? ordersError}</Text>
              )}
              <Pressable
                style={({ pressed }) => [
                  styles.startButton,
                  { backgroundColor: canConfirmReceipt ? '#00ffd1' : palette.border },
                  !canConfirmReceipt && { opacity: 0.7 },
                  pressed && canConfirmReceipt && styles.buttonPressed,
                ]}
                onPress={handleCompleteOrder}
                disabled={!canConfirmReceipt}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canConfirmReceipt }}>
                <Text style={[styles.startButtonText, { color: canConfirmReceipt ? palette.text : palette.secondary }]}>
                  {isCompletingOrder ? 'Guardando...' : '✓  Confirmar entrega'}
                </Text>
              </Pressable>
              <Pressable
                style={styles.cancelStartButton}
                onPress={() => setActiveModal('orderDetails')}
                accessibilityRole="button">
                <Text style={[styles.cancelStartText, { color: palette.secondary }]}>Volver</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={activeModal === 'deliveredDetail'}
          transparent
          animationType="fade"
          onRequestClose={() => setActiveModal(null)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.startDialog, styles.deliveredDialog, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={[styles.modalHeader, styles.deliveredHeader]}>
                <View style={[styles.deliveredBanner, { backgroundColor: palette.successSurface }]}>
                  <Text style={[styles.deliveredStatus, { color: palette.successText }]}>✓  Entregado</Text>
                  {deliveredOrder?.fechaEstado && (
                    <Text style={[styles.deliveredDate, { color: palette.successText }]}>
                      {new Date(deliveredOrder.fechaEstado).toLocaleDateString('es-AR')}
                      {' · '}
                      {new Date(deliveredOrder.fechaEstado).toLocaleTimeString('es-AR', {
                        hour: '2-digit', minute: '2-digit',
                      })} hs
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={() => setActiveModal(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar">
                  <Text style={[styles.modalClose, { color: palette.secondary }]}>×</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.deliveredScroll} showsVerticalScrollIndicator={false}>
                {deliveredOrder && (
                  <>
                    <View style={[
                      styles.startOrderSummary,
                      { backgroundColor: palette.background, borderColor: palette.border },
                    ]}>
                      <Text style={[styles.queueOrderCode, { color: palette.text }]}>
                        Pedido #{deliveredOrder.codigo}
                      </Text>
                      <LegGroup active={false} palette={palette}>
                        <Text style={[styles.orderFieldLabel, styles.firstFieldLabel, { color: palette.secondary }]}>DEPÓSITO DE ORIGEN</Text>
                        <Text style={[styles.orderFieldValue, { color: palette.text }]}>
                          {deliveredOrder.comercioOrigen ?? 'Depósito de origen'}
                        </Text>
                        <Text style={[styles.orderFieldLabel, { color: palette.secondary }]}>DIRECCIÓN DE ORIGEN</Text>
                        <Text style={[styles.orderFieldValue, { color: palette.text }]}>{deliveredOrder.origen}</Text>
                      </LegGroup>
                      <LegGroup active={false} palette={palette}>
                        <Text style={[styles.orderFieldLabel, styles.firstFieldLabel, { color: palette.secondary }]}>COMERCIO DESTINO</Text>
                        <Text style={[styles.orderFieldValue, { color: palette.text }]}>{deliveredOrder.destinatario}</Text>
                        <Text style={[styles.orderFieldLabel, { color: palette.secondary }]}>DIRECCIÓN DE ENTREGA</Text>
                        <Text style={[styles.orderFieldValue, { color: palette.text }]}>{deliveredOrder.destino}</Text>
                        <Text style={[styles.orderFieldLabel, { color: palette.secondary }]}>CONTACTO</Text>
                        <Text style={[styles.orderFieldValue, { color: palette.text }]}>{deliveredOrder.contacto}</Text>
                      </LegGroup>
                      <LegGroup active={false} palette={palette}>
                        <Text style={[styles.orderFieldLabel, styles.firstFieldLabel, { color: palette.secondary }]}>MÉTODO DE PAGO</Text>
                        <Text style={[styles.orderFieldValue, { color: palette.text }]}>
                          {deliveredOrder.metodoPago ?? 'Sin registrar'}
                        </Text>
                        <Text style={[styles.orderFieldLabel, { color: palette.secondary }]}>PRECIO</Text>
                        <Text style={[
                          styles.orderFieldValue,
                          styles.deliveredPrice,
                          { color: typeof deliveredOrder.precio === 'number' ? palette.successText : palette.text },
                        ]}>
                          {typeof deliveredOrder.precio === 'number'
                            ? `$ ${deliveredOrder.precio.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : 'Sin registrar'}
                        </Text>
                      </LegGroup>
                    </View>

                    <Text style={[styles.orderFieldLabel, { color: palette.secondary }]}>COMPROBANTE / FACTURA</Text>
                    <View style={[styles.receiptBox, { backgroundColor: palette.background, borderColor: palette.border }]}>
                      {deliveredOrder.comprobanteUrl && !receiptImageFailed ? (
                        <Image
                          source={{ uri: deliveredOrder.comprobanteUrl }}
                          style={styles.receiptImage}
                          resizeMode="contain"
                          onError={() => setReceiptImageFailed(true)}
                          accessibilityLabel="Comprobante de la entrega"
                        />
                      ) : (
                        <Text style={[styles.inlineEmpty, { color: palette.secondary }]}>
                          {deliveredOrder.comprobanteUrl
                            ? 'No se pudo cargar la imagen del comprobante.'
                            : 'Este pedido no tiene comprobante cargado.'}
                        </Text>
                      )}
                    </View>
                  </>
                )}
              </ScrollView>
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
                  ? `El pedido #${completedOrder.codigo} fue marcado como entregado.`
                  : 'El pedido fue marcado como entregado.'}
              </Text>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
