'use strict';
// ---------- тело Тефы: физика прыжка в точку, масса и радиус, сквош и наклон трансформацией ----------
const GRAV = 1500;
const JUMP_MIN_H = 100, JUMP_MAX_H = 280; // высота дуги (px) от низа Тефы до точки тапа с запасом
const VX_MAX = 420;                       // px/с — предел горизонтальной скорости прыжка
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
  alive: true,
};
function radiusFor(m) { return MASS_R0 + MASS_RK * (clamp(m, 1, MASS_RCAP) - 1); }
// прыжок к точке (tx, ty): вершина дуги низа Тефы на AIM_MARGIN выше ty; горизонталь рассчитана так, чтобы на спуске
// низ пересёк уровень ty ровно над tx — игрок тапает туда, куда хочет ПРИЗЕМЛИТЬСЯ
function aimJump(bx, by, r, tx, ty) {
  const dy = clamp(by + r - ty + AIM_MARGIN, JUMP_MIN_H, JUMP_MAX_H);
  const vy = -Math.sqrt(2 * GRAV * dy), tUp = -vy / GRAV, tDown = Math.sqrt(2 * AIM_MARGIN / GRAV);
  const t = tUp + tDown;
  const vx = clamp((tx - bx) / t, -VX_MAX, VX_MAX);
  return { vx, vy, t, dy };
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
expose({ ball, aimJump, radiusFor, GRAV, JUMP_MIN_H, JUMP_MAX_H, VX_MAX, AIM_MARGIN, HEAL_T });
