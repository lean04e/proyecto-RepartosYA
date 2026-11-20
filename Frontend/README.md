# RepartosYA Frontend

## Ejecutar la aplicación con la API de prueba

Instala las dependencias una vez desde la carpeta `Frontend`:

```bash
npm install
```

Abre dos terminales, ambas en `Frontend`. En la primera inicia la API simulada:

```bash
npm run mock-api
```

En la segunda inicia la aplicación:

```bash
npm run dev
```

JSON Server queda disponible en `http://localhost:3001` y Vite muestra la URL de la aplicación (normalmente `http://localhost:5173`).

## Credenciales de demostración

- Administrador: `AdminMartin` / `SoyElAdmin`
- Repartidor de prueba: `0001` / `RepartidorNro1`

El inicio de sesión se valida mediante `POST /auth/login`. La sesión del administrador se conserva en `sessionStorage`, lo que permite actualizar la página mientras la pestaña del navegador siga abierta; al cerrar la pestaña, la sesión temporal desaparece.

## Datos y endpoints simulados

Los datos se guardan en `mock-api/db.json`. JSON Server persiste allí las operaciones CRUD de estas colecciones:

- `/pedidos`
- `/comercios`
- `/repartidores`

El módulo `src/services/api.js` centraliza las llamadas HTTP (`getAll`, `create`, `update`, `remove` y `login`). Al conectar el backend real, se podrá cambiar la URL con `VITE_API_URL` y adaptar el contrato en ese módulo.

Esta API es exclusivamente local y de demostración: almacena las contraseñas de prueba en texto plano, no publica la colección `/users` por la API y el token de sesión es ficticio. No usar con credenciales ni datos reales.
