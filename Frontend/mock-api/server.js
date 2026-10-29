import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import jsonServer from 'json-server';

const server = jsonServer.create();
const router = jsonServer.router(fileURLToPath(new URL('./db.json', import.meta.url)));

server.use(jsonServer.defaults());
server.use(jsonServer.bodyParser);

server.post('/auth/login', (request, response) => {
    const { username, password } = request.body;
    const user = router.db.get('users')
        .find({ username, password })
        .value();

    if (!user) {
        response.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
        return;
    }

    response.json({
        token: `mock-${randomUUID()}`,
        user: {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
        },
    });
});

server.post('/auth/forgot-password', (request, response) => {
    const { identifier, email } = request.body || {};
    const input = (identifier || email || '').trim().toLowerCase();

    if (!input) {
        response.status(400).json({ message: 'Debes ingresar tu usuario o correo electrónico.' });
        return;
    }

    const user = router.db.get('users').value().find(u => 
        (u.username && u.username.toLowerCase() === input) ||
        (u.email && u.email.toLowerCase() === input)
    );

    // Escenario 2: Si no existe, responder 200 genérico
    if (!user) {
        response.json({
            message: 'Si el correo electrónico coincide con una cuenta registrada, se enviará un enlace de recuperación.'
        });
        return;
    }

    const resetToken = `reset-${randomUUID()}`;
    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    console.log('\n==============================================================');
    console.log('📧 [MOCK API - SIMULACIÓN DE RECUPERACIÓN DE CONTRASEÑA]');
    console.log(`Para: ${user.email} (${user.name})`);
    console.log(`🔗 Enlace: ${resetLink}`);
    console.log(`🔑 Token: ${resetToken}`);
    console.log('==============================================================\n');

    response.json({
        message: 'Si el correo electrónico coincide con una cuenta registrada, se enviará un enlace de recuperación.',
        token: resetToken,
        resetLink,
        user: {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email || `${user.username.toLowerCase()}@repartosya.com`,
        },
    });
});

server.get('/auth/verify-reset-token/:token', (request, response) => {
    const { token } = request.params;
    if (!token) {
        return response.status(400).json({ valid: false, message: 'Token no proporcionado.' });
    }
    const admin = router.db.get('users').find({ role: 'admin' }).value();
    return response.json({
        valid: true,
        email: admin?.email || 'admin@repartosya.com'
    });
});

server.post('/auth/reset-password', (request, response) => {
    const { username, newPassword, token } = request.body || {};
    if (!newPassword) {
        response.status(400).json({ message: 'Debes ingresar una nueva contraseña.' });
        return;
    }

    if (newPassword.length < 4 || newPassword.length > 20) {
        response.status(400).json({ message: 'La contraseña debe tener entre 4 y 20 caracteres.' });
        return;
    }

    let user = null;
    if (username) {
        user = router.db.get('users').find({ username }).value();
    }
    if (!user) {
        user = router.db.get('users').find({ role: 'admin' }).value();
    }

    if (!user) {
        response.status(404).json({ message: 'Usuario no encontrado.' });
        return;
    }

    router.db.get('users').find({ id: user.id }).assign({ password: newPassword }).write();

    response.json({
        message: 'Contraseña actualizada correctamente.',
        token: `mock-session-${randomUUID()}`,
        user: {
            id: user.id,
            name: user.name,
            role: user.role
        }
    });
});

server.use((request, response, next) => {
    if (/^\/users(?:\/|$)/.test(request.path)) {
        response.status(404).json({ message: 'Recurso no encontrado.' });
        return;
    }

    next();
});

server.use(router);
server.listen(3001, () => {
    console.log('JSON Server de prueba disponible en http://localhost:3001');
});
