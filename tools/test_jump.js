// node tools/test_jump.js — прыжок в точку: вершина низа Тефы на AIM_MARGIN выше точки тапа, а на спуске низ пересекает уровень тапа ровно над tx
const assert = require('assert');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
(async () => {
  const g = require('./_env')(ctx); const d = g.dbg();
  const { aimJump, GRAV, JUMP_MIN_H, JUMP_MAX_H, VX_MAX, AIM_MARGIN } = d;
  // интегрируем полёт до момента, когда низ на спуске снова на уровне ty
  const fly = (bx, by, r, tx, ty) => {
    const a = aimJump(bx, by, r, tx, ty); let x = bx, y = by, vx = a.vx, vy = a.vy, minB = Infinity;
    for (let i = 0; i < 3000; i++) { vy += GRAV * 0.0005; x += vx * 0.0005; y += vy * 0.0005; minB = Math.min(minB, y + r); if (vy > 0 && y + r >= ty) break; }
    return { a, minB, x, y };
  };
  const r = 34;
  let f = fly(240, -100, r, 300, -260);
  assert.ok(Math.abs(f.minB - (-260 - AIM_MARGIN)) < 3, 'вершина низа на AIM_MARGIN выше точки тапа: ' + f.minB);
  assert.ok(Math.abs(f.x - 300) < 4, 'на уровне тапа — над точкой тапа: ' + f.x);
  f = fly(240, -100, r, 120, -200); assert.ok(Math.abs(f.x - 120) < 4, 'влево тоже: ' + f.x);
  // цель на том же уровне и ниже: спуск считается от реальной высоты цели, приземление над точкой тапа
  f = fly(100, -r, r, 400, 0); assert.ok(Math.abs(f.x - 400) < 4, 'тот же уровень: ' + f.x);
  f = fly(100, -r, r, 300, 60); assert.ok(Math.abs(f.x - 300) < 4, 'цель ниже: ' + f.x);
  // зажимы высоты
  assert.strictEqual(aimJump(240, 0, r, 240, 40).dy, JUMP_MIN_H, 'тап ниже — минимальный прыжок');
  assert.strictEqual(aimJump(240, 0, r, 240, -900).dy, JUMP_MAX_H, 'слишком высоко — максимальный');
  // зажим горизонтали
  assert.strictEqual(aimJump(0, 0, r, 480, -150).vx, VX_MAX); assert.strictEqual(aimJump(480, 0, r, 0, -150).vx, -VX_MAX);
  // достижимость ряда: |Δx| = 180 при подъёме на ряд (120) не упирается в VX_MAX
  const a = aimJump(100, -100 - r, r, 280, -220); assert.ok(Math.abs(a.vx) < VX_MAX, 'REACH_X 180 без зажима: ' + a.vx);
  f = fly(100, -100 - r, r, 280, -220); assert.ok(Math.abs(f.x - 280) < 4, 'ряд выше достижим: ' + f.x);
  // новые поля тела
  assert.strictEqual(d.ball.charges, 3); assert.strictEqual(d.ball.onPlatform, null); assert.strictEqual(d.ball.sq, 0);
  console.log('test_jump ok');
})().catch(e => { console.error(e); process.exit(1); });
