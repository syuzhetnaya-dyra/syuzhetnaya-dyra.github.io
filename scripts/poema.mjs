/*
 * Разметка поэмы, разбитой на пронумерованные главки.
 *
 * У Блока в «Двенадцати» двенадцать частей, и на Викитеке они набраны
 * жирным номером: '''1''', '''2'''. После чистки жирность пропадает, и
 * номер остаётся голой строкой — сверка такую метку не видит, и вся
 * поэма считается одним местом.
 *
 * Между тем для ученика номер главки — главный ориентир: «Двенадцать»
 * спрашивают по частям, и «в двенадцатой главке» точнее, чем «в поэме».
 *
 *   node scripts/poema.mjs dvenadtsat
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SOURCES = join(dirname(fileURLToPath(import.meta.url)), '..', 'lithero-content', 'sources');

const slug = process.argv[2];
if (!slug) {
  console.error('нужен slug: node scripts/poema.mjs dvenadtsat');
  process.exit(1);
}

const put = join(SOURCES, `${slug}.raw.txt`);
const stroki = readFileSync(put, 'utf8').replace(/\r\n/g, '\n').split('\n');

/*
 * Номер главки набирают по-разному: у Блока жирным ('''1'''), у
 * Маяковского заголовком с центрированием (=== <center>1</center> ===).
 * Для нас это один и тот же номер, и приводится он к одной метке.
 */
let metok = 0;
const vyhod = stroki.map((s) => {
  const m =
    s.match(/^\s*'''\s*(\d{1,2})\s*'''\s*$/) ||
    s.match(/^\s*=+\s*(?:<center>)?\s*(\d{1,2})\s*(?:<\/center>)?\s*=+\s*$/);
  if (!m) return s;
  metok += 1;
  return `== ${Number(m[1])} ==`;
});

if (!metok) {
  console.error('не нашлось ни одной главки — разметка не та, что ожидалась');
  process.exit(1);
}

/*
 * Метка скачивателя в начале: он не знал, что внутри есть главки, и
 * пометил всю поэму как «1». Рядом с настоящей первой главкой это два
 * одинаковых номера — и второй молча затирает первый вместе со всем,
 * что стояло до него. Так из «Облака в штанах» пропал пролог.
 */
if (metok > 1 && vyhod[0] === '== 1 ==') vyhod.shift();

/*
 * Пролог. Текст до первой главки иначе пропадает совсем: сверка режет
 * источник по меткам и всё, что стоит до первой, выбрасывает. А у
 * Маяковского именно в прологе «иду — красивый, двадцатидвухлетний» и
 * само заглавие поэмы.
 */
const pervaya = vyhod.findIndex((s) => /^== \d+ ==$/.test(s));
if (pervaya > 0 && vyhod.slice(0, pervaya).join('').trim().length > 200) {
  vyhod.unshift('== 0 ==');
  console.log('пролог сохранён как главка 0');
}

writeFileSync(put, vyhod.join('\n'), 'utf8');
console.log(`${slug}: главок размечено ${metok}`);
