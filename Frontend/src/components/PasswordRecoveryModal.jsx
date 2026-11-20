import { useState } from 'react';
import { requestPasswordReset } from '../services/api';
import '../styles/passwordRecovery.css';

function PasswordRecoveryModal({ isOpen, onClose }) {
    const [identifier, setIdentifier] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleClose = () => {
        setIdentifier('');
        setIsSubmitted(false);
        setErrorMessage('');
        setIsLoading(false);
        onClose();
    };

    const handleRequestReset = async (e) => {
        e.preventDefault();
        const trimmed = identifier.trim();

        if (!trimmed) {
            setErrorMessage('Por favor, ingresa tu usuario o correo electrónico.');
            return;
        }

        setIsLoading(true);
        setErrorMessage('');

        try {
            await requestPasswordReset(trimmed);
        } catch {
            // Por seguridad y experiencia de usuario estándar, no mostramos error si el servicio simula el envío
        } finally {
            setIsLoading(false);
            setIsSubmitted(true);
        }
    };

    return (
        <div className="recovery-modal-overlay" onClick={handleClose}>
            <div className="recovery-modal-card" onClick={(e) => e.stopPropagation()}>
                
                {!isSubmitted ? (
                    <form onSubmit={handleRequestReset}>
                        <div className="recovery-header">
                            <span className="recovery-badge">
                                🔐 Recuperación de cuenta
                            </span>
                            <h3 className="recovery-title">Recuperar Contraseña</h3>
                            <p className="recovery-subtitle">
                                Ingresa tu usuario o correo electrónico para enviarte las instrucciones de recuperación.
                            </p>
                        </div>

                        {errorMessage && (
                            <div className="recovery-error-alert">
                                <span>⚠️</span>
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <div className="recovery-field">
                            <label className="recovery-label">
                                Usuario o Correo Electrónico
                            </label>
                            <input
                                type="text"
                                className={`recovery-input ${errorMessage ? 'is-invalid' : ''}`}
                                placeholder="Ingresa tu usuario o correo electrónico"
                                value={identifier}
                                onChange={(e) => {
                                    setIdentifier(e.target.value);
                                    if (errorMessage) setErrorMessage('');
                                }}
                                autoFocus
                            />
                        </div>

                        <div className="recovery-actions">
                            <button
                                type="button"
                                className="recovery-btn-cancel"
                                onClick={handleClose}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="recovery-btn-submit"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Enviando...' : 'Enviar enlace'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="recovery-success-box">
                        <div className="recovery-success-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>
                            ✉️
                        </div>
                        <h3 className="recovery-success-title">Solicitud Enviada</h3>
                        <p className="recovery-success-desc" style={{ marginBottom: '24px' }}>
                            Si tu usuario o correo coinciden con uno registrado, recibirás un correo para recuperar tu contraseña.
                        </p>

                        <button
                            type="button"
                            className="recovery-btn-login-now"
                            onClick={handleClose}
                        >
                            Entendido
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}

export default PasswordRecoveryModal;
