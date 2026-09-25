'use strict';
// ---------- суперсила: шкала за хорошую игру, берсерк по тапу, лимит на башню; скрытая серия для мух ----------
// Спека v2.1.1 §4. Состояние живёт только здесь; game.js сообщает события забега и применяет последствия.
const POWER_FULL = 30;                          // очков в полной шкале (черновик)
const POWER_HIT_LOSS = [0.25, 0.125, 0.0625];   // доля полной шкалы, которую отнимает удар, по уровню «Стойкости»
const BERSERK_T = 6;                            // базовая длительность берсерка, с
// v — очки шкалы, used — берсерков за башню, berserkT — остаток берсерка, flyStreak — скрытая серия для мух (§4.4)
const power = { v: 0, used: 0, berserkT: 0, flyStreak: 0 };
const _lvl = (k, max) => Math.min(max, (save.up && save.up[k]) || 0);
function berserkLimit() { return 1 + _lvl('fury', 2); }                                  // «Запал»: +1 берсерк на башню
function berserkDur() { return BERSERK_T + 0.5 * ((save.up && save.up.appetite) || 0); } // «Аппетит» без потолка
function isBerserk() { return power.berserkT > 0; }
function powerSpent() { return power.used >= berserkLimit(); }                          // лимит на башню исчерпан — шкала серая
function powerReady() { return !isBerserk() && !powerSpent() && power.v >= POWER_FULL; }
function resetPower() { power.v = 0; power.used = 0; power.berserkT = 0; power.flyStreak = 0; } // «Заново» и новая башня
// +pts к шкале с учётом «Куража» (+15 % за уровень); возвращает 'ready', когда шкала только что стала полной
function powerAdd(pts) {
  if (isBerserk() || powerSpent() || power.v >= POWER_FULL) return null;
  power.v = Math.min(POWER_FULL, power.v + pts * (1 + 0.15 * _lvl('nerve', 2)));
  return power.v >= POWER_FULL ? 'ready' : null;
}
function powerHit() { power.v = Math.max(0, power.v - POWER_FULL * POWER_HIT_LOSS[_lvl('grit', 2)]); power.flyStreak = 0; }
function flyStreakAdd(k) { power.flyStreak += k; }
function activatePower() { if (!powerReady()) return false; power.v = 0; power.used++; power.berserkT = berserkDur(); return true; }
function endBerserk() { power.berserkT = 0; power.flyStreak = 0; } // смерть заканчивает берсерк и сбивает серию для мух
function updatePower(dt) {
  if (!isBerserk()) return null;
  power.berserkT -= dt;
  if (power.berserkT <= 0) { power.berserkT = 0; return 'berserkEnd'; }
  return null;
}
expose({ power, POWER_FULL, POWER_HIT_LOSS, BERSERK_T, berserkLimit, berserkDur, isBerserk, powerSpent, powerReady, resetPower,
  powerAdd, powerHit, flyStreakAdd, activatePower, endBerserk, updatePower });
