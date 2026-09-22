'use strict';
// ---------- i18n: ru + en, остальные языки → en ----------
const STR = {
  ru: {
    title: 'Тефтеля',
    hint1: 'Тап — прыжок.', hint2: 'Тап слева или справа — в ту сторону.', hint3: 'Ешь еду, расти. Волосы и грязь — не ешь.',
    hint4: 'Каждый прыжок тратит заряд, еда возвращает.', hint5: 'Об стену на скорости — теряешь мясо.',
    tapToJump: 'Тапни, чтобы прыгнуть',
    fell: 'Упала', best: 'лучший', runCoins: 'Собрано за забег', total: 'Всего',
    again: 'Ещё раз', continueAd: 'Продолжить', doubleAd: 'Монеты ×2', forAd: 'за рекламу',
    paused: 'Пауза', tapToContinue: 'Тапни, чтобы продолжить',
    mass: 'масса', hairProof: 'волосы не страшны', meatLost: '−1 мясо', pf: 'пф', m: 'м',
    adStub: 'Реклама (заглушка)', loading: 'Загрузка…',
    'item.hair': 'волос', 'item.dirt': 'грязь', 'item.fly': 'муха',
  },
  en: {
    title: 'Meatball',
    hint1: 'Tap to jump.', hint2: 'Tap left or right to jump that way.', hint3: 'Eat food to grow. Avoid hair and dirt.',
    hint4: 'Each jump costs a charge, food refills.', hint5: 'Hit a wall fast — lose meat.',
    tapToJump: 'Tap to jump',
    fell: 'Fell', best: 'best', runCoins: 'Coins this run', total: 'Total',
    again: 'Again', continueAd: 'Continue', doubleAd: 'Coins ×2', forAd: 'watch ad',
    paused: 'Paused', tapToContinue: 'Tap to continue',
    mass: 'mass', hairProof: 'hair-proof', meatLost: '−1 meat', pf: 'pff', m: 'm',
    adStub: 'Ad (stub)', loading: 'Loading…',
    'item.hair': 'hair', 'item.dirt': 'dirt', 'item.fly': 'fly',
  },
};
let LANG = 'ru';
function setLang(code) { LANG = code === 'ru' ? 'ru' : 'en'; }
function T(key) {
  const t = STR[LANG][key];
  if (t !== undefined) return t;
  const f = STR.ru[key];
  return f === undefined ? key : f;
}
Object.assign(DBG, { setLang, T, get lang() { return LANG; } });
