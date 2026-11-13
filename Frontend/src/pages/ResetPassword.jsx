import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyResetToken, resetPassword } from '../services/api';
import '../styles/resetPassword.css';

function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get('token');
    const emailFromUrl = searchParams.get('email');

    // Estado de verificación del token
    const [verifying, setVerifying] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [verifiedEmail, setVerifiedEmail] = useState('');

    // Estado del formulario
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [success, setSuccess] = useState(false);

    // Verificar el token al montar el componente
    useEffect(() => {
        if (!token) {
            setVerifying(false);
            setTokenValid(false);
            return;
        }

        verifyResetToken(token)
            .then((data) => {
                setTokenValid(data.valid);
                setVerifiedEmail(data.email || emailFromUrl || '');
            })
            .catch(() => {
                setTokenValid(false);
            })
            .finally(() => {
                setVerifying(false);
            });
    }, [token, emailFromUrl]);

    const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
    const passwordsDontMatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        if (!newPassword.trim()) {
            setErrorMessage('Debes ingresar una nueva contraseña.');
            return;
        }

        if (newPassword.length < 4 || newPassword.length > 20) {
            setErrorMessage('La contraseña debe tener entre 4 y 20 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setErrorMessage('Las contraseñas no coinciden.');
            return;
        }

        setIsLoading(true);

        try {
            const result = await resetPassword({ token, newPassword });

            // Si el backend devuelve sesión, guardarla para auto-login
            if (result.token && result.user) {
                sessionStorage.setItem(
                    'repartosya_session',
                    JSON.stringify({ token: result.token, user: result.user })
                );
            }

            setSuccess(true);
        } catch (err) {
            setErrorMessage(err.message || 'No se pudo restablecer la contraseña. Intentá nuevamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoToLogin = () => {
        navigate('/');
    };

    // Pantalla de carga mientras se verifica el token
    if (verifying) {
        return (
            <div className="reset-password-page">
                <main className="reset-password-main">
                    <div className="reset-password-card">
                        <div className="reset-header">
                            <span className="reset-badge">🔐 Verificando enlace</span>
                            <h3 className="reset-title">Un momento...</h3>
                            <p className="reset-subtitle">
                                Estamos verificando tu enlace de recuperación.
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // Token inválido o expirado
    if (!tokenValid) {
        return (
            <div className="reset-password-page">
                <main className="reset-password-main">
                    <div className="reset-password-card">
                        <div className="reset-header">
                            <span className="reset-badge">⚠️ Enlace no válido</span>
                            <h3 className="reset-title">Enlace inválido o expirado</h3>
                            <p className="reset-subtitle">
                                El enlace de recuperación que utilizaste ya no es válido o ha expirado.
                                Por favor, solicitá uno nuevo desde la pantalla de inicio de sesión.
                            </p>
                        </div>
                        <div className="reset-actions">
                            <button
                                type="button"
                                className="reset-btn-submit"
                                onClick={handleGoToLogin}
                            >
                                Volver al inicio de sesión
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // Éxito al restablecer la contraseña
    if (success) {
        return (
            <div className="reset-password-page">
                <main className="reset-password-main">
                    <div className="reset-password-card">
                        <div className="reset-success-box">
                            <div className="reset-success-icon">✅</div>
                            <h3 className="reset-success-title">¡Contraseña actualizada!</h3>
                            <p className="reset-success-desc">
                                Tu contraseña fue restablecida exitosamente.
                                Ya podés ingresar al sistema con tus nuevas credenciales.
                            </p>
                            <button
                                type="button"
                                className="reset-btn-submit"
                                onClick={handleGoToLogin}
                            >
                                Ir al inicio de sesión
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // Formulario de nueva contraseña
    return (
        <div className="reset-password-page">
            <main className="reset-password-main">
                <div className="reset-password-card">
                    <form onSubmit={handleSubmit}>
                        <div className="reset-header">
                            <span className="reset-badge">🔐 Restablecer contraseña</span>
                            <h3 className="reset-title">Nueva contraseña</h3>
                            <p className="reset-subtitle">
                                Ingresá la nueva contraseña para la cuenta{' '}
                                <strong>{verifiedEmail}</strong>
                            </p>
                        </div>

                        {errorMessage && (
                            <div className="reset-alert error">
                                <span>⚠️</span>
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <div className="reset-field">
                            <label className="reset-label">Nueva contraseña</label>
                            <div className="reset-input-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className={`reset-input ${errorMessage ? 'is-invalid' : ''}`}
                                    placeholder="Ingresá tu nueva contraseña"
                                    value={newPassword}
                                    onChange={(e) => {
                                        setNewPassword(e.target.value);
                                        if (errorMessage) setErrorMessage('');
                                    }}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    className="reset-toggle-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                            <span className="reset-hint">Entre 4 y 20 caracteres</span>
                        </div>

                        <div className="reset-field">
                            <label className="reset-label">Confirmar contraseña</label>
                            <div className="reset-input-wrapper">
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    className={`reset-input ${passwordsDontMatch ? 'is-invalid' : ''}`}
                                    placeholder="Repetí tu nueva contraseña"
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        if (errorMessage) setErrorMessage('');
                                    }}
                                />
                                <button
                                    type="button"
                                    className="reset-toggle-btn"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    tabIndex={-1}
                                >
                                    {showConfirm ? '🙈' : '👁️'}
                                </button>
                            </div>
                            {passwordsMatch && (
                                <span className="reset-hint match">✓ Las contraseñas coinciden</span>
                            )}
                            {passwordsDontMatch && (
                                <span className="reset-hint no-match">✗ Las contraseñas no coinciden</span>
                            )}
                        </div>

                        <div className="reset-actions">
                            <button
                                type="submit"
                                className="reset-btn-submit"
                                disabled={isLoading || !passwordsMatch}
                            >
                                {isLoading ? 'Guardando...' : 'Restablecer contraseña'}
                            </button>
                            <button
                                type="button"
                                className="reset-btn-cancel"
                                onClick={handleGoToLogin}
                            >
                                Cancelar y volver al inicio
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}

export default ResetPassword;

