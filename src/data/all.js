/*
 * Все произведения в одном виде.
 *
 * Страницы ничего не знают про конкретное произведение: они берут отсюда
 * карточки, вопросы чека и задания по slug. Добавить произведение — значит
 * написать файл данных и дописать сюда одну строку; трогать страницы не
 * придётся.
 *
 * Пока данные разных произведений устроены немного по-разному (у «Ионыча»
 * исторически отдельные family и heroes), приведение к общему виду живёт
 * здесь — в одном месте, а не расползается по страницам.
 */

import * as ionych from './ionych.js';
import * as otcyIDeti from './otcy-i-deti.js';
import * as oblomov from './oblomov.js';
import { warmup as ionychWarmup, matching as ionychMatching, terms as ionychTerms } from './zadaniya.js';
import { workBySlug } from './works.js';

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public');

/*
 * Снимок есть или снимка нет — решает файл на диске, а не пометка в данных.
 *
 * Так новое произведение живёт с силуэтами ровно до того дня, когда придут
 * картинки: положил файл — карточка его показала, ничего не правя. И так же
 * честно выглядят малые карточки, которым собственный снимок не полагается
 * вовсе.
 */
function sFoto(slug, card) {
  if (card.noPhoto) return null;
  const put = `heroes/cut/${slug}__${card.id}.webp`;
  return existsSync(join(PUBLIC, put)) ? put : null;
}

function sobrat(slug, modul, zadaniya) {
  const cards = modul.cards.map((c, i) => ({
    ...c,
    order: i + 1,
    // Буква для силуэта, пока снимка нет
    initial: c.name.replace(/^[^A-Za-zА-Яа-яЁё]+/, '').charAt(0).toUpperCase(),
    photo: sFoto(slug, c),
    // thumb отличается только папкой: тот же снимок, меньше весом
    thumb: sFoto(slug, c) ? `heroes/cut/thumb/${slug}__${c.id}.webp` : null,
  }));

  const checks = modul.checks || {};
  const checkOrder = (modul.checkOrder || []).filter((id) => (checks[id] || []).length);

  // Снимок первого экрана — по тому же правилу: есть файл или нет файла
  const ekran = existsSync(join(PUBLIC, `hero/${slug}-1680.jpg`))
    ? { wide: `hero/${slug}-1680.jpg`, narrow: `hero/${slug}-900.jpg` }
    : null;

  return {
    work: workBySlug[slug],
    ekran,
    cards,
    cardById: Object.fromEntries(cards.map((c) => [c.id, c])),
    checks,
    checkOrder,
    finalCheck: modul.finalCheck || null,
    // Сколько блоков закрывает ученик в чеке: герои плюс финал, если он есть
    blokov: checkOrder.length + (modul.finalCheck ? 1 : 0),
    zadaniya,
  };
}

export const dataBySlug = {
  ionych: sobrat('ionych', ionych, {
    warmup: ionychWarmup,
    matching: ionychMatching,
    terms: ionychTerms,
  }),
  oblomov: sobrat('oblomov', oblomov, {
    warmup: oblomov.warmup || [],
    matching: oblomov.matching || [],
    terms: oblomov.terms || [],
  }),
  'otcy-i-deti': sobrat('otcy-i-deti', otcyIDeti, {
    warmup: otcyIDeti.warmup || [],
    matching: otcyIDeti.matching || [],
    terms: otcyIDeti.terms || [],
  }),
};

/**
 * Произведения, у которых есть данные. Это не то же самое, что published:
 * данные могут быть собраны, а статус ещё не выставлен — и наоборот,
 * статус выставлен по ошибке, а данных нет. Страницы строятся по данным.
 */
export const sobrannye = Object.keys(dataBySlug).filter((slug) => dataBySlug[slug].cards.length);
