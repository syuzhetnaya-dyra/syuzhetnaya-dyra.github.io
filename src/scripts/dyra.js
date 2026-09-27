// Тест-дыра: задание № 1 (род, жанр, направление), № 2 (сопоставление),
// № 3 (термин).
//
// Сопоставление работает тапом — сначала позиция, потом вариант.
// Перетаскивания нет нигде: на телефоне оно не работает, а дублировать
// один и тот же жест двумя способами значит чинить то, что не сломано.
//
// Задания № 2 и № 3 — колоды: в разметке лежат все, показывается одно.
// Порядок перемешивается при каждом заходе, иначе ученик запомнит не
// материал, а последовательность.

import { readDone } from './progress.js';
import { to } from './paths.js';
import { goal } from './metrika.js';
import { revealNextWork } from './next-work.js';

const ORDER = ['ivan', 'vera', 'kotik', 'starcev', 'sluga', 'final'];

// Проверка не придирается к регистру, ё и окончаниям: «эпосъ», «Эпос»,
// «эпическ» — всё это один и тот же ответ ученика, который помнит суть.
function normalize(s) {
  return s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я]/gi, '')
    .trim();
}

function matches(given, expected) {
  const g = normalize(given);
  if (!g) return false;
  return expected.some((e) => {
    const x = normalize(e);
    const stem = x.slice(0, Math.max(4, x.length - 2));
    return g === x || g.startsWith(stem);
  });
}

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Собранные задания помнят, как себя сбросить: колода открывает одну и ту же
// карточку не раз, а вешать обработчики заново значит удваивать их на каждом
// круге.
const sobrano = new WeakMap();

const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const show = (el) => el.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' });

// Цель воронки шлётся один раз на страницу: интересен факт «дошёл до
// разбора», а не число решённых заданий.
let taskGoalSent = false;
function taskDone() {
  if (taskGoalSent) return;
  taskGoalSent = true;
  goal('task-done');
}

function mountHint() {
  const hint = document.querySelector('[data-hint]');
  if (!hint) return;
  const done = new Set(readDone());
  const left = ORDER.filter((id) => !done.has(id));
  if (!left.length) {
    hint.textContent = 'Все герои в сюжетном чеке закрыты — можно проверять себя начисто.';
    hint.dataset.state = 'ready';
  } else {
    hint.innerHTML = `Сюжетный чек пройден не весь: осталось ${left.length} из ${ORDER.length}. Это не запрещает тест — но ловушки здесь рассчитаны на то, что досье уже разобрано. <a class="done__link" href="${to('ionych/check/')}">Вернуться к чеку</a>`;
    hint.dataset.state = 'partial';
  }
}

// ─── Задание № 1 ───

function mountWarmup() {
  const root = document.querySelector('.warm:not(.warm--terms)');
  if (!root) return;

  const rows = [...root.querySelectorAll('.warm__row')];
  const check = root.querySelector('.warm__check');
  const skip = root.querySelector('.warm__skip');
  const count = root.querySelector('[data-warm-count]');
  const pool = document.querySelector('[data-match-pool]');

  // Счётчик считает заполненные поля, а не верные: до проверки правильность
  // не известна, и обещать её счётчиком нельзя.
  function recount() {
    if (!count) return;
    const filled = rows.filter((r) => r.querySelector('.warm__input').value.trim()).length;
    count.textContent = `Отвечено ${filled} из ${rows.length}`;
    count.dataset.full = filled === rows.length ? 'true' : 'false';
  }

  check?.addEventListener('click', () => {
    rows.forEach((row) => verdictFor(row));
    check.disabled = true;
    check.textContent = 'Проверено';
    if (pool) show(pool);
  });

  skip?.addEventListener('click', () => {
    root.dataset.skipped = 'yes';
    if (pool) show(pool);
  });

  rows.forEach((row, i) => {
    const input = row.querySelector('.warm__input');
    input?.addEventListener('input', recount);
    input?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const next = rows[i + 1]?.querySelector('.warm__input');
      if (next) next.focus();
      else check?.click();
    });
  });

  // Браузер может вернуть введённое при возврате «назад» — счёт должен
  // совпадать с тем, что в полях, а не начинаться с нуля.
  recount();
}

