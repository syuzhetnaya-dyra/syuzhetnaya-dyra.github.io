/*
 * Поиск фразы в тексте произведения: номер главы и подлинный текст вокруг.
 *
 *   node scripts/najti.mjs voyna-i-mir "дубина народной войны"
 *   node scripts/najti.mjs voyna-i-mir --kto "Тушин" 3
 *
 * Зачем. Цитата в карточке должна быть дословной и с верным номером
 * главы. Сверка это проверяет, но проверяет уже написанное; искать, что
 * написать, приходится по тексту, а в «Войне и мире» это пять мегабайт и
 * 361 глава. Руками там находится только опечатка.
 *
 * Искать надо по приведённому виду, а показывать — подлинный: иначе фраза,
 * найденная здесь, не найдётся в сверке (из-за «ёлочек», тире, ё и знаков
 * ударения из сканов ПСС), а перенесённая в карточку потеряет авторскую
 * пунктуацию. Поэтому приведение идёт посимвольно и помнит, какому месту
 * исходника соответствует каждый символ.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const KORENb = join(dirname(fileURLToPath(import.meta.url)), '..');

const PARY = new Map([
  ['«', '"'], ['»', '"'], ['„', '"'], ['“', '"'], ['”', '"'],
  ['—', '-'], ['–', '-'], ['‒', '-'], ['―', '-'],
  ['’', "'"], ['‘', "'"], ['ʼ', "'"],
  ['ё', 'е'], ['Ё', 'Е'],
]);
const VYBROSIT = new Set(['\u00ad', '\u0300', '\u0301']);

function privesti(ishodnyy) {
  let tekst = '';
  const karta = [];
  let probel = false;
  for (let i = 0; i < ishodnyy.length; i += 1) {
    const c = ishodnyy[i];
    if (VYBROSIT.has(c)) continue;
    if (/\s/.test(c)) {
      if (probel) continue;
      probel = true;
      tekst += ' ';
      karta.push(i);
      continue;
    }
    probel = false;
    tekst += (PARY.get(c) ?? c).toLowerCase();
    karta.push(i);
  }
  return { tekst, karta };
}

const [slug, ...ostatok] = process.argv.slice(2);
if (!slug || !ostatok.length) {
  console.error('node scripts/najti.mjs <slug> "<фраза>"   |   <slug> --kto "<имя>" [сколько]');
  process.exit(1);
}

let tekst = null;
for (const p of [
  join(KORENb, 'lithero-content', 'sources', `${slug}.txt`),
  join(KORENb, 'lithero-content', 'sources', 'private', `${slug}.txt`),
]) {
  try { tekst = readFileSync(p, 'utf8'); break; } catch {}
}
if (tekst === null) throw new Error(`нет чистого текста для «${slug}» — сначала прогоните сверку`);

const kuski = tekst.split(/^=+\s*([IVXLC]+|(?:Э\.)?\d+(?:\.\d+){0,2})\s*=+\s*$/m);
const glavy = [];
for (let i = 1; i < kuski.length; i += 2) glavy.push({ metka: kuski[i], telo: kuski[i + 1] });
if (!glavy.length) glavy.push({ metka: '—', telo: tekst });

const rezhimKto = ostatok[0] === '--kto';
const fraza = rezhimKto ? ostatok[1] : ostatok.join(' ');
const predel = rezhimKto ? Number(ostatok[2] || 5) : 40;
const iskomoe = privesti(fraza).tekst;
const POLE = 240;

let najdeno = 0;
for (const g of glavy) {
  const { tekst: n, karta } = privesti(g.telo);
  let poz = 0;
  while (najdeno < predel) {
    const i = n.indexOf(iskomoe, poz);
    if (i < 0) break;
    najdeno += 1;
    const ot = karta[Math.max(0, i - POLE)];
    const konec = karta[Math.min(karta.length - 1, i + iskomoe.length + POLE)];
    console.log(`\n── ${g.metka} ──`);
    console.log(g.telo.slice(ot, konec).replace(/\s+/g, ' '));
    poz = i + iskomoe.length;
  }
  if (najdeno >= predel) break;
}

console.log(najdeno ? `\nвхождений показано: ${najdeno}` : '\nне найдено');
process.exit(najdeno ? 0 : 1);
