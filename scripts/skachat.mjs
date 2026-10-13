/*
 * Скачивание текста произведения с Викитеки — дословно, через API.
 *
 * Не через обычную страницу: оттуда текст пришёл бы уже обработанным, а
 * сверка цитат требует ровно того, что набрано в источнике, до последней
 * запятой. action=raw отдаёт исходник статьи как есть.
 *
 * Главы складываются в один файл с заголовками «== I ==» — в таком виде
 * его читает scripts/sverka.mjs.
 *
 *   node scripts/skachat.mjs otcy-i-deti
 */
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const KORENb = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES = join(KORENb, 'lithero-content', 'sources');

const rim = (n) => {
  const Z = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let o = '', r = n;
  for (const [v, z] of Z) while (r >= v) { o += z; r -= v; }
  return o;
};
const RIM = rim;

const RABOTY = {
  'otcy-i-deti': {
    // На Викитеке роман разложен по главам отдельными страницами
    stranica: (n) => `Отцы и дети (Тургенев)/Глава ${n}`,
    glav: 28,
    izdanie: 'ru.wikisource.org · И. С. Тургенев. Отцы и дети',
  },
  oblomov: {
    /*
     * Роман разбит на четыре части, и главы нумеруются внутри каждой
     * заново. «Глава 9» без части — это четыре разных места в книге, и
     * ученик, отправленный по такой ссылке, ищет цитату втрое дольше.
     * Поэтому метка составная: 1.9 значит часть первая, глава девятая.
     */
    chasti: [11, 12, 12, 11],
    stranica: (chast, glava) => `Обломов (Гончаров)/Часть ${chast}/Глава ${glava}`,
    izdanie: 'ru.wikisource.org · И. А. Гончаров. Обломов',
  },

  /*
   * Короткая вещь лежит на Викитеке одной страницей. Метки глав тогда
   * ставить не из чего, и ставить их незачем: вся вещь — одно место, и
   * ссылка «глава такая-то» только мешала бы.
   */
  'chelovek-v-futlyare': {
    listy: [{ metka: '1', imya: 'Человек в футляре (Чехов)', podpis: 'рассказ целиком' }],
    izdanie: 'ru.wikisource.org · А. П. Чехов. Человек в футляре',
  },
  student: {
    listy: [{ metka: '1', imya: 'Студент (Чехов)', podpis: 'рассказ целиком' }],
    izdanie: 'ru.wikisource.org · А. П. Чехов. Студент',
  },

  /*
   * Пьеса разложена по действиям отдельными страницами. Явления внутри
   * размечает scripts/pyesa.mjs — уже после скачивания.
   */
  'vishnevyy-sad': {
    listy: ['первое', 'второе', 'третье', 'четвёртое'].map((s, i) => ({
      metka: String(i + 1),
      imya: `Вишнёвый сад (Чехов)/Действие ${s}`,
      podpis: `действие ${i + 1}`,
    })),
    izdanie: 'ru.wikisource.org · А. П. Чехов. Вишнёвый сад',
  },
  'na-dne': {
    listy: [{ metka: '1', imya: 'На дне (Горький)/ИС 1986', podpis: 'пьеса целиком' }],
    izdanie: 'ru.wikisource.org · М. Горький. На дне',
  },

  'gospodin-iz-san-francisco': {
    listy: [{ metka: '1', imya: 'Господин из Сан-Франциско (Бунин)', podpis: 'рассказ целиком' }],
    izdanie: 'ru.wikisource.org · И. А. Бунин. Господин из Сан-Франциско',
  },

  /*
   * Поэмы приходят одной страницей, но деление внутри у них своё:
   * у Блока двенадцать пронумерованных глав, у Маяковского четыре
   * части с прологом. Разметку наводит pyesa.mjs или руки — здесь
   * важно только скачать дословно.
   */
  dvenadtsat: {
    listy: [{ metka: '1', imya: 'Двенадцать (Блок)', podpis: 'поэма целиком' }],
    izdanie: 'ru.wikisource.org · А. А. Блок. Двенадцать',
  },
  'oblako-v-shtanakh': {
    listy: [{ metka: '1', imya: 'Облако в штанах (Маяковский)', podpis: 'поэма целиком' }],
    izdanie: 'ru.wikisource.org · В. В. Маяковский. Облако в штанах',
  },

  /*
   * Роман по частям и главам, и то и другое римскими цифрами. Метка
   * составная: 4.4 — часть четвёртая, глава четвёртая. Эпилог идёт
   * седьмой частью: иначе две его главы некуда деть, а ссылаться на
   * них приходится — там каторга и сон о моровой язве.
   */
  'prestuplenie-i-nakazanie': {
    listy: [
      ...[7, 7, 6, 6, 5, 8].flatMap((glav, ch) =>
        Array.from({ length: glav }, (_, g) => ({
          metka: `${ch + 1}.${g + 1}`,
          imya: `Преступление и наказание (Достоевский)/Часть ${RIM(ch + 1)}/Глава ${RIM(g + 1)}`,
          podpis: `часть ${ch + 1}, глава ${g + 1}`,
        }))
      ),
      ...[1, 2].map((g) => ({
        metka: `7.${g}`,
        imya: `Преступление и наказание (Достоевский)/Эпилог/${RIM(g)}`,
        podpis: `эпилог, глава ${g}`,
      })),
    ],
    izdanie: 'ru.wikisource.org · Ф. М. Достоевский. Преступление и наказание',
  },

  /*
   * Поэма из четырёх частей, у каждой свои главы, и у двух есть пролог.
   * Метка составная: 3.4 — часть третья «Крестьянка», глава четвёртая.
   * Пролог части помечен нулём: 1.0 и 3.0.
   *
   * Песни «Пира на весь мир» («Русь», «Барщинная», «Голодная» и прочие)
   * лежат на Викитеке отдельными страницами, но входят и в главы — их
   * не качаем, иначе один и тот же текст попал бы в две главы сразу и
   * сверка показывала бы цитату не там, где она на самом деле.
   */
  'kto-na-rusi': {
    listy: [
      { metka: '1.0', imya: 'Кому на Руси жить хорошо (Некрасов)/Часть первая/Пролог', podpis: 'часть 1, пролог' },
      ...['I. Поп', 'II. Сельская ярмонка', 'III. Пьяна ночь', 'IV. Счастливые', 'V. Помещик'].map((g, i) => ({
        metka: `1.${i + 1}`,
        imya: `Кому на Руси жить хорошо (Некрасов)/Часть первая/Глава ${g}`,
        podpis: `часть 1, глава ${i + 1}`,
      })),
      ...['I. Петровки. Время жаркое', 'II. Помещик наш особенный', 'III. Пошли за Власом странники'].map((g, i) => ({
        metka: `2.${i + 1}`,
        imya: `Кому на Руси жить хорошо (Некрасов)/Часть вторая. Последыш/${g}`,
        podpis: `часть 2, глава ${i + 1}`,
      })),
      { metka: '3.0', imya: 'Кому на Руси жить хорошо (Некрасов)/Часть третья. Крестьянка/Пролог', podpis: 'часть 3, пролог' },
      ...[
        'I. До замужества', 'II. Песни', 'III. Савелий, богатырь святорусский', 'IV. Дёмушка',
        'V. Волчица', 'VI. Трудный год', 'VII. Губернаторша', 'VIII. Бабья притча',
      ].map((g, i) => ({
        metka: `3.${i + 1}`,
        imya: `Кому на Руси жить хорошо (Некрасов)/Часть третья. Крестьянка/Глава ${g}`,
        podpis: `часть 3, глава ${i + 1}`,
      })),
      { metka: '4.0', imya: 'Кому на Руси жить хорошо (Некрасов)/Часть четвёртая. Пир на весь мир/Вступление', podpis: 'часть 4, вступление' },
      ...[
        'I. Горькое время — горькие песни', 'II. Странники и богомольцы',
        'III. Старое и новое', 'IV. Доброе время — добрые песни',
      ].map((g, i) => ({
        metka: `4.${i + 1}`,
        imya: `Кому на Руси жить хорошо (Некрасов)/Часть четвёртая. Пир на весь мир/${g}`,
        podpis: `часть 4, глава ${i + 1}`,
      })),
      /*
       * Песни «Пира на весь мир» лежат на Викитеке отдельными страницами
       * и в главы не включены — без них пропадает «Русь», та самая «Ты и
       * убогая, ты и обильная», которой поэма отвечает на свой вопрос.
       *
       * Номера им даются подряд, но в карточке ссылаются на часть целиком:
       * своей нумерации у этих песен нет, и придумывать её не надо.
       */
      ...[
        'Барщинная', 'Бурлак', 'Голодная', 'Солдатская', 'Солёная',
        'Крестьянский грех', 'О двух великих грешниках',
        'Про холопа примерного — Якова верного', 'Русь',
      ].map((p, i) => ({
        metka: `4.${i + 5}`,
        imya: `Кому на Руси жить хорошо (Некрасов)/Часть четвёртая. Пир на весь мир/${p}`,
        podpis: `часть 4, «${p}»`,
      })),
    ],
    izdanie: 'ru.wikisource.org · Н. А. Некрасов. Кому на Руси жить хорошо',
  },

  /*
   * Четыре тома, в каждом свои части, в части своя нумерация глав. Одна
   * «глава IX» без тома и части — это десяток разных мест в книге, и
   * ученик по такой ссылке будет искать цитату полчаса. Поэтому метка
   * трёхсоставная: 1.1.25 значит том первый, часть первая, глава
   * двадцать пятая.
   *
   * Эпилог — не пятый том, и писать «том 5» значило бы соврать. Его
   * метки идут с «Э.»: Э.1.16 — эпилог, часть первая, глава
   * шестнадцатая. Это понимают METKA и сверка (scripts/sverka.mjs).
   *
   * Страницы отдельных глав на Викитеке есть, но все они —
   * перенаправления: текст набран по сканам ПСС в 90 томах и собирается
   * транслюзией, так что в wikitext тома лежит одна строка <pages
   * index=…>. Поэтому том забирается разобранным (action=parse), а режет
   * его на главы scripts/epopeya.mjs — он же проверяет, что глав вышло
   * ровно столько, сколько здесь заявлено.
   *
   * Числа не из памяти: структура перебрана по allpages Викитеки, 361
   * глава, пропусков в нумерации нет.
   */
  'voyna-i-mir': {
    toma: [
      { imya: 'Том 1', metka: '1', chasti: [25, 21, 19] },
      { imya: 'Том 2', metka: '2', chasti: [16, 21, 26, 13, 22] },
      /*
       * У страницы «Том 3» в директиве стоит to=400, а текст тома идёт до
       * 409-го листа скана: обрезаны конец главы XXXIII и вся глава XXXIV
       * (Пьер вытаскивает ребёнка из огня и попадает под арест) — то, чем
       * том кончается. Это недосмотр на стороне Викитеки, и молча потерять
       * из-за него главу нельзя, поэтому хвост забирается отдельно.
       * Остальные тома проверены: они кончаются там, где начинаются
       * «Печатные варианты».
       */
      {
        imya: 'Том 3',
        metka: '3',
        chasti: [23, 39, 34],
        hvost: { skan: 'L. N. Tolstoy. All in 90 volumes. Volume 11.pdf', ot: 401, do: 409 },
      },
      { imya: 'Том 4', metka: '4', chasti: [16, 19, 19, 20] },
      { imya: 'Эпилог', metka: 'Э', chasti: [16, 12] },
    ],
    izdanie: 'ru.wikisource.org · Л. Н. Толстой. Война и мир. ПСС в 90 т., тт. 9—12',
  },

  /*
   * Единственное произведение не с Викитеки: «Чистого понедельника» там
   * нет — ни отдельной страницей, ни в составе «Тёмных аллей» (на
   * Викитеке лежит только одноимённый рассказ, давший название сборнику).
   *
   * Бунин умер в 1953 году, значит с 1 января 2024 года его тексты в
   * общественном достоянии (ст. 1281 ГК РФ: жизнь автора плюс семьдесят
   * лет). Поэтому берём из библиотеки Комарова, которая указывает
   * печатное издание, и это издание записано в источнике карточек.
   *
   * Разметка там своя: абзац — <z>, отступ — <o></o>. Рассказ лежит
   * одной страницей, p.2 отдаёт перенаправление.
   */
  'chistyy-ponedelnik': {
    ilibrary: 1019,
    izdanie:
      'ilibrary.ru · И. А. Бунин. Стихотворения. Рассказы. Повести. Библиотека Всемирной литературы. М.: Художественная литература, 1973',
  },
};


