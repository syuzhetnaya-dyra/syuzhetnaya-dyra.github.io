/*
 * Вставка присланных картинок на сайт.
 *
 * Берёт всё из «входящие-картинки», разбирает и раскладывает:
 *
 *   вертикальная  → карточка героя: вырезка, прозрачный фон,
 *                   public/heroes/cut/<произведение>__<карточка>.webp 820×1230
 *                   и миниатюра для чека
 *   широкая       → первый экран: public/hero/<произведение>-1680.jpg и -900.jpg
 *
 * Два решения, которые стоит объяснить.
 *
 * ЛИСТ С НЕСКОЛЬКИМИ КАДРАМИ. Генераторы охотно возвращают не карточку, а
 * целый лист из восьми обрывков одного героя. Такой лист на сайте выглядит
 * contact sheet-ом, а не карточкой. Поэтому после вырезки фона считаются
 * связные области, и если их много, остаются три самые крупные — ровно
 * столько фрагментов в карточке «Старцев», с которой сверяется вся серия.
 *
 * ФОН УБИРАЕТСЯ ЗАЛИВКОЙ ОТ КРАЯ, а не отбором по цвету: внутри коллажа
 * полно светлого — бумага, небо, рубаха. Отбор «всё, что похоже на
 * кремовый» пробил бы в них дыры. Заливка идёт по связной области от рамки
 * и внутренних светлых пятен не достаёт: до них нужно пройти через тёмный
 * коллаж, а он её останавливает.
 *
 *   node scripts/vstavit.mjs            — разложить и записать
 *   node scripts/vstavit.mjs --suho     — только показать, что куда ляжет
 */
import sharp from 'sharp';
import { readdirSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, extname, basename } from 'node:path';

const KORENb = join(dirname(fileURLToPath(import.meta.url)), '..');
/*
 * Откуда брать картинки. По умолчанию — папка в проекте, но её ещё нужно
 * найти, а искать папку с кириллическим именем в чужом Проводнике — лишний
 * шаг. Поэтому путь можно просто назвать:
 *
 *   node scripts/vstavit.mjs "C:/Users/Anastasia/Downloads/картинки"
 */
const ukazan = process.argv.slice(2).find((a) => !a.startsWith('--'));
const VHOD = ukazan || join(KORENb, 'входящие-картинки');
const CUT = join(KORENb, 'public', 'heroes', 'cut');
const THUMB = join(CUT, 'thumb');
const HERO = join(KORENb, 'public', 'hero');
const RAZOBRANO = join(VHOD, 'разобрано');

const SUHO = process.argv.includes('--suho');
const LIST = join(VHOD, 'контрольные-листы');

// На сколько пикселей сжимать маску, чтобы разорвать перемычки между
// соприкасающимися кадрами листа. Шесть хватает: шов между кадрами уже,
// чем кадр, но шире случайного касания углами.
const SZHATIE = 6;

/*
 * Ручной выбор кусков для конкретного файла: имя файла → номера кусков с
 * контрольного листа. Нужен, когда три самых крупных куска оказались
 * видами комнаты, а герой — на четвёртом.
 */
const VYBOR = {
  // проба-базаров.png: [1, 3, 5],
};
const TOL = 30;
const SHIRINA = 820;
const VYSOTA = 1230;

// ─── Кого мы вообще знаем ───

const { dataBySlug } = await import(pathToFileURL(join(KORENb, 'src/data/all.js')).href);
const { works } = await import(pathToFileURL(join(KORENb, 'src/data/works.js')).href);

const prosto = (s) =>
  s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/g, ' ')
    .trim();

// Словарь примет: по какому слову в имени файла узнаётся карточка
const karty = [];
for (const [slug, d] of Object.entries(dataBySlug)) {
  for (const c of d.cards) {
    const primety = new Set([c.id, ...prosto(c.name).split(' ').filter((w) => w.length > 3)]);
    karty.push({ slug, id: c.id, name: c.name, primety: [...primety].map(prosto) });
  }
}

const ekrany = works.map((w) => ({
  slug: w.slug,
  title: w.title,
  primety: [w.slug, ...prosto(w.title).split(' ').filter((x) => x.length > 3)].map(prosto),
}));

