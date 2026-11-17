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

function EyeIcon({ crossed }) {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
            {crossed && <path d="M3 3l18 18" />}
        </svg>
    );
}

function TopNavbar({ onToggleSidebar, onLogout, isDarkMode, onToggleTheme, isDataHidden, onToggleData }) {
    const dataLabel = isDataHidden ? 'Mostrar los datos cargados' : 'Ocultar los datos cargados';
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
                    onClick={onToggleData}
                    className="top-icon-btn"
                    aria-label={dataLabel}
                    aria-pressed={isDataHidden}
                    title={dataLabel}
                >
                    <EyeIcon crossed={isDataHidden} />
                </button>
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