const slug = process.argv[2];
const r = RABOTY[slug];
if (!r) {
  console.error(`не знаю произведения «${slug}». Известны: ${Object.keys(RABOTY).join(', ')}`);
  process.exit(1);
}

mkdirSync(SOURCES, { recursive: true });

/*
 * Рассказ из библиотеки Комарова. Так забирается только «Чистый
 * понедельник» — почему, написано в его записи выше.
 *
 * Страница в windows-1251, и это надо читать из объявленной кодировки, а
 * не предполагать utf-8: иначе получится мусор, в котором сверка не найдёт
 * ни одной цитаты и будет права.
 */
if (r.ilibrary) {
  const url = `http://ilibrary.ru/text/${r.ilibrary}/p.1/index.html`;
  let bayty = null;
  for (let popytka = 1; popytka <= 3; popytka += 1) {
    try {
      const otvet = await fetch(url, { headers: { 'user-agent': 'lithero-sverka/1.0' } });
      if (!otvet.ok) throw new Error(`код ${otvet.status}`);
      bayty = Buffer.from(await otvet.arrayBuffer());
      break;
    } catch (e) {
      if (popytka === 3) throw new Error(`${url}: ${e.message}`);
      await new Promise((res) => setTimeout(res, 1500 * popytka));
    }
  }

  const html = new TextDecoder('windows-1251').decode(bayty);
  const SUSCHNOSTI = {
    '&mdash;': '—', '&ndash;': '–', '&laquo;': '«', '&raquo;': '»',
    '&bdquo;': '„', '&ldquo;': '“', '&rdquo;': '”', '&hellip;': '…',
    '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
  };
  const abzacy = [...html.matchAll(/<z>([\s\S]*?)<\/z>/g)].map((m) =>
    m[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&[a-z]+;/g, (s) => SUSCHNOSTI[s] ?? s)
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .trim()
  );

  // Первый абзац — имя автора, набранное тем же тегом. Это не текст
  // рассказа, и цитата из него была бы цитатой из шапки страницы.
  if (/^Иван Бунин$/.test(abzacy[0])) abzacy.shift();

  if (abzacy.length < 50) throw new Error(`абзацев всего ${abzacy.length} — разметка изменилась`);
  const ostalis = [...new Set(abzacy.join('').match(/&[a-z]+;/g) || [])];
  if (ostalis.length) throw new Error(`нераспознанные сущности: ${ostalis.join(' ')}`);

  const putI = join(SOURCES, `${slug}.raw.txt`);
  /*
   * Метка «== 1 ==» одна на весь рассказ: он идёт сплошь, и делить его на
   * главы значило бы выдумать деление, которого у Бунина нет. Сверка на
   * одной главе номера не проверяет — проверять нечего, цитата может быть
   * найдена только здесь. Так же лежат «Студент», «Человек в футляре» и
   * «Господин из Сан-Франциско».
   */
  writeFileSync(putI, `== 1 ==\n${abzacy.join('\n\n')}\n`, 'utf8');
  console.log(`${putI}`);
  console.log(`абзацев ${abzacy.length}, ${(abzacy.join('').length / 1024).toFixed(0)} КБ`);
  console.log(`издание: ${r.izdanie}`);
  process.exit(0);
}

