'use strict';
// ---------- платформы: посадка сверху (swept), стояние, поднос, сковородка с таймером ----------
const PAN_TIME = 2;      // с до ожога на сковородке (черновик)
const PAN_MIN = 0.5;     // ниже таймер не опускается при любом жаре башни
const LAND_TOL = 0.35;   // доля радиуса, на которую Тефа может свисать с края и всё ещё стоять
function panTime(tp) { return Math.max(PAN_MIN, PAN_TIME + 0.25 * ((save.up && save.up.crust) || 0) - ((tp && tp.heat) || 0)); }
function platformById(platforms, id) { return id === null || id === undefined ? null : platforms.find(p => p.id === id) || null; }
function overPlatform(p) { return Math.abs(ball.x - p.x) <= p.w / 2 + ball.r * LAND_TOL; }
function landOn(p) { ball.y = p.y - ball.r; ball.vy = 0; ball.vx = 0; ball.onPlatform = p.id; }
// посадка сверху с учётом пройденного за кадр пути: prevBottom — низ Тефы в прошлом кадре. Снизу и сбоку платформы проницаемы.
function tryLand(platforms, prevBottom) {
  if (ball.vy < 0) return null;
  const bottom = ball.y + ball.r;
  let best = null;
  for (const p of platforms) {
    if (Math.abs(p.y - ball.y) > 240 || !overPlatform(p)) continue;
    if (prevBottom <= p.y + 2 && bottom >= p.y && (!best || p.y < best.y)) best = p;
  }
  if (best) landOn(best);
  return best;
}
// движение подносов, нагрев сковородок, удержание стоящей Тефы. Возвращает события [{ type: 'burn', p }]
function updatePlatforms(dt, platforms, tp) {
  const ev = [];
  const standing = platformById(platforms, ball.onPlatform);
  for (const p of platforms) {
    if (p.type === 'tray') {
      const px = p.x, nx = p.x + p.dir * p.speed * dt;
      if (nx > p.x1) { p.x = p.x1; p.dir = -1; } else if (nx < p.x0) { p.x = p.x0; p.dir = 1; } else p.x = nx;
      if (p === standing) ball.x += p.x - px;
    } else if (p.type === 'pan') {
      if (p === standing) { p.hotT = (p.hotT || 0) + dt; if (p.hotT >= panTime(tp)) { p.hotT = 0; ev.push({ type: 'burn', p }); } }
      else p.hotT = Math.max(0, (p.hotT || 0) - dt * 2);
    }
  }
  if (standing) { if (!overPlatform(standing)) ball.onPlatform = null; else { ball.y = standing.y - ball.r; ball.vy = 0; } }
  return ev;
}
function panHeat(p) { return p.type === 'pan' ? clamp((p.hotT || 0) / PAN_TIME, 0, 1) : 0; }
expose({ PAN_TIME, PAN_MIN, panTime, platformById, overPlatform, landOn, tryLand, updatePlatforms, panHeat });
