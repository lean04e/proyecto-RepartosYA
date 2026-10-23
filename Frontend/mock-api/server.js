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
    const { identifier } = request.body || {};
    if (!identifier || !identifier.trim()) {
        response.status(400).json({ message: 'Debes ingresar tu usuario o correo electrónico.' });
        return;
    }

    const clean = identifier.trim().toLowerCase();
    const user = router.db.get('users').value().find(u => 
        (u.username && u.username.toLowerCase() === clean) ||
        (u.email && u.email.toLowerCase() === clean)
    );

    if (!user) {
        response.status(404).json({ message: 'El usuario o correo electrónico ingresado no se encuentra registrado.' });
        return;
    }

    const resetToken = `reset-${randomUUID()}`;
    response.json({
        message: 'Enlace de recuperación generado con éxito.',
        token: resetToken,
        user: {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email || `${user.username.toLowerCase()}@repartosya.com`,
        },
    });
});

server.post('/auth/reset-password', (request, response) => {
    const { username, newPassword } = request.body || {};
    if (!username || !newPassword) {
        response.status(400).json({ message: 'Datos incompletos para restablecer la contraseña.' });
        return;
    }

    if (newPassword.length < 4 || newPassword.length > 20) {
        response.status(400).json({ message: 'La contraseña debe tener entre 4 y 20 caracteres.' });
        return;
    }

    const user = router.db.get('users').find({ username }).value();
    if (!user) {
        response.status(404).json({ message: 'Usuario no encontrado.' });
        return;
    }

    router.db.get('users').find({ username }).assign({ password: newPassword }).write();

    response.json({
        message: 'Contraseña actualizada correctamente.',
        username,
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
