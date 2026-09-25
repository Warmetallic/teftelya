'use strict';
// ---------- забег по башне: прыжок в точку, урон, смерть, чекпоинты, финиш и рейтинг ----------
const MASS_BASE = 4;            // максимум массы без прокачки; башня начинается с полной массой (спека v2.1.1 §5)
const INVULN_HIT = 1;           // с неуязвимости после удара
const BANNER_T = 1.5;           // с — плашка «Башня N · Тема» при старте башни (спека v2.2a §5)
const INVULN_CONT = 1.5;        // с неуязвимости после «Продолжить»
const DOUBLE_MIN_COINS = 10;    // «Монеты ×2» предлагаем от этой суммы
const BONUS_MULT = { S: 2, A: 1.5, B: 1.2, C: 1, D: 0.8 };
const FOOD_SHARE = 0.8;         // доля еды башни для галочки рейтинга
let state = 'title';            // title | play | dead | finish
let tower = null;               // { tp, platforms, hazards, items } текущей башни
let camY = 0, tGame = 0, camShake = 0, shakeX = 0, shakeY = 0;
let run = null;                 // состояние забега, см. newRun()
let god = false;                // тесты (smoke): без урона и смерти от падения
function massMax() { return MASS_BASE + ((save.up && save.up.meat) || 0); }
function chargesMax() { return 3 + ((save.up && save.up.charge) || 0); }
// лечение (спека v2.1.1 §5): чекпоинт, «Продолжить» и съеденная в берсерке муха или капля масла; еда не лечит
function heal(n) {
  const m0 = ball.mass; ball.mass = Math.min(massMax(), ball.mass + n);
  if (ball.mass > m0) { ball.healT = HEAL_T; burst(ball.x, ball.y - ball.r * 0.5, '#ffe08a', 10, 160, 0.5, 3); } // укус зарастает на Тефе
  return ball.mass - m0;
}
// visited — id платформ, на которые Тефа уже садилась в этом забеге: шкала растёт только за первую посадку (спека v2.1.1 §4.1)
function newRun() { return { time: 0, runCoins: 0, bankedCoins: 0, deaths: 0, usedContinue: 0, usedDouble: false, foodEaten: 0, foodTotal: 0, cp: 0, lastLandId: 0, visited: new Set(), campT: 0, flyCd: 0, invuln: 0, reason: '', rating: null, bonus: 0, progress: 0, finished: false, bannerT: 0 }; }
function cpPlatform(k) { return tower.platforms.find(p => k ? p.cp === k : p.start) || tower.platforms[0]; }
function placeAt(p) {
  ball.x = p.x; ball.y = p.y - ball.r; ball.vx = 0; ball.vy = 0; ball.onPlatform = p.id; ball.charges = chargesMax();
  ball.sq = 0; ball.sqv = 0; ball.tilt = 0; ball.tiltv = 0; ball.mouth = 0; ball.face = 0; ball.hot = 0; ball.alive = true;
  run.lastLandId = p.id; run.visited.add(p.id); run.campT = 0; run.invuln = 0;
}
// башня N с нуля; fromCp > 0 — старт с чекпоинта сохранения (новая сессия: считается одной смертью)
function startTower(N, fromCp = 0) {
  tower = buildTower(N); run = newRun(); run.foodTotal = tower.items.length; run.bannerT = BANNER_T;
  if (fromCp && !tower.platforms.some(p => p.cp === fromCp)) fromCp = 0; // битый чекпоинт из сохранения
  resetPower(); resetFlies(); resetFx(); resetPours(5); // первый налив масла не раньше 5 с
  ball.mass = massMax(); ball.r = radiusFor(ball.mass);
  run.cp = fromCp; if (fromCp) run.deaths = 1;
  placeAt(cpPlatform(fromCp));
  camY = ball.y - H * 0.6; tGame = 0; camShake = 0;
}
// прыжок к точке мира (tx, ty); false — нет зарядов или не в игре
function jumpTo(tx, ty) {
  if (!ball.alive || state !== 'play') return false;
  if (ball.charges <= 0) { pulse(-60); tone(160, 90, 0.12, 'sine', 0.12); return false; }
  const a = aimJump(ball.x, ball.y, ball.r, clamp(tx, 0, W), ty);
  ball.charges--; ball.vx = a.vx; ball.vy = a.vy; ball.onPlatform = null; run.campT = 0;
  squash(-220); crumbs(ball.x, ball.y + ball.r * 0.8); sfx.jump(ball.mass); ball.blink = 0.08;
  return true;
}
function coinsFor(kind) { return Math.round(FOOD_KINDS[kind].coins * tower.tp.coinMul * (1 + 0.05 * ((save.up && save.up.spice) || 0)) * (isBerserk() ? 2 : 1)); }
let tapHintShown = false; // подсказка «Тапни по Тефе!» — один раз за сессию
function onPower(ev) { // события суперсилы: шкала полна, берсерк кончился
  if (ev === 'ready') { tone(520, 880, 0.18, 'triangle', 0.16); if (!tapHintShown) { tapHintShown = true; popText(ball.x, ball.y - ball.r - 50, T('tapTefa'), '#ffe08a', true); } }
  else if (ev === 'berserkEnd') pulse(-80);
}
// суперсила по тапу на Тефу или клавише E (спека v2.1.1 §3.4): только при полной шкале и неисчерпанном лимите
function tryActivatePower() {
  if (!ball.alive || state !== 'play' || !activatePower()) return false;
  camShake = 10; sfx.big(); popText(ball.x, ball.y - ball.r - 30, T('berserk'), '#ffe08a', true);
  return true;
}
function eat(it) {
  it.dead = true; run.foodEaten++;
  const gain = coinsFor(it.kind); run.runCoins += gain;
  ball.mouth = 1; pulse(140);
  burst(it.x, it.y, FOOD_COLOR[it.kind], 12, 260, 0.5, 5); popText(it.x, it.y - 20, '+' + gain, '#ffe08a', isBerserk());
  sfx.eat(); onPower(powerAdd(ball.onPlatform === null ? 2 : 1)); flyStreakAdd(1); // еда, пойманная в полёте, заряжает вдвое
}
// урон n кусков с точки (fx, fy); false — урон не прошёл (неуязвимость, берсерк, god)
function damage(n, reason, fx, fy) {
  if (god || run.invuln > 0 || isBerserk() || !ball.alive) return false;
  ball.mass -= n; powerHit(); run.invuln = INVULN_HIT;
  loseMeat(fx, fy, n * 2); jolt(fx, fy, 260); camShake = 10; sfx.hit();
  ball.vy = Math.min(ball.vy, -260); ball.vx = (ball.x < fx ? -1 : 1) * 200; ball.onPlatform = null;
  if (ball.mass <= 0) { ball.mass = 0; die(reason); } else popText(ball.x, ball.y - ball.r - 10, T('die.' + reason), '#ff7a6b', true);
  return true;
}
function bank() { save.earned += run.runCoins - run.bankedCoins; run.bankedCoins = run.runCoins; }
function die(reason) {
  if (!ball.alive || god) return;
  ball.alive = false; state = 'dead'; run.reason = reason; run.deaths++; tGame = 0; endBerserk();
  sfx.die(); camShake = 16; burst(ball.x, ball.y, '#b9542f', 40, 380, 0.9, 6);
  bank(); persist(); YG.gameplayStop();
}
// «Продолжить» за rewarded: на последней платформе с полной массой (еда больше не лечит); рейтинг башни станет D
function continueRun() {
  ball.mass = massMax(); ball.r = radiusFor(ball.mass); // масса и радиус до посадки: placeAt сажает Тефу по ball.r
  placeAt(platformById(tower.platforms, run.lastLandId) || cpPlatform(run.cp));
  endBerserk(); resetFlies(); resetPours(3); run.invuln = INVULN_CONT; run.usedContinue++; camShake = 0; tGame = 0; state = 'play'; // шкала и потраченный берсерк смерть переживают, серия для мух — нет
}
// «С чекпоинта» бесплатно: смерти уже посчитаны в die(); масло и мухи сброшены
function restartFromCp() {
  ball.mass = massMax(); ball.r = radiusFor(ball.mass); placeAt(cpPlatform(run.cp));
  endBerserk(); resetFlies(); resetFx(); resetPours(4);
  camY = ball.y - H * 0.6; tGame = 0; state = 'play';
}
function restartTower() { startTower(tower.tp.N, 0); save.cp = 0; state = 'play'; } // чекпоинт сбрасывается вместе с башней; запишет ближайшая смерть или финиш
function nextTower() { startTower(save.tower, 0); state = 'play'; }
function doubleCoins() { save.earned += run.runCoins; run.runCoins *= 2; run.bankedCoins = run.runCoins; run.usedDouble = true; persist(); }
// три проверки → буква; «Продолжить» → D
function ratingFor(r, tp) {
  const checks = { noDeath: r.deaths === 0, time: r.time <= tp.par, food: r.foodTotal === 0 || r.foodEaten >= FOOD_SHARE * r.foodTotal };
  const n = (checks.noDeath ? 1 : 0) + (checks.time ? 1 : 0) + (checks.food ? 1 : 0);
  return { letter: r.usedContinue ? 'D' : ['C', 'B', 'A', 'S'][n], checks };
}
function bonusCoins(N, letter) { return Math.round(20 * N * BONUS_MULT[letter]); }
function finishTower() {
  const N = tower.tp.N, rt = ratingFor(run, tower.tp);
  run.rating = rt; run.bonus = bonusCoins(N, rt.letter); run.runCoins += run.bonus; run.finished = true; bank();
  const prev = save.log[N], t = Math.round(run.time * 10) / 10;
  if (!prev || RANK.indexOf(rt.letter) > RANK.indexOf(prev.r) || (rt.letter === prev.r && t < prev.t)) save.log[N] = { r: rt.letter, t };
  save.tower = Math.max(save.tower, N + 1); save.cp = 0; persist();
  ball.onPlatform = tower.platforms.find(p => p.roof).id;
  state = 'finish'; tGame = 0; sfx.big(); camShake = 8; YG.gameplayStop();
}
function reachCheckpoint(p) { run.cp = p.cp; save.cp = p.cp; heal(massMax()); delayPours(4); persist(); popText(p.x, p.y - 40, T('checkpoint', p.cp), '#8ff0a4', true); sfx.buy(); }
function onLand(p, vy) {
  ball.charges = chargesMax();
  if (vy > 80) { squash(Math.min(vy, 900) * 0.5); crumbs(ball.x, ball.y + ball.r); }
  run.lastLandId = p.id;
  if (!run.visited.has(p.id)) { run.visited.add(p.id); onPower(powerAdd(1)); flyStreakAdd(1); } // только первая посадка: прыжками туда-обратно шкалу не накрутить
  if (p.cp > run.cp) reachCheckpoint(p);
  if (p.roof) finishTower();
}
function updateRun(dt) {
  const tp = tower.tp; run.time += dt; run.bannerT = Math.max(0, run.bannerT - dt);
  const prevBottom = ball.y + ball.r, wasOn = ball.onPlatform;
  if (ball.onPlatform === null) { ball.vy += GRAV * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt; }
  if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx) * 0.6; } else if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx) * 0.6; }
  for (const e of updatePlatforms(dt, tower.platforms, tp)) {
    if (e.type === 'crumble') { burst(e.p.x, e.p.y, '#f6c343', 16, 200, 0.6, 4); continue; } // сыр раскрошился
    if (isBerserk()) continue; // спека §4.4: в берсерке Тефа не горит — ни урона, ни подброса; таймер сковородки уже сброшен в platforms.js
    damage(1, 'pan', e.p.x, e.p.y + 40);
    if (!ball.alive) return;
    ball.onPlatform = null; ball.vy = -700; ball.vx = 0; // спека §3.2: автопрыжок строго вверх — боковой отброс урона сдувал с узкой сковородки в пропасть
  }
  if (ball.onPlatform === null) {
    const vy = ball.vy, p = tryLand(tower.platforms, prevBottom);
    if (p) { onLand(p, vy); if (state !== 'play') return; }
  }
  run.campT = ball.onPlatform !== null && ball.onPlatform === wasOn ? run.campT + dt : 0;
  const st = platformById(tower.platforms, ball.onPlatform);
  ball.hot = st && st.type === 'pan' ? clamp((st.hotT || 0) / panTime(tp), 0, 1) : Math.max(0, ball.hot - dt * 2);
  run.flyCd = Math.max(0, run.flyCd - dt);
  if (run.flyCd <= 0 && flyWanted(dt, power.flyStreak, run.campT, isBerserk(), powerReady())) { spawnFly(); run.flyCd = FLY_CD; run.campT = 0; }
  const hev = updateHazards(dt, tower.hazards, { tp, berserk: isBerserk(), invuln: run.invuln }).concat(updatePours(dt, { tp, berserk: isBerserk(), camY, platforms: tower.platforms }));
  for (const e of hev) {
    if (e.type === 'hit') damage(1, e.reason, e.x, e.y); // каждая опасность снимает один кусок; сразу убивает только падение
    else if (e.type === 'flyGaveUp') { onPower(powerAdd(3)); flyStreakAdd(3); popText(e.h.x, e.h.y, T('flyGone'), 'rgba(255,255,255,0.7)'); }
    else if (e.type === 'eaten') { const gain = coinsFor('meat'); run.runCoins += gain; heal(1); burst(e.x, e.y, e.what === 'fly' ? '#2b2b2b' : '#ff9a2a', 10, 200, 0.4, 3); popText(e.x, e.y, '+' + gain, '#ffe08a', true); sfx.eat(); }
    else if (e.type === 'smash') { run.runCoins += 2; burst(e.x, e.y, '#ddd', 14, 300, 0.5, 4); sfx.hit(); }
    if (!ball.alive) return;
  }
  for (const it of tower.items) {
    if (it.dead || Math.abs(it.y - ball.y) > 200) continue;
    if (isBerserk()) { const dx0 = ball.x - it.x, dy0 = ball.y - it.y, d = Math.hypot(dx0, dy0); if (d > 0 && d < ball.r + 140) { const s = Math.min(d, 300 * dt); it.x += dx0 / d * s; it.y += dy0 / d * s; } } // магнит только в берсерке
    const dx = it.x - ball.x, dy = it.y - ball.y;
    if (dx * dx + dy * dy < (it.r + ball.r * 0.92) ** 2) eat(it);
  }
  const pe = updatePower(dt); if (pe) onPower(pe);
  const target = ball.y - H * 0.6; if (target < camY) camY = lerp(camY, target, 1 - Math.pow(0.001, dt)); // камера только вверх
  run.progress = Math.max(run.progress, clamp(-ball.y / tp.height, 0, 1));
  if (ball.y - ball.r > camY + H + 40) { if (god) placeAt(platformById(tower.platforms, run.lastLandId) || cpPlatform(run.cp)); else { die('fall'); return; } }
  run.invuln = Math.max(0, run.invuln - dt);
  ball.mouth = Math.max(0, ball.mouth - dt * 3);
  ball.face = lerp(ball.face, clamp(ball.vx / 300, -1, 1), 1 - Math.pow(0.02, dt));
}
function update(dt) {
  tGame += dt;
  if (state === 'play' && ball.alive) updateRun(dt);
  ball.blink -= dt; if (ball.blink < -rnd(2, 5)) ball.blink = 0.1;
  updateBody(dt); updateFx(dt);
  camShake = Math.max(0, camShake - dt * 40); shakeX = rnd(-camShake, camShake); shakeY = rnd(-camShake, camShake);
}
expose({
  get state() { return state; }, set state(v) { state = v; }, get tower() { return tower; }, get run() { return run; }, get camY() { return camY; },
  get platforms() { return tower ? tower.platforms : []; }, get hazards() { return tower ? tower.hazards : []; }, get items() { return tower ? tower.items : []; },
  setRunCoins(n) { run.runCoins = n; }, setGod(v) { god = !!v; }, setCamY(v) { camY = v; }, massMax, chargesMax, coinsFor, heal,
  startTower, jumpTo, tryActivatePower, damage, die, continueRun, restartFromCp, restartTower, nextTower, finishTower, doubleCoins, ratingFor, bonusCoins, update,
});
