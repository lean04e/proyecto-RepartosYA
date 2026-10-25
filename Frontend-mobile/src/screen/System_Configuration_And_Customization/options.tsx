import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Image, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/app-theme';
import { APP_THEMES, DELIVERY_DASHBOARD_STYLES as styles } from '../../theme/theme';

export default function OptionsScreen() {
  const { id, nombre, apellido } = useLocalSearchParams<{
    id?: string;
    nombre?: string;
    apellido?: string;
  }>();
  const { isDarkMode } = useAppTheme();
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const palette = APP_THEMES[isDarkMode ? 'dark' : 'light'];
  const fullName = [nombre, apellido].filter(Boolean).join(' ') || 'Repartidor';

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

        <View style={styles.optionsContent}>
          <Pressable
            style={styles.optionsBackButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Volver al panel">
            <Text style={[styles.optionsBackText, { color: palette.secondary }]}>← Volver al panel</Text>
          </Pressable>
          <View style={[styles.profileCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View
              style={styles.profileAvatar}
              accessibilityRole="image"
              accessibilityLabel={`Foto de perfil de ${fullName}`}>
              <View style={styles.profileAvatarHead} />
              <View style={styles.profileAvatarBody} />
            </View>
            <Text style={[styles.profileCaption, { color: palette.secondary }]}>PERFIL DEL REPARTIDOR</Text>
            <Text style={[styles.profileName, { color: palette.text }]}>{fullName}</Text>
            <Text style={[styles.profileIdentifier, { color: palette.secondary }]}>
              N.º de repartidor: {id || '—'}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.logoutAction, pressed && styles.buttonPressed]}
            onPress={() => setShowLogoutConfirmation(true)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión">
            <Text style={styles.menuIcon}>↪</Text>
            <Text style={styles.logoutActionText}>Cerrar sesión</Text>
          </Pressable>
        </View>

        <Modal
          visible={showLogoutConfirmation}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLogoutConfirmation(false)}>
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.logoutDialog,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
              accessibilityRole="alert">
              <Text style={styles.logoutDialogTitle}>¿Cerrar sesión?</Text>
              <Text style={[styles.logoutDialogMessage, { color: palette.secondary }]}>
                ¿Estás seguro de que deseas salir de tu cuenta?
              </Text>
              <View style={styles.logoutDialogActions}>
                <Pressable
                  style={({ pressed }) => [styles.logoutCancelButton, pressed && styles.buttonPressed]}
                  onPress={() => setShowLogoutConfirmation(false)}
                  accessibilityRole="button">
                  <Text style={styles.logoutCancelText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.logoutConfirmButton, pressed && styles.buttonPressed]}
                  onPress={() => {
                    setShowLogoutConfirmation(false);
                    router.replace('/');
                  }}
                  accessibilityRole="button">
                  <Text style={styles.logoutConfirmText}>Sí, salir</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
