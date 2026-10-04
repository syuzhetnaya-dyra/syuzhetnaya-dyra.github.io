/*
 * Раскладывает промты из photos/<slug>.md по отдельным текстовым файлам.
 *
 * В .md промт лежит в блоке кода вместе с разбором «Проверка» — это файл для
 * чтения. А для работы нужен другой файл: открыл, выделил всё, вставил в
 * генератор. Поэтому .txt содержит ровно текст промта и ничего больше: ни
 * заголовка, ни пометок, ни обратных кавычек, которые иначе уедут в
 * генератор вместе с заданием.
 *
 * Источник один — .md. Руками .txt не правят: правят .md и пересобирают,
 * иначе два текста разойдутся и никто не вспомнит, какой из них настоящий.
 *
 *   node scripts/promty.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const KORENb = join(dirname(fileURLToPath(import.meta.url)), '..');
const PHOTOS = join(KORENb, 'photos');

// Имя файла из заголовка: «## otcy-i-deti__bazarov: Евгений Базаров»
// или «## Главный экран произведения» — для него имя задаём отдельно.
function imyaFayla(zagolovok, poryadok) {
  const m = zagolovok.match(/^##\s+([a-z0-9-]+__[a-z0-9-]+)\s*:/i);
  if (m) return m[1].split('__')[1];
  // \w кириллицу не ловит — отсюда [а-яё]*, иначе главный экран получал
  // безличное имя вроде promt-10
  if (/главн[а-яё]*\s+экран/i.test(zagolovok)) return '00-glavnyy-ekran';
  return `promt-${String(poryadok).padStart(2, '0')}`;
}

let vsego = 0;
for (const fayl of readdirSync(PHOTOS).filter((f) => f.endsWith('.md') && !f.startsWith('_'))) {
  const slug = fayl.replace(/\.md$/, '');
  const md = readFileSync(join(PHOTOS, fayl), 'utf8').replace(/\r\n/g, '\n');

  const papka = join(PHOTOS, slug);
  if (existsSync(papka)) rmSync(papka, { recursive: true, force: true });
  mkdirSync(papka, { recursive: true });

  // Идём по заголовкам второго уровня и берём первый блок кода под каждым
  const chasti = md.split(/\n(?=## )/).slice(1);
  let n = 0;
  const spisok = [];

  for (const chast of chasti) {
    const zagolovok = chast.split('\n')[0];
    const blok = chast.match(/```[a-z]*\n([\s\S]*?)\n```/);
    if (!blok) continue;
    n += 1;
    const imya = imyaFayla(zagolovok, n);
    const nazvanie = zagolovok.replace(/^##\s+/, '').replace(/^[a-z0-9-]+__[a-z0-9-]+\s*:\s*/i, '');

    // CRLF: файл открывают двойным щелчком, в том числе в Блокноте
    writeFileSync(join(papka, `${imya}.txt`), blok[1].trim().replace(/\n/g, '\r\n') + '\r\n', 'utf8');
    spisok.push(`${imya}.txt — ${nazvanie}`);
    vsego += 1;
  }

  // Опись рядом, чтобы было видно, какой файл к кому относится
  writeFileSync(
    join(papka, '00-opis.txt'),
    [
      `Промты для картинок: ${slug}`,
      '',
      'В каждом файле — только текст промта. Открыть, выделить всё, вставить',
      'в ChatGPT или Gemini вместе с образцом стиля.',
      '',
      'Образец для карточек героев:',
      'https://syuzhetnaya-dyra.github.io/heroes/cut/ionych__starcev.webp',
      '',
      'Образец для главного экрана:',
      'https://syuzhetnaya-dyra.github.io/hero/ionych-1680.jpg',
      '',
      'Файлы:',
      ...spisok.map((s) => '  ' + s),
      '',
      `Разбор по каждому промту — что подтверждено текстом и где — в photos/${slug}.md`,
    ].join('\r\n') + '\r\n',
    'utf8'
  );

  console.log(`${slug}: ${n} промтов → photos/${slug}/`);
}

console.log(`\nвсего файлов: ${vsego}`);
