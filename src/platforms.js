'use strict';
// ---------- платформы: посадка сверху (swept), стояние, поднос, сковородка с таймером, крошащийся сыр ----------
const PAN_TIME = 2;      // с до ожога на сковородке (черновик)
const PAN_MIN = 0.5;     // ниже таймер не опускается при любом жаре башни
const LAND_TOL = 0.35;   // доля радиуса, на которую Тефа может свисать с края и всё ещё стоять
const TOASTER_T = 1;   // с стоя на тостере до подброса (спека v2.2a §6.2)
const SHELF_KEEP = 0.6, SHELF_FRICTION = 600; // полка: доля скорости полёта при посадке и торможение, px/с² (спека v2.2a §6.1)
const CHEESE_T = 0.5, CHEESE_BACK = 3; // сыр крошится через 0.5 с после посадки и отрастает через 3 с (спека v2.1.1 §6.3)
function panTime(tp) { return Math.max(PAN_MIN, PAN_TIME + 0.25 * ((save.up && save.up.crust) || 0) - ((tp && tp.heat) || 0)); }
function platformById(platforms, id) { return id === null || id === undefined ? null : platforms.find(p => p.id === id) || null; }
function overPlatform(p) { return Math.abs(ball.x - p.x) <= p.w / 2 + ball.r * LAND_TOL; }
function landOn(p) { ball.slide = p.type === 'shelf' ? SHELF_KEEP * ball.vx : 0; ball.stuck = p.type === 'bowl'; ball.y = p.y - ball.r; ball.vy = 0; ball.vx = 0; ball.onPlatform = p.id; }
// посадка сверху с учётом пройденного за кадр пути: prevBottom — низ Тефы в прошлом кадре. Снизу и сбоку платформы проницаемы.
function tryLand(platforms, prevBottom) {
  if (ball.vy < 0) return null;
  const bottom = ball.y + ball.r;
  let best = null;
  for (const p of platforms) {
    if (p.gone || Math.abs(p.y - ball.y) > 240 || !overPlatform(p)) continue;
    if (prevBottom <= p.y + 2 && bottom >= p.y && (!best || p.y < best.y)) best = p;
  }
  if (best) landOn(best);
  return best;
}
// движение подносов, нагрев сковородок, крошение сыра, отсчёт тостера, подброс лопаткой, удержание стоящей Тефы.
// События: [{ type: 'burn' | 'crumble' | 'launch', p }]
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
    } else if (p.type === 'toaster') { // отсчёт идёт, пока Тефа стоит; ушла — сброшен
      if (p === standing) { p.toastT = (p.toastT || 0) + dt; if (p.toastT >= TOASTER_T) { p.toastT = 0; ev.push({ type: 'launch', p }); } }
      else p.toastT = 0;
    } else if (p.type === 'spatula') { if (p === standing) ev.push({ type: 'launch', p }); // стоять на лопатке нельзя
    } else if (p.type === 'cheese') { // посадка запускает крошение; пропавший сыр не ловит, пока не отрастёт
      if (p.gone) { p.backT -= dt; if (p.backT <= 0) { p.gone = false; p.crumbleT = 0; } }
      else {
        if (p === standing && !(p.crumbleT > 0)) p.crumbleT = CHEESE_T;
        if (p.crumbleT > 0) { p.crumbleT -= dt; if (p.crumbleT <= 0) { p.crumbleT = 0; p.gone = true; p.backT = CHEESE_BACK; ev.push({ type: 'crumble', p }); } }
      }
    }
  }
  if (standing && standing.type === 'shelf' && ball.slide) { // Тефа скользит по полке и тормозит; съехала за край — падает (проверка ниже)
    ball.x += ball.slide * dt; const dv = SHELF_FRICTION * dt; ball.slide = Math.abs(ball.slide) <= dv ? 0 : ball.slide - Math.sign(ball.slide) * dv;
  }
  if (standing) { if (standing.gone || !overPlatform(standing)) ball.onPlatform = null; else { ball.y = standing.y - ball.r; ball.vy = 0; } }
  return ev;
}
// доля до ожога для рендера: делим на реальный таймер, а не на базовый —
// при жаре башни и «Корочке» шкала должна совпадать с тем, когда сковородка правда сожжёт
function panHeat(p, tp) { return p.type === 'pan' ? clamp((p.hotT || 0) / panTime(tp), 0, 1) : 0; }
expose({ TOASTER_T, SHELF_KEEP, SHELF_FRICTION, PAN_TIME, PAN_MIN, panTime, platformById, overPlatform, landOn, tryLand, updatePlatforms, panHeat });
