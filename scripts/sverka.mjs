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

/*
 * Закрытые тексты.
 *
 * Ахматова, Шолохов, Солженицын, Фадеев защищены авторским правом.
 * Цитировать их в учебных целях закон разрешает — с именем автора, с
 * источником и в объёме, оправданном целью. А вот положить книгу целиком
 * в этот репозиторий нельзя: репозиторий публичный, он и есть сайт, и
 * полный текст в нём — не цитата, а публикация всего произведения.
 *
 * Поэтому такие тексты лежат в sources/private/, закрытой от git. Сверка
 * берёт их оттуда, если они есть на машине, и работает как обычно. Если
 * их нет — она говорит об этом вслух и не делает вида, что цитаты
 * проверены.
 */
const ZAKRYTYE = join(SOURCES, 'private');

// Произведение → откуда берутся карточки и где лежит текст.
const RABOTY = [
  {
    slug: 'ionych',
    dannye: 'src/data/ionych.js',
    karty: (m) => [m.family, ...m.heroes],
    syroy: 'ionych.raw.txt',
    chisto: 'ionych.txt',
  },
  {
    slug: 'oblomov',
    dannye: 'src/data/oblomov.js',
    karty: (m) => m.cards,
    syroy: 'oblomov.raw.txt',
    chisto: 'oblomov.txt',
  },
  {
    slug: 'otcy-i-deti',
    dannye: 'src/data/otcy-i-deti.js',
    karty: (m) => m.cards,
    syroy: 'otcy-i-deti.raw.txt',
    chisto: 'otcy-i-deti.txt',
  },
  {
    slug: 'groza',
    dannye: 'src/data/groza.js',
    karty: (m) => m.cards,
    syroy: 'groza.raw.txt',
    chisto: 'groza.txt',
  },
  {
    slug: 'student',
    dannye: 'src/data/student.js',
    karty: (m) => m.cards,
    syroy: 'student.raw.txt',
    chisto: 'student.txt',
  },
  {
    slug: 'chelovek-v-futlyare',
    dannye: 'src/data/chelovek-v-futlyare.js',
    karty: (m) => m.cards,
    syroy: 'chelovek-v-futlyare.raw.txt',
    chisto: 'chelovek-v-futlyare.txt',
  },
  {
    slug: 'starukha-izergil',
    dannye: 'src/data/starukha-izergil.js',
    karty: (m) => m.cards,
    syroy: 'starukha-izergil.raw.txt',
    chisto: 'starukha-izergil.txt',
  },
];

// ─── Очистка вики-разметки ───

