/**
 * Servicio para envío de notificaciones y correos de autenticación.
 * En entorno de desarrollo o cuando no hay servidor SMTP configurado,
 * simula el envío imprimiendo el enlace y detalles en la consola.
 */
const sendRecoveryEmail = async ({ to, name, resetLink, resetToken }) => {
  console.log('\n==============================================================');
  console.log('📧 [REPARTOS YA - SERVICIO DE RECUPERACIÓN DE CONTRASEÑA]');
  console.log(`Para: ${to} (${name || 'Usuario'})`);
  console.log('Asunto: Restablecimiento de clave de acceso - RepartosYA');
  console.log('Mensaje: Has solicitado restablecer tu contraseña para ingresar al sistema.');
  console.log(`🔗 Enlace de recuperación: ${resetLink}`);
  console.log(`🔑 Token de seguridad: ${resetToken}`);
  console.log('⏳ Tiempo de validez: 1 hora');
  console.log('==============================================================\n');

  return {
    success: true,
    message: 'Correo de recuperación enviado con éxito.'
  };
};

module.exports = {
  sendRecoveryEmail
};

