/*
 * Папка «СДЕЛАТЬ» на рабочем столе: ровно те промты, по которым картинок
 * ещё нет. Без подпапок, по файлу на карточку, имя говорит само за себя.
 *
 * Зачем отдельно от «ПРОМТЫ ДЛЯ КАРТИНОК». Там лежит всё, включая уже
 * отработанное, и разложено по произведениям — это архив. А для работы
 * нужен список дел: открыл папку, видишь, сколько осталось, и ни одного
 * лишнего файла.
 *
 * Что сделано, а что нет, решает наличие файла в public/heroes/cut —
 * то же правило, по которому карточка показывает снимок или силуэт.
 *
 *   node scripts/nado-sdelat.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const KORENb = join(dirname(fileURLToPath(import.meta.url)), '..');
const PHOTOS = join(KORENb, 'photos');
const CUT = join(KORENb, 'public', 'heroes', 'cut');
const HERO = join(KORENb, 'public', 'hero');
const STOL = join(homedir(), 'Desktop', 'СДЕЛАТЬ КАРТИНКИ');

// Названия произведений — из базы, чтобы в имени файла было по-русски
const baza = readFileSync(join(KORENb, 'lithero-content/02_Baza_proizvedenij_i_geroev.md'), 'utf8').replace(/\r/g, '');
const nazvaniya = {};
const imena = {};
for (const chast of baza.split(/\n### /).slice(1)) {
  const m = chast.match(/^(.+?)\s+\(/);
  const s = chast.match(/-\s+`([a-z0-9-]+)`/);
  if (!m || !s) continue;
  nazvaniya[s[1]] = m[1].trim();
  for (const k of chast.matchAll(/^\s+-\s+`([a-z0-9-]+)`\s*\|\s*([^|\n]+?)\s*\|/gm)) {
    imena[`${s[1]}__${k[1]}`] = k[2].trim();
  }
}

if (existsSync(STOL)) rmSync(STOL, { recursive: true, force: true });
mkdirSync(STOL, { recursive: true });

const spisok = [];

// Карточки
for (const papka of readdirSync(PHOTOS)) {
  if (papka === 'glavnye-ekrany' || !existsSync(join(PHOTOS, papka, '00-opis.txt'))) continue;
  for (const f of readdirSync(join(PHOTOS, papka))) {
    if (!f.endsWith('.txt') || f.startsWith('00-')) continue;
    const id = f.replace(/\.txt$/, '');
    if (existsSync(join(CUT, `${papka}__${id}.webp`))) continue;
    const kto = imena[`${papka}__${id}`] || id;
    const imya = `${nazvaniya[papka] || papka} — ${kto}.txt`.replace(/[\\/:*?"<>|]/g, '-');
    writeFileSync(join(STOL, imya), readFileSync(join(PHOTOS, papka, f)));
    spisok.push(imya);
  }
}

// Первые экраны
for (const f of readdirSync(join(PHOTOS, 'glavnye-ekrany'))) {
  if (!f.endsWith('.txt') || f.startsWith('00-')) continue;
  const slug = f.replace(/\.txt$/, '');
  if (existsSync(join(HERO, `${slug}-1680.jpg`))) continue;
  const imya = `ЭКРАН — ${nazvaniya[slug] || slug}.txt`.replace(/[\\/:*?"<>|]/g, '-');
  writeFileSync(join(STOL, imya), readFileSync(join(PHOTOS, 'glavnye-ekrany', f)));
  spisok.push(imya);
}

spisok.sort((a, b) => a.localeCompare(b, 'ru'));

writeFileSync(
  join(STOL, '00-ЧИТАЙ-МЕНЯ.txt'),
  [
    `ОСТАЛОСЬ СДЕЛАТЬ: ${spisok.length}`,
    '',
    'В этой папке только то, по чему картинки ещё нет. Сделал — файл',
    'пропадёт отсюда при следующей пересборке.',
    '',
    'Открыть файл, выделить всё, вставить в ChatGPT или Gemini',
    'ВМЕСТЕ С ОБРАЗЦОМ СТИЛЯ:',
    '',
    '  карточки героев:',
    '  https://syuzhetnaya-dyra.github.io/heroes/cut/ionych__starcev.webp',
    '',
    '  первые экраны (файлы со словом ЭКРАН):',
    '  https://syuzhetnaya-dyra.github.io/hero/ionych-1680.jpg',
    '',
    'Готовые класть в «КАРТИНКИ ДЛЯ САЙТА» и сказать мне.',
    '',
    'Список:',
    ...spisok.map((s) => '  ' + s),
  ].join('\r\n') + '\r\n',
  'utf8'
);

console.log(`на столе: «СДЕЛАТЬ КАРТИНКИ» — ${spisok.length} файлов`);
for (const s of spisok) console.log('  ' + s);