/*
 * Том целиком, разобранным. Так забирается только «Война и мир»: у неё
 * страницы глав — перенаправления, и дословный текст лежит в разобранной
 * странице тома. Подробности — в записи 'voyna-i-mir' выше и в
 * scripts/epopeya.mjs.
 */
if (r.toma) {
  const { razobrat } = await import('./epopeya.mjs');

  const razobrannoe = async (chto, parametry) => {
    const u = new URL('https://ru.wikisource.org/w/api.php');
    u.searchParams.set('action', 'parse');
    u.searchParams.set('prop', 'text');
    u.searchParams.set('formatversion', '2');
    u.searchParams.set('format', 'json');
    for (const [k, v] of Object.entries(parametry)) u.searchParams.set(k, v);

    for (let popytka = 1; popytka <= 3; popytka += 1) {
      try {
        const otvet = await fetch(u, { headers: { 'user-agent': 'lithero-sverka/1.0' } });
        if (!otvet.ok) throw new Error(`код ${otvet.status}`);
        const j = await otvet.json();
        const html = j?.parse?.text;
        if (!html) throw new Error('в ответе нет разобранного текста');
        return html;
      } catch (e) {
        if (popytka === 3) throw new Error(`${chto}: ${e.message}`);
        await new Promise((res) => setTimeout(res, 800 * popytka));
      }
    }
    return '';
  };

  const chasti = [];
  let glav = 0;
  for (const t of r.toma) {
    const razmetka = [
      await razobrannoe(t.imya, { page: `Война и мир (Толстой)/${t.imya}` }),
    ];
    if (t.hvost) {
      razmetka.push(
        await razobrannoe(`${t.imya}, хвост`, {
          title: `Война и мир (Толстой)/${t.imya}`,
          contentmodel: 'wikitext',
          text: `<pages index="${t.hvost.skan}" from=${t.hvost.ot} to=${t.hvost.do} />`,
        })
      );
    }

    const razbor = razobrat(razmetka, { metkaToma: t.metka, chasti: t.chasti });
    chasti.push(razbor.tekst);
    glav += razbor.glav;
    const lishnee = razbor.nepoznannye.length ? `, непонятных заголовков ${razbor.nepoznannye.length}` : '';
    console.log(`${t.imya}: глав ${razbor.glav}${lishnee}`);
  }

  const putT = join(SOURCES, `${slug}.raw.txt`);
  writeFileSync(putT, chasti.join('\n\n') + '\n', 'utf8');
  console.log(`\n${putT}`);
  console.log(`глав ${glav}, ${(chasti.join('').length / 1024).toFixed(0)} КБ`);
  console.log(`издание: ${r.izdanie}`);
  process.exit(0);
}

