/*
 * Печать главы по метке:  node scripts/glava.mjs voyna-i-mir 1.1.8
 *
 * Цитату в карточку нужно переносить с той же пунктуацией, что в
 * источнике, — со «ёлочками», тире и ё. Поиск (scripts/najti.mjs)
 * показывает текст приведённым к сравнимому виду и для этого не годится.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const KORENb = join(dirname(fileURLToPath(import.meta.url)), '..');
const [slug, metka, ot, skolko] = process.argv.slice(2);
if (!slug || !metka) {
  console.error('node scripts/glava.mjs <slug> <метка> [с какого знака] [сколько]');
  process.exit(1);
}

const puti = [
  join(KORENb, 'lithero-content', 'sources', `${slug}.txt`),
  join(KORENb, 'lithero-content', 'sources', 'private', `${slug}.txt`),
];
let tekst = null;
for (const p of puti) {
  try { tekst = readFileSync(p, 'utf8'); break; } catch {}
}
if (tekst === null) throw new Error(`нет чистого текста: ${puti.join(' , ')}`);

const kuski = tekst.split(/^=+\s*([IVXLC]+|(?:Э\.)?\d+(?:\.\d+){0,2})\s*=+\s*$/m);
for (let i = 1; i < kuski.length; i += 2) {
  if (kuski[i] !== metka) continue;
  const telo = kuski[i + 1].trim();
  const s = Number(ot || 0);
  const n = Number(skolko || 4000);
  console.log(`── ${metka} ── знаков ${telo.length}\n`);
  console.log(telo.slice(s, s + n));
  process.exit(0);
}
console.error(`нет главы ${metka}. Есть: ${kuski.filter((_, i) => i % 2).slice(0, 8).join(', ')}…`);
process.exit(1);
