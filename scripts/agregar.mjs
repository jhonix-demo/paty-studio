// Procesa y sube UNA foto, y te imprime el JSON para pegar en src/data/fotos.json
// Uso:  node --env-file=.env scripts/agregar.mjs <foto> grupales
//       node --env-file=.env scripts/agregar.mjs <foto> "Uriel y Diana"
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const [file, destino] = process.argv.slice(2);
const E = process.env;
if (!file || !destino || !E.R2_BUCKET) {
  console.error('Uso: node --env-file=.env scripts/agregar.mjs <foto> <grupales | "Nombre">\nRevisa también que .env tenga las credenciales de R2.');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${E.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: E.R2_ACCESS_KEY_ID, secretAccessKey: E.R2_SECRET_ACCESS_KEY },
});
const slug = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\w.-]+/g, '-').toLowerCase();
const put = (Key, Body, ContentType, extra = {}) =>
  s3.send(new PutObjectCommand({ Bucket: E.R2_BUCKET, Key, Body, ContentType,
    CacheControl: 'public, max-age=31536000, immutable', ...extra }));

const esGrupal = destino.toLowerCase() === 'grupales';
const grupo = esGrupal ? 'grupales' : `individuales/${slug(destino)}`;
const EVENTO = E.EVENTO_SLUG || 'evento';
const nombreArchivo = path.basename(file);
const base = slug(path.parse(file).name);
const ext = path.extname(file).slice(1).toLowerCase();
const k = (t, e) => `${EVENTO}/${grupo}/${t}/${base}.${e}`;

const buf = await fs.readFile(file);
const p = await sharp(buf).rotate().resize({ width: 1800, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
const t = await sharp(buf).rotate().resize({ width: 600 }).webp({ quality: 75 }).toBuffer();
const o = k('o', ext);

await Promise.all([
  put(k('t', 'webp'), t, 'image/webp'),
  put(k('p', 'webp'), p.data, 'image/webp'),
  put(o, buf, ext === 'png' ? 'image/png' : 'image/jpeg', { ContentDisposition: `attachment; filename="${nombreArchivo}"` }),
]);

const f = { t: k('t', 'webp'), p: k('p', 'webp'), o, w: p.info.width, h: p.info.height };
console.log(`\n✔ Subida: ${nombreArchivo} → ${grupo}\n`);

if (esGrupal) {
  console.log('Pega esto al FINAL de la lista "grupales" en src/data/fotos.json (con una coma antes):\n');
  console.log(JSON.stringify(f));
} else {
  console.log(`Si "${destino}" YA existe en "personas": pega esto al final de su lista "fotos" (con una coma antes):\n`);
  console.log(JSON.stringify(f));
  console.log(`\nSi es una persona NUEVA: pega esto dentro de la lista "personas" (con una coma antes):\n`);
  console.log(JSON.stringify({ nombre: destino, fotos: [f] }));
}
console.log('');
