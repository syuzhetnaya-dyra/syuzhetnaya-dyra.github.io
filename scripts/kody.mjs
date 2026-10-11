/*
 * Коды доступа.
 *
 *   node scripts/kody.mjs 200      — выпустить 200 кодов
 *
 * Как это работает и почему так.
 *
 * Содержимое платных страниц шифруется одним ключом — назовём его ключом
 * выпуска. Сам ключ нигде не публикуется. Каждый код доступа — это пароль,
 * которым ключ выпуска завёрнут ещё раз: из кода выводится KEK (PBKDF2), им
 * расшифровывается ключ выпуска, а уже им — страницы.
 *
 * Поэтому в public/dostup/kody.json лежат только завёрнутые копии ключа.
 * Выложить их наружу безопасно: без кода из них ничего не достать, а
 * подобрать код нельзя — в нём 60 бит.
 *
 * Коды выпускаются пачкой заранее. Продали — выдали следующий из списка;
 * пересобирать и перевыкладывать сайт ради каждой продажи не нужно.
 *
 * ГЛАВНОЕ. Ключ выпуска лежит в lithero-content/kluchi/ — папке, закрытой
 * от git. Потеряете его — перестанут работать ВСЕ выданные коды, и починить
 * это будет нечем. Сохраните его копию отдельно.
 */
import { randomBytes, pbkdf2Sync, createCipheriv, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const KORENb = join(dirname(fileURLToPath(import.meta.url)), '..');
const KLYUCHI = join(KORENb, 'lithero-content', 'kluchi');
const KLYUCH_FAYL = join(KLYUCHI, 'vypusk.key');
const SPISOK = join(KLYUCHI, 'kody-vydacha.txt');
const NARUZHU = join(KORENb, 'public', 'dostup', 'kody.json');

// Без похожих знаков: 0/O и 1/I/l человек путает, а код диктуют вслух
const ALFAVIT = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ITERACIY = 200000;

const skolko = Number(process.argv[2] || 100);
if (!Number.isInteger(skolko) || skolko < 1 || skolko > 5000) {
  console.error('сколько кодов выпустить? node scripts/kody.mjs 200');
  process.exit(1);
}

mkdirSync(KLYUCHI, { recursive: true });
mkdirSync(dirname(NARUZHU), { recursive: true });

/*
 * Ключ выпуска создаётся один раз и больше не меняется. Новый ключ сделал
 * бы недействительными все ранее проданные коды, поэтому файл никогда не
 * перезаписывается молча.
 */
let klyuch;
if (existsSync(KLYUCH_FAYL)) {
  klyuch = Buffer.from(readFileSync(KLYUCH_FAYL, 'utf8').trim(), 'base64');
  if (klyuch.length !== 32) {
    console.error(`повреждён ключ выпуска: ${KLYUCH_FAYL}`);
    process.exit(1);
  }
  console.log('ключ выпуска взят из lithero-content/kluchi/vypusk.key');
} else {
  klyuch = randomBytes(32);
  writeFileSync(KLYUCH_FAYL, klyuch.toString('base64') + '\n', 'utf8');
  console.log('СОЗДАН НОВЫЙ КЛЮЧ ВЫПУСКА: lithero-content/kluchi/vypusk.key');
  console.log('Сохраните его копию отдельно. Без него не соберётся сайт и');
  console.log('перестанут работать все выданные коды.');
}

const kod = () => {
  const b = randomBytes(12);
  const s = [...b].map((x) => ALFAVIT[x % ALFAVIT.length]).join('');
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
};

// Старые коды не выбрасываются: они уже у людей на руках
const bylo = existsSync(NARUZHU) ? JSON.parse(readFileSync(NARUZHU, 'utf8')) : { zapisi: [] };
const estId = new Set(bylo.zapisi.map((z) => z.id));

const novye = [];
const zapisi = [...bylo.zapisi];

while (novye.length < skolko) {
  const k = kod();
  const id = createHash('sha256').update(k).digest('hex').slice(0, 16);
  if (estId.has(id)) continue;
  estId.add(id);

  const sol = randomBytes(16);
  const kek = pbkdf2Sync(k, sol, ITERACIY, 32, 'sha256');
  const iv = randomBytes(12);
  const shifr = createCipheriv('aes-256-gcm', kek, iv);
  const telo = Buffer.concat([shifr.update(klyuch), shifr.final()]);

  zapisi.push({
    id,
    sol: sol.toString('base64'),
    iv: iv.toString('base64'),
    telo: Buffer.concat([telo, shifr.getAuthTag()]).toString('base64'),
  });
  novye.push(k);
}

writeFileSync(NARUZHU, JSON.stringify({ iteraciy: ITERACIY, zapisi }, null, 0), 'utf8');

const ranshe = existsSync(SPISOK) ? readFileSync(SPISOK, 'utf8') : '';
writeFileSync(
  SPISOK,
  ranshe +
    `\r\n=== выпуск ${new Date().toISOString().slice(0, 10)}, кодов ${novye.length} ===\r\n` +
    novye.join('\r\n') +
    '\r\n',
  'utf8'
);

console.log(`\nвыпущено кодов: ${novye.length}, всего в обороте: ${zapisi.length}`);
console.log(`коды для выдачи: lithero-content/kluchi/kody-vydacha.txt (в git не попадает)`);
console.log(`завёрнутые ключи: public/dostup/kody.json (это публикуется, и это нормально)`);
console.log(`\nпервые пять:\n  ${novye.slice(0, 5).join('\n  ')}`);
