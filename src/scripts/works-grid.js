// Прогресс на карточках произведений.
//
// Полоса появляется только у того, кто уже начинал: пустая полоса у
// новичка — укор ни за что, и первое, что он видит на сайте, — ноль.
//
// Сколько героев в произведении, страница знает из реестра; сколько закрыто
// — только браузер. Поэтому число подставляется здесь, а не на сборке.

import { readDone } from './progress.js';

export function mountWorks() {
  const karty = [...document.querySelectorAll('[data-work-card]')];
  if (!karty.length) return;

  karty.forEach((kart) => {
    const slug = kart.dataset.workCard;
    const vsego = Number(kart.querySelector('[data-work-count]')?.dataset.workCount || 0) ||
      Number(kart.dataset.workTotal || 0);
    const zakryto = readDone(slug).length;

    const polosa = kart.querySelector('[data-work-prog]');
    if (!polosa || !zakryto || !vsego) return;

    const dolya = Math.min(1, zakryto / vsego);
    polosa.hidden = false;
    const bar = kart.querySelector('[data-work-bar]');
    if (bar) bar.style.setProperty('--dolya', String(dolya));
    const ratio = kart.querySelector('[data-work-ratio]');
    if (ratio) ratio.textContent = `${zakryto} из ${vsego}`;
    kart.dataset.started = dolya >= 1 ? 'done' : 'yes';
  });
}
