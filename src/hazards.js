'use strict';
// ---------- опасности: муха (наводится), масло (капает), нож (гильотина в разрыве), лопасти; каждая снимает один кусок ----------
const FLY_CHASE = 6, FLY_CHASE_MIN = 1.5, FLY_WARN = 0.7, FLY_MAX = 3, FLY_CD = 2, CAMP_T = 3;
const OIL_DROP_V = 420, OIL_R = 8;
const KNIFE_REST = 1.2, KNIFE_WIND = 0.6, KNIFE_STRIKE = 0.3; // сумма = KNIFE_CYCLE
const BLADES_R = 36;
let flies = []; // мухи живут отдельно от раскладки башни: их спавнит политика, а не генератор
function flyChase() { return Math.max(FLY_CHASE_MIN, FLY_CHASE - 0.3 * ((save.up && save.up.repel) || 0)); }
function spawnFly(fromLeft) {
  const left = fromLeft === undefined ? Math.random() < 0.5 : fromLeft;
  flies.push({ type: 'fly', x: left ? -30 : W + 30, y: ball.y - 100, side: left ? -1 : 1, warnT: FLY_WARN, chaseT: 0, phase: Math.random() * 6.28, gone: false });
}
function resetFlies() { flies = []; }
// политика влёта (спека §4.3): лень — гарантированно; высокая серия — по шансу; берсерк и лимит — никогда
function flyWanted(dt, streakN, campT, berserk) {
  if (berserk || flies.length >= FLY_MAX) return false;
  if (campT >= CAMP_T) return true;
  if (streakN >= 6) return Math.random() < dt * Math.min(0.4, 0.08 + 0.02 * (streakN - 6));
  return false;
}
function knifePhase(t) { // t → { phase, k } где k — 0..1 внутри фазы
  const c = ((t % KNIFE_CYCLE) + KNIFE_CYCLE) % KNIFE_CYCLE;
  if (c < KNIFE_REST) return { phase: 'rest', k: c / KNIFE_REST };
  if (c < KNIFE_REST + KNIFE_WIND) return { phase: 'wind', k: (c - KNIFE_REST) / KNIFE_WIND };
  return { phase: 'strike', k: (c - KNIFE_REST - KNIFE_WIND) / KNIFE_STRIKE };
}
function knifeY(h) { // верх лезвия: пауза наверху (by), замах чуть выше, удар вниз до уровня ряда
  const { phase, k } = knifePhase(h.t), top = h.by, bottom = h.y - 80;
  return phase === 'rest' ? top : phase === 'wind' ? top - 14 * Math.sin(k * Math.PI) : top + (bottom - top) * Math.sin(k * Math.PI);
}
// env: { tp, berserk, invuln }. События: hit {reason,x,y} | flyGaveUp {h} | eaten {what,x,y} | smash {h,x,y}.
// В берсерке муха и капля масла съедаются (eaten — game.js лечит на кусок), нож и лопасти ломаются (smash).
function updateHazards(dt, hazards, env) {
  const ev = [], tp = env.tp, R = ball.r;
  for (const f of flies) {
    if (f.gone) continue;
    if (f.warnT > 0) { f.warnT -= dt; f.y = ball.y - 100; continue; }
    f.chaseT += dt; f.phase += dt * 7;
    const dx = ball.x - f.x, dy = ball.y - f.y, dist = Math.hypot(dx, dy) || 1, sp = tp.flySpeed;
    f.x += (dx / dist) * sp * dt + Math.cos(f.phase) * 60 * dt; f.y += (dy / dist) * sp * dt + Math.sin(f.phase * 1.3) * 60 * dt;
    if (dist < R + 12) { f.gone = true; ev.push(env.berserk ? { type: 'eaten', what: 'fly', x: f.x, y: f.y } : { type: 'hit', reason: 'fly', x: f.x, y: f.y }); continue; }
    if (f.chaseT >= flyChase()) { f.gone = true; ev.push({ type: 'flyGaveUp', h: f }); }
  }
  flies = flies.filter(f => !f.gone);
  for (const h of hazards) {
    if (h.gone || Math.abs(h.y - ball.y) > H + 100) continue;
    if (h.type === 'oil') {
      h.t += dt; if (h.t >= OIL_T) { h.t -= OIL_T; h.drops.push({ y: h.y + 20, splat: 0, dead: false }); }
      for (const dr of h.drops) {
        if (dr.dead) continue;
        if (dr.splat > 0) { dr.splat -= dt; if (dr.splat <= 0) dr.dead = true; continue; }
        dr.y += OIL_DROP_V * dt;
        if (dr.y >= h.floorY) { dr.y = h.floorY; dr.splat = 0.5; continue; }
        if (Math.hypot(ball.x - h.x, ball.y - dr.y) < R + OIL_R) { dr.dead = true; ev.push(env.berserk ? { type: 'eaten', what: 'oil', x: h.x, y: dr.y } : { type: 'hit', reason: 'oil', x: h.x, y: dr.y }); }
      }
      h.drops = h.drops.filter(dr => !dr.dead);
    } else if (h.type === 'knife') {
      h.t += dt * tp.speedMul; h.phase = knifePhase(h.t).phase;
      const ky = knifeY(h);
      if (h.phase === 'strike' && Math.abs(ball.x - h.x) < R + 8 && Math.abs(ball.y - (ky + 40)) < R + 40) {
        if (env.berserk) { h.gone = true; ev.push({ type: 'smash', h, x: h.x, y: ky }); } else ev.push({ type: 'hit', reason: 'knife', x: h.x, y: ky });
      }
    } else if (h.type === 'blades') {
      h.ang += dt * 6 * tp.speedMul;
      if (Math.hypot(ball.x - h.x, ball.y - h.y) < R + BLADES_R) {
        if (env.berserk) { h.gone = true; ev.push({ type: 'smash', h, x: h.x, y: h.y }); } else ev.push({ type: 'hit', reason: 'blades', x: h.x, y: h.y });
      }
    }
  }
  return ev;
}
expose({ FLY_CHASE, FLY_CHASE_MIN, FLY_WARN, FLY_MAX, FLY_CD, CAMP_T, OIL_DROP_V, KNIFE_REST, KNIFE_WIND, KNIFE_STRIKE, BLADES_R,
  get flies() { return flies; }, flyChase, spawnFly, resetFlies, flyWanted, knifePhase, knifeY, updateHazards });
