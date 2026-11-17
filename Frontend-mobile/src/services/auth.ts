import AsyncStorage from '@react-native-async-storage/async-storage';

export type CourierUserProfile = {
  id: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  email?: string;
  legajo?: string;
  fotoPerfil?: string;
};

export const USER_STORAGE_KEY = '@repartosya_courier_user';

export async function saveStoredUser(user: CourierUserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error al guardar usuario en AsyncStorage:', error);
  }
}

export async function getStoredUser(): Promise<CourierUserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error al leer usuario de AsyncStorage:', error);
    return null;
  }
}

export async function clearStoredUser(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  } catch (error) {
    console.error('Error al borrar usuario de AsyncStorage:', error);
  }
}

type CourierLoginResponse = {
  token: string;
  user: {
    id: string;
    email?: string;
    name: string;
    surname: string;
    telefono?: string;
    fotoPerfil?: string;
    legajo?: string;
    role: 'repartidor';
  };
};

export type MobileDemoCourier = {
  id: string;
} | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getApiUrl() {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');
  if (!apiUrl) {
    throw new Error('Falta configurar EXPO_PUBLIC_API_URL para conectar con el backend.');
  }
  return apiUrl;
}

export async function getMobileDemoCourier(): Promise<MobileDemoCourier> {
  const apiUrl = getApiUrl();
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/auth/mobile/demo-user`);
  } catch {
    throw new Error(`No se pudo conectar con el backend en ${apiUrl}. Verifica que esté iniciado y accesible desde este dispositivo.`);
  }

  let responseData: unknown;
  try {
    responseData = await response.json();
  } catch {
    throw new Error('El backend devolvió una respuesta inválida al buscar el repartidor de demostración.');
  }

  if (!response.ok) {
    const message = isRecord(responseData) && typeof responseData.message === 'string'
      ? responseData.message
      : `No se pudo buscar el repartidor de demostración (HTTP ${response.status}).`;
    throw new Error(message);
  }

  if (!isRecord(responseData) || !('user' in responseData)) {
    throw new Error('El backend devolvió datos de demostración incompletos o inválidos.');
  }

  if (responseData.user === null) {
    return null;
  }

  if (!isRecord(responseData.user) || typeof responseData.user.id !== 'string') {
    throw new Error('El backend devolvió un usuario de demostración inválido.');
  }

  return { id: responseData.user.id };
}

export async function loginCourier(username: string, password: string): Promise<CourierLoginResponse> {
  const apiUrl = getApiUrl();

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/auth/mobile/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new Error(`No se pudo conectar con el backend en ${apiUrl}. Verifica que esté iniciado y accesible desde este dispositivo.`);
  }

  let responseData: unknown;
  try {
    responseData = await response.json();
  } catch {
    throw new Error('El backend devolvió una respuesta inválida.');
  }

  if (!response.ok) {
    if (response.status === 404 && isRecord(responseData) && typeof responseData.message === 'string') {
      throw new Error(responseData.message);
    }

    if (response.status === 401) {
      throw new Error('Credenciales Invalidas. Por favor, verifique sus credenciales.');
    }

    const message = isRecord(responseData) && typeof responseData.message === 'string'
      ? responseData.message
      : `No se pudo iniciar sesión (HTTP ${response.status}).`;
    throw new Error(message);
  }

  if (
    !isRecord(responseData)
    || typeof responseData.token !== 'string'
    || !isRecord(responseData.user)
    || typeof responseData.user.id !== 'string'
    || typeof responseData.user.name !== 'string'
    || typeof responseData.user.surname !== 'string'
    || responseData.user.role !== 'repartidor'
  ) {
    throw new Error('El backend devolvió una sesión de repartidor incompleta o inválida.');
  }

  const sessionUser = {
    id: responseData.user.id,
    email: typeof responseData.user.email === 'string' ? responseData.user.email : undefined,
    name: responseData.user.name,
    surname: responseData.user.surname,
    telefono: typeof responseData.user.telefono === 'string' ? responseData.user.telefono : undefined,
    fotoPerfil: typeof responseData.user.fotoPerfil === 'string' ? responseData.user.fotoPerfil : undefined,
    legajo: typeof responseData.user.legajo === 'string' ? responseData.user.legajo : undefined,
    role: 'repartidor' as const,
  };

  await saveStoredUser({
    id: sessionUser.id,
    nombre: sessionUser.name,
    apellido: sessionUser.surname,
    email: sessionUser.email,
    telefono: sessionUser.telefono,
    fotoPerfil: sessionUser.fotoPerfil,
    legajo: sessionUser.legajo,
  });

  return {
    token: responseData.token,
    user: sessionUser,
  };
}

export async function getCourierProfile(courierId: string): Promise<CourierUserProfile> {
  const apiUrl = getApiUrl();
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/repartidores/${courierId}/perfil`);
  } catch {
    throw new Error(`No se pudo conectar con el backend en ${apiUrl}.`);
  }

  if (!response.ok) {
    throw new Error('No se pudo obtener el perfil del repartidor.');
  }

  const data = await response.json();
  const profile: CourierUserProfile = {
    id: data._id || data.ID || courierId,
    nombre: data.nombre || '',
    apellido: data.apellido || '',
    telefono: data.telefono || '',
    email: data.email || '',
    legajo: data.legajo || data.ID || '',
    fotoPerfil: data.fotoPerfil || '',
  };

  await saveStoredUser(profile);
  return profile;
}

export async function updateCourierProfile(
  courierId: string,
  data: { nombre: string; apellido: string; telefono: string; fotoPerfil?: string }
): Promise<CourierUserProfile> {
  const apiUrl = getApiUrl();
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/repartidores/${courierId}/perfil`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    throw new Error(`No se pudo conectar con el backend en ${apiUrl}.`);
  }

  const responseData = await response.json().catch(() => null);

  if (!response.ok) {
    const message = responseData?.error || responseData?.message || 'Error al actualizar el perfil.';
    throw new Error(message);
  }

  const updated = responseData?.repartidor || responseData;
  const userProfile: CourierUserProfile = {
    id: updated._id || updated.ID || courierId,
    nombre: updated.nombre || data.nombre,
    apellido: updated.apellido || data.apellido,
    telefono: updated.telefono || data.telefono,
    email: updated.email || '',
    legajo: updated.legajo || updated.ID || '',
    fotoPerfil: updated.fotoPerfil ?? data.fotoPerfil ?? '',
  };

  await saveStoredUser(userProfile);
  return userProfile;
}
