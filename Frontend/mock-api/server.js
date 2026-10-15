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
