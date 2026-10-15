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
        throw new Error('No se pudo conectar con el servidor de prueba. Ejecuta npm run mock-api en la carpeta Frontend.');
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
