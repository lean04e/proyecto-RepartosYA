import { useEffect, useState } from 'react';
import repartosYaLogo from '../../assets/repartosYA-logo.png';
import repartosYALogoOsc from '../../assets/repartosYA-version-Osc.png';

function TopNavbar({ onToggleSidebar, onLogout, isDarkMode, onToggleTheme }) {
    // 1. Estado y lógica del reloj
    const [fechaHora, setFechaHora] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setFechaHora(new Date());
        }, 1000); // Se actualiza cada 1 segundo

        return () => clearInterval(timer); // Limpiamos el intervalo al salir
    }, []);

    // 2. Formateo de fecha y hora
    const fechaFormateada = fechaHora.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const horaFormateada = fechaHora.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit' // Opcional: podés borrar esta línea si no querés los segundos
    });

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

            {/* 3. Reemplazamos el input de búsqueda por el reloj manteniendo la clase del contenedor */}
            <div className="top-search-box" style={{ display: 'flex', justifyContent: 'center', gap: '10px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                <span>{fechaFormateada}</span>
                <span style={{ margin: '0 4px', opacity: 0.5 }}>|</span>
                <span>{horaFormateada}</span>
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