function pochistit(syroy) {
  let t = syroy.replace(/\r\n/g, '\n');
  t = t.replace(/^==\s*(?:См\.\s*также|Примечания|Ссылки)\s*==[\s\S]*$/m, '');
  t = t.replace(/<!--[\s\S]*?-->/g, '');
  t = t.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').replace(/<ref[^>]*\/>/g, '');
  // {{lang|fr|pince-nez}} — внутри шаблона лежит слово из самого текста.
  // Выбросить шаблон целиком значит выбросить слово.
  // {{Реплика|Катерина}} — имя говорящего внутри шаблона. Для пьесы это
  // главное: «установите соответствие между героем и репликой» строится
  // ровно на нём. Выбросить шаблон целиком значит потерять, кто говорит.
  // Второй параметр — ремарка при имени: {{Реплика|Варвара|глядя в сторону}}.
  // Форма с ремаркой под старое правило не подходила, и шаблон выметало
  // следующим, общим правилом — вместе с именем. В «Грозе» так молча
  // пропали говорящие у целых явлений, включая последний монолог Катерины.
  // Ремарка остаётся текстом: выбрасывать из источника нечего.
  t = t.replace(/\{\{\s*Реплика\s*\|\s*([^|{}]+?)\s*(?:\|\s*([^|{}]*?)\s*)?\}\}/gi,
    (_, imya, remarka) => `${imya}. ${remarka ? remarka + ' ' : ''}`);
  // {{razr|Савел Прокофьевич Дикой}} — разрядка. Внутри лежит имя, и
  // выбросить шаблон целиком значит оставить список действующих лиц без
  // единого имени: ««, купец, значительное лицо в городе»».
  t = t.replace(/\{\{\s*(?:razr|разр|разрядка)\s*\|\s*([^{}]*?)\s*\}\}/gi, '$1');
  t = t.replace(/\{\{\s*(?:Ремарка|Выдел)\s*\|\s*([^|{}]*?)\s*\}\}/gi, '$1');
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
  // У закрытого произведения текст ищется только в непубликуемой папке:
  // если он вдруг окажется в общей, это ошибка, а не запасной путь.
  const syroyPut = r.zakrytoe ? join(ZAKRYTYE, r.syroy) : join(SOURCES, r.syroy);

  if (!existsSync(syroyPut) && r.zakrytoe) {
    return { slug: r.slug, nesvereno: true, bedy: [] };
  }
  if (!existsSync(syroyPut)) {
    return { slug: r.slug, bedy: [`нет текста источника: lithero-content/sources/${r.syroy}`] };
  }

  const tekst = pochistit(readFileSync(syroyPut, 'utf8'));
  const glavy = new Map();
  // Метка главы бывает римской («IV») или составной («1.9» — часть первая,
  // глава девятая): у «Обломова» главы нумеруются внутри каждой части
  // заново, и «глава 9» без части — это четыре разных места в книге.
  // Знаков равенства бывает и два, и четыре: это уровень заголовка на
  // Викитеке, а не часть метки. Под номер подходит только римская цифра
  // или составной номер, поэтому «== Примечания ==» сюда не попадёт.
  const kuski = tekst.split(/^=+\s*([IVXLC]+|\d+(?:\.\d+){0,2})\s*=+\s*$/m);
  for (let i = 1; i < kuski.length; i += 2) glavy.set(kuski[i], kuski[i + 1]);
  if (!glavy.size) return { slug: r.slug, bedy: ['в тексте не нашлось ни одной главы вида «== I =='] };

  // Чистый текст кладём рядом: по нему удобно искать руками. У закрытого
  // произведения «рядом» значит в той же непубликуемой папке — иначе
  // книга, которую нельзя выкладывать, легла бы в репозиторий начисто
  // переписанной, и запрет обошёл бы сам себя.
  writeFileSync(
    join(r.zakrytoe ? ZAKRYTYE : SOURCES, r.chisto),
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
      // «часть 1, глава 9» приводим к метке «1.9»; «I и IV» остаётся парой
      // римских. Человеку в карточке читается словами, скрипту — меткой.
      //
      // У короткого рассказа глав нет вовсе: весь текст — одно место, и
      // «глава 1» в карточке была бы выдумкой. Тогда метку не проверяем:
      // проверять нечего, цитата может быть найдена только здесь.
      if (normGlavy.size === 1) continue;

      // «часть I» — это та же метка «I», только названная по-человечески:
      // у «Старухи Изергиль» деление на части, а не на главы, и писать в
      // карточке голое «I» значило бы называть часть главой.
      const slova = String(row.chapter || '');
      const rimskie = slova.match(/\b[IVXLC]+\b/g);
      const zayavleny = /\d/.test(slova)
        ? [(slova.match(/\d+/g) || []).join('.')]
        : rimskie || slova.split(/\s*(?:и|,|\/)\s*/).filter(Boolean);
      if (!zayavleny.length) bedy.push(`${gde}: не указана глава`);
      else if (!zayavleny.includes(najdenaV)) {
        bedy.push(`${gde}: заявлена глава ${row.chapter}, а цитата в главе ${najdenaV}`);
      }
    }
  }

  // ── Вопросы чека: привязка к строке досье ──
  //
  // «Нет строки в досье — нет вопроса» держится только пока это проверяет
  // машина: опечатка в названии строки не видна ни при чтении данных, ни на
  // странице, а правило при этом уже нарушено.
  const karty = r.karty(modul);
  // Строка может принадлежать своей карточке («Внешность») или чужой
  // («turkiny:Как их видит город»): о семье Туркиных спрашивают в блоке
  // Ивана Петровича, и вопрос честно ссылается туда, где факт записан.
  const stroki = new Set(karty.flatMap((k) => k.rows.map((row) => row.key)));
  const svoi = new Set(karty.flatMap((k) => k.rows.map((row) => `${k.id}:${row.key}`)));
  // 'имя' — вопрос про то, как героя зовут: опирается на саму карточку.
  const znaem = (ref) => ref === 'имя' || (ref.includes(':') ? svoi.has(ref) : stroki.has(ref));
  const vopros = { vsego: 0, bezRow: 0 };

  const vseVoprosy = [
    ...Object.entries(modul.checks || {}).flatMap(([hero, list]) =>
      list.map((q, i) => ({ q, gde: `${hero} · вопрос ${i + 1}` }))
    ),
    ...(modul.finalCheck ? [{ q: modul.finalCheck, gde: 'финал' }] : []),
  ];

  for (const { q, gde } of vseVoprosy) {
    vopros.vsego += 1;
    if (!q.row) {
      vopros.bezRow += 1;
      continue;
    }
    if (!znaem(q.row)) bedy.push(`${gde}: ссылается на строку досье «${q.row}», которой нет`);
    if (!Array.isArray(q.options) || q.options.length !== 3) bedy.push(`${gde}: вариантов не три`);
    if (typeof q.answer !== 'number' || !q.options?.[q.answer]) bedy.push(`${gde}: неверный номер ответа`);
    if (new Set(q.options).size !== q.options?.length) bedy.push(`${gde}: варианты повторяются`);
    if (!q.why || q.why.length < 20) bedy.push(`${gde}: нет пояснения`);
  }

  return { slug: r.slug, glav: glavy.size, citat, najdeno, vopros, bedy };
}

// ─── Запуск ───

let vsegoBed = 0;
const nesvereny = [];
for (const r of RABOTY) {
  const it = await sverit(r);
  console.log(`\n── ${it.slug} ──`);

  if (it.nesvereno) {
    nesvereny.push(r);
    console.log(`НЕ СВЕРЕНО: текст защищён авторским правом и в репозитории не лежит.`);
    console.log(`Положите его в lithero-content/sources/private/${r.syroy} — и сверка пройдёт как обычно.`);
    continue;
  }

  if (it.citat !== undefined) {
    console.log(`глав ${it.glav} · цитат ${it.citat} · найдено дословно ${it.najdeno}`);
  }
  if (it.vopros) {
    const hvost = it.vopros.bezRow ? ` · без привязки к досье ${it.vopros.bezRow}` : ' · все привязаны к досье';
    console.log(`вопросов чека ${it.vopros.vsego}${hvost}`);
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

/*
 * «Пройдена» и «пройдена целиком» — разные вещи, и разница должна быть
 * видна с одного взгляда. Иначе непроверенные цитаты защищённых авторов
 * однажды уедут на сайт под тем же зелёным словом, что и проверенные.
 */
if (nesvereny.length) {
  console.log(`\nсверка пройдена по доступным текстам`);
  console.log(`НЕ ПРОВЕРЕНО произведений: ${nesvereny.length} — ${nesvereny.map((r) => r.slug).join(', ')}`);
  console.log(`Их цитаты держатся только на том, что их сверил человек.`);
  process.exit(0);
}
console.log('\nсверка пройдена');
