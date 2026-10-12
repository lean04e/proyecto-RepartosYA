import React, { useState } from 'react';
import Header from '../components/header';
import LoginForm from '../components/loginForm';
import repartosYaLogo from '../assets/repartosYA-logo.png'; 
import '../styles/login.css';

function Login() {
    // Estado para controlar qué modal del footer se muestra
    const [footerModalType, setFooterModalType] = useState(null); // 'terms', 'privacy', 'support' o null

    const handleOpenModal = (type) => {
        setFooterModalType(type);
    };

    const handleCloseModal = () => {
        setFooterModalType(null);
    };

    // Textos correspondientes para cada modal
    const getModalMessage = () => {
        switch (footerModalType) {
            case 'terms':
                return 'En la brevedad se cargarán los términos de servicio';
            case 'privacy':
                return 'En breve se ha de cargar las políticas';
            case 'support':
                return 'En breve pondremos una bandeja de comentarios para que pueda hablar con el grupo Sintax';
            default:
                return '';
        }
    };

    return (
        <div className="login-page-container">
            {/* Barra superior compartida */}
            <Header />

            {/* Contenido central dividido en dos columnas */}
            <main className="login-main-content">
                <div className="login-grid-layout">
                    
                    {/* Columna Izquierda: Formulario de Acceso */}
                    <div className="login-left-col">
                        <LoginForm />
                    </div>

                    {/* Columna Derecha: Branding e Isotipo */}
                    <div className="login-right-col">
                        <div className="brand-card-display">
                            <img src={repartosYaLogo} alt="RepartosYA Logo" className="brand-logo-large" />
                            <p className="brand-desc-text">
                                Plataforma integral de gestión logística, despacho express y monitoreo en tiempo real.
                            </p>
                        </div>
                    </div>

                </div>
            </main>

            {/* Pie de página institucional */}
            <footer className="page-global-footer">
                <p>© 2026 RepartosYA Technologies S.A. Todos los derechos reservados. Sistema privado de uso confidencial y monitoreado. Desarrollado en colaboración con Sintax Studio.</p>
                <div className="footer-links">
                    <button onClick={() => handleOpenModal('terms')} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}>
                        Términos de Servicio
                    </button>
                    <span>•</span>
                    <button onClick={() => handleOpenModal('privacy')} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}>
                        Políticas de Privacidad
                    </button>
                    <span>•</span>
                    <button onClick={() => handleOpenModal('support')} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}>
                        Soporte Operativo
                    </button>
                </div>
            </footer>

            {/* Ventana Emergente (Modal) para los enlaces del Footer */}
            {footerModalType && (
                <div className="modal-overlay">
                    <div className="modal-content-box">
                        <p>{getModalMessage()}</p>
                        <button className="btn-modal-close" onClick={handleCloseModal}>
                            Aceptar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Login;