/*
 * Список страниц к скачиванию. У одних произведений главы идут сплошной
 * нумерацией, у других — внутри частей, и тогда метка составная: «1.9»
 * значит часть первая, глава девятая. Одна «глава 9» без части — это
 * четыре разных места в книге.
 */
const stranicy = r.listy
  ? r.listy
  : r.chasti
  ? r.chasti.flatMap((skolko, i) =>
      Array.from({ length: skolko }, (_, j) => ({
        metka: `${i + 1}.${j + 1}`,
        imya: r.stranica(i + 1, j + 1),
        podpis: `часть ${i + 1}, глава ${j + 1}`,
      }))
    )
  : Array.from({ length: r.glav }, (_, i) => ({
      metka: rim(i + 1),
      imya: r.stranica(i + 1),
      podpis: `глава ${rim(i + 1)}`,
    }));

const kuski = [];
for (const [i, s] of stranicy.entries()) {
  const url =
    'https://ru.wikisource.org/w/index.php?action=raw&title=' + encodeURIComponent(s.imya);

  let telo = '';
  for (let popytka = 1; popytka <= 3; popytka += 1) {
    try {
      const otvet = await fetch(url, { headers: { 'user-agent': 'lithero-sverka/1.0' } });
      if (!otvet.ok) throw new Error(`код ${otvet.status}`);
      telo = await otvet.text();
      break;
    } catch (e) {
      if (popytka === 3) throw new Error(`${s.podpis}: ${e.message}`);
      await new Promise((res) => setTimeout(res, 800 * popytka));
    }
  }

  // Пустая или подозрительно короткая глава — повод остановиться, а не
  // молча записать заглушку: сверка потом «не найдёт» цитаты и мы будем
  // искать ошибку в данных, которой там нет.
  if (telo.trim().length < 400) throw new Error(`${s.podpis} пришла пустой (${telo.length} байт)`);

  // У страницы главы есть свой заголовок и хвост с примечаниями. Заголовок
  // дублировал бы наш и сбивал счёт глав, примечания — это не текст романа,
  // и цитата, случайно взятая оттуда, была бы цитатой из комментария.
  telo = telo.replace(/^==\s*Примечания\s*==[\s\S]*$/m, '');
  telo = telo.replace(/^==+\s*(?:Глава\s*)?[IVXL\d]+\s*==+\s*$/gim, '');

  kuski.push(`== ${s.metka} ==\n${telo.trim()}`);
  process.stdout.write(`\rскачано: ${i + 1} из ${stranicy.length}`);
}

const put = join(SOURCES, `${slug}.raw.txt`);
writeFileSync(put, kuski.join('\n\n') + '\n', 'utf8');
console.log(`\n${put}`);
console.log(`кусков ${stranicy.length}, ${(kuski.join('').length / 1024).toFixed(0)} КБ`);
console.log(`издание: ${r.izdanie}`);
