'use strict';
// ---------- башня N: параметры роста и детерминированная генерация рядов (платформы, опасности, еда) ----------
// Все числа черновые (спека §5.1); растут с N, чтобы новые башни требовали прокачки.
const ROW_H = 120;        // шаг рядов платформ, px
const REACH_X = 180;      // предел |Δx| между платформами соседних рядов: прыжок в один ряд достаёт всегда (VX_MAX·(tUp+tDown) при dy = ROW_H + AIM_MARGIN ≈ 259)
const OIL_T = 2.2;        // период капли масла, с
const KNIFE_CYCLE = 2.1;  // нож: пауза 1.2 + замах 0.6 + удар 0.3
const CP_EVERY = 20;      // чекпоинт каждые 20 рядов
const LANE_L = [100, 170], LANE_R = [310, 380], LANE_C = [200, 280]; // диапазоны x центров платформ: дорожки и ряд схождения
const FOOD_KINDS = { ketchup: { r: 15, coins: 1, w: 5 }, pasta: { r: 17, coins: 2, w: 4 }, meat: { r: 21, coins: 3, w: 2 } };
const FOOD_COLOR = { ketchup: '#e3342f', pasta: '#f6c343', meat: '#b5452b' };
function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function towerParams(N) {
  const rows = Math.min(40 + 5 * N, 160);
  return { N, rows, height: rows * ROW_H, dmg: 1 + Math.floor((N - 1) / 8), heat: Math.min(0.05 * N, 1.5), speedMul: 1 + 0.03 * N, flySpeed: 220 + 5 * N,
    pHaz: Math.min(0.15 + 0.02 * N, 0.6), pPan: Math.min(0.1 + 0.02 * N, 0.5), pTray: N >= 2 ? 0.15 : 0, foodPerRow: Math.max(0.35, 0.8 - 0.01 * N),
    par: rows * 2.4, coinMul: 1 + 0.05 * (N - 1), theme: 'kitchen' };
}
function pickKind(R) { let sum = 0; for (const k in FOOD_KINDS) sum += FOOD_KINDS[k].w; let t = R() * sum; for (const k in FOOD_KINDS) { t -= FOOD_KINDS[k].w; if (t <= 0) return k; } return 'ketchup'; }
function mkFood(R, x, y) { const kind = pickKind(R); return { kind, x, y, r: FOOD_KINDS[kind].r, seed: R() * 10, dead: false }; }
// buildTower(N) → { tp, platforms, hazards, items }; одинаково при каждом вызове с тем же N (сид = N)
function buildTower(N) {
  const tp = towerParams(N), R = mulberry32(N * 7919 + 17), rr = (a, b) => a + R() * (b - a);
  const platforms = [{ id: 0, row: 0, type: 'plate', x: W / 2, y: 0, w: 220, cp: 0, start: true }];
  const hazards = [], items = [];
  let id = 1, hid = 1, lastBlades = -99, greedy = R() < 0.5 ? 'L' : 'R'; // «жадная» дорожка: еда и опасности
  const mk = (row, side, y) => {
    const [a, b] = side === 'L' ? LANE_L : LANE_R; const x = rr(a, b);
    let type = 'plate'; const q = R();
    if (q < tp.pPan) { if (row >= 3) type = 'pan'; } else if (q < tp.pPan + tp.pTray) type = 'tray'; // ряды 1–2 без сковородок
    const p = { id: id++, row, type, x, y, w: type === 'tray' ? 130 : rr(110, 150), cp: 0, lane: side };
    if (type === 'tray') { p.x0 = x - 40; p.x1 = x + 40; p.dir = 1; p.speed = rr(60, 120) * tp.speedMul; }
    platforms.push(p); return p;
  };
  for (let i = 1; i <= tp.rows; i++) {
    const y = -i * ROW_H;
    if (i === tp.rows) { platforms.push({ id: id++, row: i, type: 'plate', x: W / 2, y, w: 360, cp: 0, roof: true }); break; }
    if (i % CP_EVERY === 0) { platforms.push({ id: id++, row: i, type: 'plate', x: W / 2, y, w: 240, cp: i / CP_EVERY }); greedy = greedy === 'L' ? 'R' : 'L'; continue; }
    if (i % 3 === 0) { platforms.push({ id: id++, row: i, type: 'plate', x: rr(LANE_C[0], LANE_C[1]), y, w: 180, cp: 0 }); continue; } // дорожки сходятся
    const pl = mk(i, 'L', y), pr = mk(i, 'R', y);
    const gp = greedy === 'L' ? pl : pr, sp = greedy === 'L' ? pr : pl;
    if (R() < tp.foodPerRow) { const n = R() < 0.5 ? 2 : 1; for (let k = 0; k < n; k++) items.push(mkFood(R, gp.x + (k ? 40 : -40), y - rr(50, 90))); }
    if (R() < 0.3) items.push(mkFood(R, sp.x, y - rr(50, 90)));
    if (R() < tp.pHaz) {
      const pool = ['oil']; if (N >= 2) pool.push('knife'); if (N >= 3 && i - lastBlades >= 15) pool.push('blades');
      const t = pool[Math.floor(R() * pool.length)];
      if (t === 'oil') hazards.push({ id: hid++, type: 'oil', x: gp.x, y: y - 140, floorY: y, t: R() * OIL_T, drops: [] });
      else if (t === 'knife') hazards.push({ id: hid++, type: 'knife', x: W / 2, y, t: R() * KNIFE_CYCLE, phase: 'rest', by: y - 150 });
      else { hazards.push({ id: hid++, type: 'blades', x: W / 2, y: y - 60, ang: 0, gone: false }); lastBlades = i; }
    }
  }
  return { tp, platforms, hazards, items };
}
expose({ ROW_H, REACH_X, OIL_T, KNIFE_CYCLE, CP_EVERY, FOOD_KINDS, FOOD_COLOR, mulberry32, towerParams, buildTower });
