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
expose({ FLOOR_H, VENT_TIME, floorOf, startMass, hatchMass, hatchBonus, hatchY, floorBaseY, inBuffetZone, get hatches() { return hatches; }, get nextHatchFloor() { return nextHatchFloor; }, spawnHatch, spawnHatches, setStartFloor });
