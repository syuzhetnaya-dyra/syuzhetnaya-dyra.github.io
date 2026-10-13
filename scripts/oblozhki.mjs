/*
 * Обложки для карточек на главной.
 *
 *   node scripts/oblozhki.mjs
 *
 * Зачем отдельный размер. Главные экраны лежат в 1680 и 900 пикселей — это
 * фон на всю ширину титульной страницы. На главной таких карточек двадцать,
 * и если ставить в них экраны по 900, страница потянет полтора мегабайта
 * картинок. Мобильный первичен, значит так нельзя.
 *
 * Карточка на телефоне шириной около 330 пикселей, на десктопе в три
 * колонки — около 400. Берём 480 по ширине: хватает и для удвоенной
 * плотности на телефоне, и для десктопа.
 */
import { readdirSync, mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const KORENb = join(dirname(fileURLToPath(import.meta.url)), '..');
const OTKUDA = join(KORENb, 'public', 'hero');
const KUDA = join(OTKUDA, 'cover');

const SHIRINA = 480;
const VYSOTA = 270;

mkdirSync(KUDA, { recursive: true });

const ishodniki = readdirSync(OTKUDA).filter((f) => f.endsWith('-1680.jpg'));
if (!ishodniki.length) throw new Error(`в ${OTKUDA} нет файлов вида *-1680.jpg`);

let vsego = 0;
for (const f of ishodniki) {
  const slug = f.replace(/-1680\.jpg$/, '');
  const kuda = join(KUDA, `${slug}.webp`);
  await sharp(join(OTKUDA, f))
    /*
     * Кадрирование по центру, а не «по интересному»: экран 1680×900 почти
     * той же пропорции, что обложка, и обрезается на считанные проценты.
     * Автоматический выбор области дал бы при том же результате разный
     * кадр от запуска к запуску — обложки перестали бы совпадать с
     * титульными экранами, из которых сделаны.
     */
    .resize(SHIRINA, VYSOTA, { fit: 'cover', position: 'centre' })
    .webp({ quality: 70 })
    .toFile(kuda);
  const kb = statSync(kuda).size / 1024;
  vsego += kb;
  console.log(`${slug.padEnd(28)} ${kb.toFixed(0)} КБ`);
}
console.log(`\nобложек ${ishodniki.length}, всего ${(vsego / 1024).toFixed(2)} МБ`);