function opoznat(imya, shirokaya) {
  const n = prosto(imya);
  const spisok = shirokaya ? ekrany : karty;
  // Длинная примета вернее короткой: «базаров» надёжнее, чем «дети»
  const nayden = spisok
    .flatMap((k) => k.primety.map((p) => ({ k, p })))
    .filter(({ p }) => p && n.includes(p))
    .sort((a, b) => b.p.length - a.p.length)[0];
  return nayden ? nayden.k : null;
}

// ─── Вырезка фона ───

function vyrezat(data, W, H, ch) {
  const rs = [], gs = [], bs = [];
  const push = (x, y) => {
    const i = (y * W + x) * ch;
    rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]);
  };
  for (let x = 0; x < W; x += 1) { push(x, 0); push(x, H - 1); }
  for (let y = 0; y < H; y += 1) { push(0, y); push(W - 1, y); }
  const med = (a) => a.sort((p, q) => p - q)[a.length >> 1];
  const bg = [med(rs), med(gs), med(bs)];

  const near = (i) =>
    Math.abs(data[i] - bg[0]) <= TOL &&
    Math.abs(data[i + 1] - bg[1]) <= TOL &&
    Math.abs(data[i + 2] - bg[2]) <= TOL;

  const isBg = new Uint8Array(W * H);
  const stack = [];
  const seed = (x, y) => {
    const p = y * W + x;
    if (!isBg[p] && near(p * ch)) { isBg[p] = 1; stack.push(p); }
  };
  for (let x = 0; x < W; x += 1) { seed(x, 0); seed(x, H - 1); }
  for (let y = 0; y < H; y += 1) { seed(0, y); seed(W - 1, y); }
  while (stack.length) {
    const p = stack.pop();
    const x = p % W;
    const y = (p - x) / W;
    if (x > 0) seed(x - 1, y);
    if (x < W - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < H - 1) seed(x, y + 1);
  }
  return { isBg, bg };
}

// ─── Разрыв перемычек ───
//
// На листе кадры лежат встык и местами соприкасаются углами. Для заливки
// это одна фигура, и «три самых крупных куска» превращаются в один лист
// целиком. Поэтому маска сначала сжимается: тонкие перемычки рвутся, куски
// становятся отдельными, — а потом разжимается обратно, чтобы вернуть
// кадрам полный размер.

function szhat(mask, W, H, raz) {
  let cur = mask;
  for (let i = 0; i < raz; i += 1) {
    const next = new Uint8Array(W * H);
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const p = y * W + x;
        if (!cur[p]) continue;
        if (x === 0 || x === W - 1 || y === 0 || y === H - 1) continue;
        if (cur[p - 1] && cur[p + 1] && cur[p - W] && cur[p + W]) next[p] = 1;
      }
    }
    cur = next;
  }
  return cur;
}

// ─── Связные куски: лист из многих кадров или одна карточка ───

// fig — карта фигуры: 1 там, где есть изображение.
function kuski(fig, W, H) {
  const metka = new Int32Array(W * H).fill(-1);
  const spisok = [];
  const ochered = new Int32Array(W * H);

  for (let start = 0; start < W * H; start += 1) {
    if (!fig[start] || metka[start] >= 0) continue;
    const nomer = spisok.length;
    let golova = 0;
    let hvost = 0;
    ochered[hvost += 1] = start;
    metka[start] = nomer;
    let n = 0;
    let x0 = W, y0 = H, x1 = 0, y1 = 0;

    while (golova < hvost) {
      const p = ochered[golova += 1];
      n += 1;
      const x = p % W;
      const y = (p - x) / W;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      const sosedi = [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1];
      for (const q of sosedi) {
        if (q < 0 || !fig[q] || metka[q] >= 0) continue;
        metka[q] = nomer;
        ochered[hvost += 1] = q;
      }
    }
    spisok.push({ nomer, n, x0, y0, x1, y1 });
  }
  return { metka, spisok };
}

// ─── Обработка одного файла ───

