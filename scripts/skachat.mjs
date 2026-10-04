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

const RABOTY = {
  'otcy-i-deti': {
    // На Викитеке роман разложен по главам отдельными страницами
    stranica: (n) => `Отцы и дети (Тургенев)/Глава ${n}`,
    glav: 28,
    izdanie: 'ru.wikisource.org · И. С. Тургенев. Отцы и дети',
  },
};

const rim = (n) => {
  const Z = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let o = '', r = n;
  for (const [v, z] of Z) while (r >= v) { o += z; r -= v; }
  return o;
};

const slug = process.argv[2];
const r = RABOTY[slug];
if (!r) {
  console.error(`не знаю произведения «${slug}». Известны: ${Object.keys(RABOTY).join(', ')}`);
  process.exit(1);
}

mkdirSync(SOURCES, { recursive: true });

const kuski = [];
for (let n = 1; n <= r.glav; n += 1) {
  const url =
    'https://ru.wikisource.org/w/index.php?action=raw&title=' +
    encodeURIComponent(r.stranica(n));

  let telo = '';
  for (let popytka = 1; popytka <= 3; popytka += 1) {
    try {
      const otvet = await fetch(url, { headers: { 'user-agent': 'lithero-sverka/1.0' } });
      if (!otvet.ok) throw new Error(`код ${otvet.status}`);
      telo = await otvet.text();
      break;
    } catch (e) {
      if (popytka === 3) throw new Error(`глава ${n}: ${e.message}`);
      await new Promise((res) => setTimeout(res, 800 * popytka));
    }
  }

  // Пустая или подозрительно короткая глава — повод остановиться, а не
  // молча записать заглушку: сверка потом «не найдёт» цитаты и мы будем
  // искать ошибку в данных, которой там нет.
  if (telo.trim().length < 400) throw new Error(`глава ${n} пришла пустой (${telo.length} байт)`);

  // У страницы главы есть свой заголовок и хвост с примечаниями. Заголовок
  // дублировал бы наш и сбивал счёт глав, примечания — это не текст романа,
  // и цитата, случайно взятая оттуда, была бы цитатой из комментария.
  telo = telo.replace(/^==\s*Примечания\s*==[\s\S]*$/m, '');
  telo = telo.replace(/^==+\s*(?:Глава\s*)?[IVXL\d]+\s*==+\s*$/gim, '');

  kuski.push(`== ${rim(n)} ==\n${telo.trim()}`);
  process.stdout.write(`\rглав скачано: ${n} из ${r.glav}`);
}

const put = join(SOURCES, `${slug}.raw.txt`);
writeFileSync(put, kuski.join('\n\n') + '\n', 'utf8');
console.log(`\n${put}`);
console.log(`глав ${r.glav}, ${(kuski.join('').length / 1024).toFixed(0)} КБ`);
console.log(`издание: ${r.izdanie}`);
