'use strict';
// ---------- апгрейды: каталог, цены, эффекты, покупка ----------
// Экономика этапа 2 черновая: цены правятся только здесь, по метрикам после релиза (spec 2026-09-23 §4).
const JUMPS_BASE = 4;
const UPGRADES = {
  jumps:  { levels: [{ price: 80, value: 5 }, { price: 300, value: 6 }] },                              // value — максимум зарядов
  magnet: { levels: [{ price: 60, value: 60 }, { price: 180, value: 90 }, { price: 400, value: 120 }] }, // value — радиус, px от края тефтели
};
function upLevel(id) { return (save.up && save.up[id]) || 0; }
function upMaxLevel(id) { return UPGRADES[id].levels.length; }
// значение эффекта на уровне level (0 — без апгрейда)
function upValue(id, level) { return level > 0 ? UPGRADES[id].levels[level - 1].value : (id === 'jumps' ? JUMPS_BASE : 0); }
function upPrice(id) { const l = upLevel(id); return l < upMaxLevel(id) ? UPGRADES[id].levels[l].price : null; } // null — максимум
function maxJumps() { return upValue('jumps', upLevel('jumps')); }
function magnetRadius() { return upValue('magnet', upLevel('magnet')); }
function canBuy(id) { const p = upPrice(id); return p !== null && coins() >= p; }
function canBuyAny() { return Object.keys(UPGRADES).some(canBuy); }
function buy(id) {
  if (!canBuy(id)) return false;
  save.spent += upPrice(id); save.up[id] = upLevel(id) + 1;
  persist(); sfx.buy();
  return true;
}
expose({ UPGRADES, JUMPS_BASE, upLevel, upMaxLevel, upValue, upPrice, maxJumps, magnetRadius, canBuy, canBuyAny, buy });
