/*
 * Разбор тома «Войны и мира» на главы.
 *
 * Зачем отдельный скрипт. У всех прочих произведений Викитека держит главу
 * отдельной страницей, и скачиванию достаточно перебрать адреса. Здесь
 * такие страницы есть, но все они — перенаправления на «Том 1»…«Том 4» и
 * «Эпилог»: текст набран по сканам ПСС в 90 томах и собирается
 * транслюзией, поэтому в wikitext тома лежит одна строка <pages index=…>.
 * Дословный текст можно взять только из разобранной страницы.
 *
 * Поэтому том забирается через action=parse и разбирается здесь.
 *
 * Границы глав в этой разметке — заголовки: «ЧАСТЬ ВТОРАЯ.» и римский
 * номер. Разметка у них непостоянна: первый заголовок тома приходит как
 * <h3> внутри mw-heading, остальные — как <div role="heading">, а одна
 * глава первого тома и вовсе <center>I.</center>. Поэтому берём все три
 * вида, а решаем по тексту заголовка.
 *
 * Отдельная засада: в номере главы X первого тома стоит кириллическая «Х».
 * Подставить её в римское число молча — значит получить главу, которой нет,
 * и потерять настоящую. Похожие буквы приводятся к латинским перед
 * разбором; к самому тексту романа это не применяется.
 *
 * Число глав в каждой части задаётся вызывающим и проверяется. Не сошлось —
 * исключение, а не предупреждение: сверка цитат по тексту, в котором
 * съехала нумерация, отчитается об успехе и будет неправа.
 */

const SUSCHNOSTI = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': '\u00a0',
};

const rasschifrovat = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&[a-z]+;/gi, (m) => SUSCHNOSTI[m.toLowerCase()] ?? m);

// Кириллические двойники латиницы в римских числах. Текст романа этого не
// касается — только распознавание заголовка.
const DVOYNIKI = { 'Х': 'X', 'х': 'X', 'С': 'C', 'с': 'C', 'І': 'I', 'і': 'I', 'М': 'M', 'м': 'M', 'Ѵ': 'V', 'Ь': 'b' };
const polatinski = (s) => s.replace(/[ХхСсІіМмѴ]/g, (c) => DVOYNIKI[c] ?? c);

const RIMSKIE = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV','XXV','XXVI','XXVII','XXVIII','XXIX','XXX','XXXI','XXXII','XXXIII','XXXIV','XXXV','XXXVI','XXXVII','XXXVIII','XXXIX','XL'];
const CHISLO = new Map(RIMSKIE.map((r, i) => [r, i + 1]));

const NOMER_CHASTI = new Map([
  ['ПЕРВАЯ', 1], ['ВТОРАЯ', 2], ['ТРЕТЬЯ', 3],
  ['ЧЕТВЁРТАЯ', 4], ['ЧЕТВЕРТАЯ', 4], ['ПЯТАЯ', 5],
]);

/*
 * Разметку в текст с метками заголовков. Отдельной функцией, потому что
 * том может прийти не одним куском: у «Тома 3» страница Викитеки
 * обрывается на 400-м листе скана, а глава XXXIV лежит дальше, и дальше
 * же — конец главы XXXIII. Каждый кусок чистится сам: примечания
 * обрезаются по своему хвосту, и склеивать до чистки нельзя — хвост
 * первого куска съел бы второй.
 */
function pochistit(html) {
  // ── 1. Оставить только тело страницы ──
  const nachalo = html.indexOf('class="prp-pages-output"');
  if (nachalo < 0) throw new Error('не нашёл prp-pages-output: разметка Викитеки изменилась');
  let t = html.slice(html.indexOf('>', nachalo) + 1);

  // Переводы французского лежат в примечаниях внизу. Это не текст романа:
  // цитата, случайно взятая оттуда, была бы цитатой из комментария.
  for (const hvost of ['<div class="mw-references-wrap', '<ol class="references"', '<div id="ws-footer"']) {
    const i = t.indexOf(hvost);
    if (i > 0) t = t.slice(0, i);
  }

  // ── 2. Выбросить то, что не текст ──
  // Номера страниц сканa: <span class="… pagenumber" …>[<a …>3</a>]</span>.
  t = t.replace(/<span class="[^"]*pagenumber[^"]*"[^>]*>[\s\S]*?<\/span>/g, '');
  // Сноски-переводы: надстрочный номер посреди фразы сломал бы цитату.
  t = t.replace(/<sup[^>]*class="[^"]*reference[^"]*"[^>]*>[\s\S]*?<\/sup>/g, '');
  t = t.replace(/<style[\s\S]*?<\/style>/g, '');
  t = t.replace(/<link\b[^>]*>/g, '');

  // ── 3. Заголовки — в метки, которые не спутать с текстом ──
  const vMetku = (_, telo) => `\n\u0001${rasschifrovat(telo.replace(/<[^>]+>/g, '')).trim()}\u0001\n`;
  t = t.replace(/<div role="heading"[^>]*>([\s\S]*?)<\/div>/g, vMetku);
  t = t.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/g, vMetku);
  t = t.replace(/<center>([\s\S]*?)<\/center>/g, vMetku);
  /*
   * Четвёртый вид разметки того же номера главы: <div class="div-center">I.</div>.
   * Так набраны первые главы частей второго тома. Перечислять виды дальше
   * бессмысленно — берём любой короткий центрированный блок, а решает всё
   * равно текст заголовка: что не похоже на номер и не похоже на «ЧАСТЬ
   * ВТОРАЯ», возвращается в текст и попадает в nepoznannye.
   */
  t = t.replace(/<div class="[^"]*center[^"]*"[^>]*>([^<]{1,40})<\/div>/g, vMetku);

  // ── 4. Остальная разметка — в переводы строк ──
  t = t.replace(/<br\s*\/?>/g, '\n');
  t = t.replace(/<\/(p|div|li|tr|blockquote)>/g, '\n\n');
  t = t.replace(/<[^>]+>/g, '');
  t = rasschifrovat(t);
  t = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  return t;
}

