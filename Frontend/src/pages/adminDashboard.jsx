import { useEffect, useState } from 'react';
import TopNavbar from '../components/admin/TopNavBar';
import avatar from '../assets/jefeP.jpeg';
import { getAll } from '../services/api';
import '../styles/admin.css';

const ORDER_REFRESH_INTERVAL = 60_000;

function formatToday() {
    return new Intl.DateTimeFormat('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date());
}

function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getOrderDateKey(order, viewId) {
    const dateFields = viewId === 'delivered'
        ? ['fechaEntrega', 'fecha_entrega', 'deliveredAt', 'delivered_at', 'completedAt', 'completed_at']
        : [];
    const dateValue = [
        ...dateFields,
        'fecha',
        'date',
        'createdAt',
        'created_at',
        'fechaPedido',
        'fecha_pedido',
    ].map((field) => order[field]).find(Boolean);

    if (!dateValue) {
        return null;
    }

    const dateText = String(dateValue);
    const dateOnlyMatch = dateText.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnlyMatch) {
        return `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`;
    }

    const parsedDate = new Date(dateValue);
    return Number.isNaN(parsedDate.getTime()) ? null : getLocalDateKey(parsedDate);
}

function getOrderStatus(order) {
    return String(order.estado ?? order.status ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function matchesOrderView(order, viewId) {
    const status = getOrderStatus(order);

    switch (viewId) {
        case 'pending':
            return status.includes('pendiente') || status.includes('pending');
        case 'in-progress':
            return status.includes('curso')
                || status.includes('transito')
                || status.includes('progress')
                || status.includes('active');
        case 'delivered':
            return status.includes('entregado')
                || status.includes('delivered')
                || status.includes('completado');
        default:
            return true;
    }
}

function getOrderLabel(order, index) {
    const identifier = order.id ?? order.numero ?? order.codigo;
    return identifier ? `Pedido ${identifier}` : `Pedido ${index + 1}`;
}

const sections = [
    { icon: '▣', label: 'Gestión de Pedidos', href: '#pedidos', active: true, badge: '0' },
    { icon: '▥', label: 'Reportes', href: '#dashboard',  badge: '0'},
    { icon: '▤', label: 'Comercios', href: '#comercios' },
    { icon: '🚚', label: 'Repartidores', href: '#repartidores', status: 'Activos' },
    { icon: '⚙', label: 'Configuración', href: '#configuracion' },
];

const metricTitles = [
    { id: 'pending', title: 'Total Pendientes' },
    { id: 'in-progress', title: 'En Tránsito Activo' },
    { id: 'delivered', title: 'Entregados Hoy' },
    { id: 'effectiveness', title: 'Tasa de Efectividad' },
];

const orderSections = [
    { id: 'pending', title: 'Pendiente', note: 'Por despachar', color: 'pending' },
    { id: 'in-progress', title: 'En Curso', note: 'Monitoreo GPS', color: 'in-progress' },
    { id: 'delivered', title: 'Entregado', note: 'Comprobante OK', color: 'delivered' },
];

function AdminDashboard({ onLogout }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
    const [today, setToday] = useState(formatToday);
    const [orders, setOrders] = useState(null);
    const [ordersError, setOrdersError] = useState('');
    const [activeOrderView, setActiveOrderView] = useState(null);
    const [pedidos, setPedidos] = useState([]);

    useEffect(() => {
        fetch('http:localhost:3001/pedidos')
            .then((res) => res.json())
            .then((data) => {
                setPedidos(data);
            })
            .catch((err) => console.error('Error al cargar los pedidos:', err))
    }, []);

    useEffect(() => {
        const dateRefreshInterval = window.setInterval(() => {
            setToday(formatToday());
        }, 60_000);

        return () => window.clearInterval(dateRefreshInterval);
    }, []);

    useEffect(() => {
        let isMounted = true;

        const refreshOrders = async () => {
            try {
                const latestOrders = await getAll('pedidos');
                if (!Array.isArray(latestOrders)) {
                    throw new Error('La respuesta de pedidos no tiene un formato válido.');
                }
                if (isMounted) {
                    setOrders(latestOrders);
                    setOrdersError('');
                }
            } catch (error) {
                if (isMounted) {
                    setOrdersError(error.message);
                }
            }
        };

        refreshOrders();
        const ordersRefreshInterval = window.setInterval(refreshOrders, ORDER_REFRESH_INTERVAL);

        return () => {
            isMounted = false;
            window.clearInterval(ordersRefreshInterval);
        };
    }, []);

    useEffect(() => {
        if (!activeOrderView) {
            return undefined;
        }

        const closeOnEscape = (event) => {
            if (event.key === 'Escape') {
                setActiveOrderView(null);
            }
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [activeOrderView]);

    const todayDateKey = getLocalDateKey();
    const todayOrders = (orders ?? []).filter((order) => (
        getOrderDateKey(order) === todayDateKey
    ));
    const selectedTodayOrders = activeOrderView?.id === 'delivered'
        ? (orders ?? []).filter((order) => getOrderDateKey(order, 'delivered') === todayDateKey)
        : todayOrders;
    const displayedOrders = activeOrderView?.id === 'effectiveness'
        ? selectedTodayOrders
        : selectedTodayOrders.filter((order) => matchesOrderView(order, activeOrderView?.id));
    const deliveredTodayOrders = (orders ?? []).filter((order) => (
        getOrderDateKey(order, 'delivered') === todayDateKey
            && matchesOrderView(order, 'delivered')
    ));
    const deliveredTodayCount = todayOrders.filter((order) => matchesOrderView(order, 'delivered')).length;
    const effectiveness = todayOrders.length
        ? Math.round((deliveredTodayCount / todayOrders.length) * 100)
        : 0;
    const ordersBySection = Object.fromEntries(orderSections.map((section) => [
        section.id,
        (orders ?? []).filter((order) => matchesOrderView(order, section.id)),
    ]));

    return (
        <div className="admin-layout-container">
            <TopNavbar
                onToggleSidebar={() => setIsSidebarOpen((isOpen) => !isOpen)}
                onLogout={() => setIsLogoutDialogOpen(true)}
            />

            {isSidebarOpen && (
                <aside className="admin-sidebar" id="admin-sidebar">
                    <div>
                        <span className="sidebar-section-title">OPERACIONES</span>
                        <nav className="sidebar-menu" aria-label="Menú principal">
                            {sections.map((section) => (
                                <a
                                    key={section.label}
                                    href={section.href}
                                    className={`sidebar-menu-item${section.active ? ' active' : ''}`}
                                    aria-current={section.active ? 'page' : undefined}
                                >
                                    <span className="sidebar-item-icon" aria-hidden="true">{section.icon}</span>
                                    <span className="sidebar-item-label">{section.label}</span>
                                    {section.badge && <span className="badge-counter">{section.badge}</span>}
                                    {section.status && <span className="badge-status-active">{section.status}</span>}
                                </a>
                            ))}
                        </nav>
                    </div>

                    <a
                        className="sidebar-user-card profile-link"
                        href="/perfil"
                        aria-label="Ir al perfil de Administrador"
                    >
                        <div className="user-info">
                            <img src={avatar} alt="Administrador" className="user-avatar" />
                            <div className="user-details">
                                <p className="user-name">Martin</p>
                                <p className="user-role">Jefe de Operaciones</p>
                            </div>
                        </div>
                    </a>
                </aside>
            )}

            <main className={`admin-content-area${isSidebarOpen ? ' sidebar-is-open' : ''}`}>
                <div className="admin-header-title-row">
                    <div>
                        <p className="eyebrow"><span className="green-dot" /> DESPACHO CENTRAL · TIEMPO REAL</p>
                        <h1 className="main-title">Gestión de Pedidos en Vivo</h1>
                        <p className="subtitle-date">Hoy, {today} <span>•</span> {pedidos.length} {pedidos.length === 1 ? 'registro de pedido' : 'registros de pedidos'} en el turno</p>
                    </div>
                    <button type="button" className="new-order-button">＋ Nuevo Pedido</button>
                </div>

                <section className="metrics-grid" aria-label="Indicadores">
                    {metricTitles.map((metric) => (
                        <button
                            className="metric-card metric-card-button"
                            key={metric.id}
                            type="button"
                            aria-haspopup="dialog"
                            onClick={() => setActiveOrderView(metric)}
                        >
                            <h2 className="metric-title">{metric.title}</h2>
                            {metric.id === 'effectiveness' && orders !== null && (
                                <span className="metric-value">{effectiveness}%</span>
                            )}
                            {metric.id !== 'effectiveness' && orders !== null && (
                                <span className="metric-value">
                                    {(metric.id === 'delivered' ? deliveredTodayOrders : todayOrders
                                        .filter((order) => matchesOrderView(order, metric.id))).length}
                                </span>
                            )}
                        </button>
                    ))}
                </section>

                <section className="kanban-columns-grid" aria-label="Estado de pedidos">
                    {orderSections.map((section) => (
                        <article
                            className="kanban-column"
                            key={section.id}
                        >
                            <div className="kanban-column-header">
                                <h2><span className={`status-dot ${section.color}`} />{section.title}</h2>
                                <span>{section.note}</span>
                            </div>
                            {ordersError ? (
                                <p className="kanban-state-message kanban-state-error" role="alert">
                                    {ordersError}
                                </p>
                            ) : orders === null ? (
                                <p className="kanban-state-message" role="status">Cargando pedidos...</p>
                            ) : ordersBySection[section.id].length === 0 ? (
                                <p className="kanban-state-message" role="status">
                                    {orders.length === 0
                                        ? 'No hay pedidos cargados en la base de datos.'
                                        : 'No hay pedidos cargados en este estado.'}
                                </p>
                            ) : (
                                <ul className="kanban-order-list">
                                    {ordersBySection[section.id].map((order, index) => (
                                        <li key={order.id ?? `${section.id}-${index}`}>
                                            <span>{getOrderLabel(order, index)}</span>
                                            {(order.estado ?? order.status) && (
                                                <span className="kanban-order-status">
                                                    {order.estado ?? order.status}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </article>
                    ))}
                </section>
            </main>
            {activeOrderView && (
                <div
                    className="order-dialog-backdrop"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            setActiveOrderView(null);
                        }
                    }}
                >
                    <section
                        className="order-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="order-dialog-title"
                    >
                        <div className="order-dialog-header">
                            <h2 id="order-dialog-title">{activeOrderView.title}</h2>
                            <button
                                className="order-dialog-close"
                                type="button"
                                aria-label="Cerrar"
                                onClick={() => setActiveOrderView(null)}
                            >
                                ×
                            </button>
                        </div>
                        {ordersError ? (
                            <p className="order-dialog-error" role="alert">{ordersError}</p>
                        ) : orders === null ? (
                            <p className="order-dialog-loading" role="status">Cargando pedidos...</p>
                        ) : selectedTodayOrders.length === 0 ? (
                            <p className="order-dialog-empty">No hay pedidos cargados el dia de hoy.</p>
                        ) : displayedOrders.length === 0 ? (
                            <p className="order-dialog-empty">No hay pedidos cargados el dia de hoy.</p>
                        ) : (
                            <>
                                {activeOrderView.id === 'effectiveness' && (
                                    <p className="order-dialog-summary">
                                        Efectividad de entregas de hoy: <strong>{effectiveness}%</strong>
                                    </p>
                                )}
                                <ul className="order-dialog-list">
                                    {displayedOrders.map((order, index) => (
                                        <li key={order.id ?? `${activeOrderView.id}-${index}`}>
                                            <span>{getOrderLabel(order, index)}</span>
                                            {(order.estado ?? order.status) && (
                                                <span className="order-dialog-status">{order.estado ?? order.status}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </section>
                </div>
            )}
            {isLogoutDialogOpen && (
                <div className="logout-dialog-backdrop">
                    <section
                        className="logout-dialog"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="logout-dialog-title"
                        aria-describedby="logout-dialog-message"
                    >
                        <h2 id="logout-dialog-title">Confirmar cierre de sesión</h2>
                        <p id="logout-dialog-message">¿Estás seguro que desea cerrar sesión?</p>
                        <div className="logout-dialog-actions">
                            <button
                                type="button"
                                className="logout-cancel-btn"
                                onClick={() => setIsLogoutDialogOpen(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                className="logout-confirm-btn"
                                onClick={onLogout}
                            >
                                Cerrar sesión
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;
