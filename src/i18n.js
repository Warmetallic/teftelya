'use strict';
// ---------- i18n: ru, tr, остальные языки → en; недостающий ключ ищется в en, потом в ru ----------
const STR = {
  ru: {
    title: 'Тефтеля',
    hint1: 'Тап — прыжок.', hint2: 'Тап слева или справа — в ту сторону.', hint3: 'Ешь еду, расти. Волосы и грязь — не ешь.',
    hint4: 'Каждый прыжок тратит заряд, еда возвращает.', hint5: 'Об стену на скорости — теряешь мясо.',
    tapToJump: 'Тапни, чтобы прыгнуть',
    fell: 'Шлёп!', best: 'лучший', runCoins: 'Собрано за забег', total: 'Всего',
    again: 'Ещё раз', continueAd: 'Продолжить', doubleAd: 'Монеты ×2', forAd: 'за рекламу',
    paused: 'Пауза', tapToContinue: 'Тапни, чтобы продолжить',
    mass: 'масса', hairProof: 'волосы не страшны', meatLost: '−1 мясо', pf: 'пф', m: 'м',
    adStub: 'Реклама (заглушка)', loading: 'Загрузка…',
    'item.hair': 'волос', 'item.dirt': 'грязь', 'item.fly': 'муха',
    shop: 'Магазин', back: 'Назад', buy: 'Купить', max: 'Макс', none: 'нет',
    'up.jumps': 'Заряды прыжка', 'up.magnet': 'Магнит', 'up.jumps.effect': 'Прыжков', 'up.magnet.effect': 'Радиус',
    floor: 'Этаж', massAtLeast: 'масса ≥ {n}', needMass: 'Нужна масса {n}', floorCleared: 'Этаж {n} пройден!', floorUnlocked: 'Открыт этаж {n}', vented: 'Вентиляция',
  },
  en: {
    title: 'Meatball',
    hint1: 'Tap to jump.', hint2: 'Tap left or right to jump that way.', hint3: 'Eat food to grow. Avoid hair and dirt.',
    hint4: 'Each jump costs a charge, food refills.', hint5: 'Hit a wall fast — lose meat.',
    tapToJump: 'Tap to jump',
    fell: 'Splat!', best: 'best', runCoins: 'Coins this run', total: 'Total',
    again: 'Again', continueAd: 'Continue', doubleAd: 'Coins ×2', forAd: 'watch ad',
    paused: 'Paused', tapToContinue: 'Tap to continue',
    mass: 'mass', hairProof: 'hair-proof', meatLost: '−1 meat', pf: 'pff', m: 'm',
    adStub: 'Ad (stub)', loading: 'Loading…',
    'item.hair': 'hair', 'item.dirt': 'dirt', 'item.fly': 'fly',
    shop: 'Shop', back: 'Back', buy: 'Buy', max: 'Max', none: 'none',
    'up.jumps': 'Jump charges', 'up.magnet': 'Magnet', 'up.jumps.effect': 'Jumps', 'up.magnet.effect': 'Radius',
    floor: 'Floor', massAtLeast: 'mass ≥ {n}', needMass: 'Need mass {n}', floorCleared: 'Floor {n} cleared!', floorUnlocked: 'Floor {n} unlocked', vented: 'Vent',
  },
  tr: {
    title: 'Köfte',
    hint1: 'Zıplamak için dokun.', hint2: 'Sola veya sağa dokun — o yöne zıpla.', hint3: 'Yemek ye, büyü. Kıl ve kirden kaçın.',
    hint4: 'Her zıplama bir şarj harcar, yemek doldurur.', hint5: 'Duvara hızla çarparsan et kaybedersin.',
    tapToJump: 'Zıplamak için dokun',
    fell: 'Pat!', best: 'en iyi', runCoins: 'Bu turda toplanan', total: 'Toplam',
    again: 'Tekrar', continueAd: 'Devam et', doubleAd: 'Para ×2', forAd: 'reklam izle',
    paused: 'Duraklatıldı', tapToContinue: 'Devam etmek için dokun',
    mass: 'kütle', hairProof: 'kıl işlemez', meatLost: '−1 et', pf: 'pöf', m: 'm',
    adStub: 'Reklam (taslak)', loading: 'Yükleniyor…',
    'item.hair': 'kıl', 'item.dirt': 'kir', 'item.fly': 'sinek',
    shop: 'Mağaza', back: 'Geri', buy: 'Satın al', max: 'Maks', none: 'yok',
    'up.jumps': 'Zıplama şarjı', 'up.magnet': 'Mıknatıs', 'up.jumps.effect': 'Zıplama sayısı', 'up.magnet.effect': 'Yarıçap',
    floor: 'Kat', massAtLeast: 'kütle ≥ {n}', needMass: 'Kütle {n} gerek', floorCleared: 'Kat {n} geçildi!', floorUnlocked: 'Kat {n} açıldı', vented: 'Havalandırma',
  },
};
function langFor(code) { const c = String(code || '').slice(0, 2).toLowerCase(); return c === 'ru' ? 'ru' : c === 'tr' ? 'tr' : 'en'; }
// до YG.init()/setLang язык берём из браузера, чтобы «Загрузка…» не всегда была русской
let LANG = langFor((window.navigator && window.navigator.language) || 'ru');
function setLang(code) { LANG = langFor(code); }
// T(key) — строка; T(key, n) — с подстановкой {n} (число) или {s} (строка)
function T(key, n) {
  for (const tbl of [STR[LANG], STR.en, STR.ru]) {
    const t = tbl[key];
    if (t !== undefined) return n === undefined ? t : t.replace('{n}', String(n)).replace('{s}', String(n));
  }
  return key;
}
expose({ setLang, T, get lang() { return LANG; } });
