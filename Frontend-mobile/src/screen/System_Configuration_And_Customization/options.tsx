import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/app-theme';
import {
  clearStoredUser,
  getCourierProfile,
  getStoredUser,
  updateCourierProfile,
  type CourierUserProfile,
} from '../../services/auth';
import { APP_THEMES, DELIVERY_DASHBOARD_STYLES as styles } from '../../theme/theme';

export default function OptionsScreen() {
  const { id: paramId, nombre: paramNombre, apellido: paramApellido } = useLocalSearchParams<{
    id?: string;
    nombre?: string;
    apellido?: string;
  }>();

  const { isDarkMode } = useAppTheme();
  const palette = APP_THEMES[isDarkMode ? 'dark' : 'light'];

  const [profile, setProfile] = useState<CourierUserProfile>({
    id: paramId || '',
    nombre: paramNombre || '',
    apellido: paramApellido || '',
    telefono: '',
    email: '',
    legajo: '',
    fotoPerfil: '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    fotoPerfil: '',
  });

  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);

  // Carga inicial del perfil desde almacenamiento local y sincronización con el backend
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      // 1. Cargar desde almacenamiento local para respuesta instantánea
      const stored = await getStoredUser();
      if (stored && isMounted) {
        setProfile((prev) => ({
          ...prev,
          ...stored,
          id: stored.id || prev.id,
          nombre: stored.nombre || prev.nombre,
          apellido: stored.apellido || prev.apellido,
          fotoPerfil: stored.fotoPerfil !== undefined ? stored.fotoPerfil : prev.fotoPerfil,
        }));
      }

      // 2. Consultar al backend por los datos más recientes
      const courierId = paramId || stored?.id;
      if (courierId) {
        try {
          const fresh = await getCourierProfile(courierId);
          if (isMounted) {
            setProfile(fresh);
          }
        } catch {
          // Si falla la red, el perfil cargado localmente mantiene la pantalla funcional
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [paramId]);

  const fullName = [profile.nombre, profile.apellido].filter(Boolean).join(' ') || 'Repartidor';
  const isInactive = profile.status?.trim().toLocaleLowerCase('es') === 'inactivo';
  const statusLabel = isInactive ? 'Inactivo' : 'Disponible';
  const statusBackgroundColor = isInactive ? palette.backgroundElement : palette.successSurface;
  const statusColor = isInactive ? palette.secondary : palette.successText;

  const handleStartEdit = () => {
    setEditForm({
      nombre: profile.nombre || '',
      apellido: profile.apellido || '',
      telefono: profile.telefono || '',
      fotoPerfil: profile.fotoPerfil || '',
    });
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setErrorMsg(null);
  };

  const handleSelectFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrorMsg('Se requieren permisos para acceder a la galería de fotos.');
        setShowImagePickerModal(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const dataUri = asset.base64
          ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
          : asset.uri;

        setEditForm((prev) => ({ ...prev, fotoPerfil: dataUri }));
        setErrorMsg(null);
      }
    } catch {
      setErrorMsg('No se pudo cargar la imagen seleccionada.');
    } finally {
      setShowImagePickerModal(false);
    }
  };

  const handleSelectFromCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setErrorMsg('Se requieren permisos de cámara para tomar fotos.');
        setShowImagePickerModal(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const dataUri = asset.base64
          ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
          : asset.uri;

        setEditForm((prev) => ({ ...prev, fotoPerfil: dataUri }));
        setErrorMsg(null);
      }
    } catch {
      setErrorMsg('No se pudo capturar la foto.');
    } finally {
      setShowImagePickerModal(false);
    }
  };

  const handleRemovePhoto = () => {
    setEditForm((prev) => ({ ...prev, fotoPerfil: '' }));
    setShowImagePickerModal(false);
  };

  const handleSaveEdit = async () => {
    if (!editForm.nombre.trim()) {
      setErrorMsg('El nombre es obligatorio.');
      return;
    }
    if (!editForm.apellido.trim()) {
      setErrorMsg('El apellido es obligatorio.');
      return;
    }
    if (!editForm.telefono.trim()) {
      setErrorMsg('El teléfono es obligatorio.');
      return;
    }

    const courierId = profile.id || paramId;
    if (!courierId) {
      setErrorMsg('No se encontró el identificador del repartidor.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);

      const updated = await updateCourierProfile(courierId, {
        nombre: editForm.nombre.trim(),
        apellido: editForm.apellido.trim(),
        telefono: editForm.telefono.trim(),
        fotoPerfil: editForm.fotoPerfil,
      });

      setProfile(updated);
      setIsEditing(false);
      setSuccessMsg('Perfil actualizado con éxito');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Error al guardar los cambios.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackToPanel = () => {
    router.replace({
      pathname: '/repartidorDashboard',
      params: {
        id: profile.id || paramId || '',
        nombre: profile.nombre || paramNombre || '',
        apellido: profile.apellido || paramApellido || '',
      },
    });
  };

  const handleLogout = async () => {
    setShowLogoutConfirmation(false);
    await clearStoredUser();
    router.replace('/');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.container, { backgroundColor: palette.background }]}>
          {/* Encabezado original con logo */}
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

          <ScrollView
            contentContainerStyle={[styles.optionsContent, { flexGrow: 1 }]}
            keyboardShouldPersistTaps="handled">
            {/* Botón Volver al panel */}
            <Pressable
              style={styles.optionsBackButton}
              onPress={handleBackToPanel}
              accessibilityRole="button"
              accessibilityLabel="Volver al panel">
              <Text style={[styles.optionsBackText, { color: palette.secondary }]}>
                ← Volver al panel
              </Text>
            </Pressable>

            {/* Tarjeta principal de perfil */}
            <View
              style={[
                styles.profileCard,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}>
              {!isEditing ? (
                // ================= MODO VISTA =================
                <>
                  <View
                    style={[
                      styles.profileAvatar,
                      {
                        backgroundColor: palette.backgroundElement,
                        borderColor: isDarkMode ? palette.primary : '#00ffd1',
                      },
                    ]}
                    accessibilityRole="image"
                    accessibilityLabel={`Foto de perfil de ${fullName}`}>
                    {profile.fotoPerfil ? (
                      <Image
                        source={{ uri: profile.fotoPerfil }}
                        style={{ width: '100%', height: '100%', borderRadius: 52 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <>
                        <View style={styles.profileAvatarHead} />
                        <View style={styles.profileAvatarBody} />
                      </>
                    )}
                  </View>

                  <Text style={[styles.profileCaption, { color: palette.heading }]}>
                    PERFIL DEL REPARTIDOR
                  </Text>
                  <Text style={[styles.profileName, { color: palette.text }]}>{fullName}</Text>
                  <Text style={[styles.profileIdentifier, { color: palette.secondary }]}>
                    N.º de repartidor: {profile.legajo || profile.id || paramId || '—'}
                  </Text>

                  {profile.telefono ? (
                    <Text style={[styles.profileIdentifier, { color: palette.secondary, marginTop: 2 }]}>
                      Tel: {profile.telefono}
                    </Text>
                  ) : null}

                  {successMsg ? (
                    <View
                      style={{
                        marginTop: 12,
                        paddingVertical: 6,
                        paddingHorizontal: 14,
                        borderRadius: 8,
                        backgroundColor: palette.successSurface,
                      }}>
                      <Text
                        style={{
                          color: palette.successText,
                          fontSize: 13,
                          fontWeight: '600',
                          textAlign: 'center',
                        }}>
                        {successMsg}
                      </Text>
                    </View>
                  ) : null}

                  {/* Botón Editar perfil agregado dentro de la tarjeta principal */}
                  <Pressable
                    style={({ pressed }) => [
                      {
                        marginTop: 18,
                        paddingVertical: 10,
                        paddingHorizontal: 24,
                        borderRadius: 10,
                        backgroundColor: palette.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      },
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={handleStartEdit}
                    accessibilityRole="button"
                    accessibilityLabel="Editar perfil">
                    <Text style={{ color: palette.onPrimary, fontSize: 15, fontWeight: '700' }}>
                      Editar perfil
                    </Text>
                  </Pressable>
                </>
              ) : (
                // ================= MODO EDICIÓN =================
                <>
                  <Pressable
                    onPress={() => setShowImagePickerModal(true)}
                    style={({ pressed }) => [
                      styles.profileAvatar,
                      {
                        backgroundColor: palette.backgroundElement,
                        borderColor: isDarkMode ? palette.primary : '#00ffd1',
                      },
                      pressed && styles.buttonPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Cambiar foto de perfil">
                    {editForm.fotoPerfil ? (
                      <Image
                        source={{ uri: editForm.fotoPerfil }}
                        style={{ width: '100%', height: '100%', borderRadius: 52 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <>
                        <View style={styles.profileAvatarHead} />
                        <View style={styles.profileAvatarBody} />
                      </>
                    )}
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        paddingVertical: 4,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>
                        📷 Cambiar
                      </Text>
                    </View>
                  </Pressable>

                  {editForm.fotoPerfil ? (
                    <Pressable
                      onPress={handleRemovePhoto}
                      style={{ marginTop: 6, paddingVertical: 2, paddingHorizontal: 8 }}
                      accessibilityRole="button">
                      <Text style={{ color: palette.dangerText, fontSize: 12, fontWeight: '600' }}>
                        Quitar foto
                      </Text>
                    </Pressable>
                  ) : null}

                  <Text style={[styles.profileCaption, { color: palette.heading, marginTop: 10 }]}>
                    EDITAR PERFIL
                  </Text>

                  <View style={{ width: '100%', marginTop: 14 }}>
                    {errorMsg ? (
                      <View
                        style={{
                          padding: 10,
                          borderRadius: 8,
                          backgroundColor: palette.dangerSurface,
                          marginBottom: 12,
                        }}>
                        <Text
                          style={{
                            color: palette.dangerText,
                            fontSize: 13,
                            fontWeight: '600',
                            textAlign: 'center',
                          }}>
                          {errorMsg}
                        </Text>
                      </View>
                    ) : null}

                    {/* Campo Nombre */}
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: palette.secondary,
                        marginBottom: 4,
                      }}>
                      NOMBRE *
                    </Text>
                    <TextInput
                      style={{
                        width: '100%',
                        minHeight: 44,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: palette.border,
                        backgroundColor: palette.background,
                        color: palette.text,
                        fontSize: 15,
                        marginBottom: 12,
                      }}
                      value={editForm.nombre}
                      onChangeText={(text) => setEditForm((prev) => ({ ...prev, nombre: text }))}
                      placeholder="Tu nombre"
                      placeholderTextColor={palette.secondary}
                      autoCapitalize="words"
                    />

                    {/* Campo Apellido */}
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: palette.secondary,
                        marginBottom: 4,
                      }}>
                      APELLIDO *
                    </Text>
                    <TextInput
                      style={{
                        width: '100%',
                        minHeight: 44,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: palette.border,
                        backgroundColor: palette.background,
                        color: palette.text,
                        fontSize: 15,
                        marginBottom: 12,
                      }}
                      value={editForm.apellido}
                      onChangeText={(text) => setEditForm((prev) => ({ ...prev, apellido: text }))}
                      placeholder="Tu apellido"
                      placeholderTextColor={palette.secondary}
                      autoCapitalize="words"
                    />

                    {/* Campo Teléfono */}
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: palette.secondary,
                        marginBottom: 4,
                      }}>
                      TELÉFONO *
                    </Text>
                    <TextInput
                      style={{
                        width: '100%',
                        minHeight: 44,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: palette.border,
                        backgroundColor: palette.background,
                        color: palette.text,
                        fontSize: 15,
                        marginBottom: 12,
                      }}
                      value={editForm.telefono}
                      onChangeText={(text) => setEditForm((prev) => ({ ...prev, telefono: text }))}
                      placeholder="Número de teléfono"
                      placeholderTextColor={palette.secondary}
                      keyboardType="phone-pad"
                    />

                    {/* Campo Correo (Solo Lectura) */}
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: palette.secondary,
                        marginBottom: 4,
                      }}>
                      CORREO ELECTRÓNICO (NO MODIFICABLE)
                    </Text>
                    <TextInput
                      style={{
                        width: '100%',
                        minHeight: 44,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: palette.border,
                        backgroundColor: palette.backgroundElement,
                        color: palette.secondary,
                        fontSize: 15,
                        marginBottom: 12,
                        opacity: 0.8,
                      }}
                      value={profile.email || '—'}
                      editable={false}
                      selectTextOnFocus={false}
                    />

                    {/* Campo N.º de repartidor / Legajo (Solo Lectura) */}
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: palette.secondary,
                        marginBottom: 4,
                      }}>
                      N.º DE REPARTIDOR / LEGAJO (NO MODIFICABLE)
                    </Text>
                    <TextInput
                      style={{
                        width: '100%',
                        minHeight: 44,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: palette.border,
                        backgroundColor: palette.backgroundElement,
                        color: palette.secondary,
                        fontSize: 15,
                        marginBottom: 16,
                        opacity: 0.8,
                      }}
                      value={profile.legajo || profile.id || paramId || '—'}
                      editable={false}
                      selectTextOnFocus={false}
                    />

                    {/* Botones Guardar cambios / Cancelar */}
                    <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                      <Pressable
                        style={({ pressed }) => [
                          {
                            flex: 1,
                            minHeight: 46,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: palette.border,
                            backgroundColor: palette.backgroundElement,
                          },
                          pressed && styles.buttonPressed,
                        ]}
                        onPress={handleCancelEdit}
                        disabled={isSaving}
                        accessibilityRole="button"
                        accessibilityLabel="Cancelar">
                        <Text style={{ color: palette.text, fontSize: 15, fontWeight: '700' }}>
                          Cancelar
                        </Text>
                      </Pressable>

                      <Pressable
                        style={({ pressed }) => [
                          {
                            flex: 1,
                            minHeight: 46,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 10,
                            backgroundColor: palette.primary,
                            opacity: isSaving ? 0.7 : 1,
                          },
                          pressed && styles.buttonPressed,
                        ]}
                        onPress={handleSaveEdit}
                        disabled={isSaving}
                        accessibilityRole="button"
                        accessibilityLabel="Guardar cambios">
                        {isSaving ? (
                          <ActivityIndicator color={palette.onPrimary} size="small" />
                        ) : (
                          <Text
                            style={{ color: palette.onPrimary, fontSize: 15, fontWeight: '700' }}>
                            Guardar cambios
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                </>
              )}
            </View>

            <View style={styles.content}>
              <Text style={[styles.title, { color: palette.text }]}>Estado:</Text>
              <View style={[styles.statusCard, { backgroundColor: statusBackgroundColor }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </View>

            {/* Botón Cerrar sesión (original intacto) */}
            <Pressable
              style={({ pressed }) => [styles.logoutAction, pressed && styles.buttonPressed]}
              onPress={() => setShowLogoutConfirmation(true)}
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión">
              <Text style={styles.menuIcon}>↪</Text>
              <Text style={styles.logoutActionText}>Cerrar sesión</Text>
            </Pressable>
          </ScrollView>

          {/* Modal de selección de origen de imagen */}
          <Modal
            visible={showImagePickerModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowImagePickerModal(false)}>
            <View style={styles.modalBackdrop}>
              <View
                style={[
                  styles.logoutDialog,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}>
                <Text
                  style={{
                    color: palette.text,
                    fontSize: 18,
                    fontWeight: '700',
                    textAlign: 'center',
                  }}>
                  Foto de perfil
                </Text>
                <Text
                  style={{
                    color: palette.secondary,
                    fontSize: 14,
                    textAlign: 'center',
                    marginTop: 8,
                    marginBottom: 16,
                  }}>
                  Elige cómo deseas actualizar tu foto de perfil:
                </Text>
                <View style={{ gap: 10 }}>
                  <Pressable
                    style={({ pressed }) => [
                      {
                        paddingVertical: 12,
                        borderRadius: 10,
                        backgroundColor: palette.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      },
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={handleSelectFromGallery}
                    accessibilityRole="button">
                    <Text style={{ color: palette.onPrimary, fontWeight: '700', fontSize: 15 }}>
                      🖼️ Elegir de la galería
                    </Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      {
                        paddingVertical: 12,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: palette.border,
                        backgroundColor: palette.backgroundElement,
                        alignItems: 'center',
                        justifyContent: 'center',
                      },
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={handleSelectFromCamera}
                    accessibilityRole="button">
                    <Text style={{ color: palette.text, fontWeight: '700', fontSize: 15 }}>
                      📷 Tomar fotografía
                    </Text>
                  </Pressable>

                  {editForm.fotoPerfil ? (
                    <Pressable
                      style={({ pressed }) => [
                        {
                          paddingVertical: 10,
                          borderRadius: 10,
                          backgroundColor: palette.dangerSurface,
                          alignItems: 'center',
                          justifyContent: 'center',
                        },
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={handleRemovePhoto}
                      accessibilityRole="button">
                      <Text style={{ color: palette.dangerText, fontWeight: '700', fontSize: 14 }}>
                        🗑️ Quitar foto actual
                      </Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    style={({ pressed }) => [
                      {
                        paddingVertical: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 4,
                      },
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => setShowImagePickerModal(false)}
                    accessibilityRole="button">
                    <Text style={{ color: palette.secondary, fontWeight: '600', fontSize: 14 }}>
                      Cancelar
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* Modal original de confirmación de cierre de sesión */}
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
                    style={({ pressed }) => [
                      styles.logoutCancelButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => setShowLogoutConfirmation(false)}
                    accessibilityRole="button">
                    <Text style={styles.logoutCancelText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.logoutConfirmButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={handleLogout}
                    accessibilityRole="button">
                    <Text style={styles.logoutConfirmText}>Sí, salir</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
