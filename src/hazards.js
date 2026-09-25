'use strict';
// ---------- опасности: муха (наводится), масло сверху (льёт повар), нож (гильотина в разрыве), лопасти; каждая снимает один кусок ----------
const FLY_CHASE = 6, FLY_CHASE_MIN = 1.5, FLY_WARN = 0.7, FLY_MAX = 3, FLY_CD = 2, CAMP_T = 3;
const FLY_UP = 0.4; // вверх муха летит не быстрее этой доли своей скорости: от Тефы, которая лезет вверх, отстаёт (плейтест владельца v2.2a)
const KNIFE_REST = 1.2, KNIFE_WIND = 0.6, KNIFE_STRIKE = 0.3; // сумма = KNIFE_CYCLE
// BLADES_R (радиус лопастей) задаёт tower.js: генератор ищет лопастям место с учётом их размера
let flies = []; // мухи живут отдельно от раскладки башни: их спавнит политика, а не генератор
function flyChase() { return Math.max(FLY_CHASE_MIN, FLY_CHASE - 0.3 * ((save.up && save.up.repel) || 0)); }
function spawnFly(fromLeft) {
  const left = fromLeft === undefined ? Math.random() < 0.5 : fromLeft;
  flies.push({ type: 'fly', x: left ? -30 : W + 30, y: ball.y - 100, side: left ? -1 : 1, warnT: FLY_WARN, chaseT: 0, phase: Math.random() * 6.28, gone: false });
}
function resetFlies() { flies = []; }
// политика влёта (спека v2.1.1 §4.4): лень — гарантированно; скрытая серия ≥ 6 — по шансу, полная шкала (doubled) его удваивает;
// берсерк и лимит — никогда
function flyWanted(dt, streakN, campT, berserk, doubled) {
  if (berserk || flies.length >= FLY_MAX) return false;
  if (campT >= CAMP_T) return true;
  if (streakN >= 6) return Math.random() < dt * Math.min(0.4, 0.08 + 0.02 * (streakN - 6)) * (doubled ? 2 : 1);
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
// В берсерке муха съедается (eaten — game.js лечит на кусок), нож и лопасти ломаются (smash). Масло — updatePours ниже.
function updateHazards(dt, hazards, env) {
  const ev = [], tp = env.tp, R = ball.r;
  for (const f of flies) {
    if (f.gone) continue;
    const sp = tp.flySpeed, up = FLY_UP * sp;
    if (f.warnT > 0) { f.warnT -= dt; f.y = Math.max(ball.y - 100, f.y - up * dt); continue; } // за Тефой вниз сразу, вверх медленно
    f.chaseT += dt; f.phase += dt * 7;
    const dx = ball.x - f.x, dy = ball.y - f.y, dist = Math.hypot(dx, dy) || 1;
    f.x += (dx / dist) * sp * dt + Math.cos(f.phase) * 60 * dt; f.y += Math.max((dy / dist) * sp + Math.sin(f.phase * 1.3) * 60, -up) * dt;
    if (dist < R + 12) { f.gone = true; ev.push(env.berserk ? { type: 'eaten', what: 'fly', x: f.x, y: f.y } : { type: 'hit', reason: 'fly', x: f.x, y: f.y }); continue; }
    if (f.chaseT >= flyChase()) { f.gone = true; ev.push({ type: 'flyGaveUp', h: f }); }
  }
  flies = flies.filter(f => !f.gone);
  for (const h of hazards) {
    if (h.gone || Math.abs(h.y - ball.y) > H + 100) continue;
    if (h.type === 'knife') {
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
// ---------- масло сверху (спека v2.1.1 §7.2): повар льёт с верхнего края, пунктир предупреждает, капли падают, пятна шипят ----------
const POUR_WARN = 0.6, POUR_DROPS = 4, POUR_GAP = 0.08; // предупреждение, капель в наливе, интервал между каплями, с
const POUR_V = 700, DROP_R = 8;                         // скорость падения, px/с; радиус капли
const SPLAT_T = 1, SPLAT_W = 36;                        // пятно на платформе: живёт 1 с, шириной 36 px
const LADLE_Y = 110;                                    // половник ниже строк HUD (счёт y 40, «Башня N» y 64), px от верха экрана; капли начинаются от черпака
let pours = [], drops = [], splats = [], pourT = 5;     // pourT — секунд до следующего налива
function pourInterval(N) { return Math.max(3, 9 - 0.3 * (N - 1)); }
function resetPours(delay) { pours = []; drops = []; splats = []; pourT = delay; } // старт башни, чекпоинт, «Продолжить»
function delayPours(t) { pourT = Math.max(pourT, t); }                            // передышка после нового чекпоинта
function startPour(x, extraWarn = 0) { pours.push({ x: clamp(x, 40, W - 40), warnT: POUR_WARN + extraWarn, left: POUR_DROPS, dropT: 0 }); }
// env: { tp, berserk, camY, platforms }. События: hit {reason: 'oil'} | eaten {what: 'oil'} — как у остальных опасностей
function updatePours(dt, env) {
  const ev = [], N = env.tp.N;
  pourT -= dt;
  if (pourT <= 0) { // столб рядом с Тефой или чуть впереди по ходу; с башни 6 иногда второй налив через 0.4 с в другом столбе
    startPour(ball.x + ball.vx * 0.3 + (Math.random() * 200 - 100));
    if (N >= 6 && Math.random() < 0.3) startPour(ball.x + (Math.random() < 0.5 ? -1 : 1) * (120 + Math.random() * 80), 0.4);
    pourT = pourInterval(N) + (Math.random() * 2 - 1);
  }
  for (const p of pours) {
    if (p.warnT > 0) { p.warnT -= dt; continue; }
    p.dropT -= dt;
    while (p.left > 0 && p.dropT <= 0) { drops.push({ x: p.x, y: env.camY + LADLE_Y + 6, dead: false }); p.left--; p.dropT += POUR_GAP; }
  }
  pours = pours.filter(p => p.warnT > 0 || p.left > 0);
  for (const dr of drops) {
    const y0 = dr.y; dr.y += POUR_V * dt;
    if (Math.hypot(ball.x - dr.x, ball.y - dr.y) < ball.r + DROP_R) { dr.dead = true; ev.push(env.berserk ? { type: 'eaten', what: 'oil', x: dr.x, y: dr.y } : { type: 'hit', reason: 'oil', x: dr.x, y: dr.y }); continue; }
    for (const p of env.platforms) { // капля упала на платформу — шипящее пятно (едет вместе с подносом)
      if (p.gone || Math.abs(dr.x - p.x) > p.w / 2 || !(y0 <= p.y && dr.y >= p.y)) continue;
      dr.dead = true; splats.push({ p, dx: dr.x - p.x, t: SPLAT_T }); break;
    }
    if (dr.y > env.camY + H + 100) dr.dead = true;
  }
  drops = drops.filter(dr => !dr.dead);
  for (const s of splats) {
    s.t -= dt;
    if (!env.berserk && ball.onPlatform === s.p.id && Math.abs(ball.x - (s.p.x + s.dx)) < SPLAT_W / 2 + 0.6 * ball.r) ev.push({ type: 'hit', reason: 'oil', x: s.p.x + s.dx, y: s.p.y });
  }
  splats = splats.filter(s => s.t > 0);
  return ev;
}
expose({ FLY_UP, FLY_CHASE, FLY_CHASE_MIN, FLY_WARN, FLY_MAX, FLY_CD, CAMP_T, KNIFE_REST, KNIFE_WIND, KNIFE_STRIKE,
  POUR_WARN, POUR_DROPS, POUR_V, SPLAT_T, SPLAT_W, LADLE_Y,
  get flies() { return flies; }, flyChase, spawnFly, resetFlies, flyWanted, knifePhase, knifeY, updateHazards,
  get pours() { return pours; }, get drops() { return drops; }, get splats() { return splats; }, pourInterval, resetPours, delayPours, startPour, updatePours });
