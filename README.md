# Galería de entrega de fotos

## 1. Cloudflare R2 (una sola vez)
1. Cuenta en Cloudflare → R2 → crear bucket (ej. `fotos-tia`).
2. Hacer público el bucket: *Settings → Public access* (r2.dev) o, mejor, conectar un dominio propio.
3. *Manage R2 API Tokens* → crear token con permiso de lectura/escritura → copiar a `.env` (ver `.env.example`).

## 2. Procesar y subir fotos (en la PC donde están las fotos)
```
fotos-originales/
  grupales/            IMG_001.jpg ...
  individuales/
    Josías/            ...
    Uriel y Diana/     ...
```
```
npm install
cp .env.example .env   # y rellénalo
npm run procesar
```
Genera miniaturas/vistas previas, sube todo al bucket y actualiza `src/data/fotos.json`.

## 3. Publicar
```
git add src/data/fotos.json && git commit -m "Fotos pedido #1" && git push
```
Netlify: build `npm run build`, carpeta `dist` (Astro se detecta solo).
Esta página vive en `/p/esp-2026-1` (archivo `src/pages/p/esp-2026-1.astro`). Para otro pedido, copia ese archivo con otro nombre (ej. `p/otro-pedido.astro`), cambia el título y `EVENTO_SLUG`.
