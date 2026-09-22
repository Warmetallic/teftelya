'use strict';
// ---------- мягкое тело тефтели: N точек на пружинах вокруг центра ----------
const N = 26;
const ball = {
  x: W / 2, y: 0, vx: 0, vy: 0,
  mass: 1, r: 26,
  pts: [],          // {ox, oy, vx, vy} — смещения точек от центра
  jumps: 4,         // заряды прыжка
  regen: 0,         // таймер восстановления заряда
  face: 0,          // куда смотрят глаза, -1..1
  mouth: 0,         // 0 закрыт .. 1 открыт
  blink: 0,
  alive: true,
};
function radiusFor(m) { return 26 + 13 * Math.sqrt(Math.max(0, m - 1)); }
function heavy() { return clamp((ball.mass - 1) / 15, 0, 1); } // 0 маленькая .. 1 огромная
function initBody() {
  ball.pts = [];
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2;
    ball.pts.push({ ox: Math.cos(a) * ball.r, oy: Math.sin(a) * ball.r, vx: 0, vy: 0 });
  }
}
// deform: fn(angle, dirx, diry) → {x, y} импульс для каждой точки
function deform(fn) {
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
    const im = fn(a, dx, dy); ball.pts[i].vx += im.x; ball.pts[i].vy += im.y;
  }
}
function squash(amount) { deform((a, dx, dy) => ({ x: dx * amount * 0.8, y: -dy * amount * 1.3 })); } // сплющить
function pulse(amount) { deform((a, dx, dy) => ({ x: dx * amount, y: dy * amount })); }
function jolt(px, py, amount) { // тычок со стороны точки px,py
  const ang = Math.atan2(py - ball.y, px - ball.x);
  deform((a, dx, dy) => { const d = Math.cos(a - ang); return d > 0 ? { x: -dx * amount * d, y: -dy * amount * d } : { x: 0, y: 0 }; });
}
function updateBody(dt) {
  // жёсткость и демпфирование падают с массой: большая тефтеля колышется лениво и дольше
  const k = lerp(260, 120, heavy());
  const damp = lerp(9, 5.5, heavy());
  const nk = 40;
  const lagx = clamp(-ball.vx * 0.04, -16, 16), lagy = clamp(-ball.vy * 0.012, -7, 7);
  for (let i = 0; i < N; i++) {
    const p = ball.pts[i], a = i / N * Math.PI * 2;
    const dx = Math.cos(a), dy = Math.sin(a);
    const tx = dx * ball.r + lagx * (dy * dy), ty = dy * ball.r + lagy * Math.abs(dy);
    let ax = (tx - p.ox) * k - p.vx * damp, ay = (ty - p.oy) * k - p.vy * damp;
    const prev = ball.pts[(i + N - 1) % N], next = ball.pts[(i + 1) % N];
    ax += ((prev.ox + next.ox) / 2 - p.ox) * nk; ay += ((prev.oy + next.oy) / 2 - p.oy) * nk;
    p.vx += ax * dt; p.vy += ay * dt; p.ox += p.vx * dt; p.oy += p.vy * dt;
  }
}
expose({ ball });
