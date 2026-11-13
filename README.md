# Galería de entrega de fotos (varios eventos)

Cada evento tiene su propia página: `/p/<slug>` (ej. `/p/esp-2026-1`).

## Configuración única (Cloudflare R2)
1. Crea un bucket en R2 y actívale la URL pública (o un dominio propio).
2. *Manage R2 API Tokens* → token con lectura/escritura.
3. Crea `.env` (ver `.env.example`) en la PC donde están las fotos.

## Agregar un evento nuevo
1. Edita `src/data/eventos.json` y agrega `{ "slug", "titulo", "subtitulo", "fotografa" }`.
2. Ordena las fotos en `fotos-originales/<slug>/`:
   ```
   grupales/             IMG_001.jpg ...
   individuales/
     Josías/
     Uriel y Diana/
   ```
3. `npm install` (solo la primera vez) y `npm run procesar -- <slug>`
   Genera vistas previas, sube todo al bucket y crea `src/data/fotos/<slug>.json`.
4. Commit y push. Netlify publica: build `npm run build`, carpeta `dist`.

## Agregar una sola foto después
`node --env-file=.env scripts/agregar.mjs <slug> "ruta/foto.jpg" grupales`
`node --env-file=.env scripts/agregar.mjs <slug> "ruta/foto.jpg" "Uriel y Diana"`
Sube la foto e imprime el JSON para pegarlo en `src/data/fotos/<slug>.json`.

## Notas
- Los eventos de `eventos.json` sin fotos muestran la página vacía: agrégalos cuando estén listos.
- Todas las páginas llevan `noindex` (no salen en Google), pero cualquiera con el enlace puede verlas.
- Modo oscuro: sigue el tema del sistema y hay un botón para cambiarlo.
