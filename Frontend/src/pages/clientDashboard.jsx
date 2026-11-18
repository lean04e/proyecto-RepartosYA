import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import repartosYaLogo from '../assets/repartosYA-logo.png';
import Header from '../components/header';
import '../styles/login.css';

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

function ClientDashboard() {
    const { trackingId } = useParams();
    const productId = trackingId || 'No es posible mostrar en este momento.';
    const courierName = 'No es posible mostrar en este momento.';
    const status = getClientStatus(null);
    const remainingTime = '-- : --';

    useEffect(() => {
        const previousMinWidth = document.body.style.minWidth;
        document.body.style.minWidth = '320px';

        return () => {
            document.body.style.minWidth = previousMinWidth;
        };
    }, []);

    return (
        <div className="login-page-container">
            <Header />

            <main className="login-main-content">
                <div className="login-grid-layout">
                    <div className="login-left-col">
                        <section style={trackingCardStyle} aria-labelledby="tracking-title">
                            <p style={eyebrowStyle}>Seguimiento del pedido</p>
                            <h1 id="tracking-title" style={titleStyle}>
                                ID del Producto: {productId}
                            </h1>

                            <div style={dividerStyle} />

                            <dl style={{ display: 'grid', gap: '14px', margin: 0 }}>
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
                            </dl>
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
                    <span style={statusBadgeStyle}>
                        <span aria-hidden="true" style={statusDotStyle} />
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
    color: '#2b0101',
    background: 'rgba(205, 14, 14, 0.16)',
    border: '1px solid rgba(0, 180, 145, 0.24)',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
};

const statusDotStyle = {
    width: '9px',
    height: '9px',
    flex: '0 0 9px',
    background: '#620606',
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
