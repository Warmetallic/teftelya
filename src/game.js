'use strict';
// ---------- забег: правила, столкновения, смерть, «Продолжить», «×2» ----------
const G = 1500;
const COIN_MULT = [[14, 4], [10, 3], [7, 2], [4, 1.5]]; // [масса, множитель монет] — первая подходящая ступень сверху вниз
const MAGNET_SPEED = 300;       // px/с — с какой скоростью магнит подтягивает еду
const REGEN = 1.6;              // секунд на восстановление заряда без еды
const WALL_HIT = 260;           // скорость удара о стену, отрывающая мясо
const HAIR_PROOF = 6;           // с этой массы волосы не страшны
const CONTINUE_MIN_MASS = 3;    // масса после «Продолжить» не меньше
const INVULN_TIME = 1.5;        // секунд неуязвимости после «Продолжить»
const DOUBLE_MIN_COINS = 10;    // «Монеты ×2» предлагаем от этой суммы
let state = 'title';            // title | play | dead | shop
let camShake = 0, shakeX = 0, shakeY = 0;
let maxHeight = 0, runCoins = 0;
let bankedCoins = 0;            // сколько из runCoins уже зачислено в save.earned — die() банкует по шагам, а не всё сразу
let usedContinue = false, usedDouble = false, invuln = 0, massAtDeath = 0;
let floorReached = 1, clearedThisRun = [], newUnlock = 0; // этажи: достигнутый, пройденные за забег, открытый для старта
function jumpPower() { return 690; } // от массы не зависит — ритм тапов одинаковый всю игру
function coinMult() { for (const [m, k] of COIN_MULT) if (ball.mass >= m) return k; return 1; }
function reset(n = 1) {
  const baseY = floorBaseY(n);
  ball.x = W / 2; ball.y = baseY; ball.vx = 0; ball.vy = 0; ball.mass = startMass(n); ball.r = radiusFor(ball.mass);
  ball.jumps = maxJumps(); ball.regen = 0; ball.mouth = 0; ball.face = 0; ball.alive = true; initBody();
  camY = baseY - H + 120; items = []; particles = []; texts = []; plates = [{ x: W / 2, y: baseY + 30, w: 220 }];
  spawnedTo = baseY - 160; maxHeight = FLOOR_H * (n - 1); runCoins = 0; bankedCoins = 0; tGame = 0; camShake = 0;
  usedContinue = false; usedDouble = false; invuln = 0; massAtDeath = 0;
  resetHatches(n); floorReached = n; clearedThisRun = []; newUnlock = 0;
}
// прыжок в сторону dir (-1 влево, +1 вправо)
function jump(dir) {
  if (!ball.alive) return;
  if (ball.jumps <= 0) { deform((a, dx, dy) => ({ x: 0, y: -dy * 90 })); tone(160, 90, 0.12, 'sine', 0.12); return; }
  ball.jumps--;
  const p = jumpPower();
  ball.vy = -p;
  const side = lerp(250, 150, heavy()); // тяжёлая хуже слушается
  ball.vx = clamp(ball.vx * lerp(0.35, 0.75, heavy()) + dir * side, -420, 420);
  squash(p * 0.55);
  crumbs(ball.x, ball.y + ball.r * 0.8);
  sfx.jump(ball.mass);
  ball.blink = 0.08;
}
function eat(it) {
  const d = it.def;
  if (!it.trash) {
    it.dead = true;
    const mult = coinMult(), gain = Math.round(d.coins * mult); // множитель до прироста массы — и для монет, и для флага big
    ball.mass += d.mass; runCoins += gain;
    ball.jumps = Math.min(maxJumps(), ball.jumps + d.jumps);
    ball.mouth = 1;
    pulse(140 * d.mass);
    burst(it.x, it.y, colorOf(it.kind), 10 + d.mass * 6, 260, 0.5, 5);
    popText(it.x, it.y - 20, '+' + gain, '#ffe08a', d.mass > 1 || mult > 1);
    if (d.mass > 1) { camShake = 6; sfx.big(); } else sfx.eat();
    return;
  }
  if (invuln > 0) return; // после «Продолжить» мусор пролетает сквозь
  it.dead = true;
  if (it.kind === 'hair' && ball.mass >= HAIR_PROOF) {
    burst(it.x, it.y, '#222', 6, 160, 0.4, 2);
    popText(it.x, it.y - 20, T('pf'), 'rgba(255,255,255,0.7)');
    tone(700, 300, 0.06, 'square', 0.08);
    return;
  }
  ball.mass += d.mass;
  jolt(it.x, it.y, 260);
  loseMeat(it.x, it.y, -d.mass * 2);
  burst(it.x, it.y, '#6b6b6b', 12, 200, 0.5, 3);
  popText(it.x, it.y - 20, T('item.' + it.kind), '#ff7a6b', true);
  camShake = 10; sfx.hit();
  ball.vy = Math.min(ball.vy + 200, 400); ball.vx *= 0.5;
  if (ball.mass < 1) die();
}
function wallHit(wx, speed) {
  jolt(wx, ball.y, 200);
  if (speed > WALL_HIT && ball.mass > 1 && invuln <= 0) {
    ball.mass -= 1; loseMeat(wx, ball.y, 2); camShake = 9; sfx.hit();
    popText(ball.x, ball.y - ball.r - 10, T('meatLost'), '#ff7a6b', true);
  } else if (speed > 120) crumbs(ball.x, ball.y);
}
function die() {
  if (!ball.alive) return;
  massAtDeath = ball.mass;
  ball.alive = false; state = 'dead'; tGame = 0;
  sfx.die(); camShake = 16;
  burst(ball.x, ball.y, '#b9542f', 40, 380, 0.9, 6);
  save.earned += runCoins - bankedCoins; bankedCoins = runCoins; if (maxHeight > save.best) save.best = maxHeight;
  persist();
  YG.gameplayStop();
}
// «Продолжить» после rewarded: тарелка у нижнего края экрана, масса не меньше CONTINUE_MIN_MASS
function continueRun() {
  const plate = { x: W / 2, y: camY + H - 90, w: 220 };
  plates.push(plate);
  ball.mass = Math.max(massAtDeath, CONTINUE_MIN_MASS); ball.r = radiusFor(ball.mass);
  ball.x = plate.x; ball.y = plate.y - ball.r; ball.vx = 0; ball.vy = 0;
  ball.jumps = maxJumps(); ball.regen = 0; ball.mouth = 0; ball.alive = true; initBody();
  for (const it of items) { const dx = it.x - ball.x, dy = it.y - ball.y; if (dx * dx + dy * dy < 120 * 120) it.dead = true; }
  items = items.filter(it => !it.dead);
  invuln = INVULN_TIME; usedContinue = true; camShake = 0; tGame = 0;
  state = 'play';
}
// «Монеты ×2» после rewarded
function doubleCoins() { save.earned += runCoins; runCoins *= 2; bankedCoins = runCoins; usedDouble = true; persist(); }
// этаж пройден честно: учёт за забег и прогресс сохранения
function floorCleared(n) {
  clearedThisRun.push(n);
  if (n > save.floor) { save.floor = n; newUnlock = n + 1; persist(); }
}
function updateRun(dt) {
  ball.vy += G * dt;
  ball.x += ball.vx * dt; ball.y += ball.vy * dt;
  ball.vx *= Math.pow(lerp(0.35, 0.6, heavy()), dt);
  if (ball.x < ball.r) { ball.x = ball.r; if (ball.vx < 0) { wallHit(0, -ball.vx); ball.vx = -ball.vx * 0.5; } }
  if (ball.x > W - ball.r) { ball.x = W - ball.r; if (ball.vx > 0) { wallHit(W, ball.vx); ball.vx = -ball.vx * 0.5; } }
  for (const pl of plates) {
    if (Math.abs(ball.x - pl.x) < pl.w / 2 && ball.vy > 0 && ball.y + ball.r > pl.y && ball.y + ball.r < pl.y + 40) {
      ball.y = pl.y - ball.r; if (ball.vy > 80) { squash(ball.vy * 0.5); crumbs(ball.x, ball.y + ball.r); }
      ball.vy = 0; ball.vx *= 0.8;
    }
  }
  const target = ball.y - H * 0.55; // камера едет только вверх
  if (target < camY) camY = lerp(camY, target, 1 - Math.pow(0.001, dt));
  maxHeight = Math.max(maxHeight, Math.floor(-ball.y / 10));
  floorReached = Math.max(floorReached, floorOf(Math.max(0, -ball.y / 10)));
  if (ball.y - ball.r > camY + H + 40) { die(); return; }
  ball.r = lerp(ball.r, radiusFor(ball.mass), 1 - Math.pow(0.01, dt));
  if (ball.jumps < maxJumps()) { ball.regen += dt; if (ball.regen >= REGEN) { ball.regen = 0; ball.jumps++; } } else ball.regen = 0;
  invuln = Math.max(0, invuln - dt);
  ball.mouth = Math.max(0, ball.mouth - dt * 3);
  ball.face = lerp(ball.face, clamp(ball.vx / 300, -1, 1), 1 - Math.pow(0.02, dt));
  spawn();
  spawnHatches();
  const mr = magnetRadius();
  for (const it of items) {
    if (it.dead) continue;
    if (mr > 0 && !it.trash) { // магнит: еда в радиусе подтягивается к центру, мусор нет
      const dx0 = ball.x - it.x, dy0 = ball.y - it.y, dist = Math.hypot(dx0, dy0);
      if (dist > 0 && dist < ball.r + mr) { const step = Math.min(dist, MAGNET_SPEED * dt); it.x += dx0 / dist * step; it.y += dy0 / dist * step; }
    }
    if (it.vx) { it.x += it.vx * dt; if (it.x < 30 || it.x > W - 30) it.vx = -it.vx; it.y += Math.sin(tGame * 6 + it.seed) * 18 * dt; }
    const dx = it.x - ball.x, dy = it.y - ball.y;
    if (dx * dx + dy * dy < (it.r + ball.r * 0.92) ** 2) { eat(it); if (!ball.alive) return; }
  }
  items = items.filter(it => !it.dead && it.y < camY + H + 80);
  plates = plates.filter(pl => pl.y < camY + H + 80);
  pruneHatches();
}
function update(dt) {
  tGame += dt;
  if (state === 'play' && ball.alive) updateRun(dt);
  ball.blink -= dt; if (ball.blink < -rnd(2, 5)) ball.blink = 0.1;
  updateBody(dt);
  updateFx(dt);
  camShake = Math.max(0, camShake - dt * 40);
  shakeX = rnd(-camShake, camShake); shakeY = rnd(-camShake, camShake);
}
expose({
  get state() { return state; }, set state(v) { state = v; },
  get run() { return { maxHeight, runCoins, usedContinue, usedDouble, invuln, massAtDeath, bankedCoins, floorReached, clearedThisRun, newUnlock }; },
  setRunCoins(n) { runCoins = n; },
  reset, jump, die, continueRun, doubleCoins, update, coinMult, floorCleared,
});
