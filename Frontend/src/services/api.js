const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const availableResources = new Set(['pedidos', 'comercios', 'repartidores']);

async function request(path, options = {}) {
    let response;

    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers: {
                ...(options.body ? { 'Content-Type': 'application/json' } : {}),
                ...options.headers,
            },
        });
    } catch {
        throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté iniciado.');
    }

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || `La solicitud falló (${response.status}).`);
    }

    return data;
}

function getResourcePath(resource, id) {
    if (!availableResources.has(resource)) {
        throw new Error(`Recurso de API no reconocido: ${resource}`);
    }

    return `/${resource}${id === undefined ? '' : `/${encodeURIComponent(id)}`}`;
}

export function login(username, password) {
    return request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
}

export function requestPasswordReset(identifier) {
    return request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ identifier }),
    });
}

export function resetPassword(data, optionalNewPassword) {
    let payload;
    if (typeof data === 'object' && data !== null) {
        payload = data;
    } else if (optionalNewPassword !== undefined) {
        if (typeof data === 'string' && (data.includes('@') || data.length < 30)) {
            payload = { username: data, newPassword: optionalNewPassword };
        } else {
            payload = { token: data, newPassword: optionalNewPassword };
        }
    } else {
        payload = { newPassword: data };
    }

    return request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function verifyResetToken(token) {
    return request(`/auth/verify-reset-token/${encodeURIComponent(token)}`);
}

// El backend expone los pedidos en /api/pedidos (a diferencia de comercios y repartidores).
export function getPedidos() {
    return request('/api/pedidos');
}

export function getAll(resource) {
    return request(getResourcePath(resource));
}

export function create(resource, record) {
    return request(getResourcePath(resource), {
        method: 'POST',
        body: JSON.stringify(record),
    });
}

export function update(resource, id, record) {
    return request(getResourcePath(resource, id), {
        method: 'PUT',
        body: JSON.stringify(record),
    });
}

export function remove(resource, id) {
    return request(getResourcePath(resource, id), { method: 'DELETE' });
}
