# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dueño/gerente de un negocio de repartos que usa el panel admin (`Frontend/`) en escritorio para controlar la operación: pedidos, repartidores, comercios, hojas de ruta y reportes. Uso orientado a supervisar y decidir, no a cargar pedidos todo el día.

## Product Purpose

RepartosYA gestiona repartos de comercios locales. Los comercios cargan pedidos, el admin los asigna a repartidores (que usan la app móvil en `Frontend-mobile/`) y controla entregas y rutas. El éxito es que el dueño vea el estado de la operación de un vistazo y pueda actuar sobre ella.

## Operating Context

- Panel admin web (React + Vite) con secciones: pedidos, repartidores, comercios, hoja de ruta y reportes (entregas, rankings, exportación a Excel).
- Backend Node/Express con MongoDB Atlas (`Backend/`).
- Los repartidores trabajan desde una app móvil aparte (Expo).

## Capabilities and Constraints

- El panel admin es solo para escritorio; móvil no es prioridad.
- Todo el texto de la interfaz va en español (Argentina).
- Tema claro y oscuro existentes.
- Los ingresos no tienen campo en el esquema de pedidos; el reporte usa una tarifa de prueba.
- Posicionamiento diferencial: no definido todavía.

## Brand Commitments

Se mantienen el logo y la paleta actuales (header con rotación logo/fecha, variantes clara y oscura).

## Evidence on Hand

Datos reales limitados: pocos pedidos entregados en la base. No hay testimonios, clientes ni métricas documentadas; no inventarlos.

## Product Principles

- El dueño ve el estado del negocio de un vistazo.
- Los reportes deben ser confiables: no mostrar cifras que el esquema no respalda.
- Español rioplatense claro, sin jerga técnica.
- Consistencia entre secciones antes que expresividad.
