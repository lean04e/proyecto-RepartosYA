// Modo demo: oculta en el admin todo lo que ya existe en la base (pedidos, repartidores,
// comercios y entregas) sin borrarlo. Se filtra en un unico punto, interceptando los GET
// que devuelven listas, asi cada seccion se entera sin cambios propios.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const hiddenIds = new Set();
const originalFetch = window.fetch.bind(window);

const idsOf = (item) => [item?._id, item?.id, item?.ID].filter(Boolean).map(String);

window.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (hiddenIds.size === 0 || method !== 'GET') {
        return response;
    }

    const data = await response.clone().json().catch(() => null);
    if (!Array.isArray(data)) {
        return response;
    }

    const visible = data.filter((item) => !idsOf(item).some((id) => hiddenIds.has(id)));
    return new Response(JSON.stringify(visible), {
        status: response.status,
        statusText: response.statusText,
        headers: { 'Content-Type': 'application/json' },
    });
};

// Anota los ids de todo lo cargado hasta ahora; lo que se cree despues sigue visible
export async function hideLoadedData() {
    const urls = ['/api/pedidos?incluirEntregadosBorrados=true', '/comercios', '/api/repartidores'];
    const lists = await Promise.all(urls.map(async (path) => {
        const response = await originalFetch(`${API_BASE_URL}${path}`);
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    }));
    lists.flat().forEach((item) => idsOf(item).forEach((id) => hiddenIds.add(id)));
}

export function showLoadedData() {
    hiddenIds.clear();
}
