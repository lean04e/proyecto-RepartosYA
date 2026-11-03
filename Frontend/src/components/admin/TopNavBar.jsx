import { useEffect, useState } from 'react';
import repartosYaLogo from '../../assets/repartosYA-logo.png';
import repartosYALogoOsc from '../../assets/repartosYA-version-Osc.png';

const CLOCK_REFRESH_INTERVAL = 15_000;

// Ejemplo: "Lunes 25/7 15:30"
function formatHeaderDate(date) {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).formatToParts(date).map((part) => [part.type, part.value]),
    );
    const weekday = parts.weekday.charAt(0).toUpperCase() + parts.weekday.slice(1);
    return `${weekday} ${parts.day}/${parts.month} ${parts.hour}:${parts.minute}`;
}

function HeaderRotator({ isDarkMode }) {
    const [now, setNow] = useState(() => formatHeaderDate(new Date()));

    useEffect(() => {
        const interval = window.setInterval(() => setNow(formatHeaderDate(new Date())), CLOCK_REFRESH_INTERVAL);
        return () => window.clearInterval(interval);
    }, []);

    return (
        <div className="top-rotator">
            <span className="rotator-sr-only">RepartosYA, {now}</span>
            <img
                src={isDarkMode ? repartosYALogoOsc : repartosYaLogo}
                alt=""
                aria-hidden="true"
                className="rotator-item navbar-company-logo"
            />
            <span className="rotator-item rotator-date" aria-hidden="true">{now}</span>
        </div>
    );
}

function TopNavbar({ onToggleSidebar, onLogout, isDarkMode, onToggleTheme }) {
    return (
        <header className="admin-top-navbar">
            <div className="top-navbar-left">
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

            <HeaderRotator isDarkMode={isDarkMode} />

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
