/*
 * Разметка пьесы для сверки.
 *
 * Пьеса на Викитеке лежит одной страницей с заголовками «Действие первое»,
 * «Сцена первая», «Явление седьмое». Сверке нужны машинные метки, и метка
 * должна быть точной: в «Грозе» третье действие разбито на две сцены, и
 * явления в каждой нумеруются заново. «Действие 3, явление 4» без сцены —
 * это два разных места на сцене, и ученик ищет цитату дважды.
 *
 * Поэтому метка составная: 1.7 — действие первое, явление седьмое;
 * 3.2.4 — действие третье, сцена вторая, явление четвёртое.
 *
 *   node scripts/pyesa.mjs groza
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SOURCES = join(dirname(fileURLToPath(import.meta.url)), '..', 'lithero-content', 'sources');

const CHISLA = {
  первое: 1, первая: 1, второе: 2, вторая: 2, третье: 3, третья: 3,
  четвертое: 4, четвёртое: 4, четвертая: 4, четвёртая: 4, пятое: 5, пятая: 5,
  шестое: 6, шестая: 6, седьмое: 7, седьмая: 7, восьмое: 8, восьмая: 8,
  девятое: 9, девятая: 9, десятое: 10, десятая: 10,
  одиннадцатое: 11, одиннадцатая: 11, двенадцатое: 12, двенадцатая: 12,
  тринадцатое: 13, тринадцатая: 13, четырнадцатое: 14, четырнадцатая: 14,
  пятнадцатое: 15, пятнадцатая: 15,
};

const chislo = (slovo) => CHISLA[slovo.toLowerCase().replace(/ё/g, 'е')] ?? null;

const slug = process.argv[2];
if (!slug) {
  console.error('нужен slug: node scripts/pyesa.mjs groza');
  process.exit(1);
}

const put = join(SOURCES, `${slug}.raw.txt`);
const syroy = readFileSync(put, 'utf8').replace(/\r\n/g, '\n');

let deystvie = 0;
let scena = 0;
let yavlenie = 0;
let scenyEst = false;
let metok = 0;

const stroki = syroy.split('\n').map((s) => {
  let m = s.match(/^==\s*Действие\s+(\S+?)\s*==\s*$/i);
  if (m && chislo(m[1])) {
    deystvie = chislo(m[1]);
    scena = 0;
    yavlenie = 0;
    scenyEst = false;
    return `== ${deystvie} ==`;
  }
  m = s.match(/^===\s*Сцена\s+(\S+?)\s*===\s*$/i);
  if (m && chislo(m[1])) {
    scena = chislo(m[1]);
    scenyEst = true;
    yavlenie = 0;
    return `== ${deystvie}.${scena} ==`;
  }
  m = s.match(/^=+\s*Явление\s+(\S+?)\s*=+\s*$/i);
  if (m && chislo(m[1])) {
    yavlenie = chislo(m[1]);
    metok += 1;
    return scenyEst
      ? `== ${deystvie}.${scena}.${yavlenie} ==`
      : `== ${deystvie}.${yavlenie} ==`;
  }
  return s;
});

if (!metok) {
  console.error('не нашлось ни одного явления — разметка не та, что ожидалась');
  process.exit(1);
}

writeFileSync(put, stroki.join('\n'), 'utf8');
console.log(`${slug}: действий ${deystvie}, явлений размечено ${metok}`);
console.log(`метки вида «действие.явление» и «действие.сцена.явление»`);