export function razobrat(razmetka, { metkaToma, chasti }) {
  // ── 5. Пройти метки по порядку ──
  const kuski = [].concat(razmetka).map(pochistit).join('\n\n').split('\u0001');
  const glavy = [];
  let chast = 0;
  let glava = 0;
  let tekuschaya = null;
  const nepoznannye = [];
  /*
   * Во втором томе у части второй номер первой главы не набран: за
   * «ЧАСТЬ ВТОРАЯ.» сразу идёт текст. Если такой текст просто выбросить,
   * пропадёт целая глава, а сверка отчитается об успехе — проверка ниже
   * считает только то, что нашлось.
   *
   * Поэтому после заголовка части ждём: пришёл существенный кусок текста
   * раньше, чем номер главы — это и есть глава первая. Порог в 400 знаков
   * отделяет её от пробелов и переносов, которые лежат между заголовком
   * части и номером главы в остальных томах.
   */
  let zhdyomPervuyu = false;

  for (let i = 0; i < kuski.length; i += 1) {
    // Чётные куски — текст, нечётные — содержимое заголовка.
    if (i % 2 === 0) {
      if (zhdyomPervuyu && kuski[i].trim().length >= 400) {
        glava = 1;
        tekuschaya = { chast, glava, telo: [] };
        glavy.push(tekuschaya);
        zhdyomPervuyu = false;
      }
      if (tekuschaya) tekuschaya.telo.push(kuski[i]);
      continue;
    }
    const zag = kuski[i].replace(/\s+/g, ' ').trim();

    // Внутри главы части текста разделены строкой тире, и в разметке это
    // такой же <center>, как номер главы. Это не заголовок и не текст.
    if (/^[—–-]+$/.test(zag)) continue;

    const mChast = zag.match(/^ЧАСТЬ\s+([А-ЯЁ]+)\.?$/i);
    if (mChast) {
      // ЧЕТВЁРТАЯ и ЧЕТВЕРТАЯ — одна и та же четвёртая: в сканах ПСС «ё»
      // проставлена не везде.
      const nomer = NOMER_CHASTI.get(mChast[1].toUpperCase());
      if (!nomer) throw new Error(`не знаю части «${zag}»`);
      chast = nomer;
      glava = 0;
      tekuschaya = null;
      zhdyomPervuyu = true;
      continue;
    }
    const mGlava = polatinski(zag).match(/^([IVXLM]+)\.?$/);
    if (mGlava && CHISLO.has(mGlava[1])) {
      if (chast === 0) chast = 1; // первая часть тома иногда без заголовка
      zhdyomPervuyu = false;
      glava = CHISLO.get(mGlava[1]);
      tekuschaya = { chast, glava, telo: [] };
      glavy.push(tekuschaya);
      continue;
    }
    // Не заголовок — значит текст, и возвращается в текст. С переводами
    // строк: без них он слипся бы с соседними словами.
    nepoznannye.push(zag);
    if (tekuschaya) tekuschaya.telo.push(`\n${zag}\n`);
  }

  // ── 6. Проверить, что вышло ровно столько глав, сколько заявлено ──
  const poChastyam = new Map();
  for (const g of glavy) {
    if (!poChastyam.has(g.chast)) poChastyam.set(g.chast, []);
    poChastyam.get(g.chast).push(g.glava);
  }
  const bedy = [];
  if (poChastyam.size !== chasti.length) {
    bedy.push(`частей ${poChastyam.size}, ожидалось ${chasti.length}`);
  }
  for (const [ch, skolko] of chasti.entries()) {
    const est = poChastyam.get(ch + 1) || [];
    const dolzhno = Array.from({ length: skolko }, (_, i) => i + 1);
    if (est.join(',') !== dolzhno.join(',')) {
      bedy.push(`часть ${ch + 1}: главы ${est.join(',') || '—'}, ожидались 1…${skolko}`);
    }
  }
  if (bedy.length) throw new Error(`том ${metkaToma}:\n  ${bedy.join('\n  ')}`);

  const pustye = glavy.filter((g) => g.telo.join('').trim().length < 400);
  if (pustye.length) {
    throw new Error(
      `том ${metkaToma}: глава пришла пустой — ${pustye.map((g) => `${g.chast}.${g.glava}`).join(', ')}`
    );
  }

  return {
    tekst: glavy
      .map((g) => `== ${metkaToma}.${g.chast}.${g.glava} ==\n${g.telo.join('').trim()}`)
      .join('\n\n'),
    glav: glavy.length,
    nepoznannye,
  };
}
