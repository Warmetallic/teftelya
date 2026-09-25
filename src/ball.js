'use strict';
// ---------- тело Тефы: физика прыжка в точку, масса и радиус, сквош и наклон трансформацией ----------
const GRAV = 1500;
const JUMP_MIN_H = 100, JUMP_MAX_H = 280; // высота дуги (px) от низа Тефы до точки тапа с запасом
const VX_MAX = 420;                       // px/с — предел горизонтальной скорости прыжка
const LAUNCH_H = 420;                     // px — на сколько тостер и лопатка-батут подбрасывают низ Тефы (спека v2.2a §6.2, §6.4)
const AIM_MARGIN = 24;                    // низ Тефы поднимается на столько выше точки тапа, чтобы сесть на платформу, а не пролететь сквозь
const MASS_R0 = 26, MASS_RK = 4, MASS_RCAP = 8; // радиус 26 + 4·(масса−1); для радиуса масса не больше 8
const HEAL_T = 0.3;             // с — сколько зарастает укус при лечении
const ball = {
  x: W / 2, y: 0, vx: 0, vy: 0,
  mass: 3, r: 34,
  charges: 3, onPlatform: null, // id платформы, на которой стоит; null — в воздухе
  sq: 0, sqv: 0,                // сквош: > 0 сплющена, < 0 вытянута
  tilt: 0, tiltv: 0,            // наклон, рад
  face: 0, mouth: 0, blink: 0, hot: 0, healT: 0, // healT — остаток анимации заживления укуса
  slide: 0,                     // px/с — проскальзывание по полке холодильника после посадки
  stuck: false,                 // приклеилась в миске: первый тап только отлепляет (спека v2.2a §6.3)
  alive: true,
};
function radiusFor(m) { return MASS_R0 + MASS_RK * (clamp(m, 1, MASS_RCAP) - 1); }
// прыжок к точке (tx, ty): вершина дуги низа Тефы на AIM_MARGIN выше ty; горизонталь рассчитана так, чтобы на спуске
// низ пересёк уровень ty ровно над tx — игрок тапает туда, куда хочет ПРИЗЕМЛИТЬСЯ. Спуск считается от реальной высоты
// цели: для цели на том же уровне или ниже дуга зажата в JUMP_MIN_H, и падать до неё дольше, чем AIM_MARGIN
function aimJump(bx, by, r, tx, ty) {
  const rise = by + r - ty; // на сколько точка тапа выше низа Тефы; ниже нуля — цель ниже
  const dy = clamp(rise + AIM_MARGIN, JUMP_MIN_H, JUMP_MAX_H);
  const vy = -Math.sqrt(2 * GRAV * dy), tUp = -vy / GRAV, tDown = Math.sqrt(2 * Math.max(0, dy - rise) / GRAV);
  const t = tUp + tDown;
  const vx = clamp((tx - bx) / t, -VX_MAX, VX_MAX);
  return { vx, vy, t, dy };
}
// как прицельно достать поверхность (tx, ty) из (bx, by): одним прыжком, а если дуга не достаёт — двумя: первый на полпути
// вбок и вверх до высоты на 120 px выше цели (не ниже JUMP_MIN_H и не выше предела прыжка), второй у вершины (vy ≥ −30).
// Лишняя высота опасна: камера уходит за Тефой, и цель ниже вершины на ~280 px оказывается под нижней полосой (спека v2.2a §4).
// Так прыгает бот (tools/bot.js), и так генератор проверяет, что лопасти не стоят на пути (tower.js). Возвращает точку для первого тапа
function jumpPlan(bx, by, r, tx, ty) {
  const a = aimJump(bx, by, r, tx, ty), rise = by + r - ty;
  if (rise <= JUMP_MAX_H - AIM_MARGIN && Math.abs(a.vx) < VX_MAX - 1) return { double: false, tx, ty };
  return { double: true, tx: bx + clamp((tx - bx) * 0.5, -250, 250), ty: Math.min(by + r - JUMP_MIN_H, ty - 120) };
}
// центры Тефы по кадрам 1/60 с на пути по jumpPlan до посадки на поверхность ty; шаг как в game.js update
function flightPath(bx, by, r, tx, ty) {
  const plan = jumpPlan(bx, by, r, tx, ty), pts = [];
  let x = bx, y = by, a = aimJump(x, y, r, clamp(plan.tx, 0, W), plan.ty), vx = a.vx, vy = a.vy, second = !plan.double;
  for (let i = 0; i < 600; i++) {
    if (!second && vy >= -30) { second = true; a = aimJump(x, y, r, clamp(tx, 0, W), ty); vx = a.vx; vy = a.vy; }
    vy += GRAV / 60; x += vx / 60; y += vy / 60; pts.push([x, y]);
    if (second && vy > 0 && y + r >= ty) break;
  }
  return pts;
}
function squash(a) { ball.sqv += a * 0.006; }   // > 0 — сплющить (посадка), < 0 — вытянуть (прыжок)
function pulse(a) { ball.sqv -= a * 0.004; }    // вытянуть (еда)
function jolt(px, py, a) { ball.tiltv += (px < ball.x ? 1 : -1) * a * 0.012; } // тычок со стороны точки
function updateBody(dt) {
  ball.sqv += (-ball.sq * 220 - ball.sqv * 9) * dt; ball.sq = clamp(ball.sq + ball.sqv * dt, -0.45, 0.45);
  const tt = clamp(ball.vx / 900, -0.35, 0.35);
  ball.tiltv += ((tt - ball.tilt) * 160 - ball.tiltv * 8) * dt; ball.tilt += ball.tiltv * dt;
  ball.r = lerp(ball.r, radiusFor(ball.mass), 1 - Math.pow(0.01, dt));
  ball.healT = Math.max(0, ball.healT - dt);
}
expose({ ball, aimJump, jumpPlan, flightPath, radiusFor, LAUNCH_H, GRAV, JUMP_MIN_H, JUMP_MAX_H, VX_MAX, AIM_MARGIN, HEAL_T });
