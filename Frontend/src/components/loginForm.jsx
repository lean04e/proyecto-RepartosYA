import React, { useState } from 'react';

function LoginForm() {
    const [usuario, setUsuario] = useState('');
    const [contraseña, setContraseña] = useState('');

    // Estados para controlar el modal y su mensaje
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validar campos vacíos
        if(!usuario.trim() || !contraseña.trim()) {
            setModalMessage('Campos Vacíos, falta completar');
            setModalOpen(true);
            return;
        }

        // Si los datos son correctos
        if (usuario === 'admin' && contraseña === '123456'){
            setModalMessage('Bienvenido a la plataforma de RepartosYA');
            setModalOpen(true);
        } else {
            // Si puso datos incorrectos
            setModalMessage('Usuario o contraseña incorrectos, vuelva a intentarlo');
            setModalOpen(true);
        }

        // Limpia los campos de texto al hacer clic en Iniciar Sesión
        setUsuario('');
        setContraseña('');
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
            <p style={{ color: 'var(--color-text-secondary)', fontSize:'14px', lineHeight: '1.5', marginBottom: '24px' }}>Portal Privado de Logística, Operaciones y Gestión.</p>
            
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                    <label style={{ display: 'block', fontSize: '12px', color:'var(--color-text-primary)', fontWeight:'600', marginBottom: '6px', textTransform: 'uppercase' }}>Usuario / Nro de Repartidor</label>
                    <input
                        type="text"
                        value={usuario}
                        onChange={(e) => setUsuario(e.target.value)}
                        placeholder="El admin pishin"
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

                <button type="submit" style={{ 
                    width: '100%', 
                    padding: '14px', 
                    backgroundColor: 'var(--color-accent-teal)',
                    color: '#042921', 
                    border: 'none', 
                    borderRadius: 'var(--radius-sm)', 
                    cursor: 'pointer', 
                    fontWeight: '700',
                    fontSize: '16px' }}>
                    Iniciar Sesión
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
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        padding: '30px',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        textAlign: 'center',
                        maxWidth: '90%',
                        width: '360px'
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
                            onClick={() => setModalOpen(false)}
                            style={{
                                backgroundColor: 'var(--color-primary-dark)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '10px 24px',
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
        </div>
    );
}

export default LoginForm;