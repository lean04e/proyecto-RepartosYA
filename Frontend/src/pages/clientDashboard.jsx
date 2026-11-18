import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import repartosYaLogo from '../assets/repartosYA-logo.png';
import Header from '../components/header';
import { getPublicOrderTracking } from '../services/api';
import '../styles/login.css';

const TRACKING_REFRESH_INTERVAL_MS = 1000;

const trackingCardStyle = {
    width: '100%',
    maxWidth: '500px',
    boxSizing: 'border-box',
    padding: '34px clamp(24px, 4vw, 42px)',
    color: 'var(--color-text-primary)',
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-card)',
    textAlign: 'center',
};

const detailPanelStyle = {
    display: 'grid',
    justifyItems: 'center',
    gap: '8px',
    minHeight: '70px',
    padding: '14px 12px',
    boxSizing: 'border-box',
    color: 'var(--color-text-primary)',
    background: 'var(--color-bg-input)',
    borderRadius: 'var(--radius-md)',
    textAlign: 'center',
};

const supportedStatuses = new Map([
    ['en camino', 'En camino'],
    ['en_camino', 'En camino'],
    ['pendiente', 'Pendiente'],
    ['asignado', 'Asignado'],
]);

function getClientStatus(status) {
    const normalizedStatus = String(status || '').trim().toLocaleLowerCase('es');
    return supportedStatuses.get(normalizedStatus) || 'Desconectado';
}

function isDeliveredStatus(status) {
    return String(status || '').trim().toLocaleLowerCase('es') === 'entregado';
}

function isInTransitStatus(status) {
    return ['en_camino', 'en camino'].includes(
        String(status || '').trim().toLocaleLowerCase('es'),
    );
}

function isUnavailableStatus(status) {
    return ['fallido', 'cancelado', 'rechazado'].includes(
        String(status || '').trim().toLocaleLowerCase('es'),
    );
}

