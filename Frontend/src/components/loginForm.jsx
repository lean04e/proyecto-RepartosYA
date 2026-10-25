import { useState } from 'react';
import { login } from '../services/api';
import PasswordRecoveryModal from './PasswordRecoveryModal';
import '../styles/passwordRecovery.css';

function LoginForm({ onLoginSuccess }) {
    const [usuario, setUsuario] = useState('');
    const [contraseña, setContraseña] = useState('');

    // Estados para controlar el modal y su mensaje
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [pendingSession, setPendingSession] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!usuario.trim() || !contraseña.trim()) {
            setModalMessage('Completa el usuario y la contraseña.');
            setModalOpen(true);
            return;
        }

        setIsSubmitting(true);
        try {
            const session = await login(usuario.trim(), contraseña);
            setPendingSession(session);
            setModalMessage(
                session.user.role === 'admin'
                    ? `Bienvenido ${session.user.name}, a la Plataforma de RepartosYA`
                    : `Bienvenido ${session.user.name} a la Aplicación Móvil de RepartosYA`,
            );
            setModalOpen(true);
            setUsuario('');
            setContraseña('');
        } catch (error) {
            setPendingSession(null);
            setModalMessage(error.message);
            setModalOpen(true);
            setContraseña('');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleModalAceptar = () => {
        setModalOpen(false);
        if (pendingSession?.user.role === 'admin' && onLoginSuccess) {
            onLoginSuccess(pendingSession);
        }
        setPendingSession(null);
    };

    return(
        <div style={{ 
            backgroundColor: 'var(--color-bg-card)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)', 
            padding: '35px',
            width: '100%',
            maxWidth: '420px',
            boxSizing: 'border-box',
            fontFamily: 'var(--font-family-base)' }}>

            <h2 style={{ color: 'var(--color-text-primary)', fontSize: '24px', fontWeight: '700', margin: '0 0 8px 0' }}> Acceso al Sistema </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize:'14px', lineHeight: '1.5', marginBottom: '20px' }}>Portal Privado de Logística, Operaciones y Gestión de Empleados.</p>
            
            {/* CAJITA AMARILLA DE CREDENCIALES DE PRUEBA */}
            <div style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                marginBottom: '24px',
                fontSize: '12px',
                color: '#92400e',
                textAlign: 'left',
                boxSizing: 'border-box'
            }}>
                <strong style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>Credenciales de Prueba (Testing):</strong>
                <div>🔹 <strong>Admin:</strong> AdminMartin / SoyElAdmin</div>
                <div>🔹 <strong>Repartidor:</strong> 0001 / RepartidorNro1</div>
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                    <label style={{ display: 'block', fontSize: '12px', color:'var(--color-text-primary)', fontWeight:'600', marginBottom: '6px', textTransform: 'uppercase' }}>Usuario / Nro de Repartidor</label>
                    <input
                        type="text"
                        value={usuario}
                        onChange={(e) => setUsuario(e.target.value)}
                        placeholder="Ej: AdminMartin o 0001"
                        style={{ 
                            width: '100%', 
                            padding: '12px 14px', 
                            background: '#f8fafc', 
                            border: '1px solid var(--color-border)', 
                            borderRadius: 'var(--radius-sm)', 
                            fontSize: '14px', 
                            boxSizing: 'border-box',
                            color: '#070c18' 
                        }}
                     />
                </div>

                <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                    <label style={{ display: 'block', fontSize: '12px', color:'var(--color-text-primary)', fontWeight:'600', marginBottom: '6px', textTransform: 'uppercase' }}>Contraseña</label>
                    <input
                        type="password"
                        value={contraseña}
                        onChange={(e) => setContraseña(e.target.value)}
                        placeholder="********"
                        maxLength={20}
                        style={{ 
                            width: '100%', 
                            padding: '12px 14px', 
                            background: '#f8fafc', 
                            border: contraseña.length > 0 && contraseña.length < 4 ? '1px solid #ef4444' : '1px solid var(--color-border)', 
                            borderRadius: 'var(--radius-sm)', 
                            fontSize: '14px', 
                            boxSizing: 'border-box',
                            color: '#070c18' 
                        }}
                     />
                    {contraseña.length > 0 && contraseña.length < 4 && (
                        <span style={{ 
                            display: 'block', 
                            color: '#ef4444', 
                            fontSize: '11px', 
                            marginTop: '4px',
                            fontWeight: '500' 
                        }}>
                            La contraseña debe tener como mínimo 4 caracteres y un máximo de 20 caracteres.
                        </span>
                    )}
                </div>

                {/* Botón para recuperar contraseña */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-8px', marginBottom: '22px' }}>
                    <button
                        type="button"
                        onClick={() => setIsRecoveryOpen(true)}
                        className="login-forgot-password-btn"
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#070c18',
                            textDecoration: 'none',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600',
                            padding: 0
                        }}
                    >
                        ¿Olvidaste tu contraseña? Recuperar contraseña
                    </button>
                </div>

                <button type="submit" disabled={isSubmitting} style={{
                    width: '100%', 
                    padding: '14px', 
                    backgroundColor: isSubmitting ? '#a7f3e5' : 'var(--color-accent-teal)',
                    color: '#042921', 
                    border: 'none', 
                    borderRadius: 'var(--radius-sm)', 
                    cursor: isSubmitting ? 'wait' : 'pointer',
                    fontWeight: '700',
                    fontSize: '16px' }}>
                    {isSubmitting ? 'Validando...' : 'Iniciar Sesión'}
                </button>
            </form>

            {/* Modal de mensaje */}
            {modalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(15, 28, 46, 0.6)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 2000
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        padding: '30px',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                        textAlign: 'center',
                        maxWidth: '90%',
                        width: '380px',
                        boxSizing: 'border-box'
                    }}>
                        <p style={{
                            fontSize: '16px',
                            color: 'var(--color-text-primary)',
                            fontWeight: '500',
                            marginBottom: '24px',
                            lineHeight: '1.5'
                        }}>
                            {modalMessage}
                        </p>
                        <button
                            onClick={handleModalAceptar}
                            style={{
                                backgroundColor: 'var(--color-primary-dark)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '10px 30px',
                                borderRadius: 'var(--radius-sm)',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Aceptar
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de recuperación de contraseña */}
            <PasswordRecoveryModal
                isOpen={isRecoveryOpen}
                onClose={() => setIsRecoveryOpen(false)}
            />
        </div>
    );
}

export default LoginForm;