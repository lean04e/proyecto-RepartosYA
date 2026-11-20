const nodemailer = require('nodemailer');

let cachedTransporter = null;
let cachedTestAccount = null;

/**
 * Obtiene o inicializa el transporter SMTP.
 * Si no hay variables SMTP configuradas en .env, crea automáticamente
 * una cuenta de correo de prueba real en Ethereal Email (sin necesidad de registro).
 */
const getTransporter = async () => {
  if (cachedTransporter) {
    return { transporter: cachedTransporter, testAccount: cachedTestAccount };
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    return { transporter: cachedTransporter, testAccount: null };
  }

  // Crear cuenta SMTP automática en Ethereal Email
  cachedTestAccount = await nodemailer.createTestAccount();
  cachedTransporter = nodemailer.createTransport({
    host: cachedTestAccount.smtp.host,
    port: cachedTestAccount.smtp.port,
    secure: cachedTestAccount.smtp.secure,
    auth: {
      user: cachedTestAccount.user,
      pass: cachedTestAccount.pass
    }
  });

  return { transporter: cachedTransporter, testAccount: cachedTestAccount };
};

/**
 * Servicio para envío de notificaciones y correos de autenticación.
 * Envía el correo real vía SMTP (Ethereal Email por defecto) y también
 * imprime los datos y la URL de la bandeja web en la consola para verificación.
 */
const sendRecoveryEmail = async ({ to, name, resetLink, resetToken }) => {
  let previewUrl = null;
  let messageId = null;
  let senderEmail = process.env.SMTP_FROM || 'no-reply@repartosya.com';

  try {
    const { transporter, testAccount } = await getTransporter();
    if (testAccount?.user) {
      senderEmail = `"RepartosYA Soporte" <${testAccount.user}>`;
    }

    const info = await transporter.sendMail({
      from: senderEmail,
      to: `${name ? `"${name}" ` : ''}<${to}>`,
      subject: 'Restablecimiento de clave de acceso - RepartosYA',
      text: [
        `Hola ${name || 'Usuario'},`,
        '',
        'Has solicitado restablecer tu contraseña para ingresar al sistema de RepartosYA.',
        `Enlace de recuperación: ${resetLink}`,
        `Token de seguridad: ${resetToken}`,
        '',
        'Tiempo de validez: 30 minutos.',
        'Si no solicitaste este cambio, puedes ignorar este mensaje.'
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff; color: #0f172a;">
          <h2 style="margin: 0 0 12px; color: #0f172a;">Restablecimiento de clave de acceso</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #334155;">
            Hola <strong>${name || 'Usuario'}</strong>,
          </p>
          <p style="font-size: 15px; line-height: 1.6; color: #334155;">
            Has solicitado restablecer tu contraseña para ingresar al portal de administración de <strong>RepartosYA</strong>.
          </p>
          <div style="margin: 26px 0; text-align: center;">
            <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #14b8a6; color: #042921; text-decoration: none; font-weight: 700; border-radius: 6px; font-size: 15px;">
              Restablecer mi contraseña
            </a>
          </div>
          <p style="font-size: 13px; line-height: 1.5; color: #64748b;">
            O copia y pega el siguiente enlace en tu navegador:<br />
            <a href="${resetLink}" style="color: #0d9488; word-break: break-all;">${resetLink}</a>
          </p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
            ⏳ Este enlace tiene una validez de 30 minutos. Si no solicitaste este cambio, ignora este correo.
          </p>
        </div>
      `
    });

    messageId = info.messageId;
    previewUrl = nodemailer.getTestMessageUrl(info) || null;
  } catch (error) {
    console.error('⚠️ Error al enviar correo vía SMTP (Ethereal):', error.message);
  }

  console.log('\n==============================================================');
  console.log('📧 [REPARTOS YA - SERVICIO DE RECUPERACIÓN DE CONTRASEÑA]');
  console.log(`Para: ${to} (${name || 'Usuario'})`);
  console.log('Asunto: Restablecimiento de clave de acceso - RepartosYA');
  console.log('Mensaje: Has solicitado restablecer tu contraseña para ingresar al sistema.');
  console.log(`🔗 Enlace de recuperación: ${resetLink}`);
  console.log(`🔑 Token de seguridad: ${resetToken}`);
  if (messageId) {
    console.log(`✉️ ID de envío SMTP: ${messageId}`);
  }
  if (previewUrl) {
    console.log(`📬 Ver correo real enviado (Ethereal Webmail): ${previewUrl}`);
  }
  console.log('⏳ Tiempo de validez: 30 minutos');
  console.log('==============================================================\n');

  return {
    success: true,
    message: 'Correo de recuperación enviado con éxito.',
    messageId,
    previewUrl
  };
};

module.exports = {
  sendRecoveryEmail
};

