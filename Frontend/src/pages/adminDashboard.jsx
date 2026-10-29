import { useCallback, useEffect, useState } from 'react';
import avatar from '../assets/jefeP.jpeg';
import TopNavbar from '../components/admin/TopNavBar';
import CommercesSection from '../components/CommercesSection';
import OrdersSection, { PackageIcon } from '../components/OrdersSection';
import RepartidoresSection from '../components/RepartidoresSection';
import RouteSheetSection from '../components/RouteSheetSection';
import { initialDriversData } from '../data/mockDrivers';
import { initialOrdersData } from '../data/mockOrders';
import { getAll, getPedidos } from '../services/api';
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

// Los pedidos viejos no tienen createdAt: la fecha de creacion esta en los primeros 4 bytes del _id de Mongo
function getCreationDate(order) {
    if (order.createdAt) {
        return new Date(order.createdAt);
    }
    if (order._id) {
        return new Date(parseInt(String(order._id).substring(0, 8), 16) * 1000);
    }
    return null;
}

function getOrderDateKey(order, viewId) {
    let date;

    if (viewId === 'delivered') {
        const deliveredEntry = [...(order.historialEstados ?? [])]
            .reverse()
            .find((change) => change.estadoNuevo === 'ENTREGADO');
        date = deliveredEntry?.fecha ? new Date(deliveredEntry.fecha) : null;
    } else {
        date = getCreationDate(order);
    }

    return date && !Number.isNaN(date.getTime()) ? getLocalDateKey(date) : null;
}

function matchesOrderView(order, viewId) {
    switch (viewId) {
        case 'pending':
            return order.estado === 'REGISTRADO' || order.estado === 'ASIGNADO';
        case 'in-progress':
            return order.estado === 'EN_CAMINO';
        case 'delivered':
            return order.estado === 'ENTREGADO';
        default:
            return true;
    }
}

function getOrderLabel(order, index) {
    const identifier = String(order.ID ?? order.id ?? '').split('-')[0];
    return identifier ? `Pedido ${identifier}` : `Pedido ${index + 1}`;
}



const metricTitles = [
    { id: 'pending', title: 'Total Pendientes' },
    { id: 'in-progress', title: 'En Tránsito Activo' },
    { id: 'delivered', title: 'Entregados Hoy' },
    { id: 'effectiveness', title: 'Tasa de Efectividad' },
];

const orderSections = [
    { id: 'pending', title: 'Pendiente', color: 'pending' },
    { id: 'in-progress', title: 'En Curso', color: 'in-progress' },
    { id: 'delivered', title: 'Entregado', color: 'delivered' },
];

