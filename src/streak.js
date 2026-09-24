'use strict';
// ---------- серия и берсерк: чистое состояние, события для game.js ----------
const BERSERK_AT = [12, 10, 8];      // порог по уровню «Куража»
const GRIT_KEEP = [0, 0.5, 0.75];    // доля серии после удара по уровню «Стойкости»
const BERSERK_T = 6;                 // базовая длительность берсерка, с
const streak = { n: 0, berserkT: 0, best: 0 };
const _lvl = (k, max) => Math.min(max, (save.up && save.up[k]) || 0);
function berserkThreshold() { return BERSERK_AT[_lvl('nerve', 2)]; }
function berserkDur() { return BERSERK_T + 0.5 * ((save.up && save.up.appetite) || 0); }
function isBerserk() { return streak.berserkT > 0; }
function resetStreak() { streak.n = 0; streak.berserkT = 0; streak.best = 0; }
// +k к серии; при пороге серия обнуляется и начинается берсерк
function streakAdd(k) {
  if (isBerserk()) return null;
  streak.n += k; streak.best = Math.max(streak.best, streak.n);
  if (streak.n >= berserkThreshold()) { streak.n = 0; streak.berserkT = berserkDur(); return 'berserkStart'; }
  return null;
}
function streakHit() { streak.n = Math.floor(streak.n * GRIT_KEEP[_lvl('grit', 2)]); }
function updateStreak(dt) {
  if (!isBerserk()) return null;
  streak.berserkT -= dt;
  if (streak.berserkT <= 0) { streak.berserkT = 0; streak.n = 0; return 'berserkEnd'; }
  return null;
}
expose({ streak, BERSERK_AT, GRIT_KEEP, BERSERK_T, berserkThreshold, berserkDur, isBerserk, resetStreak, streakAdd, streakHit, updateStreak });
