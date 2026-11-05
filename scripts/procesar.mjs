// Uso: npm run procesar [carpeta]   (por defecto ./fotos-originales)
// Estructura: grupales/*.jpg  e  individuales/<Nombre o "Uriel y Diana">/*.jpg
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const SRC = process.argv[2] || 'fotos-originales';
const E = process.env;
const EVENTO = E.EVENTO_SLUG || 'evento';
const OK = /\.(jpe?g|png)$/i;
const s3 = E.R2_BUCKET && new S3Client({
  region: 'auto',
  endpoint: `https://${E.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: E.R2_ACCESS_KEY_ID, secretAccessKey: E.R2_SECRET_ACCESS_KEY },
});
if (!s3) console.log('⚠ Sin credenciales R2: solo se genera fotos.json (no se sube nada).');

const slug = (s) => s.normalize('NFD').replace(/\p{M}/g, '').replace(/[^\w.-]+/g, '-').toLowerCase();
const put = (Key, Body, ContentType, extra = {}) =>
  s3 && s3.send(new PutObjectCommand({ Bucket: E.R2_BUCKET, Key, Body, ContentType,
    CacheControl: 'public, max-age=31536000, immutable', ...extra }));
const ls = async (d) => (await fs.readdir(d).catch(() => [])).filter((f) => OK.test(f)).sort();

async function foto(dir, file, grupo) {
  const buf = await fs.readFile(path.join(dir, file));
  const base = slug(path.parse(file).name);
  const k = (t, ext) => `${EVENTO}/${grupo}/${t}/${base}.${ext}`;
  const p = await sharp(buf).rotate().resize({ width: 1800, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const t = await sharp(buf).rotate().resize({ width: 600 }).webp({ quality: 75 }).toBuffer();
  const ext = path.extname(file).slice(1).toLowerCase();
  const o = k('o', ext);
  await Promise.all([
    put(k('t', 'webp'), t, 'image/webp'),
    put(k('p', 'webp'), p.data, 'image/webp'),
    // Content-Disposition fuerza la descarga directa, sin problemas de CORS
    put(o, buf, ext === 'png' ? 'image/png' : 'image/jpeg', { ContentDisposition: `attachment; filename="${file}"` }),
  ]);
  console.log('✔', grupo, file);
  return { t: k('t', 'webp'), p: k('p', 'webp'), o, w: p.info.width, h: p.info.height };
}

async function lote(dir, grupo) {
  const out = [];
  const files = await ls(dir);
  for (let i = 0; i < files.length; i += 3)
    out.push(...(await Promise.all(files.slice(i, i + 3).map((f) => foto(dir, f, grupo)))));
  return out;
}

const grupales = await lote(path.join(SRC, 'grupales'), 'grupales');
const personas = [];
const indDir = path.join(SRC, 'individuales');
for (const d of (await fs.readdir(indDir, { withFileTypes: true }).catch(() => [])).filter((x) => x.isDirectory())) {
  const fotos = await lote(path.join(indDir, d.name), `individuales/${slug(d.name)}`);
  if (fotos.length) personas.push({ nombre: d.name, fotos });
}
personas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

await fs.writeFile('src/data/fotos.json', JSON.stringify({ base: E.R2_PUBLIC_URL || '', grupales, personas }));
console.log(`\nListo: ${grupales.length} grupales, ${personas.length} personas. Haz commit de src/data/fotos.json.`);
