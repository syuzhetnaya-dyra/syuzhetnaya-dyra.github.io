/*
 * Стартовая скидка на странице: отсчёт и переключение состояний.
 *
 * Зачем это вообще на клиенте. Сайт собирается заранее и одинаков для
 * всех, а срок акции наступает в конкретную минуту. Страница, собранная
 * 12 октября, у посетителя 27-го всё равно показывала бы скидку — и
 * вела бы его на оплату, которой уже нет. Поэтому состояние выбирает
 * браузер, по текущему времени.
 *
 * Разметка готова к обоим состояниям сразу: [data-aktsiya] — то, что
 * видно, пока скидка идёт; [data-posle] — то, что встаёт на её место.
 * Сборка показывает то состояние, которое верно на момент сборки, а
 * скрипт при загрузке приводит страницу к правде.
 *
 * Отсчёт ничего не хранит: он каждую секунду вычитает текущее время из
 * фиксированного срока. Поэтому обновление страницы его не сбрасывает, а
 * часовой пояс посетителя на результат не влияет — срок задан с +03:00 и
 * сравнивается в абсолютном времени (см. src/data/aktsiya.js).
 */
import { SROK, cenaSejchas, rubli, aktsiyaIdyot } from '../data/aktsiya.js';

const sklonenie = (n, one, few, many) => {
  const d = Math.abs(n) % 100;
  const e = d % 10;
  if (d > 10 && d < 20) return many;
  if (e > 1 && e < 5) return few;
  if (e === 1) return one;
  return many;
};

const DVE = (n) => String(n).padStart(2, '0');

/*
 * Часовой живёт на уровне модуля, а не внутри mountAktsiya: функция
 * вызывается дважды — сразу при загрузке скрипта и потом на каждом
 * astro:page-load. Без этого каждый вызов заводил бы ещё один интервал на
 * те же узлы.
 */
let chasovoy = null;

const pogasit = () => {
  if (chasovoy) clearInterval(chasovoy);
  chasovoy = null;
};

export function mountAktsiya() {
  pogasit();

  const uzly = {
    dni: document.querySelectorAll('[data-otschet-dni]'),
    chasy: document.querySelectorAll('[data-otschet-chasy]'),
    minuty: document.querySelectorAll('[data-otschet-minuty]'),
    sekundy: document.querySelectorAll('[data-otschet-sekundy]'),
    dniSlovo: document.querySelectorAll('[data-otschet-dni-slovo]'),
    chasySlovo: document.querySelectorAll('[data-otschet-chasy-slovo]'),
    minutySlovo: document.querySelectorAll('[data-otschet-minuty-slovo]'),
    sekundySlovo: document.querySelectorAll('[data-otschet-sekundy-slovo]'),
  };

  const aktsiya = document.querySelectorAll('[data-aktsiya]');
  const posle = document.querySelectorAll('[data-posle]');
  const ceny = document.querySelectorAll('[data-cena]');

  // Нечего переключать и нечего считать — страница без продающего блока.
  if (!aktsiya.length && !posle.length && !ceny.length && !uzly.dni.length) return;

  const postavit = (spisok, tekst) => {
    for (const el of spisok) el.textContent = tekst;
  };

  const sostoyanie = (idyot) => {
    for (const el of aktsiya) el.hidden = !idyot;
    for (const el of posle) el.hidden = idyot;
    /*
     * Ссылка на оплату выставлена на сумму скидки и после срока списала бы
     * её же. Отключаем по-настоящему, а не прячем: ссылка, оставшаяся в
     * разметке, открывается по клавиатуре и из контекстного меню.
     */
    for (const el of document.querySelectorAll('[data-aktsiya] a[href]')) {
      if (idyot) {
        if (el.dataset.adres) {
          el.setAttribute('href', el.dataset.adres);
          delete el.dataset.adres;
        }
        el.removeAttribute('aria-disabled');
      } else {
        el.dataset.adres = el.getAttribute('href');
        el.removeAttribute('href');
        el.setAttribute('aria-disabled', 'true');
      }
    }
  };

  const tik = () => {
    const teper = Date.now();
    const idyot = aktsiyaIdyot(teper);

    postavit(ceny, rubli(cenaSejchas(teper)));
    sostoyanie(idyot);

    if (!idyot) {
      pogasit();
      return;
    }

    const ostalos = Math.max(0, SROK - teper);
    const vsegoSek = Math.floor(ostalos / 1000);
    const dni = Math.floor(vsegoSek / 86400);
    const chasy = Math.floor((vsegoSek % 86400) / 3600);
    const minuty = Math.floor((vsegoSek % 3600) / 60);
    const sekundy = vsegoSek % 60;

    postavit(uzly.dni, String(dni));
    postavit(uzly.chasy, DVE(chasy));
    postavit(uzly.minuty, DVE(minuty));
    postavit(uzly.sekundy, DVE(sekundy));
    postavit(uzly.dniSlovo, sklonenie(dni, 'день', 'дня', 'дней'));
    postavit(uzly.chasySlovo, sklonenie(chasy, 'час', 'часа', 'часов'));
    postavit(uzly.minutySlovo, sklonenie(minuty, 'минута', 'минуты', 'минут'));
    postavit(uzly.sekundySlovo, sklonenie(sekundy, 'секунда', 'секунды', 'секунд'));
  };

  tik();
  if (aktsiyaIdyot()) chasovoy = setInterval(tik, 1000);

  /*
   * Переходы между страницами у нас без перезагрузки, и старый интервал
   * продолжал бы тикать по узлам, которых уже нет в документе.
   */
  document.addEventListener(
    'astro:before-swap',
    pogasit,
    { once: true }
  );
}
