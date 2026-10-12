/*
 * Снятие замка в браузере.
 *
 * На платной странице вместо содержимого лежит шифртекст. Код доступа
 * разворачивает ключ выпуска, ключ расшифровывает содержимое, оно
 * вставляется в страницу — и дальше работает ровно так же, как на
 * бесплатных: по событию astro:page-load поднимаются обычные скрипты.
 *
 * Ключ выпуска, развернувшись один раз, остаётся в localStorage, чтобы не
 * спрашивать код на каждой странице. Это всё, что хранится: ни адреса, ни
 * имени, ни самого кода.
 */
import { asset } from './paths.js';
import { goal } from './metrika.js';

const PAMYAT = 'sd-klyuch';

const izBase64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const vBase64 = (b) => btoa(String.fromCharCode(...new Uint8Array(b)));

async function sha256hex(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/* Код диктуют вслух и переписывают с экрана: регистр и дефисы прощаем. */
const privesti = (s) => {
  const t = s.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return t.length === 12 ? `${t.slice(0, 4)}-${t.slice(4, 8)}-${t.slice(8, 12)}` : s.trim().toUpperCase();
};

async function klyuchPoKodu(kod) {
  const spisok = await fetch(asset('dostup/kody.json')).then((r) => r.json());
  const id = (await sha256hex(kod)).slice(0, 16);
  const z = spisok.zapisi.find((x) => x.id === id);
  if (!z) return null;

  const osnova = await crypto.subtle.importKey('raw', new TextEncoder().encode(kod), 'PBKDF2', false, [
    'deriveKey',
  ]);
  const kek = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: izBase64(z.sol), iterations: spisok.iteraciy, hash: 'SHA-256' },
    osnova,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  try {
    const syroy = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: izBase64(z.iv) }, kek, izBase64(z.telo));
    return vBase64(syroy);
  } catch {
    // Совпал id, но не сошёлся код — значит, код всё-таки не тот
    return null;
  }
}

async function raskryt(klyuchBase64) {
  const korobka = document.querySelector('script[type="application/json"][data-zamok]');
  if (!korobka) return false;

  const { iv, telo } = JSON.parse(korobka.textContent);
  const klyuch = await crypto.subtle.importKey('raw', izBase64(klyuchBase64), 'AES-GCM', false, ['decrypt']);
  const syroy = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: izBase64(iv) }, klyuch, izBase64(telo));

  const mesto = korobka.parentElement;
  korobka.remove();
  mesto.insertAdjacentHTML('afterbegin', new TextDecoder().decode(syroy));

  /*
   * Скрипты страницы монтируются по astro:page-load и ничего не знают про
   * замок. Содержимое появилось позже — значит, событие надо повторить,
   * иначе чек и тест-дыра останутся мёртвой разметкой.
   */
  document.dispatchEvent(new Event('astro:page-load'));
  return true;
}

export async function mountZamok() {
  const forma = document.querySelector('[data-zamok-forma]');
  if (!forma) return;

  const pole = forma.querySelector('input');
  const beda = forma.querySelector('[data-zamok-beda]');
  const skazat = (t) => {
    beda.textContent = t;
    beda.hidden = !t;
  };

  // Ключ уже разворачивали на этом устройстве — спрашивать код незачем
  const sohranyonnyy = (() => {
    try {
      return localStorage.getItem(PAMYAT);
    } catch {
      return null;
    }
  })();

  if (sohranyonnyy) {
    try {
      if (await raskryt(sohranyonnyy)) {
        forma.remove();
        return;
      }
    } catch {
      // Ключ протух: содержимое перешифровали новым выпуском
      try {
        localStorage.removeItem(PAMYAT);
      } catch {}
    }
  }

  /*
   * Воронка. Без этих трёх цифр не понять, что мешает покупке: мало
   * ли людей вообще доходит до замка, или доходят многие, а платить не
   * идут. Пятьсот сохранений в тиктоке об этом не говорят ничего.
   */
  forma.hidden = false;
  goal('zamok-pokazan');

  for (const knopka of forma.querySelectorAll('a.zamok__kupit')) {
    knopka.addEventListener('click', () => goal('zamok-kupit'));
  }

  forma.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kod = privesti(pole.value);
    if (!kod) return;

    skazat('');
    forma.dataset.state = 'ждём';

    try {
      const klyuch = await klyuchPoKodu(kod);
      if (!klyuch) {
        forma.dataset.state = '';
        goal('zamok-kod-neveren');
        skazat('Такого кода нет. Проверьте, не перепутаны ли похожие знаки.');
        return;
      }
      await raskryt(klyuch);
      goal('zamok-otkryt');
      try {
        localStorage.setItem(PAMYAT, klyuch);
      } catch {}
      forma.remove();
    } catch {
      forma.dataset.state = '';
      skazat('Не получилось открыть. Обновите страницу и попробуйте ещё раз.');
    }
  });
}
