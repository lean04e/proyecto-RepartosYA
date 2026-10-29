import repartosYaLogo from '../../assets/repartosYA-logo.png';
import repartosYALogoOsc from '../../assets/repartosYA-version-Osc.png';

function TopNavbar({ onToggleSidebar, onLogout, isDarkMode, onToggleTheme }) {
    return (
        <header className="admin-top-navbar">
            <div className="top-navbar-left">
                <div className="brand-logo-container">
                    <img src={isDarkMode ? repartosYALogoOsc : repartosYaLogo} 
                    alt="RepartosYA" 
                    className="navbar-company-logo" />
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
                <button
                    type="button"
                    onClick={onToggleTheme}
                    className="top-icon-btn theme-toggle-btn"
                    aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
                    aria-pressed={isDarkMode}
                    title={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
                >
                    {isDarkMode ? '☀' : '☾'}
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
