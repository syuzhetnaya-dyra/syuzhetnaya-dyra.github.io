/*
 * Выдача кода доступа покупателю.
 *
 *   node scripts/vydat.mjs "Аня, тг @anya, оплата 13.10"   — выдать код
 *   node scripts/vydat.mjs --spisok                        — кому что выдано
 *   node scripts/vydat.mjs --skolko                        — сколько осталось
 *
 * Зачем скрипт, а не просто открыть файл со кодами.
 *
 * Коды выпущены пачкой заранее и лежат в lithero-content/kluchi/
 * kody-vydacha.txt. Если брать их оттуда глазами, однажды один код уйдёт
 * двум покупателям — и второй придёт с вопросом, почему у него чужой
 * доступ, а доказать, кому он выдан, будет нечем. Поэтому выдача пишется
 * в журнал, и следующий код берётся всегда первый невыданный.
 *
 * Журнал лежит рядом с ключом, в папке, закрытой от git: это сведения о
 * покупателях, и в репозиторий они попасть не должны.
 *
 * ВАЖНО, чего этот скрипт НЕ делает. Он не проверяет оплату. ЮKassa сайту
 * ничего не сообщает, и узнать, заплатил ли человек, можно только глядя в
 * личный кабинет ЮKassa. Выдавайте код, увидев оплату там, а не по
 * сообщению «я оплатил».
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const KORENb = join(dirname(fileURLToPath(import.meta.url)), '..');
const KLYUCHI = join(KORENb, 'lithero-content', 'kluchi');
const SPISOK = join(KLYUCHI, 'kody-vydacha.txt');
const ZHURNAL = join(KLYUCHI, 'vydano.txt');

const KOD = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

if (!existsSync(SPISOK)) {
  console.error(`нет файла с кодами: ${SPISOK}`);
  console.error('выпустите коды: node scripts/kody.mjs 100');
  process.exit(1);
}

const vse = readFileSync(SPISOK, 'utf8')
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter((s) => KOD.test(s));

const stroki = existsSync(ZHURNAL)
  ? readFileSync(ZHURNAL, 'utf8').split(/\r?\n/).filter((s) => s.trim())
  : [];

// В журнале строка вида «КОД<TAB>дата<TAB>кому». Код — первое поле.
const vydano = new Map(
  stroki
    .map((s) => s.split('\t'))
    .filter((ch) => KOD.test(ch[0]))
    .map((ch) => [ch[0], { kogda: ch[1] || '', komu: ch[2] || '' }])
);

const svobodnye = vse.filter((k) => !vydano.has(k));

const rezhim = process.argv[2];

if (rezhim === '--spisok') {
  if (!vydano.size) {
    console.log('ещё никому ничего не выдано');
  } else {
    console.log(`выдано кодов: ${vydano.size}\n`);
    for (const [kod, z] of vydano) console.log(`${kod}  ${z.kogda}  ${z.komu}`);
  }
  console.log(`\nсвободных осталось: ${svobodnye.length} из ${vse.length}`);
  process.exit(0);
}

if (rezhim === '--skolko') {
  console.log(`свободных кодов: ${svobodnye.length} из ${vse.length}`);
  console.log(`выдано: ${vydano.size}`);
  process.exit(0);
}

const komu = (process.argv.slice(2).join(' ') || '').trim();
if (!komu) {
  console.error('скажите, кому выдаётся код, — это и есть весь учёт:');
  console.error('  node scripts/vydat.mjs "Аня, тг @anya, оплата 13.10"');
  console.error('\nпосмотреть выданное:  node scripts/vydat.mjs --spisok');
  process.exit(1);
}

if (!svobodnye.length) {
  console.error('свободных кодов не осталось.');
  console.error('выпустите ещё: node scripts/kody.mjs 100');
  console.error('ВАЖНО: после выпуска пересоберите и выложите сайт —');
  console.error('новые завёрнутые ключи лежат в public/dostup/kody.json.');
  process.exit(1);
}

const kod = svobodnye[0];
const kogda = new Date().toISOString().slice(0, 10);

// Шапку в пустой журнал — чтобы через год было понятно, что это за файл.
if (!stroki.length) {
  writeFileSync(
    ZHURNAL,
    '# Кому выдан какой код. Формат: КОД<таб>дата<таб>кому.\n' +
      '# Заводится scripts/vydat.mjs. В git не попадает: это о покупателях.\n',
    'utf8'
  );
}
appendFileSync(ZHURNAL, `${kod}\t${kogda}\t${komu}\n`, 'utf8');

console.log(`\n  ${kod}\n`);
console.log(`записано в журнал: ${komu} (${kogda})`);
console.log(`свободных осталось: ${svobodnye.length - 1} из ${vse.length}`);
console.log('\nЧто отправить покупателю:');
console.log('---');
console.log(`Ваш код доступа: ${kod}`);
console.log('');
console.log('Откройте любое произведение на https://syuzhetnaya-dyra.github.io');
console.log('и нажмите «Досье», «Чек» или «Тест-дыра» — поверх страницы');
console.log('появится окно. Вставьте код в поле «Уже есть код?» и нажмите');
console.log('«Открыть». Код вводится один раз на устройстве: дальше все');
console.log('произведения открываются сами.');
console.log('---');
