type CourierLoginResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    surname: string;
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
    throw new Error('El backend devolvió un legajo de demostración inválido.');
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

  // 1. Validamos la estructura general
  if (
    !isRecord(responseData)
    || typeof responseData.token !== 'string'
    || !isRecord(responseData.user)
    || typeof responseData.user.name !== 'string'
    || typeof responseData.user.surname !== 'string'
    || responseData.user.role !== 'repartidor'
  ) {
    throw new Error('El backend devolvió datos de sesión incompletos o inválidos.');
  }

  // 2. Extraemos los valores forzando el tipo string seguro para TypeScript
  const userObj = responseData.user;
  const userId = String(userObj._id || userObj.id || '');

  if (!userId) {
    throw new Error('El backend no devolvió un ID válido para el usuario.');
  }

  return {
    token: responseData.token,
    user: {
      id: userId,
      name: String(userObj.name),
      surname: String(userObj.surname),
      role: 'repartidor',
    },
  };
}