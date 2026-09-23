'use strict';
// ---------- этажи башни: разметка по высоте, люк на потолке, буфет перед ним, вентиляция ----------
// Числа черновые (spec 2026-09-23 floors §3–§4) — настраиваются только здесь.
const FLOOR_H = 150;              // метров на этаж
const FLOOR_PX = FLOOR_H * 10;    // то же в px
const BUFFET_M = 20;              // последние метры этажа без обычного спавна — там буфет
const VENT_TIME = 8;              // секунд под люком до вентиляции
const VENT_NEAR = 300;            // px под люком, где копится таймер вентиляции
function floorOf(h) { return Math.floor(h / FLOOR_H) + 1; }
function startMass(n) { return n === 1 ? 1 : Math.min(1 + n, 12); }
function hatchMass(n) { return Math.min(3 + n, 15); }
function hatchBonus(n) { return 5 + 5 * n; }
function floorBaseY(n) { return -FLOOR_PX * (n - 1); }   // мировой y пола этажа n
function hatchY(n) { return -FLOOR_PX * n; }             // мировой y потолка (люка) этажа n
function inBuffetZone(h) { return (h % FLOOR_H) > FLOOR_H - BUFFET_M; }
// world.spawn() не кладёт ряды под люком; запас 3 м с обеих сторон — предметы разбросаны на ±2.5 м от ряда
spawnFilter = h => { const m = h % FLOOR_H; return m > FLOOR_H - BUFFET_M - 3 || m < 3; };
let hatches = [];                 // { floor, y, need, broken, vented, underT, bounceT }
let nextHatchFloor = 1;           // чей потолок спавн ещё не прошёл
function resetHatches(n) { hatches = []; nextHatchFloor = n; }
function buffetFor(n) { // гарантированная еда под люком: мясо + макароны (+3 массы)
  const y = hatchY(n);
  return [{ kind: 'meat', x: 160, y: y + 120 }, { kind: 'pasta', x: 320, y: y + 60 }];
}
function spawnHatch(n) {
  hatches.push({ floor: n, y: hatchY(n), need: hatchMass(n), broken: false, vented: false, underT: 0, bounceT: 0 });
  for (const b of buffetFor(n)) { const def = FOOD[b.kind]; items.push({ kind: b.kind, trash: false, def, x: b.x, y: b.y, r: def.r, vx: 0, seed: Math.random() * 10, dead: false, buffet: true }); }
}
// вызывается из game.updateRun после spawn(): спавн прошёл потолок этажа — кладём люк и буфет
function spawnHatches() { while (spawnedTo <= hatchY(nextHatchFloor)) spawnHatch(nextHatchFloor++); }
function pruneHatches() { hatches = hatches.filter(h => h.y < camY + H + 80); }
function activeHatch() { // ближайший не открытый люк над тефтелей
  let best = null;
  for (const h of hatches) if (!h.broken && !h.vented && h.y < ball.y && (!best || h.y > best.y)) best = h;
  return best;
}
function setStartFloor(n) { save.startFloor = clamp(n, 1, save.floor + 1); persist(); }
// столкновение с ближайшим люком и таймер вентиляции; вызывается из game.updateRun.
// Возвращает событие для game.js (тряска, бонус, прогресс применяет он): null | { type: 'break'|'bounce'|'vent', hatch }
function hatchUpdate(dt) {
  const h = activeHatch(); if (!h) return null;
  h.bounceT = Math.max(0, h.bounceT - dt);
  if (ball.y <= h.y + VENT_NEAR) {
    h.underT += dt;
    if (h.underT >= VENT_TIME) {
      h.vented = true; tone(300, 500, 0.3, 'triangle', 0.15);
      popText(W / 2, h.y + 60, T('vented'), 'rgba(255,255,255,0.8)', true);
      return { type: 'vent', hatch: h };
    }
  }
  if (ball.vy < 0 && ball.y - ball.r <= h.y + 12) {
    if (ball.mass >= h.need) {
      h.broken = true;
      burst(W / 2, h.y, '#8a7255', 30, 320, 0.8, 5); burst(ball.x, h.y, '#b9542f', 20, 300, 0.7, 5);
      sfx.big();
      popText(W / 2, h.y - 70, T('floorCleared', h.floor), '#fff', true);
      return { type: 'break', hatch: h };
    }
    ball.y = h.y + 12 + ball.r; ball.vy = 200; ball.vx *= 0.7; squash(200);
    if (h.bounceT <= 0) { h.bounceT = 0.5; sfx.hit(); popText(ball.x, ball.y - ball.r - 10, T('needMass', h.need), '#ff7a6b', true); }
    return { type: 'bounce', hatch: h };
  }
  return null;
}
// люк на потолке этажа: полоса во всю ширину с табличкой; сломанный — обломки по краям; вентилируемый — отъехал вправо
function drawHatch(h) {
  const y = h.y - camY; if (y < -40 || y > H + 40) return;
  ctx.save();
  if (h.broken) {
    ctx.fillStyle = '#6d5a48'; ctx.fillRect(0, y - 12, 70, 24); ctx.fillRect(W - 70, y - 12, 70, 24);
    ctx.fillStyle = '#4e3f32'; for (let i = 0; i < 6; i++) { const x = 90 + i * 55; ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x + 18, y + 4); ctx.lineTo(x - 6, y + 8); ctx.closePath(); ctx.fill(); }
  } else {
    const x0 = h.vented ? 140 : 0;
    ctx.fillStyle = '#6d5a48'; ctx.fillRect(x0, y - 12, W - x0, 24);
    ctx.fillStyle = '#4e3f32'; ctx.fillRect(x0, y + 8, W - x0, 4);
    ctx.fillStyle = '#9a8468'; for (let x = x0 + 20; x < W; x += 60) { ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
    if (!h.vented) {
      ctx.fillStyle = '#2b2118'; ctx.fillRect(W / 2 - 70, y - 22, 140, 44);
      ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 2; ctx.strokeRect(W / 2 - 70, y - 22, 140, 44);
      ctx.fillStyle = '#ffe08a'; ctx.textAlign = 'center'; ctx.font = '700 15px system-ui, sans-serif'; ctx.fillText(T('massAtLeast', h.need), W / 2, y + 5);
    }
  }
  ctx.restore();
}
expose({ FLOOR_H, VENT_TIME, floorOf, startMass, hatchMass, hatchBonus, hatchY, floorBaseY, inBuffetZone, get hatches() { return hatches; }, get nextHatchFloor() { return nextHatchFloor; }, spawnHatch, spawnHatches, setStartFloor, hatchUpdate, drawHatch });
