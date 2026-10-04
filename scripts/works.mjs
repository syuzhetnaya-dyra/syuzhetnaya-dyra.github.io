// Собирает src/data/works.js из сводной таблицы файла 02.
// Переписывать двадцать строк руками — значит однажды ошибиться в slug,
// а slug это адрес страницы.
import { readFileSync, writeFileSync } from 'node:fs';

const K = 'C:/Users/Anastasia/Documents/Сюжетная дыра/';
const md = readFileSync(K + 'lithero-content/02_Baza_proizvedenij_i_geroev.md', 'utf8');

const stroki = md
  .split('\n')
  .filter((l) => /^\|\s*\d+\s*\|/.test(l))
  .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));

if (stroki.length !== 20) throw new Error(`строк в таблице ${stroki.length}, ожидалось 20`);

// № | slug | Произведение | Позиция | Автор | Год | Жанр | Род | Направление | Уверенность | Волна | Полных | Малых | Досье | Чек | Дыра | Фото
const raboty = stroki.map((c) => ({
  slug: c[1],
  title: c[2],
  author: c[4],
  year: c[5],
  genre: c[6],
  rod: c[7],
  direction: c[8],
  wave: c[10] === 'готово' ? 0 : Number(c[10].replace('W', '')),
  cards: Number(c[11]),
  minor: Number(c[12]),
  // Произведение показывается как готовое, только если готовы все три вкладки
  status: [c[13], c[14], c[15]].every((x) => x === 'published') ? 'published' : 'soon',
}));

const esc = (s) => String(s).replace(/'/g, "\\'");
const telo = raboty
  .map(
    (r) => `  {
    slug: '${esc(r.slug)}',
    title: '${esc(r.title)}',
    author: '${esc(r.author)}',
    year: '${esc(r.year)}',
    genre: '${esc(r.genre)}',
    rod: '${esc(r.rod)}',
    direction: '${esc(r.direction)}',
    cards: ${r.cards},
    minor: ${r.minor},
    wave: ${r.wave},
    status: '${r.status}',
  },`
  )
  .join('\n');

const fayl = `/*
 * Реестр произведений.
 *
 * Собран из сводной таблицы lithero-content/02_Baza_proizvedenij_i_geroev.md —
 * единственного места, где ведутся slug-и, волны и статусы. Руками этот файл
 * не правят: правят таблицу и пересобирают (scripts/works.mjs).
 *
 * status: 'published' — все три вкладки собраны и сверены, произведение
 * открыто. 'soon' — в работе, на главной показывается заглушкой и никуда
 * не ведёт. Половины произведения ученику не показываем: он решит, что
 * продукт сырой, и не вернётся.
 *
 * genre, rod, direction — это прямые ответы задания № 1, поэтому они живут
 * здесь, а не в вёрстке.
 */

export const works = [
${telo}
];

export const workBySlug = Object.fromEntries(works.map((w) => [w.slug, w]));

export const published = works.filter((w) => w.status === 'published');

/*
 * Три вкладки произведения. Одинаковы у всех: ученик, прошедший «Ионыча»,
 * на «Отцах и детях» не должен заново искать, где что лежит.
 *
 * Адреса без ведущего слеша — его дописывает to() из scripts/paths.js,
 * который знает, в корне сайт или в подпапке.
 */
export function sectionsOf(slug) {
  return [
    { id: 'dosye', num: 'I', name: 'Досье героев', short: 'Досье', href: slug + '/dosye/' },
    { id: 'check', num: 'II', name: 'Сюжетный чек', short: 'Чек', href: slug + '/check/' },
    { id: 'dyra', num: 'III', name: 'Тест-дыра', short: 'Дыра', href: slug + '/dyra/' },
  ];
}
`;

writeFileSync(K + 'src/data/works.js', fayl, 'utf8');
console.log(`произведений: ${raboty.length}`);
console.log(`открыто: ${raboty.filter((r) => r.status === 'published').map((r) => r.slug).join(', ') || '—'}`);
console.log(`в работе: ${raboty.filter((r) => r.status !== 'published').length}`);
console.log(`волна 1: ${raboty.filter((r) => r.wave === 1).map((r) => r.slug).join(', ')}`);
