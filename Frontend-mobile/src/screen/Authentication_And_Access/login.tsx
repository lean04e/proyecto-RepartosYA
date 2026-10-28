import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import database from '../../data/db.json';
import { COLORS, LOGIN_STYLES as styles } from '../../theme/theme';

export default function Login() {
  const [nroRepartidor, setNroRepartidor] = useState('');
  const [contraseña, setContraseña] = useState('');
  // const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);

  // 1. OBTENEMOS EL PRIMER REPARTIDOR DE LA BASE DE DATOS LOCAL
  const primerRepartidor = database.repartidores && database.repartidores.length > 0 
    ? database.repartidores[0] 
    : null;

  const handleLogin = () => {
    const normalizedUsername = nroRepartidor.trim();
    const normalizedPassword = contraseña.trim();

    if (!normalizedUsername || !normalizedPassword) {
      setLoginMessage('No se ingreso nro de repartidor o contraseña');
      setContraseña('');
      return;
    }

    const repartidorEncontrado = database.repartidores.find((rep) => rep.id === normalizedUsername);

    if (!repartidorEncontrado) {
      setLoginMessage(`El Número de Repartidor " ${normalizedUsername} " no corresponde con los empleados registrados en el sistema.`);
      setNroRepartidor('');
      setContraseña('');
      return;
    }

    if (normalizedPassword !== repartidorEncontrado.contra) {
      setLoginMessage('Credenciales invalidas. Por favor verifique sus datos.');
      setContraseña('');
      return;
    }

    {/* try {
      const userData = {
        id: repartidorEncontrado.id,
        nombre: repartidorEncontrado.nombre,
        apellido: repartidorEncontrado.apellido,
        isLoggedIn: false,
      }

      //Se evalua con un if el estado del usuario
      if(userData.isLoggedIn) {
        setErrorMessage('El usuario ya se encuentra con una sesiónactiva en otro dispositivo.');
        return;
      }

      console.log('Login Exitoso. Redirigiendo...');
      router.replace('/repartidorDashboard');
    } catch(error) {
      setErrorMessage('Ocurrió un error al intentar conectar con el servidor.');
    } */}

    router.replace({
      pathname: '/repartidorDashboard',
      params: {
        id: repartidorEncontrado.id,
        nombre: repartidorEncontrado.nombre,
        apellido: repartidorEncontrado.apellido,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Image
              source={require('../../../assets/images/sintax-logo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
              accessibilityLabel="Sintax Studio"
            />
          </View>

          <View style={styles.card}>
            <View style={styles.cardTopRow}>
              <View style={styles.accessBadge}>
                <Text style={styles.accessBadgeIcon}>●</Text>
                <Text style={styles.accessBadgeText}>Acceso restringido</Text>
              </View>
              <View style={styles.partnerLogo}>
                <Image
                  source={require('../../../assets/images/repartosYA-logo.png')}
                  style={styles.partnerLogoImage}
                  resizeMode="contain"
                  accessibilityLabel="RepartosYA"
                />
              </View>
            </View>

            <Text style={styles.title}>Acceso al Sistema</Text>

            <Text style={styles.label}>Nro de Repartidor</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                value={nroRepartidor}
                onChangeText={setNroRepartidor}
                placeholder="Por ej. 0001"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
                autoComplete="username"
                returnKeyType="next"
                accessibilityLabel="Nro de Repartidor"
              />
            </View>

            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>▣</Text>
              <TextInput
                style={styles.input}
                value={contraseña}
                onChangeText={setContraseña}
                placeholder="Ingresa tu contraseña"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showPassword}
                autoComplete="current-password"
                returnKeyType="done"
                accessibilityLabel="Contraseña"
              />
              <Pressable
                onPress={() => setShowPassword((visible) => !visible)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                <Text style={styles.passwordToggle}>{showPassword ? '🕳️' : '👁️'}</Text>
              </Pressable>
            </View>

            <View style={styles.optionsRow}>
              {/*<Pressable
                style={styles.rememberButton}
                onPress={() => setRememberMe((remembered) => !remembered)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: rememberMe }}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Text style={styles.checkboxCheck}>✓</Text>}
                </View>
                <Text style={styles.rememberText}>Recordar</Text>
              </Pressable> */}
              <Pressable accessibilityRole="button">
                <Text style={styles.forgotPassword}>¿Olvidó su contraseña?</Text>
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              accessibilityRole="button"
              onPress={handleLogin}>
              <Text style={styles.buttonText}>Iniciar Sesión</Text>
              <Text style={styles.buttonArrow}>→</Text>
            </Pressable>

            <View style={styles.terminalFooter}>
              <Text style={styles.terminalIcon}>⌘</Text>
              <Text style={styles.terminalText}>Terminal Repartidor</Text>
              <Text style={styles.version}>v1.0.0</Text>
            </View>
          </View>

          <View style={styles.credentialsNotice}>
              <Text style={styles.credentialsText}>Datos de Prueba</Text>
              <Text style={styles.credentialsText}>Nro de Repartidor: {primerRepartidor?.id}</Text>
              <Text style={styles.credentialsText}>Contraseña: {primerRepartidor?.contra}</Text>
            </View>

          <View style={styles.legalFooter}>
            <Text style={styles.legalText}>Términos de Servicio</Text>
            <Text style={styles.legalSeparator}>·</Text>
            <Text style={styles.legalText}>Políticas de Privacidad</Text>
            <Text style={styles.legalSeparator}>·</Text>
            <Text style={styles.legalText}>Soporte</Text>
            <Text style={styles.copyright}>© 2026 RepartosYa Technologies</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        transparent
        visible={loginMessage !== null}
        animationType="fade"
        onRequestClose={() => setLoginMessage(null)}>
        <View style={styles.messageBackdrop}>
          <View style={styles.messageDialog} accessibilityRole="alert">
            <Text style={styles.messageText}>{loginMessage}</Text>
            <Pressable
              style={styles.messageButton}
              onPress={() => setLoginMessage(null)}
              accessibilityRole="button">
              <Text style={styles.messageButtonText}>Aceptar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
