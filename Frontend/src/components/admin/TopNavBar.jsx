import repartosYaLogo from '../../assets/repartosYA-logo.png';

function TopNavbar({ onToggleSidebar, onLogout }) {
    return (
        <header className="admin-top-navbar">
            <div className="top-navbar-left">
                <div className="brand-logo-container">
                    <img src={repartosYaLogo} alt="RepartosYA" className="navbar-company-logo" />
                </div>
                <button
                    type="button"
                    onClick={onToggleSidebar}
                    className="top-icon-btn menu-toggle-btn"
                    aria-label="Abrir o cerrar menú"
                    aria-controls="admin-sidebar"
                >
                    ☰
                </button>
            </div>

            <div className="top-search-box">
                <span className="search-icon" aria-hidden="true">⌕</span>
                <input type="search" placeholder="Buscar pedidos, repartidores, comercios..." />
                <span className="search-shortcut">CTRL + K</span>
            </div>

            <div className="top-nav-right">
                <div className="ops-status-pill">
                    <span className="green-dot" />
                    <span>Operación Normal - 98.4% puntualidad</span>
                </div>
                <div className="fleet-turn-pill">
                    <span className="clock-icon" aria-hidden="true">◷</span>
                    <div className="fleet-text">
                        <span className="fleet-title">TURNO DE EMPLEADOS</span>
                        <span className="fleet-desc">Turno --:</span>
                    </div>
                    <button type="button" className="btn-modify-turn">Modificar / Crear</button>
                </div>
                <button type="button" className="top-icon-btn notification-btn" aria-label="Notificaciones">
                    🔔
                    <span className="notification-badge" />
                </button>
                <button
                    type="button"
                    onClick={onLogout}
                    className="top-icon-btn logout-top-btn"
                    aria-label="Cerrar sesión"
                    title="Cerrar sesión"
                >
                    ↪
                </button>
            </div>
        </header>
    );
}

export default TopNavbar;
