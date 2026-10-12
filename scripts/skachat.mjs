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
