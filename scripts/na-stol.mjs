/*
 * Выкладывает все промты на рабочий стол.
 *
 * В репозитории они лежат в photos/, и это правильное место: там их правят
 * и оттуда они собираются. Но искать папку внутри проекта — лишний шаг,
 * который каждый раз стоит переписки. На столе папка видна сразу.
 *
 * Стол — копия, а не источник: правятся промты в photos/, потом
 * пересобираются сюда. Иначе два набора разойдутся.
 *
 *   node scripts/na-stol.mjs
 */
import { readdirSync, mkdirSync, copyFileSync, rmSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const KORENb = join(dirname(fileURLToPath(import.meta.url)), '..');
const PHOTOS = join(KORENb, 'photos');
const STOL = join(homedir(), 'Desktop', 'ПРОМТЫ ДЛЯ КАРТИНОК');

if (existsSync(STOL)) rmSync(STOL, { recursive: true, force: true });
mkdirSync(STOL, { recursive: true });

const papki = readdirSync(PHOTOS).filter((f) => statSync(join(PHOTOS, f)).isDirectory());

const otchet = [];
let vsego = 0;

for (const p of papki) {
  const ot = join(PHOTOS, p);
  const fayly = readdirSync(ot).filter((f) => f.endsWith('.txt'));
  if (!fayly.length) continue;

  // Главные экраны — отдельной папкой, карточки — по произведениям
  const imya = p === 'glavnye-ekrany' ? 'ГЛАВНЫЕ ЭКРАНЫ' : `карточки — ${p}`;
  const kuda = join(STOL, imya);
  mkdirSync(kuda, { recursive: true });

  for (const f of fayly) {
    copyFileSync(join(ot, f), join(kuda, f));
    if (!f.startsWith('00-')) vsego += 1;
  }
  otchet.push(`${imya}: ${fayly.filter((f) => !f.startsWith('00-')).length}`);
}

writeFileSync(
  join(STOL, '00-ЧИТАЙ-МЕНЯ.txt'),
  [
    'ПРОМТЫ ДЛЯ КАРТИНОК',
    '',
    'Открыть файл, выделить всё, вставить в ChatGPT или Gemini.',
    'В файле только текст промта — ни заголовков, ни пометок.',
    '',
    'К КАЖДОМУ ПРОМТУ ОБЯЗАТЕЛЬНО ПРИЛОЖИТЬ ОБРАЗЕЦ СТИЛЯ.',
    'Без него картинки не встанут в один ряд с уже готовыми.',
    '',
    '  для карточек героев:',
    '  https://syuzhetnaya-dyra.github.io/heroes/cut/ionych__starcev.webp',
    '',
    '  для главных экранов:',
    '  https://syuzhetnaya-dyra.github.io/hero/ionych-1680.jpg',
    '',
    'Готовые картинки класть в папку «КАРТИНКИ ДЛЯ САЙТА» и сказать мне.',
    '',
    'Что где:',
    ...otchet.map((s) => '  ' + s),
    '',
    'Эта папка — копия. Правятся промты в самом проекте, потом',
    'пересобираются сюда командой: node scripts/na-stol.mjs',
  ].join('\r\n') + '\r\n',
  'utf8'
);

console.log(`на столе: «ПРОМТЫ ДЛЯ КАРТИНОК»`);
console.log(otchet.map((s) => '  ' + s).join('\n'));
console.log(`всего промтов: ${vsego}`);
