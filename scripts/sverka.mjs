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
  {
    slug: 'vishnevyy-sad',
    dannye: 'src/data/vishnevyy-sad.js',
    karty: (m) => m.cards,
    syroy: 'vishnevyy-sad.raw.txt',
    chisto: 'vishnevyy-sad.txt',
  },
  {
    slug: 'na-dne',
    dannye: 'src/data/na-dne.js',
    karty: (m) => m.cards,
    syroy: 'na-dne.raw.txt',
    chisto: 'na-dne.txt',
  },
  {
    slug: 'kto-na-rusi',
    dannye: 'src/data/kto-na-rusi.js',
    karty: (m) => m.cards,
    syroy: 'kto-na-rusi.raw.txt',
    chisto: 'kto-na-rusi.txt',
  },
  {
    slug: 'prestuplenie-i-nakazanie',
    dannye: 'src/data/prestuplenie-i-nakazanie.js',
    karty: (m) => m.cards,
    syroy: 'prestuplenie-i-nakazanie.raw.txt',
    chisto: 'prestuplenie-i-nakazanie.txt',
  },
  {
    slug: 'oblako-v-shtanakh',
    dannye: 'src/data/oblako-v-shtanakh.js',
    karty: (m) => m.cards,
    syroy: 'oblako-v-shtanakh.raw.txt',
    chisto: 'oblako-v-shtanakh.txt',
  },
  {
    slug: 'dvenadtsat',
    dannye: 'src/data/dvenadtsat.js',
    karty: (m) => m.cards,
    syroy: 'dvenadtsat.raw.txt',
    chisto: 'dvenadtsat.txt',
  },
  {
    slug: 'gospodin-iz-san-francisco',
    dannye: 'src/data/gospodin-iz-san-francisco.js',
    karty: (m) => m.cards,
    syroy: 'gospodin-iz-san-francisco.raw.txt',
    chisto: 'gospodin-iz-san-francisco.txt',
  },
  {
    slug: 'molodaya-gvardiya',
    // Фадеев под авторским правом: текст только локально, в private/
    zakrytoe: true,
    dannye: 'src/data/molodaya-gvardiya.js',
    karty: (m) => m.cards,
    syroy: 'molodaya-gvardiya.raw.txt',
    chisto: 'molodaya-gvardiya.txt',
  },
  {
    slug: 'tikhiy-don',
    // Шолохов под авторским правом: текст только локально, в private/
    zakrytoe: true,
    dannye: 'src/data/tikhiy-don.js',
    karty: (m) => m.cards,
    syroy: 'tikhiy-don.raw.txt',
    chisto: 'tikhiy-don.txt',
  },
  {
    slug: 'rekviem',
    // Ахматова под авторским правом: текст только локально, в private/
    zakrytoe: true,
    dannye: 'src/data/rekviem.js',
    karty: (m) => m.cards,
    syroy: 'rekviem.raw.txt',
    chisto: 'rekviem.txt',
  },
  {
    slug: 'odin-den-ivana-denisovicha',
    // Солженицын под авторским правом: текст только локально, в private/
    zakrytoe: true,
    dannye: 'src/data/odin-den-ivana-denisovicha.js',
    karty: (m) => m.cards,
    syroy: 'odin-den-ivana-denisovicha.raw.txt',
    chisto: 'odin-den-ivana-denisovicha.txt',
  },
  {
    slug: 'chistyy-ponedelnik',
    dannye: 'src/data/chistyy-ponedelnik.js',
    karty: (m) => m.cards,
    syroy: 'chistyy-ponedelnik.raw.txt',
    chisto: 'chistyy-ponedelnik.txt',
  },
  {
    slug: 'voyna-i-mir',
    dannye: 'src/data/voyna-i-mir.js',
    karty: (m) => m.cards,
    syroy: 'voyna-i-mir.raw.txt',
    chisto: 'voyna-i-mir.txt',
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
  /*
   * {{poemx|РУСЬ|Ты и убогая…}} — внутри шаблона лежит само стихотворение.
   * Выбросить шаблон целиком значит выбросить стихи: так из «Кому на Руси
   * жить хорошо» пропадала «Русь», та самая, которой поэма отвечает на
   * свой вопрос. Заголовок и текст остаются, служебное уходит.
   */
  t = t.replace(/\{\{\s*poemx?\s*\|([^|{}]*)\|([\s\S]*?)\}\}/gi, (_, zag, telo) => `${zag}\n${telo}`);
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
    /*
     * Знак ударения. В сканах ПСС он расставлен там, где слово читается
     * двояко: «что́», «бо́льшая», «всё». Это надстрочный значок отдельным
     * символом, на вид неотличимый ни в карточке, ни в выдаче поиска.
     * Не снять его — значит не найти цитату, в которой он есть, и
     * получить «цитата НЕ НАЙДЕНА» там, где текст совпадает буква в
     * букву.
     */
    .replace(/[̀́]/g, '')
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

  /*
   * Чистим ПОГЛАВНО, а не весь том разом.
   *
   * Правила чистки ленивые и многострочные: «вырезать от <ref> до
   * </ref>», «от {{ до }}». Пока текст — одна глава, это безопасно. Но
   * книга склеена из двух десятков скачанных страниц, и если на одной из
   * них тег не закрыт, правило перепрыгивает на следующую страницу и
   * съедает всё между ними вместе с метками глав.
   *
   * Именно так из «Кому на Руси жить хорошо» пропали семь глав разом —
   * и сверка об этом молчала: цитат из пропавших глав в данных не было.
   * Поглавная чистка закрывает весь этот класс потерь: что бы ни было
   * сломано внутри главы, за её край оно не выйдет.
   */
  // «Э.1.16» — эпилог «Войны и мира», часть первая, глава шестнадцатая.
  // Эпилог не пятый том, и писать «том 5» значило бы соврать ученику.
  const METKA = /^=+\s*(?:[IVXLC]+|(?:Э\.)?\d+(?:\.\d+){0,2})\s*=+\s*$/;
  const tekst = readFileSync(syroyPut, 'utf8')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .reduce((chasti, stroka) => {
      if (METKA.test(stroka)) chasti.push([stroka]);
      else if (chasti.length) chasti[chasti.length - 1].push(stroka);
      else chasti.push([stroka]);
      return chasti;
    }, [])
    .map((chast) => (METKA.test(chast[0]) ? chast[0] + '\n' + pochistit(chast.slice(1).join('\n')) : pochistit(chast.join('\n'))))
    .join('\n');
  const glavy = new Map();
  // Метка главы бывает римской («IV») или составной («1.9» — часть первая,
  // глава девятая): у «Обломова» главы нумеруются внутри каждой части
  // заново, и «глава 9» без части — это четыре разных места в книге.
  // Знаков равенства бывает и два, и четыре: это уровень заголовка на
  // Викитеке, а не часть метки. Под номер подходит только римская цифра
  // или составной номер, поэтому «== Примечания ==» сюда не попадёт.
  // Тот же набор метк, что у METKA выше: «Э.» — эпилог «Войны и мира».
  // Разойдутся — главы эпилога молча прилипнут к предыдущей, и сверка
  // отчитается об успехе по тексту, в котором их нет.
  const kuski = tekst.split(/^=+\s*([IVXLC]+|(?:Э\.)?\d+(?:\.\d+){0,2})\s*=+\s*$/m);
  /*
   * Повторный номер — это потеря текста, а не мелочь.
   *
   * Скачиватель помечает всю страницу как «1», а внутри у поэмы своя
   * первая часть, тоже «1». Вторая молча затирала первую вместе с
   * прологом, и сверка при этом рапортовала, что всё хорошо: цитат из
   * пропавшего куска в данных просто не было. Теперь она об этом кричит.
   */
  const povtory = [];
  for (let i = 1; i < kuski.length; i += 2) {
    if (glavy.has(kuski[i])) povtory.push(kuski[i]);
    glavy.set(kuski[i], kuski[i + 1]);
  }
  if (povtory.length) {
    return {
      slug: r.slug,
      bedy: [
        `в источнике повторяются номера глав: ${[...new Set(povtory)].join(', ')}. ` +
          `Текст первой из них потерян — поправьте разметку источника.`,
      ],
    };
  }
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
      // «пролог» — часть до первой пронумерованной главки; в источнике она
      // помечена нулём (см. scripts/poema.mjs). В карточке слово понятнее.
      const slova = String(row.chapter || '');
      const rimskie = slova.match(/\b[IVXLC]+\b/g);
      // Номер части важнее слова: «часть 1, пролог» — это 1.0, а не 0.
      // Голый «пролог» без цифр — пролог всего произведения, он и есть 0.
      // «эпилог, часть 1, глава 16» — это метка Э.1.16: у эпилога «Войны и
      // мира» своя нумерация частей, и без приставки он слился бы с томом
      // первым.
      const epilog = /эпилог/i.test(slova) ? 'Э.' : '';
      const zayavleny = /\d/.test(slova)
        ? [epilog + (slova.match(/\d+/g) || []).join('.')]
        : /проло[гж]/i.test(slova)
        ? ['0']
        : rimskie || slova.split(/\s*(?:и|,|\/)\s*/).filter(Boolean);
      /*
       * «Часть 4» верно и для главы 4.2, и для песни 4.7. Менее точная
       * ссылка — не ошибка: у «Пира на весь мир» песни лежат внутри
       * глав, и указывать их номером значило бы выдумать нумерацию,
       * которой у Некрасова нет.
       */
      const podhodit = (z) => z === najdenaV || najdenaV.startsWith(z + '.');

      if (!zayavleny.length) bedy.push(`${gde}: не указана глава`);
      else if (!zayavleny.some(podhodit)) {
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