function AdminDashboard({ onLogout, isDarkMode, onToggleTheme }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeSection, setActiveSection] = useState('orders');
    const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
    const [today, setToday] = useState(formatToday);
    const [orders, setOrders] = useState(null);
    const [ordersError, setOrdersError] = useState('');
    const [activeOrderView, setActiveOrderView] = useState(null);
    const [requestedOrderId, setRequestedOrderId] = useState(null);
    const [addOrderRequest, setAddOrderRequest] = useState(0);
    const [ordersVersion, setOrdersVersion] = useState(0);
    const [commerces, setCommerces] = useState([]);
    const [openAddCommerce, setOpenAddCommerce] = useState(false);
    const [drivers, setDrivers] = useState(initialDriversData);
    const [routeAssignments, setRouteAssignments] = useState({});

    const sections = [
        { id: 'orders', icon: '📋', label: 'Gestión de Pedidos', href: '#pedidos' },
        { icon: '📊', label: 'Reportes', href: '#dashboard' },
        { id: 'commerces', icon: '🏪', label: 'Comercios', href: '#comercios' },
        {
            id: 'drivers',
            icon: '🚚',
            label: 'Repartidores',
            href: '#repartidores',
        },
        { id: 'routes', icon: '🗺️', label: 'Hoja de Ruta', href: '#hoja-de-ruta' },
        { icon: '⚙️', label: 'Configuración', href: '#configuracion' },
    ];

    // EFFECT PARA REPARTIDORES
    useEffect(() => {
        getAll('repartidores')
            .then((data) => {
                if (Array.isArray(data) && data.length > 0) {
                    const repartidoresAdaptados = data.map((repartidor) => ({
                        id: repartidor._id || repartidor.id,
                        name: `${repartidor.nombre || ''} ${repartidor.apellido || ''}`.trim() || repartidor.name,
                        firstName: repartidor.nombre || repartidor.firstName || '',
                        lastName: repartidor.apellido || repartidor.lastName || '',
                        email: repartidor.email || '',
                        phone: repartidor.telefono || repartidor.phone || '',
                        vehicle: repartidor.vehiculo || repartidor.vehicle || 'Moto',
                        status: repartidor.estado || repartidor.status || 'Activo',
                        destination: repartidor.dondeSeDirige || repartidor.destination || 'En base / Central',
                        pendingOrders: Number(repartidor.pedidosPendientes ?? repartidor.pendingOrders ?? 0),
                        deliveredOrders: Number(repartidor.cantPedidos ?? repartidor.orders ?? 0),
                        orders: Number(repartidor.cantPedidos ?? repartidor.orders ?? 0),
                        historicalOrders: (Number(repartidor.cantPedidos ?? repartidor.orders ?? 0)) * 4,
                        recentOrders: repartidor.recentOrders || []
                    }));
                    setDrivers(repartidoresAdaptados);
                }
            })
            .catch((err) => console.error('Error al cargar repartidores:', err));
    }, []);


    // EFFECT PARA COMERCIOS (Con traducción de datos backend -> frontend)
    useEffect(() => {
        getAll('comercios')
            .then((data) => {
                if (Array.isArray(data)) {
                    const comerciosAdaptados = data.map((comercio) => ({
                        id: comercio._id,
                        name: comercio.nombre,
                        rubro: comercio.rubro || '',
                        orders: comercio.cantPedidos,
                        phone: comercio.telefono,
                        address: comercio.direccion,
                        historicalOrders: (comercio.cantPedidos || 0) * 5,
                        recentOrders: []
                    }));
                    setCommerces(comerciosAdaptados);
                }
            })
            .catch((err) => console.error('Error al cargar los comercios:', err));
    }, []);

    useEffect(() => {
        const dateRefreshInterval = window.setInterval(() => {
            setToday(formatToday());
        }, 60_000);

        return () => window.clearInterval(dateRefreshInterval);
    }, []);

    const refreshOrders = useCallback(() => setOrdersVersion((version) => version + 1), []);

    // Carga al montar, al volver a la seccion de pedidos, ante cambios (ordersVersion) y cada ORDER_REFRESH_INTERVAL
    useEffect(() => {
        if (activeSection !== 'orders') {
            return undefined;
        }

        let isMounted = true;

        const loadOrders = async () => {
            try {
                const latestOrders = await getPedidos();
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

        loadOrders();
        const ordersRefreshInterval = window.setInterval(loadOrders, ORDER_REFRESH_INTERVAL);

        return () => {
            isMounted = false;
            window.clearInterval(ordersRefreshInterval);
        };
    }, [activeSection, ordersVersion]);

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

    const openOrderDetail = (order) => {
        setActiveOrderView(null);
        setRequestedOrderId(order.ID ?? order.id);
    };
    const getOrderItemProps = (order) => ({
        className: 'order-item-clickable',
        role: 'button',
        tabIndex: 0,
        onClick: () => openOrderDetail(order),
        onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openOrderDetail(order);
            }
        },
    });

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
    const effectiveBase = todayOrders.filter((order) => order.estado !== 'CANCELADO');
    const effectiveness = effectiveBase.length
        ? Math.round((deliveredTodayCount / effectiveBase.length) * 100)
        : 0;
    const ordersBySection = Object.fromEntries(orderSections.map((section) => [
        section.id,
        (orders ?? []).filter((order) => matchesOrderView(order, section.id)),
    ]));

    return (
        <div className="admin-layout-container" data-theme={isDarkMode ? 'dark' : 'light'}>
            <TopNavbar
                onToggleSidebar={() => setIsSidebarOpen((isOpen) => !isOpen)}
                onLogout={() => setIsLogoutDialogOpen(true)}
                isDarkMode={isDarkMode}
                onToggleTheme={onToggleTheme}
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
                                    className={`sidebar-menu-item${section.id === activeSection ? ' active' : ''}`}
                                    aria-current={section.id === activeSection ? 'page' : undefined}
                                    onClick={section.id ? (event) => {
                                        event.preventDefault();
                                        setActiveSection(section.id);
                                        setOpenAddCommerce(false);
                                        setActiveOrderView(null);
                                    } : undefined}
                                >
                                    <span className="sidebar-item-icon" aria-hidden="true">{section.icon}</span>
                                    <span className="sidebar-item-label">{section.label}</span>
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
                {activeSection === 'commerces' ? (
                    <CommercesSection commerces={commerces} onCommercesChange={setCommerces} openAddOnMount={openAddCommerce} />
                ) : activeSection === 'drivers' ? (
                    <RepartidoresSection drivers={drivers} onDriversChange={setDrivers} />
                ) : activeSection === 'routes' ? (
                    <RouteSheetSection
                        drivers={drivers}
                        assignments={routeAssignments}
                        onAssignmentsChange={setRouteAssignments}
                    />
                ) : (
                    <>
                        <div className="admin-header-title-row">
                            <div>
                                <p className="eyebrow"><span className="green-dot" /> DESPACHO CENTRAL · TIEMPO REAL</p>
                                <h1 className="main-title">Gestión de Pedidos en Vivo</h1>
                                <p className="subtitle-date">Hoy, {today} <span>•</span> {todayOrders.length} {todayOrders.length === 1 ? 'pedido' : 'pedidos'} en el turno</p>
                            </div>

                            <button type="button" className="new-order-button" onClick={() => setAddOrderRequest((count) => count + 1)}>
                                <PackageIcon />
                                <span className="btn-text">Nuevo Pedido</span>
                            </button>
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
                                                <li key={order.ID ?? `${section.id}-${index}`} {...getOrderItemProps(order)}>
                                                    <span>{getOrderLabel(order, index)}</span>
                                                    {order.estado && (
                                                        <span className="kanban-order-status">
                                                            {order.estado}
                                                        </span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </article>
                            ))}
                        </section>

                        <OrdersSection
                            orders={initialOrdersData}
                            openOrderId={requestedOrderId}
                            addOrderRequest={addOrderRequest}
                            onOrdersChanged={refreshOrders}
                            onOrderOpened={() => setRequestedOrderId(null)}
                            onGoToCommerces={() => {
                                setOpenAddCommerce(true);
                                setActiveSection('commerces');
                                setActiveOrderView(null);
                            }}
                        />
                    </>
                )}
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
                                        <li key={order.ID ?? `${activeOrderView.id}-${index}`} {...getOrderItemProps(order)}>
                                            <span>{getOrderLabel(order, index)}</span>
                                            {order.estado && (
                                                <span className="order-dialog-status">{order.estado}</span>
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