async function obrabotat(file) {
  const imya = basename(file);
  const meta = await sharp(file).metadata();
  const shirokaya = meta.width / meta.height > 1.2;

  const cel = opoznat(imya, shirokaya);
  if (!cel) return { imya, bed: shirokaya ? 'не понял, к какому произведению экран' : 'не понял, чья карточка' };

  if (shirokaya) {
    // Первый экран: фон не режется, он и есть кадр
    if (!SUHO) {
      mkdirSync(HERO, { recursive: true });
      await sharp(file).resize(1680, null, { withoutEnlargement: true }).jpeg({ quality: 86 }).toFile(join(HERO, `${cel.slug}-1680.jpg`));
      await sharp(file).resize(900, null, { withoutEnlargement: true }).jpeg({ quality: 84 }).toFile(join(HERO, `${cel.slug}-900.jpg`));
    }
    return { imya, kuda: `hero/${cel.slug}-1680.jpg и -900.jpg`, chto: cel.title };
  }

  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, ch = info.channels;
  const { isBg, bg } = vyrezat(data, W, H, ch);
  const bumaga = (d, i) =>
    Math.abs(d[i] - bg[0]) <= TOL && Math.abs(d[i + 1] - bg[1]) <= TOL && Math.abs(d[i + 2] - bg[2]) <= TOL;

  const est = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p += 1) est[p] = isBg[p] ? 0 : 1;

  /*
   * Делить кадры и вырезать фон — две разные задачи, и маски у них разные.
   *
   * Вырезает фон заливка от края: она не трогает светлое внутри кадров.
   * Но до швов между кадрами она не доходит — швы замкнуты кадрами со всех
   * сторон, — и для неё весь лист остаётся одной фигурой.
   *
   * Поэтому для ДЕЛЕНИЯ берётся отбор по цвету: он находит и внутренние
   * швы тоже. Дыры, которые он пробивает в светлых местах внутри кадров,
   * здесь безвредны: по этой маске мы только считаем куски, а в итоговую
   * картинку она не попадает.
   */
  const poCvetu = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p += 1) poCvetu[p] = est[p] && !bumaga(data, p * ch) ? 1 : 0;

  const yadra = szhat(poCvetu, W, H, SZHATIE);
  const { metka, spisok } = kuski(yadra, W, H);

  // Крупными считаем куски от полупроцента площади: мелочь — это обрывки
  // бумаги и шум заливки, их отбрасываем всегда.
  const porog = W * H * 0.005;
  const krupnye = spisok.filter((k) => k.n >= porog).sort((a, b) => b.n - a.n);
  const list = krupnye.length >= 4;

  // Какие куски оставить: по умолчанию три самых крупных, но выбор можно
  // задать руками — номера видны на контрольном листе.
  const ruchnoy = VYBOR[imya.toLowerCase()];
  const vybrany = ruchnoy
    ? ruchnoy.map((i) => krupnye[i - 1]).filter(Boolean)
    : list
      ? krupnye.slice(0, 3)
      : krupnye;
  const ostavit = new Set(vybrany.map((k) => k.nomer));

  // Возвращаем кускам полный размер: разжимаем ядра обратно по исходной
  // маске, иначе у кадров съелась бы рамка в SZHATIE пикселей.
  const yadro = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p += 1) if (yadra[p] && ostavit.has(metka[p])) yadro[p] = 1;

  let volna = yadro;
  for (let i = 0; i < SZHATIE + 2; i += 1) {
    const next = Uint8Array.from(volna);
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const p = y * W + x;
        if (volna[p] || !est[p]) continue;
        if (
          (x > 0 && volna[p - 1]) || (x < W - 1 && volna[p + 1]) ||
          (y > 0 && volna[p - W]) || (y < H - 1 && volna[p + W])
        ) next[p] = 1;
      }
    }
    volna = next;
  }

  const alpha = new Uint8Array(W * H);
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let p = 0; p < W * H; p += 1) {
    if (!volna[p]) continue;
    alpha[p] = 255;
    const x = p % W;
    const y = (p - x) / W;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  if (x1 <= x0 || y1 <= y0) return { imya, bed: 'после вырезки ничего не осталось — фон не опознан' };

  // Контрольный лист с номерами кусков: по нему видно, какие три взяты и
  // какие можно попросить взамен.
  if (list && !SUHO) {
    mkdirSync(LIST, { recursive: true });
    const podpisi = krupnye
      .map((k, i) => `<text x="${k.x0 + 14}" y="${k.y0 + 64}" font-family="sans-serif" font-size="56" font-weight="700" fill="${ostavit.has(k.nomer) ? '#7b1d2b' : '#9a8f7d'}">${i + 1}</text>`)
      .join('');
    await sharp(file)
      .composite([{ input: Buffer.from(`<svg width="${W}" height="${H}">${podpisi}</svg>`), top: 0, left: 0 }])
      .jpeg({ quality: 80 })
      .toFile(join(LIST, `${cel.slug}__${cel.id}.jpg`));
  }

  // Край сглаживается: жёсткая маска даёт зубцы на рваной бумаге, которая
  // как раз и должна выглядеть рваной, а не пиксельной.
  const blur = (src) => {
    const tmp = new Float32Array(W * H);
    const dst = new Float32Array(W * H);
    for (let y = 0; y < H; y += 1)
      for (let x = 0; x < W; x += 1)
        tmp[y * W + x] = (src[y * W + Math.max(0, x - 1)] + src[y * W + x] + src[y * W + Math.min(W - 1, x + 1)]) / 3;
    for (let y = 0; y < H; y += 1)
      for (let x = 0; x < W; x += 1)
        dst[y * W + x] = (tmp[Math.max(0, y - 1) * W + x] + tmp[y * W + x] + tmp[Math.min(H - 1, y + 1) * W + x]) / 3;
    return dst;
  };
  const myagko = blur(blur(Float32Array.from(alpha)));

  const rgba = Buffer.alloc(W * H * 4);
  for (let p = 0; p < W * H; p += 1) {
    const i = p * ch;
    rgba[p * 4] = data[i];
    rgba[p * 4 + 1] = data[i + 1];
    rgba[p * 4 + 2] = data[i + 2];
    rgba[p * 4 + 3] = Math.max(0, Math.min(255, Math.round(myagko[p])));
  }

  if (!SUHO) {
    mkdirSync(CUT, { recursive: true });
    mkdirSync(THUMB, { recursive: true });
    const obrez = { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
    const kadr = sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
      .extract(obrez)
      .resize(SHIRINA, VYSOTA, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
    await kadr.clone().webp({ quality: 86 }).toFile(join(CUT, `${cel.slug}__${cel.id}.webp`));
    await kadr.clone().resize(300, 450, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 82 }).toFile(join(THUMB, `${cel.slug}__${cel.id}.webp`));
  }

  return {
    imya,
    kuda: `heroes/cut/${cel.slug}__${cel.id}.webp`,
    chto: cel.name,
    list: list ? `лист из ${krupnye.length} кадров — оставлено 3` : null,
  };
}

// ─── Запуск ───

if (!existsSync(VHOD)) {
  console.error('нет папки «входящие-картинки»');
  process.exit(1);
}

const fayly = readdirSync(VHOD)
  .filter((f) => ['.png', '.jpg', '.jpeg', '.webp'].includes(extname(f).toLowerCase()))
  .map((f) => join(VHOD, f));

if (!fayly.length) {
  console.log('во «входящих» пусто — класть картинки туда');
  process.exit(0);
}

const lozhilos = [];
const bedy = [];
for (const f of fayly) {
  try {
    const it = await obrabotat(f);
    if (it.bed) bedy.push(`${it.imya}: ${it.bed}`);
    else {
      lozhilos.push(it);
      console.log(`${it.imya.padEnd(34)} → ${it.chto}${it.list ? `  [${it.list}]` : ''}`);
      if (!SUHO) {
        mkdirSync(RAZOBRANO, { recursive: true });
        renameSync(f, join(RAZOBRANO, basename(f)));
      }
    }
  } catch (e) {
    bedy.push(`${basename(f)}: ${e.message}`);
  }
}

console.log(`\nразложено: ${lozhilos.length} из ${fayly.length}`);
if (bedy.length) console.log('НЕ РАЗОБРАНО:\n  ' + bedy.join('\n  '));

// ─── Чего не хватает ───

console.log('\n── чего ещё нет ──');
for (const [slug, d] of Object.entries(dataBySlug)) {
  const net = d.cards.filter((c) => !existsSync(join(CUT, `${slug}__${c.id}.webp`)));
  const bezEkrana = !existsSync(join(HERO, `${slug}-1680.jpg`));
  if (!net.length && !bezEkrana) {
    console.log(`${slug}: всё на месте`);
    continue;
  }
  const chasti = [];
  if (bezEkrana) chasti.push('первый экран');
  if (net.length) chasti.push(`карточки: ${net.map((c) => c.name).join(', ')}`);
  console.log(`${slug}: ${chasti.join('; ')}`);
}
