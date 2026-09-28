# Menú & Compra Mercadona

App web instalable (PWA) para planificar las comidas y cenas de la semana y generar la lista de la compra con precios de Mercadona. Pensada para usarse como app en el iPhone («Añadir a pantalla de inicio»), también funciona en ordenador.

## Arrancar en local

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>. Para probar la versión de producción (con service worker y modo sin conexión):

```bash
npm run build
npm start
```

## Sincronización entre dispositivos (código de hogar)

Los datos se guardan en cada dispositivo y, si activas la sincronización en **Ajustes → Compartir con tu hogar**, también en la nube para compartirlos entre el móvil, el ordenador o con otra persona.

- **En local** (`npm run dev` / `npm start` en tu ordenador) los datos del hogar se guardan en la carpeta `.sync-data/`, sin configurar nada.
- **En Vercel** hace falta una base de datos Redis gratuita:
  1. En el panel del proyecto en Vercel: **Storage → Create Database → Upstash for Redis** (plan gratuito).
  2. Conéctala al proyecto. Vercel añade solas las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN`.
  3. Vuelve a desplegar (Deployments → Redeploy).

  También valen las variables `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` si creas la base de datos directamente en upstash.com. Sin base de datos, la app avisa en Ajustes de que la sincronización no está disponible (ya no «finge» guardar).

Cómo funciona: cada dispositivo sube sus cambios poco después de hacerlos y descarga los de los demás al abrir la app, al volver a ella y cada 45 segundos. Los cambios se combinan elemento a elemento (plato, producto de la lista…), así que dos personas pueden usar la lista a la vez. Los códigos nuevos son del tipo `CASA-7KQ2-M9XD-4TPB` (no se pueden adivinar).

## Instalar en el iPhone

1. Abre la web en **Safari**.
2. Pulsa **Compartir** y elige **Añadir a pantalla de inicio**.

Una vez instalada funciona sin conexión (útil dentro del supermercado): el menú y la lista están guardados en el teléfono.

## Estructura

- `src/components/` — pantallas (menú, platos, lista, ajustes) y hojas modales.
- `src/components/ui/` — piezas comunes: `Sheet` (hoja inferior en móvil / diálogo en escritorio), avisos con «Deshacer», confirmaciones, controles.
- `src/context/AppContext.tsx` — datos de la app y acciones; `useCloudSync.ts` — sincronización automática.
- `src/lib/sync.ts` — combinación de datos entre dispositivos (compartido por el navegador y el servidor).
- `src/app/api/sync` — API de sincronización (Upstash Redis o archivos locales).
- `src/app/api/mercadona/search` — buscador de productos (catálogo incluido + búsqueda en vivo cuando responde).
- `public/sw.js` — service worker (red primero para la app, caché para funcionar sin conexión).
