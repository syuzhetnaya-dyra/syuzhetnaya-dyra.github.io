/*
 * Сверка цитат с источником.
 *
 * Берёт каждую строку досье, у которой есть quote, и ищет её дословно в
 * сохранённом тексте произведения. Падает, если цитата не нашлась или
 * нашлась не в той главе, что указана в данных.
 *
 * Зачем машина, если цитаты вносит человек: человек обрывает предложение и
 * ставит точку, теряет «ё», сдвигает номер главы на единицу — и ничего из
 * этого не видно при чтении карточки. Видно только на экзамене, когда
 * ученик ищет цитату в книге и не находит.
 *
 * Сравнение идёт по нормализованному виду: тире, кавычки, «ё» и пробелы в
 * разных изданиях пишутся по-разному, а слова — нет. Слова и сверяем.
 *
 *   node scripts/sverka.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const KORENb = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES = join(KORENb, 'lithero-content', 'sources');

// Произведение → откуда берутся карточки и где лежит текст.
const RABOTY = [
  {
    slug: 'ionych',
    dannye: 'src/data/ionych.js',
    karty: (m) => [m.family, ...m.heroes],
    syroy: 'ionych.raw.txt',
    chisto: 'ionych.txt',
  },
];

// ─── Очистка вики-разметки ───

function pochistit(syroy) {
  let t = syroy.replace(/\r\n/g, '\n');
  t = t.replace(/<!--[\s\S]*?-->/g, '');
  t = t.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').replace(/<ref[^>]*\/>/g, '');
  // {{lang|fr|pince-nez}} — внутри шаблона лежит слово из самого текста.
  // Выбросить шаблон целиком значит выбросить слово.
  t = t.replace(/\{\{lang\|[^|}]*\|([^{}]*)\}\}/g, '$1');
  t = t.replace(/&eacute;/g, 'é').replace(/&agrave;/g, 'à').replace(/&ecirc;/g, 'ê');
  t = t.replace(/\{\{[^{}]*\}\}/g, '').replace(/\{\{[\s\S]*?\}\}/g, '');
  t = t.replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1').replace(/\[\[([^\]]*)\]\]/g, '$1');
  t = t.replace(/\[https?:\/\/\S+\s+([^\]]*)\]/g, '$1');
  t = t.replace(/<\/?[a-z][^>]*>/gi, '');
  t = t.replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–');
  t = t.replace(/'''?/g, '');
  return t;
}

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"„“”]/g, '"')
    .replace(/[—–‒-]/g, '-')
    .replace(/[ \s]+/g, ' ')
    .trim();

// ─── Сверка одного произведения ───

async function sverit(r) {
  const syroyPut = join(SOURCES, r.syroy);
  if (!existsSync(syroyPut)) {
    return { slug: r.slug, bedy: [`нет текста источника: lithero-content/sources/${r.syroy}`] };
  }

  const tekst = pochistit(readFileSync(syroyPut, 'utf8'));
  const glavy = new Map();
  const kuski = tekst.split(/^==\s*([IVXLC]+)\s*==\s*$/m);
  for (let i = 1; i < kuski.length; i += 2) glavy.set(kuski[i], kuski[i + 1]);
  if (!glavy.size) return { slug: r.slug, bedy: ['в тексте не нашлось ни одной главы вида «== I =='] };

  // Чистый текст кладём рядом: по нему удобно искать руками
  writeFileSync(
    join(SOURCES, r.chisto),
    [...glavy].map(([n, v]) => `== ${n} ==\n${v.trim()}`).join('\n\n') + '\n',
    'utf8'
  );

  const normGlavy = new Map([...glavy].map(([n, v]) => [n, norm(v)]));
  const modul = await import(pathToFileURL(join(KORENb, r.dannye)).href);

  const bedy = [];
  let citat = 0;
  let najdeno = 0;

  for (const kart of r.karty(modul)) {
    for (const row of kart.rows) {
      if (!row.quote) continue;
      citat += 1;
      const gde = `${kart.id} · «${row.key}»`;

      if (!row.verified) bedy.push(`${gde}: не помечена как сверенная`);
      if (!row.source) bedy.push(`${gde}: не указан источник`);
      if (!row.speaker) bedy.push(`${gde}: не указан говорящий`);

      // ⟨…⟩ и многоточие — реальное сокращение: куски должны идти
      // по порядку внутри одной главы.
      const chasti = row.quote.split(/⟨…⟩|…/).map(norm).filter((x) => x.length > 3);
      let najdenaV = null;
      for (const [n, t] of normGlavy) {
        let poz = 0;
        let vse = true;
        for (const ch of chasti) {
          const i = t.indexOf(ch, poz);
          if (i < 0) { vse = false; break; }
          poz = i + ch.length;
        }
        if (vse) { najdenaV = n; break; }
      }

      if (!najdenaV) {
        bedy.push(`${gde}: цитата НЕ НАЙДЕНА в тексте дословно`);
        continue;
      }
      najdeno += 1;

      // Метка главы бывает составной: «I и IV» — фраза звучит дважды.
      const zayavleny = String(row.chapter || '').split(/\s*(?:и|,|\/)\s*/).filter(Boolean);
      if (!zayavleny.length) bedy.push(`${gde}: не указана глава`);
      else if (!zayavleny.includes(najdenaV)) {
        bedy.push(`${gde}: заявлена глава ${row.chapter}, а цитата в главе ${najdenaV}`);
      }
    }
  }

  return { slug: r.slug, glav: glavy.size, citat, najdeno, bedy };
}

// ─── Запуск ───

let vsegoBed = 0;
for (const r of RABOTY) {
  const it = await sverit(r);
  console.log(`\n── ${it.slug} ──`);
  if (it.citat !== undefined) {
    console.log(`глав ${it.glav} · цитат ${it.citat} · найдено дословно ${it.najdeno}`);
  }
  if (it.bedy.length) {
    vsegoBed += it.bedy.length;
    console.log('БЕДЫ:\n  ' + it.bedy.join('\n  '));
  } else {
    console.log('все цитаты найдены дословно, главы совпали, пометки сверки на месте');
  }
}

if (vsegoBed) {
  console.error(`\nсверка не прошла: ${vsegoBed} бед`);
  process.exit(1);
}
console.log('\nсверка пройдена');