// Общий разбор для полей со свободным ответом: и в разминке, и в терминах.
// Разбор открывается и на верном ответе: угадать термин и знать, почему он
// такой, — разные вещи, а на экзамене спросят второе.
function verdictFor(row) {
  const input = row.querySelector('.warm__input');
  const out = row.querySelector('.warm__verdict');
  const expected = row.dataset.answers.split('|');
  const ok = matches(input.value, expected);
  row.dataset.state = ok ? 'right' : 'wrong';
  out.textContent = ok ? 'верно' : `верно: ${expected[0]}`;
  input.disabled = true;
  const why = row.querySelector('.warm__why');
  if (why) why.hidden = false;
  return ok;
}

// ─── Задание № 2 ───

function mountMatchingPool() {
  const pool = document.querySelector('[data-match-pool]');
  if (!pool) return;

  const tasks = [...pool.querySelectorAll('[data-match]')];
  if (!tasks.length) return;

  const counter = pool.querySelector('[data-match-pool-count]');
  const order = shuffle(tasks);
  let at = 0;

  function open(i, scroll) {
    tasks.forEach((t) => (t.hidden = true));
    const task = order[i];
    task.hidden = false;
    if (counter) counter.textContent = `Задание ${i + 1} из ${order.length}`;
    mountMatching(task, () => {
      if (at < order.length - 1) {
        at += 1;
        open(at, true);
      } else {
        // Колода кончилась — перемешиваем и начинаем круг заново, а не
        // упираемся в тупик с неработающей кнопкой.
        at = 0;
        order.splice(0, order.length, ...shuffle(tasks));
        open(at, true);
      }
    });
    if (scroll) show(task);
  }

  open(at, false);
}

function mountMatching(root, onNext) {
  // Задание могло уже быть собрано: колода открывает карточки повторно.
  const gotov = sobrano.get(root);
  if (gotov) {
    gotov();
    return;
  }

  const answer = JSON.parse(root.dataset.answer);
  const extraKey = root.dataset.extra;
  const slots = [...root.querySelectorAll('.slot')];
  const banks = [...root.querySelectorAll('.bank')];
  const cells = [...root.querySelectorAll('[data-blank]')];
  const count = root.querySelector('[data-match-count]');
  const check = root.querySelector('.match__check');
  const verdict = root.querySelector('.match__verdict');
  const total = slots.length;

  const labelOf = (key) =>
    banks.find((b) => b.dataset.key === key)?.querySelector('.bank__label')?.textContent?.trim() || '';

  let picked = {};
  let active = null;

  function paint() {
    slots.forEach((s) => {
      const key = s.dataset.key;
      const val = picked[key];
      s.dataset.state = active === key ? 'active' : val ? 'filled' : 'empty';
      const pickEl = s.querySelector('[data-pick]');
      if (val) pickEl.textContent = `${val} · ${labelOf(val)}`;
      else pickEl.textContent = active === key ? 'выберите вариант ниже' : 'выбрать';
      s.setAttribute('aria-expanded', active === key ? 'true' : 'false');
    });

    banks.forEach((b) => {
      const used = Object.values(picked).includes(b.dataset.key);
      b.dataset.state = used ? 'used' : 'free';
    });

    // Бланк: в клетке либо цифра, либо прочерк. Пустая клетка — это тоже
    // состояние задания, и она должна быть видна как пустая.
    cells.forEach((c) => {
      const val = picked[c.dataset.blank];
      c.textContent = val || '—';
      c.dataset.state = val ? 'filled' : 'empty';
    });

    const filled = Object.keys(picked).length;
    if (count) {
      count.textContent = `Заполнено ${filled} из ${total}`;
      count.dataset.full = filled === total ? 'true' : 'false';
    }
    check.disabled = filled !== total;
  }

  function reset() {
    picked = {};
    active = null;
    verdict.hidden = true;
    slots.forEach((s) => (s.disabled = false));
    banks.forEach((b) => (b.disabled = false));
    paint();
  }

  slots.forEach((s) => {
    s.addEventListener('click', () => {
      const key = s.dataset.key;
      if (picked[key]) {
        delete picked[key];
        active = key;
      } else {
        active = active === key ? null : key;
      }
      paint();
    });
  });

  banks.forEach((b) => {
    b.addEventListener('click', () => {
      if (!active) {
        active = slots.find((s) => !picked[s.dataset.key])?.dataset.key || null;
        if (!active) return;
      }
      const key = b.dataset.key;
      Object.keys(picked).forEach((k) => {
        if (picked[k] === key) delete picked[k];
      });
      picked[active] = key;
      active = slots.find((s) => !picked[s.dataset.key])?.dataset.key || null;
      paint();
    });
  });

  check.addEventListener('click', () => {
    const rows = root.querySelector('[data-rows]');
    rows.innerHTML = '';
    let allRight = true;

    slots.forEach((s) => {
      const key = s.dataset.key;
      const label = s.querySelector('.slot__label')?.textContent?.trim() || '';
      const got = picked[key];
      const want = answer[key];
      const ok = got === want;
      if (!ok) allRight = false;

      const li = document.createElement('li');
      li.className = 'match__row';
      li.dataset.state = ok ? 'right' : 'wrong';
      // Из разбора — сразу к развороту героя: ошибся на Вере Иосифовне,
      // идёшь читать Веру Иосифовну, а не искать её по колоде заново.
      const hero = s.dataset.hero;
      const toHero = hero
        ? `<a class="hero-link" href="${to(`ionych/dosye/${hero}/`)}"><span class="hero-link__t">Посмотреть героя в досье</span><span aria-hidden="true">→</span></a>`
        : '';
      li.innerHTML = `
        <p class="match__row-head"><b>${key}</b> ${label} — ${ok ? 'верно' : 'неверно'}</p>
        ${ok ? '' : `<p class="match__row-fix">Верно: ${want} · ${labelOf(want)}</p>`}
        <p class="match__row-why">${s.dataset.why || ''}</p>
        ${toHero}`;
      rows.append(li);
    });

    root.querySelector('[data-extra-text]').textContent = `${extraKey} · ${labelOf(extraKey)}`;

    taskDone();
    verdict.hidden = false;
    revealNextWork();
    verdict.dataset.state = allRight ? 'right' : 'wrong';
    verdict.querySelector('.verdict__word').textContent = allRight ? 'Всё верно' : 'Есть ошибки';

    slots.forEach((s) => (s.disabled = true));
    banks.forEach((b) => (b.disabled = true));
    check.disabled = true;

    verdict.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'center' });
  });

  sobrano.set(root, reset);

  root.querySelector('[data-match-next]')?.addEventListener('click', () => onNext());
  root.querySelector('.match__retry')?.addEventListener('click', () => {
    reset();
    show(root);
  });

  paint();
}

