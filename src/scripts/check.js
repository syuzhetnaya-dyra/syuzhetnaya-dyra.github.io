// Сюжетный чек. Один экран, два состояния: список героев и прогон вопросов
// по выбранному герою. Какой герой — решает ?hero= в адресе, поэтому ссылка
// из досье ведёт прямо в его блок.

import { readDone, markDone, allDone } from './progress.js';
import { goal, goalOnce } from './metrika.js';
import { revealNextWork } from './next-work.js';
import { to } from './paths.js';

const ORDER = ['ivan', 'vera', 'kotik', 'starcev', 'sluga', 'final'];

const NAMES = {
  ivan: 'Иван Петрович Туркин',
  vera: 'Вера Иосифовна',
  kotik: 'Екатерина Ивановна',
  starcev: 'Дмитрий Старцев',
  sluga: 'Прислуга',
  final: 'Финал рассказа',
};

export function mountCheck() {
  const pick = document.querySelector('.pick');
  const runs = [...document.querySelectorAll('.run')];
  if (!pick || !runs.length) return;

  const wanted = new URLSearchParams(window.location.search).get('hero');
  const run = runs.find((r) => r.dataset.run === wanted);

  paintPicker();

  if (run) {
    pick.hidden = true;
    run.hidden = false;
    mountRun(run);
  }

  function paintPicker() {
    const done = new Set(readDone());

    pick.querySelectorAll('.pick__row').forEach((row) => {
      const isDone = done.has(row.dataset.hero);
      row.dataset.state = isDone ? 'done' : 'todo';
      const mark = row.querySelector('[data-mark]');
      if (mark) mark.textContent = isDone ? 'закрыт' : '';
    });

    const left = ORDER.filter((id) => !done.has(id));
    const text = pick.querySelector('[data-gate-text]');
    const go = pick.querySelector('[data-gate-go]');

    if (!left.length) {
      text.textContent = 'Все герои закрыты. Тест-дыра открыта.';
      go.hidden = false;
      revealNextWork();
    } else {
      const names = left.map((id) => NAMES[id]).join(', ');
      text.textContent =
        left.length === ORDER.length
          ? `Осталось закрыть всех: ${names}. Тест-дыра доступна и сейчас — по плашке наверху.`
          : `Осталось закрыть: ${names}. Тест-дыра доступна и сейчас — по плашке наверху.`;
      go.hidden = true;
    }
  }
}

function mountRun(root) {
  const heroId = root.dataset.run;
  const total = Number(root.dataset.total);
  const sections = [...root.querySelectorAll('.q')];
  const done = root.querySelector('.done');
  const foot = root.querySelector('.run__foot');
  const nextBtn = root.querySelector('.next');
  const counter = root.querySelector('[data-counter]');
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

  // Прогон открылся — значит первый вопрос человек увидел. Это вторая
  // ступень воронки: если сюда доходит меньше половины зашедших, дело в
  // первом экране, а не в спросе.
  goal('first-question');

  let index = 0;
  let score = 0;
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  paintCounter();

  sections.forEach((section) => {
    section.querySelectorAll('.opt').forEach((btn) => {
      btn.addEventListener('click', () => answer(section, btn));
    });
  });

  nextBtn.addEventListener('click', () => {
    if (index < total - 1) {
      sections[index].hidden = true;
      index += 1;
      sections[index].hidden = false;
      foot.hidden = true;
      paintCounter();
      sections[index].querySelector('.q__trait')?.focus?.();
      window.scrollTo({ top: 0, behavior: reduce() ? 'auto' : 'smooth' });
    } else {
      finish();
    }
  });

  root.querySelector('.done__again')?.addEventListener('click', () => {
    window.location.reload();
  });

  function answer(section, btn) {
    if (section.dataset.answered) return;
    section.dataset.answered = 'yes';

    const isRight = btn.dataset.correct === 'true';
    if (isRight) score += 1;

    section.querySelectorAll('.opt').forEach((b) => {
      b.disabled = true;
      const right = b.dataset.correct === 'true';
      // Верный вариант ждёт: сначала ученик читает «Неверно».
      b.dataset.state =
        b === btn ? (right ? 'chosen-right' : 'chosen-wrong') : right ? 'pending' : 'idle';
    });

    const verdict = btn.parentElement.querySelector('.verdict');
    verdict.hidden = false;
    verdict.dataset.state = isRight ? 'right' : 'wrong';
    verdict.querySelector('.verdict__word').textContent = isRight ? 'Верно' : 'Неверно';

    if (!isRight) {
      const right = verdict.querySelector('.verdict__right');
      if (right) right.hidden = false;
    }

    foot.hidden = false;
    nextBtn.textContent = index < total - 1 ? 'Следующий вопрос' : 'Закрыть героя';

    requestAnimationFrame(() => {
      verdict.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'center' });
    });

    if (!isRight) {
      const pending = section.querySelector('.opt[data-state="pending"]');
      const reveal = () => {
        if (pending) pending.dataset.state = 'right';
      };
      if (reduce()) reveal();
      else setTimeout(reveal, 750);
    }
  }

  function finish() {
    // «Закрыл героя» — главное число воронки. Один раз на человека, а не на
    // каждый повторный проход: интересен факт, а не счётчик повторов.
    goalOnce('hero-closed');

    sections[index].hidden = true;
    foot.hidden = true;
    done.hidden = false;
    done.querySelector('[data-score]').textContent = String(score);
    // Мерцание на заголовке итога — только за безошибочный проход.
    done.dataset.clean = score === total ? 'true' : 'false';

    markDone(heroId);

    const note = done.querySelector('[data-next]');
    const left = ORDER.filter((id) => !new Set(readDone()).has(id));

    if (!left.length) {
      note.innerHTML = `Все герои закрыты. <a class="done__link" href="${to('ionych/dyra/')}">Открыть тест-дыру</a>`;
    } else {
      const nextId = left[0];
      note.innerHTML = `Дальше по порядку — <a class="done__link" href="${to(`ionych/check/?hero=${nextId}`)}">${NAMES[nextId]}</a>`;
    }

    paintCounter(true);
  }

  function paintCounter(complete = false) {
    const shown = complete ? total : index + 1;
    if (counter) counter.textContent = roman[shown - 1] || String(shown);
  }
}
