import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/app-theme';
import { DELIVERY_DASHBOARD_STYLES as styles, APP_THEMES } from '../../theme/theme';
import { getOrders, updateOrderStatus, type DeliveryOrder } from '../../data/orders';

type ActiveModal = 'current' | 'queue' | null;

export default function RepartidorDashboard() {
  const { id, nombre, apellido } = useLocalSearchParams<{
    id?: string;
    nombre?: string;
    apellido?: string;
  }>();
  const { isDarkMode, toggleTheme } = useAppTheme();
  const [showOptions, setShowOptions] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const fullName = [nombre, apellido].filter(Boolean).join(' ') || 'Repartidor';
  const palette = APP_THEMES[isDarkMode ? 'dark' : 'light'];
  const courierOrders = orders.filter((order) => order.repartidorId === id);
  const queuedOrders = courierOrders.filter(
    (order) => (
      order.estado === 'PENDIENTE'
      || order.estado === 'ASIGNADO'
      || order.estado === 'MODIFICADO'
    ),
  );
  const historicalOrders = courierOrders.filter(
    (order) => order.estado === 'CANCELADO' || order.estado === 'ENTREGADO',
  );
  const currentOrder = queuedOrders[0];

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

  const handleCompleteOrder = async () => {
    if (!currentOrder) {
      return;
    }

    try {
      const updatedOrders = await updateOrderStatus(currentOrder.id, 'ENTREGADO');
      setOrders(updatedOrders);
      setOrdersError(null);
      setActiveModal(null);
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : 'No se pudo completar el pedido.');
    }
  };

  const renderOrderFields = (order: DeliveryOrder) => (
    <>
      <Text style={[styles.orderFieldLabel, { color: palette.secondary }]}>ORIGEN</Text>
      <Text style={[styles.orderFieldValue, { color: palette.text }]}>{order.origen}</Text>
      <Text style={[styles.orderFieldLabel, { color: palette.secondary }]}>DESTINO</Text>
      <Text style={[styles.orderFieldValue, { color: palette.text }]}>{order.destino}</Text>
      <Text style={[styles.orderFieldLabel, { color: palette.secondary }]}>DESTINATARIO</Text>
      <Text style={[styles.orderFieldValue, { color: palette.text }]}>{order.destinatario}</Text>
      <Text style={[styles.orderFieldLabel, { color: palette.secondary }]}>CONTACTO</Text>
      <Text style={[styles.orderFieldValue, { color: palette.text }]}>{order.contacto}</Text>
    </>
  );

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
          <Text style={[styles.title, { color: palette.text }]}>¡Bienvenido, {fullName}!</Text>
          <View style={[styles.statusCard, { backgroundColor: palette.successSurface }]}>
            <View style={styles.statusDot} />
            <Text style={[styles.statusText, { color: palette.text }]}>Tu sesión está iniciada</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.infoCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
              pressed && styles.buttonPressed,
            ]}
            onPress={() => setActiveModal('current')}
            accessibilityRole="button">
            <Text style={[styles.infoLabel, { color: palette.secondary }]}>Pedido Pendiente:</Text>
            <Text style={[styles.infoValue, { color: palette.text }]}>
              {isLoadingOrders ? 'Cargando...' : currentOrder ? `#${currentOrder.codigo}` : 'Sin pedidos'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.infoCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
              pressed && styles.buttonPressed,
            ]}
            onPress={() => setActiveModal('queue')}
            accessibilityRole="button">
            <Text style={[styles.infoLabel, { color: palette.secondary }]}>Cola de Pedido Pendiente:</Text>
            <Text style={[styles.infoValue, { color: palette.text }]}>
              {isLoadingOrders ? 'Cargando...' : `${queuedOrders.length} pedidos`}
            </Text>
          </Pressable>

          {ordersError && <Text style={styles.orderError} accessibilityRole="alert">{ordersError}</Text>}
        </View>

        {showOptions && (
          <View style={[styles.optionsPopover, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.optionsTitle, { color: palette.text }]}>Opciones</Text>
            <Text style={[styles.optionLabel, { color: palette.secondary }]}>REPARTIDOR</Text>
            <Text style={[styles.optionValue, { color: palette.text }]}>{fullName}</Text>
            <Text style={[styles.optionLabel, { color: palette.secondary }]}>NÚMERO</Text>
            <Text style={[styles.optionValue, { color: palette.text }]}>{id || '—'}</Text>
          </View>
        )}

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
            onPress={() => setShowOptions((visible) => !visible)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showOptions }}
            accessibilityLabel="Opciones">
            <Text style={[styles.menuIcon, { color: palette.text }]}>☰</Text>
            <Text style={[styles.menuLabel, { color: palette.secondary }]}>Opciones</Text>
          </Pressable>
          
          <Pressable
            style={({ pressed }) => [styles.menuButton, styles.logoutButtonHighlight, pressed && styles.buttonPressed]}
            onPress={() => router.replace('/')}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión">
            <Text style={[styles.menuIcon, { color: palette.text }]}>↪</Text>
            <Text style={[styles.menuLabel, { color: palette.secondary }]}>Cerrar sesión</Text>
          </Pressable>
        </View>

        <Modal
          visible={activeModal === 'current'}
          transparent
          animationType="fade"
          onRequestClose={() => setActiveModal(null)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalDialog, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: palette.text }]}>Pedido pendiente</Text>
                <Pressable onPress={() => setActiveModal(null)} accessibilityRole="button" accessibilityLabel="Cerrar">
                  <Text style={[styles.modalClose, { color: palette.secondary }]}>×</Text>
                </Pressable>
              </View>
              {isLoadingOrders ? (
                <Text style={[styles.modalEmpty, { color: palette.secondary }]}>Cargando pedidos...</Text>
              ) : currentOrder ? (
                <ScrollView style={styles.modalBody}>
                  <View style={[styles.orderRow, { borderColor: palette.border }]}>
                    <View style={styles.orderRowHeader}>
                      <Text style={[styles.orderCode, { color: palette.text }]}>Pedido #{currentOrder.codigo}</Text>
                      <Text style={[styles.orderStatus, { color: palette.secondary }]}>{currentOrder.estado}</Text>
                    </View>
                    {renderOrderFields(currentOrder)}
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.completeButton, pressed && styles.buttonPressed]}
                    onPress={handleCompleteOrder}
                    accessibilityRole="button">
                    <Text style={styles.completeButtonText}>Marcar como completado</Text>
                  </Pressable>
                </ScrollView>
              ) : (
                <Text style={[styles.modalEmpty, { color: palette.secondary }]}>
                  No tienes pedidos pendientes en la cola.
                </Text>
              )}
              {ordersError && <Text style={styles.orderError} accessibilityRole="alert">{ordersError}</Text>}
            </View>
          </View>
        </Modal>

        <Modal
          visible={activeModal === 'queue'}
          transparent
          animationType="fade"
          onRequestClose={() => setActiveModal(null)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalDialog, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: palette.text }]}>Cola de pedidos</Text>
                <Pressable onPress={() => setActiveModal(null)} accessibilityRole="button" accessibilityLabel="Cerrar">
                  <Text style={[styles.modalClose, { color: palette.secondary }]}>×</Text>
                </Pressable>
              </View>
              {isLoadingOrders ? (
                <Text style={[styles.modalEmpty, { color: palette.secondary }]}>Cargando pedidos...</Text>
              ) : queuedOrders.length > 0 || historicalOrders.length > 0 ? (
                <ScrollView style={styles.modalBody}>
                  {queuedOrders.length === 0 && (
                    <Text style={[styles.modalEmpty, { color: palette.secondary }]}>
                      No hay pedidos activos en la cola.
                    </Text>
                  )}
                  {queuedOrders.map((order) => (
                    <View key={order.id} style={[styles.orderRow, { borderColor: palette.border }]}>
                      <View style={styles.orderRowHeader}>
                        <Text style={[styles.orderCode, { color: palette.text }]}>Pedido #{order.codigo}</Text>
                        <Text style={[styles.orderStatus, { color: palette.secondary }]}>{order.estado}</Text>
                      </View>
                      {renderOrderFields(order)}
                    </View>
                  ))}
                  {historicalOrders.length > 0 && (
                    <>
                      <Text style={[styles.modalSectionTitle, { color: palette.secondary }]}>HISTORIAL</Text>
                      {historicalOrders.map((order) => (
                        <View key={order.id} style={[styles.orderRow, { borderColor: palette.border }]}>
                          <View style={styles.orderRowHeader}>
                            <Text style={[styles.orderCode, { color: palette.text }]}>Pedido #{order.codigo}</Text>
                            <Text style={[styles.orderStatus, { color: palette.secondary }]}>{order.estado}</Text>
                          </View>
                          {renderOrderFields(order)}
                        </View>
                      ))}
                    </>
                  )}
                </ScrollView>
              ) : (
                <Text style={[styles.modalEmpty, { color: palette.secondary }]}>
                  No hay pedidos en la cola.
                </Text>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