// ─── Задание № 3 ───

function mountTerms() {
  const root = document.querySelector("[data-terms]");
  if (!root) return;

  const rows = [...root.querySelectorAll("[data-term]")];
  if (!rows.length) return;

  const check = root.querySelector("[data-term-check]");
  const skip = root.querySelector("[data-term-next]");
  const count = root.querySelector("[data-term-count]");
  const order = shuffle(rows);
  let at = 0;

  // Кнопка одна и та же ведёт вперёд: проверил — она же зовёт дальше.
  // Отдельная кнопка «следующий» оказалась бы наверху, за краем экрана, и
  // ученик упирался бы в «Проверено», не зная, что делать.
  function paint() {
    const row = order[at];
    check.textContent = row.dataset.answered ? "Следующий термин" : "Проверить";
  }

  function open(i, scroll) {
    rows.forEach((r) => (r.hidden = true));
    at = i;
    const row = order[at];
    row.hidden = false;
    if (count) count.textContent = `Термин ${at + 1} из ${order.length}`;
    paint();
    if (scroll) show(root);
    if (!row.dataset.answered) row.querySelector(".warm__input")?.focus({ preventScroll: true });
  }

  function dalshe() {
    const next = at < order.length - 1 ? at + 1 : 0;
    // Круг кончился — перемешиваем, чтобы второй заход не повторял первый.
    if (next === 0) order.splice(0, order.length, ...shuffle(rows));
    open(next, true);
  }

  check.addEventListener("click", () => {
    const row = order[at];
    if (row.dataset.answered) {
      dalshe();
      return;
    }
    row.dataset.answered = "yes";
    verdictFor(row);
    taskDone();
    revealNextWork();
    paint();
  });

  skip.addEventListener("click", dalshe);

  rows.forEach((row) => {
    row.querySelector(".warm__input")?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      check.click();
    });
  });

  open(0, false);
}

export function mountDyra() {
  mountHint();
  mountWarmup();
  mountMatchingPool();
  mountTerms();
}
