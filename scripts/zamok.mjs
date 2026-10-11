/*
 * Замок на платных страницах.
 *
 *   node scripts/zamok.mjs        — после astro build
 *
 * Что делает: в каждой собранной странице платного произведения вырезает
 * содержимое между метками ЗАМОК, шифрует его ключом выпуска и кладёт на
 * его место шифртекст. В опубликованном файле текста произведения нет —
 * ни в разметке, ни в комментариях.
 *
 * Почему именно так, а не форма «введите код» поверх готовой страницы:
 * сайт — статика, и такая форма ничего не закрывает. Страницу открывают
 * по прямому адресу, и ссылка расходится по чатам за сутки.
 *
 * Ключ выпуска берётся из lithero-content/kluchi/vypusk.key, а в сборке на
 * GitHub — из секрета KLYUCH_VYPUSKA. Если ключа нет, скрипт ПАДАЕТ и не
 * даёт собрать сайт. Это сделано нарочно: самая опасная поломка здесь —
 * молча выложить платное в открытом виде.
 */
import { randomBytes, createCipheriv } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const KORENb = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(KORENb, 'dist');
const KLYUCH_FAYL = join(KORENb, 'lithero-content', 'kluchi', 'vypusk.key');

const { METKA_NACHALO, METKA_KONEC } = await import('../src/data/dostup.js');

function klyuchVypuska() {
  const izSredy = process.env.KLYUCH_VYPUSKA;
  if (izSredy) return Buffer.from(izSredy.trim(), 'base64');
  if (existsSync(KLYUCH_FAYL)) return Buffer.from(readFileSync(KLYUCH_FAYL, 'utf8').trim(), 'base64');
  return null;
}

const klyuch = klyuchVypuska();

// ─── Обход сборки ───

const stranicy = [];
(function obojti(d) {
  for (const imya of readdirSync(d)) {
    const put = join(d, imya);
    if (statSync(put).isDirectory()) obojti(put);
    else if (imya === 'index.html') stranicy.push(put);
  }
})(DIST);

const podzamkom = stranicy.filter((p) => readFileSync(p, 'utf8').includes(METKA_NACHALO));

if (!podzamkom.length) {
  console.log('замок: платных страниц в сборке нет — шифровать нечего');
  process.exit(0);
}

if (!klyuch || klyuch.length !== 32) {
  console.error(`\nЗАМОК НЕ ПОСТАВЛЕН, И СБОРКА ОСТАНОВЛЕНА.`);
  console.error(`Платных страниц: ${podzamkom.length}. Выложить их сейчас значит отдать их даром.`);
  console.error(`\nНужен ключ выпуска. Он берётся из одного из двух мест:`);
  console.error(`  • локально — lithero-content/kluchi/vypusk.key (создаётся: node scripts/kody.mjs 100)`);
  console.error(`  • в сборке на GitHub — секрет репозитория KLYUCH_VYPUSKA`);
  process.exit(1);
}

// ─── Шифрование ───

let zashifrovano = 0;
let bukv = 0;

for (const put of podzamkom) {
  const html = readFileSync(put, 'utf8');
  const a = html.indexOf(METKA_NACHALO);
  const b = html.indexOf(METKA_KONEC);
  if (a < 0 || b < 0 || b < a) {
    console.error(`метки замка стоят неправильно: ${relative(DIST, put)}`);
    process.exit(1);
  }

  const telo = html.slice(a + METKA_NACHALO.length, b);
  const iv = randomBytes(12);
  const shifr = createCipheriv('aes-256-gcm', klyuch, iv);
  const kuski = Buffer.concat([shifr.update(telo, 'utf8'), shifr.final(), shifr.getAuthTag()]);

  const vmesto =
    `<script type="application/json" data-zamok>` +
    JSON.stringify({ iv: iv.toString('base64'), telo: kuski.toString('base64') }) +
    `</script>`;

  writeFileSync(put, html.slice(0, a) + vmesto + html.slice(b + METKA_KONEC.length), 'utf8');
  zashifrovano += 1;
  bukv += telo.length;
}

/*
 * Проверка себя. Шифровать и не проверить результат — то же, что не
 * шифровать: ошибка в метках или в порядке действий оставила бы текст в
 * файле, и заметили бы это покупатели.
 */
const utechki = [];
for (const put of podzamkom) {
  const html = readFileSync(put, 'utf8');
  if (html.includes(METKA_NACHALO) || html.includes(METKA_KONEC)) {
    utechki.push(`${relative(DIST, put)}: метка осталась в файле`);
  }
  if (!html.includes('data-zamok')) utechki.push(`${relative(DIST, put)}: шифртекста нет`);
}

if (utechki.length) {
  console.error('ЗАМОК СРАБОТАЛ НЕПРАВИЛЬНО:\n  ' + utechki.join('\n  '));
  process.exit(1);
}

console.log(`замок: зашифровано страниц ${zashifrovano}, скрыто символов ${bukv}`);
