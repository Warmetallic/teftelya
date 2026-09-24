'use strict';
// ---------- башня N: параметры роста и генерация из фрагментов (ступени, пропасть, перелёт, развилка) ----------
// Все числа черновые (спека v2.1.1 §6). Башня собирается по сиду N. Генератор пишет безопасный путь path: id платформ
// от старта до крыши, где каждую следующую можно достать не больше чем двумя прыжками за полёт (с платформы и один
// в воздухе), так что один заряд из трёх остаётся в запасе.
const ROW_H = 120;          // шаг рядов, px
const CP_EVERY = 20;        // чекпоинт каждые 20 рядов
const KNIFE_CYCLE = 2.1;    // нож: пауза 1.2 + замах 0.6 + удар 0.3
const X_MIN = 70, X_MAX = 410; // центры обычных платформ; итоговый центр ещё зажимается по ширине, чтобы края были в [20, 460]
const EDGE = 20;          // платформа не подходит к краю поля ближе 20 px
const PATH_MAX_ROWS = 4;    // самый большой подъём между соседними платформами пути: 480 px, два прыжка дают ≈ 536
const FOOD_KINDS = { ketchup: { r: 15, coins: 1, w: 5 }, pasta: { r: 17, coins: 2, w: 4 }, meat: { r: 21, coins: 3, w: 2 } };
const FOOD_COLOR = { ketchup: '#e3342f', pasta: '#f6c343', meat: '#b5452b' };
function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function towerParams(N) {
  const rows = Math.min(40 + 5 * N, 160), steps = Math.max(0.2, 0.4 - 0.01 * (N - 1)), other = 1 - steps;
  return { N, rows, height: rows * ROW_H, heat: Math.min(0.05 * N, 1.5), speedMul: 1 + 0.03 * N, flySpeed: 220 + 5 * N,
    pHaz: Math.min(0.15 + 0.02 * N, 0.6), pKnife: Math.min(0.85, 0.4 + 0.03 * (N - 2)), foodPerRow: Math.max(0.35, 0.8 - 0.01 * N),
    gapMax: N >= 5 ? 3 : 2, wMin: Math.max(80, 101 - N), wMax: Math.max(110, 141 - N),
    mix: N === 1 ? { plate: 0.5, pan: 0.25, tray: 0.25, cheese: 0 } : { plate: 0.5, pan: 0.2, tray: 0.15, cheese: 0.15 },
    frag: { steps, gap: other * 25 / 60, side: other * 15 / 60, fork: other * 20 / 60 },
    par: rows * 2.4, coinMul: 1 + 0.05 * (N - 1), theme: 'kitchen' };
}
function pickKind(R) { let sum = 0; for (const k in FOOD_KINDS) sum += FOOD_KINDS[k].w; let t = R() * sum; for (const k in FOOD_KINDS) { t -= FOOD_KINDS[k].w; if (t <= 0) return k; } return 'ketchup'; }
function mkFood(R, x, y) { const kind = pickKind(R); return { kind, x, y, r: FOOD_KINDS[kind].r, seed: R() * 10, dead: false }; }
// buildTower(N) → { tp, platforms, hazards, items, path }; одинаково при каждом вызове с тем же N (сид = N)
function buildTower(N) {
  const tp = towerParams(N), R = mulberry32(N * 7919 + 17), rr = (a, b) => a + R() * (b - a), ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const platforms = [], hazards = [], items = [], path = [];
  let id = 0, hid = 1, lastBlades = -99;
  const knifeSlots = []; // пропасти без ножа: из первой берётся гарантированный нож башни
  const food = (x, y) => items.push(mkFood(R, clamp(x, 30, W - 30), y));
  const pickType = row => { const m = tp.mix, q = R(); const t = q < m.plate ? 'plate' : q < m.plate + m.pan ? 'pan' : q < m.plate + m.pan + m.tray ? 'tray' : 'cheese'; return t === 'pan' && row < 3 ? 'plate' : t; };
  const add = (row, type, x, w, extra) => {
    const p = Object.assign({ id: id++, row, type, x, y: -row * ROW_H, w, cp: 0 }, extra || {});
    if (type === 'tray') { p.x0 = Math.max(EDGE + w / 2, x - 40); p.x1 = Math.min(W - EDGE - w / 2, x + 40); p.dir = 1; p.speed = N === 1 ? rr(40, 70) : rr(60, 120) * tp.speedMul; }
    platforms.push(p); return p;
  };
  const plat = (row, x) => { const w = rr(tp.wMin, tp.wMax); return add(row, pickType(row), clamp(x, Math.max(X_MIN, EDGE + w / 2), Math.min(X_MAX, W - EDGE - w / 2)), w); };
  const rest = (row, x) => add(row, 'plate', clamp(x, EDGE + 90, W - EDGE - 90), 180, { rest: true }); // площадка отдыха шириной 180
  const walk = p => { path.push(p.id); return p; };
  const arc = (a, b, n) => { for (let j = 1; j <= n; j++) { const t = j / (n + 1); food(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - 70 - 90 * Math.sin(Math.PI * t)); } };
  // лопасти в центре ряда, ступень уходит к краю (у подноса — весь ход): стоящая Тефа массы до 8 (r = 54) их не задевает,
  // hypot(240 − 140, 60 − 54) ≈ 100 > 54 + 36
  const bladesAt = q => {
    if (q.type === 'tray') { q.type = 'plate'; delete q.x0; delete q.x1; delete q.dir; delete q.speed; } // у лопастей поднос не ездит
    q.x = q.x < W / 2 ? Math.min(q.x, 140) : Math.max(q.x, 340);
    hazards.push({ id: hid++, type: 'blades', x: W / 2, y: q.y - 60, ang: 0, gone: false }); lastBlades = q.row;
  };
  // фрагменты: начинаются с платформы пути cur, возвращают последнюю платформу пути, выше ряда lim не ставят ничего
  const steps = (cur, k, lim) => { // ступени зигзагом, иногда через ряд
    let p = cur, dir = p.x < W / 2 ? 1 : -1;
    for (let i = 0; i < k && p.row + 1 <= lim; i++) {
      const up = i < k - 1 && p.row + 2 <= lim && R() < 0.25 ? 2 : 1;
      let nx = p.x + dir * rr(120, 200); if (nx < X_MIN || nx > X_MAX) { dir = -dir; nx = p.x + dir * rr(120, 200); }
      const q = walk(plat(p.row + up, nx));
      if (N >= 3 && q.row - lastBlades >= 15 && R() < tp.pHaz * 0.5) bladesAt(q);
      if (R() < tp.foodPerRow) food(q.x, q.y - rr(50, 90));
      p = q; dir = -dir;
    }
    return p;
  };
  const knife = (x, ky) => hazards.push({ id: hid++, type: 'knife', x, y: ky, t: R() * KNIFE_CYCLE, phase: 'rest', by: ky - 150 });
  const gap = (cur, e) => { // e пустых рядов, за ними площадка отдыха; нож поперёк полёта в среднем пустом ряду, дуга еды в пустоте
    const q = walk(rest(cur.row + e + 1, cur.x + rr(-150, 150)));
    const kx = (cur.x + q.x) / 2, ky = -(cur.row + Math.ceil((e + 1) / 2)) * ROW_H;
    if (N >= 2) { if (R() < tp.pKnife) knife(kx, ky); else knifeSlots.push([kx, ky]); }
    if (R() < 0.5) arc(cur, q, ri(3, 5));
    return q;
  };
  const side = (cur, lim) => { // перелёт вбок: следующая платформа дальше, чем достаёт один прыжок
    let p = cur;
    if (p.x > 140 && p.x < 340) { // из середины перелёта не выйдет: сначала ступень к краю
      if (p.row + 2 > lim) return steps(p, 1, lim);
      p = walk(plat(p.row + 1, p.x < W / 2 ? rr(X_MIN, 110) : rr(370, X_MAX)));
    }
    const q = walk(plat(p.row + 1, p.x + (p.x < W / 2 ? 1 : -1) * rr(300, 340)));
    if (R() < tp.foodPerRow) food((p.x + q.x) / 2, q.y - 110); // еда над перелётом
    return q;
  };
  const fork = (cur, g) => { // развилка: короткий путь через пропасть с едой, длинный по ступеням; сходятся на широкой тарелке
    const J = rest(cur.row + g + 1, cur.x + rr(-120, 120)), s = cur.x < W / 2 ? 1 : -1;
    let p = cur;
    for (let row = cur.row + 1; row < J.row; row++) { p = walk(plat(row, W / 2 + s * rr(80, 170))); if (R() < 0.3) food(p.x, p.y - rr(50, 90)); }
    walk(J); arc(cur, J, ri(3, 5));
    return J;
  };
  const pickFrag = () => { let q = R(); for (const k of ['steps', 'gap', 'side', 'fork']) { q -= tp.frag[k]; if (q <= 0) return k; } return 'steps'; };
  let cur = walk(add(0, 'plate', W / 2, 220, { start: true }));
  for (let cpRow = Math.min(CP_EVERY, tp.rows); ; cpRow = Math.min(cpRow + CP_EVERY, tp.rows)) {
    const lim = cpRow - 1;
    while (cpRow - cur.row > PATH_MAX_ROWS) {
      const room = lim - cur.row, f = pickFrag(), e = ri(2, tp.gapMax);
      if (f === 'gap' && e + 1 <= room) cur = gap(cur, e);
      else if (f === 'fork' && e + 1 <= room) cur = fork(cur, e);
      else if (f === 'side' && room >= 2) cur = side(cur, lim);
      else cur = steps(cur, ri(3, 5), lim);
    }
    const top = cpRow === tp.rows ? add(cpRow, 'plate', W / 2, 360, { roof: true }) : add(cpRow, 'plate', W / 2, 240, { cp: cpRow / CP_EVERY });
    cur = walk(top);
    if (top.roof) break;
  }
  if (N >= 2 && !hazards.some(h => h.type === 'knife') && knifeSlots.length) knife(...knifeSlots[0]); // первый нож башни гарантирован
  return { tp, platforms, hazards, items, path };
}
expose({ ROW_H, CP_EVERY, KNIFE_CYCLE, X_MIN, X_MAX, PATH_MAX_ROWS, FOOD_KINDS, FOOD_COLOR, mulberry32, towerParams, buildTower });
