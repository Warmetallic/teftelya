'use strict';
// Separate streams keep new encounters and modifiers independent of the original route.
const BIOMES = {
  kitchen: { trap: 'knife' },
  fridge: { trap: 'icicle', effect: 'ice' },
  oven: { trap: 'steam', effect: 'heat' },
  cellar: { trap: 'rat', effect: 'dark' },
  feast: { trap: 'pepper', effect: 'feast' },
};
const MOD_BONUS = { heat: 20, ice: 20, swarm: 15, sharp: 15, narrow: 20, feast: 15, dark: 30, fragile: 25 };
const TRAP_WARN = { rat: 0.8, icicle: 0.78, steam: 0.95, pepper: 0.9 };
const PEPPER_RADIUS = 85;
const PENDULUM_TOWER = 6, PENDULUM_WARN = 1.1, PENDULUM_SWING = 0.92;
// Отсчёт от оси подвеса. Лезвие занимает нижнюю половину тесака.
const CHAIN_LENGTH = 61, CLEAVER_LENGTH = 98, CLEAVER_WIDTH = 21;
function pendulumAngle(h, time = h.time) {
  const swing = h.phase === 'active' ? Math.cos(time * (2 * Math.PI / 2.8)) : 1;
  return h.dir * PENDULUM_SWING * swing;
}
function addPendulum(level, worldSeed) {
  const { tp, path, platforms, items, hazards } = level;
  if (tp.N < PENDULUM_TOWER) return;
  const rng = towerRng(tp.N, worldSeed, 2821);
  const byId = new Map(platforms.map(p => [p.id, p]));
  // В шестой башне учимся на старте. Дальше выбираем из устойчивых площадок перед разрывом.
  const starts = path.filter((id, i) => {
    const p = byId.get(id), next = byId.get(path[i + 1]);
    return next && p.row > 2 && (p.rest || p.cp || p.type === 'plate') && next.row >= p.row + 2;
  });
  const host = tp.N === PENDULUM_TOWER || !starts.length ? byId.get(path[0]) : byId.get(starts[Math.floor(rng() * starts.length)]);
  const next = byId.get(path[path.indexOf(host.id) + 1]);
  const y = host.y - 292, midX = clamp((host.x + next.x) / 2, 136, W - 136);
  // При нескольких проходах выбираем тот, где тесак лучше отделён от соседних платформ и ловушек.
  const options = [midX, 132, W - 132];
  function clearance(x) {
    let gap = 180;
    for (const h of hazards) gap = Math.min(gap, Math.hypot(h.x - x, h.y - (y + 123)) - 50);
    for (const p of platforms) {
      const dx = Math.max(0, Math.abs(p.x - x) - p.w / 2);
      gap = Math.min(gap, Math.hypot(dx, p.y - (y + 123)));
    }
    return gap - Math.abs(x - midX) * 0.15;
  }
  const x = options.reduce((best, candidate) => clearance(candidate) > clearance(best) ? candidate : best);
  hazards.push({ type: 'pendulum', id: 30000, host: host.id, x, y, dir: next.x < x ? -1 : 1, phase: 'idle', time: 0 });
  items.push(mkFood(rng, x, y + 130));
}
function tickPendulum(h, dt, env) {
  if (h.phase === 'idle') {
    const tip = h.y + 120 - env.camY;
    if (ball.onPlatform !== null && tip >= 32 && tip <= H - BAND_H) {
      h.phase = 'warn'; h.time = PENDULUM_WARN;
    }
    return;
  }
  if (h.phase === 'warn') {
    h.time -= dt;
    if (h.time > 0) return;
    h.phase = 'active'; h.time = 0;
  }
  h.time += dt;
  if (env.invuln && !env.berserk) return;
  // Центр Тефы в координатах тесака. Касание цепи и деревянной ручки безопасно.
  const a = pendulumAngle(h), dx = ball.x - h.x, dy = ball.y - h.y;
  const x = dx * Math.cos(a) + dy * Math.sin(a), y = dy * Math.cos(a) - dx * Math.sin(a);
  const bladeX = clamp(x, -CLEAVER_WIDTH / 2 + 2, CLEAVER_WIDTH / 2 - 2);
  const bladeY = clamp(y, CHAIN_LENGTH + CLEAVER_LENGTH * 0.48, CHAIN_LENGTH + CLEAVER_LENGTH - 3);
  if (Math.hypot(x - bladeX, y - bladeY) < ball.r) return trapEvent(h, env.berserk, ball.x, ball.y);
}
function biomeRules(N, worldSeed) {
  const { effect } = BIOMES[themeFor(N).id];
  const effects = {}, mods = [], rng = towerRng(N, worldSeed, 5071);
  if (effect) effects[effect] = true;
  const pool = Object.keys(MOD_BONUS).filter(key => key !== effect);
  // Feast already attracts a swarm. An extra swarm would give a bonus for the same rule.
  if (effect === 'feast') pool.splice(pool.indexOf('swarm'), 1);
  const count = Math.min(loopOf(N) - 1, 3);
  while (mods.length < count) {
    const [key] = pool.splice(Math.floor(rng() * pool.length), 1);
    if ((key === 'swarm' && effects.feast) || (key === 'feast' && effects.swarm)) continue;
    effects[key] = true;
    mods.push(key);
  }
  return { effects, mods, bonusPct: mods.reduce((sum, key) => sum + MOD_BONUS[key], 0) };
}
function populateBiome(level, worldSeed) {
  const { tp, hazards, platforms, items } = level;
  Object.assign(tp, biomeRules(tp.N, worldSeed));
  const R = towerRng(tp.N, worldSeed, 1601);
  for (const p of platforms) {
    p.ice = !!tp.effects.ice;
    if (p.start || p.roof || p.cp || p.rest) continue;
    if (tp.effects.narrow && p.type !== 'board') p.w = Math.max(72, p.w * 0.84);
    if (tp.effects.fragile && p.type === 'plate' && R() < 0.34) p.type = 'cheese';
  }
  const type = BIOMES[tp.theme].trap;
  let nextRow = 1;
  for (const p of platforms.slice().sort((a,b) => a.row - b.row)) {
    if (type === 'knife') break; // The kitchen has its own board placement and clearance tests.
    if (p.row < nextRow || p.cp || p.roof || p.type === 'tray' || p.type === 'cheese') continue;
    const side = p.x < W / 2 ? -1 : 1;
    const h = { id: 20000 + p.id, type, host: p.id, phase: 'idle', time: 0, seen: false,
      x: p.x + side * (p.w / 2 - 18), y: p.y - 16, dir: -side, gone: false };
    if (type === 'icicle') { h.y = p.y - 178; h.limit = p.y; h.drop = 0; }
    if (type === 'steam') { h.x = side < 0 ? 15 : W - 15; h.y = p.y - 82; }
    if (type === 'rat') { h.left = p.x - p.w / 2 + 15; h.right = p.x + p.w / 2 - 15; }
    if (type === 'pepper') h.y = p.y - 22;
    hazards.push(h);
    items.push(mkFood(R, clamp(p.x - side * 12, 25, W - 25), p.y - 55));
    nextRow = p.row + 7 + Math.floor(R() * 4);
  }
  addPendulum(level, worldSeed);
  if (tp.effects.feast) {
    for (const it of items.slice()) {
      const x = it.x > W / 2 ? it.x - 43 : it.x + 43;
      items.push(mkFood(R, x, it.y - 21));
    }
  }
}
function trapEvent(h, berserk, x, y) {
  if (berserk) { h.gone = true; return { type: 'smash', h, x, y }; }
  return { type: 'hit', reason: h.type, x, y };
}
function tickBiomeTrap(h, dt, env) {
  // A grounded sighting arms the encounter. A pepper can then be touched and an icicle
  // passed under during a jump, with a full tell before either can hurt the player.
  const screenY = h.y - env.camY;
  if (ball.onPlatform !== null && screenY >= 18 && screenY <= H - BAND_H) h.seen = true;
  // The pepper is a visible pickup-sized prop, so touching it can light the fuse even in midair.
  if (!h.seen && h.type !== 'pepper') return;
  if (h.phase === 'cool') {
    h.time -= dt;
    if (h.time <= 0) { h.phase = 'idle'; h.drop = 0; }
    return;
  }
  if (h.phase === 'idle') {
    const below = ball.y - h.y;
    let trigger;
    switch (h.type) {
      case 'icicle': trigger = below > 10 && below < 320 && Math.abs(ball.x - h.x) < ball.r + 22; break;
      case 'pepper': trigger = Math.hypot(ball.x - h.x, ball.y - h.y) < ball.r + 17; break;
      case 'rat': trigger = Math.abs(below) < 300; break;
      case 'steam': trigger = Math.abs(below) < 255 && ball.onPlatform !== null; break;
    }
    if (trigger) {
      h.phase = 'warn'; h.time = TRAP_WARN[h.type];
      if (h.type === 'steam') tone(320, 720, 0.2, 'triangle', 0.045);
    }
    return;
  }
  if (h.phase === 'warn') {
    h.time -= dt;
    if (h.time > 0) return;
    h.phase = 'active'; h.time = 0;
  }
  h.time += dt;
  const r = ball.r;
  switch (h.type) {
    case 'rat': {
      const speed = env.tp.N >= 16 ? 85 : 58;
      h.x += h.dir * dt * speed;
      if (h.x <= h.left || h.x >= h.right) {
        h.x = clamp(h.x, h.left, h.right); h.dir *= -1;
      }
      if ((env.berserk || !env.invuln) && Math.hypot((ball.x - h.x) * 0.85, ball.y - h.y) < r + 10) {
        h.phase = 'cool'; h.time = 2.2; h.dir = ball.x < h.x ? 1 : -1;
        return trapEvent(h, env.berserk, h.x, h.y);
      }
      break;
    }
    case 'icicle': {
      h.drop = Math.min(h.limit - h.y, 640 * h.time * h.time);
      const y = h.y + h.drop;
      if (y >= h.limit) { h.phase = 'cool'; h.time = 3.2; }
      if (Math.abs(ball.x - h.x) < r + 7 && Math.abs(ball.y - y + 16) < r + 15)
        return trapEvent(h, env.berserk, h.x, y);
      break;
    }
    case 'steam': {
      const reach = Math.min(W, h.time * 1300);
      if (h.time >= 0.72) { h.phase = 'cool'; h.time = 2.8; break; }
      if (Math.abs(ball.x - h.x) <= reach + r && Math.abs(ball.y - h.y) < r + 13)
        return trapEvent(h, env.berserk, ball.x, h.y);
      break;
    }
    case 'pepper':
      if (h.time >= 0.28) { h.gone = true; break; }
      if (Math.hypot(ball.x - h.x, ball.y - h.y) < PEPPER_RADIUS + r)
        return trapEvent(h, env.berserk, h.x, h.y);
      break;
  }
}
function modifiersText(tp) {
  return tp.mods.map(key => T('mod.' + key)).join(' · ') + (tp.mods.length ? '   +' + tp.bonusPct + '%' : '');
}
expose({ BIOMES, biomeRules, TRAP_WARN, PEPPER_RADIUS, tickBiomeTrap, pendulumAngle, PENDULUM_TOWER, PENDULUM_WARN });