function formatRemainingTime(tracking, now) {
    const startedAt = Date.parse(tracking?.timerStartedAt || '');
    const durationSeconds = tracking?.timerDurationSeconds;
    if (
        !isInTransitStatus(tracking?.status)
        || !Number.isFinite(startedAt)
        || typeof durationSeconds !== 'number'
    ) {
        return '-- : --';
    }

    const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
    const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getStatusClass(status) {
    const normalizedStatus = String(status || '').trim().toLocaleLowerCase('es');
    const statusClasses = {
        'en camino': 'status-en-camino',
        en_camino: 'status-en-camino',
        entregado: 'status-entregado',
        pendiente: 'status-pendiente',
        asignado: 'status-asignado',
        desconectado: 'status-desconectado',
    };

    return statusClasses[normalizedStatus] || 'status-desconectado';
}

function ClientDashboard() {
    const { trackingId } = useParams();
    const [tracking, setTracking] = useState(null);
    const [resolvedTrackingId, setResolvedTrackingId] = useState(null);
    const [clock, setClock] = useState(Date.now);
    const currentTracking = tracking?.requestId === trackingId ? tracking : null;
    const trackingLoaded = !trackingId || resolvedTrackingId === trackingId;
    const productId = currentTracking?.id || trackingId || 'No es posible mostrar en este momento.';
    const courierName = currentTracking?.driver || 'No es posible mostrar en este momento.';
    const currentOrderStatus = currentTracking?.status;
    const isDelivered = isDeliveredStatus(currentOrderStatus);
    const isUnavailable = isUnavailableStatus(currentOrderStatus);
    const [trackingUnavailable, setTrackingUnavailable] = useState(false);
    const status = isDelivered ? 'Entregado' : getClientStatus(currentOrderStatus);
    const remainingTime = formatRemainingTime(currentTracking, clock);

    useEffect(() => {
        const clockInterval = window.setInterval(() => setClock(Date.now()), 1000);
        return () => window.clearInterval(clockInterval);
    }, []);

    useEffect(() => {
        const previousMinWidth = document.body.style.minWidth;
        document.body.style.minWidth = '320px';

        let isCurrent = true;
        let refreshInterval;
        if (trackingId) {
            const loadTracking = async () => {
                try {
                    const result = await getPublicOrderTracking(trackingId);
                    if (isCurrent) {
                        setTracking({ ...result, requestId: trackingId });
                        setResolvedTrackingId(trackingId);
                        setTrackingUnavailable(isUnavailableStatus(result.status));
                        if (isUnavailableStatus(result.status)) {
                            window.clearInterval(refreshInterval);
                        }
                    }
                } catch (error) {
                    if (isCurrent) {
                        setTracking(null);
                        setResolvedTrackingId(trackingId);
                        if (error.status === 404) {
                            setTrackingUnavailable(true);
                            window.clearInterval(refreshInterval);
                            return;
                        }
                        console.error('No se pudo cargar la información del seguimiento:', error);
                    }
                }
            };

            loadTracking();
            refreshInterval = window.setInterval(loadTracking, TRACKING_REFRESH_INTERVAL_MS);
        }

        return () => {
            isCurrent = false;
            window.clearInterval(refreshInterval);
            document.body.style.minWidth = previousMinWidth;
        };
    }, [trackingId]);

    return (
        <div className="login-page-container">
            <Header />

            <main className="login-main-content">
                <div className="login-grid-layout">
                    <div className="login-left-col">
                        <section style={trackingCardStyle} aria-label="Seguimiento del pedido">
                            {!trackingLoaded ? (
                                <p role="status" style={eyebrowStyle}>Consultando seguimiento…</p>
                            ) : trackingUnavailable || isUnavailable ? (
                                <div role="status" aria-labelledby="tracking-title">
                                    <p style={eyebrowStyle}>Página no encontrada</p>
                                    <h1 id="tracking-title" style={titleStyle}>
                                        La página solicitada no existe.
                                    </h1>
                                </div>
                            ) : (
                                <>
                                    <p style={eyebrowStyle}>Seguimiento del pedido</p>
                                    <h1 id="tracking-title" style={titleStyle}>
                                        ID del Producto: {productId}
                                    </h1>

                                    <div style={dividerStyle} />

                                    <dl style={{ display: 'grid', gap: '14px', margin: 0 }}>
                                        {isDelivered ? (
                                            <TrackingDetail label="Estado" value={status} status />
                                        ) : (
                                            <>
                                                <TrackingDetail
                                                    label="Nombre del Repartidor"
                                                    value={courierName}
                                                    icon={<PersonIcon />}
                                                />
                                                <TrackingDetail
                                                    label="Estado"
                                                    value={status}
                                                    status
                                                />
                                                <TrackingDetail
                                                    label="Tiempo Restante"
                                                    value={remainingTime}
                                                    icon={<ClockIcon />}
                                                />
                                            </>
                                        )}
                                    </dl>
                                </>
                            )}
                        </section>
                    </div>

                    <div className="login-right-col">
                        <div className="brand-card-display" aria-label="RepartosYa">
                            <img src={repartosYaLogo} alt="RepartosYa" className="brand-logo-large" />
                        </div>
                    </div>
                </div>
            </main>

            <footer className="page-global-footer">
                <p>
                    © 2026 RepartosYa Technologies S.A. Todos los derechos reservados.
                    Desarrollado en colaboración con Sintax Studio.
                </p>
            </footer>
        </div>
    );
}

function TrackingDetail({ label, value, icon, status = false }) {
    return (
        <div style={detailPanelStyle}>
            <dt style={detailLabelStyle}>{label}</dt>
            <dd style={detailValueStyle}>
                {icon}
                {status ? (
                    <span className={`status-badge ${getStatusClass(value)}`} style={statusBadgeStyle}>
                        <span className="status-dot" aria-hidden="true" style={statusDotStyle} />
                        {value}
                    </span>
                ) : (
                    <span>{value}</span>
                )}
            </dd>
        </div>
    );
}

const eyebrowStyle = {
    margin: '0 0 4px',
    color: '#039b78',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
};

const titleStyle = {
    margin: 0,
    fontSize: 'clamp(18px, 2vw, 24px)',
    fontWeight: 800,
    lineHeight: 1.35,
    overflowWrap: 'anywhere',
};

const dividerStyle = {
    height: '1px',
    margin: '22px 0',
    background: 'var(--color-border)',
};

const detailLabelStyle = {
    color: 'var(--color-text-muted)',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
};

const detailValueStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: '7px',
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
    overflowWrap: 'anywhere',
};

const statusBadgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    padding: '5px 11px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
};

const statusDotStyle = {
    width: '9px',
    height: '9px',
    flex: '0 0 9px',
    borderRadius: '50%',
};

const iconStyle = {
    width: '16px',
    height: '16px',
    fill: 'none',
    stroke: '#8da1bd',
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    flex: '0 0 16px',
};

function PersonIcon() {
    return (
        <svg style={iconStyle} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="3.2" />
            <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
        </svg>
    );
}

function ClockIcon() {
    return (
        <svg style={iconStyle} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7v5l3 2" />
        </svg>
    );
}

export default ClientDashboard;
