// Прогресс по героям. Пока живёт в браузере: аккаунтов и бэкенда нет,
// и это записано в PRODUCT.md как открытое решение. Всё чтение обёрнуто
// в try — приватное окно и запрет на данные сайта не должны ломать экран.
//
// Ключ свой на каждое произведение: закрытые герои «Ионыча» не должны
// засчитываться в «Отцах и детях». Старый ключ без произведения остался от
// времён, когда произведение было одно, и читается как «Ионыч» — иначе
// ученик, уже прошедший чек, вернулся бы к пустому прогрессу.

const STARYY = 'dyra:ionych:heroes';
const kluch = (work) => `dyra:${work}:heroes`;

function prochest(k) {
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return null;
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : null;
  } catch {
    return null;
  }
}

export function readDone(work = 'ionych') {
  const svoy = prochest(kluch(work));
  if (svoy) return svoy;
  // Переезд со старого ключа: один раз, молча, только для «Ионыча».
  if (work === 'ionych') {
    const staryy = prochest(STARYY);
    if (staryy) return staryy;
  }
  return [];
}

export function markDone(work, heroId) {
  try {
    const done = new Set(readDone(work));
    done.add(heroId);
    localStorage.setItem(kluch(work), JSON.stringify([...done]));
  } catch {
    // Прогресс не сохранился — не повод прерывать занятие.
  }
}

export function resetDone(work = 'ionych') {
  try {
    localStorage.removeItem(kluch(work));
    if (work === 'ionych') localStorage.removeItem(STARYY);
  } catch {}
}

export function allDone(work, order) {
  const done = new Set(readDone(work));
  return order.every((id) => done.has(id));
}
