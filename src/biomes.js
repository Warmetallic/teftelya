'use strict';
// Separate streams keep new encounters and modifiers independent of the original route.
const BIOMES = {
  kitchen: { trap: 'knife' },
  fridge: { trap: 'icicle', effect: 'ice' },
  oven: { trap: 'steam', effect: 'heat' },
  cellar: { trap: 'rat', effect: 'dark' },
  feast: { trap: 'pepper', effect: 'feast' },
  tea: { trap: 'brew' },
  smokehouse: { trap: 'smoke' },
  bakery: { trap:'flour', effect:'proof' },
};
const MOD_BONUS = { heat: 20, ice: 20, swarm: 15, sharp: 15, narrow: 20, feast: 15, dark: 30, fragile: 25 };
const TRAP_WARN = { rat: 0.8, icicle: 0.78, steam: 0.95, pepper: 0.9, flour:.9, brew:.85, smoke:1.15 };
const PEPPER_RADIUS = 85;
const RAT_FLEE_SPEED = 310, RAT_PATROL_INSET = 15;
const PENDULUM_TOWER = 6, PENDULUM_WARN = 1.1, PENDULUM_SWING = 0.92;
const MOUSETRAP_TOWER = 7, MOUSETRAP_WARN = 0.5, MOUSETRAP_SNAP = 0.13, MOUSETRAP_WIDTH = 86;
const WORKSHOP_UNLOCKS = [{ tower: 8, type: 'burner' }, { tower: 9, type: 'tape' }, { tower: 10, type: 'mallet' }];
const KITCHEN_UNLOCKS = [{ tower:11, type:'roller' }, { tower:12, type:'hood' }, { tower:13, type:'fork' },
  { tower:14, type:'splash' }, { tower:15, type:'grater' }];
const TRAP_UNLOCKS = [{ tower: PENDULUM_TOWER, type: 'pendulum' }, { tower: MOUSETRAP_TOWER, type: 'mousetrap' }, ...WORKSHOP_UNLOCKS, ...KITCHEN_UNLOCKS];
const TOWER_MILESTONES=[...TRAP_UNLOCKS,{tower:16,type:'pair'},{tower:18,type:'choice'},{tower:21,type:'bakery'},
  {tower:24,type:'tea'}, {tower:29,type:'smokehouse'}];
function towerMilestones() {
  if (save.oldBiomesThrough < 24) return TOWER_MILESTONES;
  return TOWER_MILESTONES.map(u => {
    if (u.tower < 24 || u.tower > save.oldBiomesThrough) return u;
    // In a migrated world the first new room can fall in a later rotation.
    for (let i=1;i<=10;i++) {
      const n=save.oldBiomesThrough+i;
      if (themeFor(n).id===u.type) return {tower:n,type:u.type};
    }
    return u;
  }).sort((a,b)=>a.tower-b.tower);
}
const hasTrapDebut = n => TRAP_UNLOCKS.some(u => u.tower === n) || n===16;
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
    return next && !p.room && p.row > 2 && (p.rest || p.cp || p.type === 'plate') && next.row >= p.row + 2;
  });
  const fallback = tp.N > PENDULUM_TOWER && hasTrapDebut(tp.N) ? platforms.find(p => p.cp) : byId.get(path[0]);
  let host = tp.N === PENDULUM_TOWER || !starts.length ? fallback : byId.get(starts[Math.floor(rng() * starts.length)]);
  if (tp.N===16) host=platforms[0];
  if (tp.N===17) host=path.map(id=>byId.get(id)).find(p=>p.type==='cheese' && p.row>2) || host;
  const next = byId.get(path[path.indexOf(host.id) + 1]);
  const y = host.y - (tp.N===17 ? 167 : 292), midX = clamp((host.x + next.x) / 2, 136, W - 136);
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
  const x = tp.N===17 ? host.x : options.reduce((best, candidate) => clearance(candidate) > clearance(best) ? candidate : best);
  const pendulum={ type: 'pendulum', id: 30000, host: host.id, x, y, dir: next.x < x ? -1 : 1, phase: 'idle', time: 0 };
  hazards.push(pendulum);
  if (tp.N>=16 && tp.N!==17) {
    pendulum.x=clamp(x,155,W-155)-58; pendulum.dir=1;
    hazards.push({...pendulum,id:30002,x:pendulum.x+116,dir:-1});
  }
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
function addMousetrap(level, worldSeed) {
  const { tp, platforms, path, hazards, items } = level;
  if (tp.N < MOUSETRAP_TOWER) return;
  const rng = towerRng(tp.N, worldSeed, 7219);
  let host;
  if (tp.N === MOUSETRAP_TOWER) {
    // Если генератор начал с пропасти, добавляем учебную полку в пустой ряд.
    // Основной маршрут выше и сохранённые чекпоинты остаются на месте.
    host = platforms.find(p => p.row === 1);
    if (!host) {
      const next = platforms.find(p => p.id === path[1]);
      host = { id: platforms.length, row: 1, x: next.x < W / 2 ? 130 : W - 130, y: -ROW_H, cp: 0 };
      platforms.push(host);
    }
    host.type = 'shelf'; host.ice = true;
    host.w = Math.max(140, host.w || 0);
    host.x = clamp(host.x, EDGE + host.w / 2, W - EDGE - host.w / 2);
  } else {
    const clear = platforms.filter(p => p.row >= 3 && !p.room && !p.cp && !p.roof && (p.type === 'plate' || p.type === 'shelf')
      && !hazards.some(h => h.host === p.id || Math.hypot(h.x - p.x, h.y - p.y) < 195));
    if (!clear.length) return;
    host = clear[Math.floor(rng() * clear.length)];
  }
  hazards.push({ id: 30001, type: 'mousetrap', host: host.id, x: host.x, y: host.y, phase: 'idle', time: 0 });
  items.push(mkFood(rng, host.x + (host.x < W / 2 ? 30 : -30), host.y - 55));
}
function tickMousetrap(h, dt, env) {
  if (h.phase === 'spent') return;
  const onBait = ball.onPlatform === h.host && Math.abs(ball.x - h.x) <= MOUSETRAP_WIDTH / 2;
  if (onBait && env.berserk) return trapEvent(h, true, h.x, h.y - 10);
  if (h.phase === 'idle') {
    if (onBait) {
      h.phase = 'warn'; h.time = MOUSETRAP_WARN;
      tone(740, 430, 0.075, 'triangle', 0.12);
    }
    return;
  }
  h.time = Math.max(0, h.time - dt);
  if (h.time > 1e-8) return;
  if (h.phase === 'warn') {
    h.phase = 'snap'; h.time = MOUSETRAP_SNAP;
    tone(245, 68, 0.075, 'square', 0.13);
    if (onBait && !env.invuln) return trapEvent(h, false, h.x, h.y - 10);
  } else {
    h.phase = 'spent';
  }
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
    p.ice = !!tp.effects.ice && p.room !== 'safe' && p.room !== 'pantry';
    if (p.start || p.roof || p.cp || p.rest || p.room) continue;
    if (tp.effects.narrow && p.type !== 'board') p.w = Math.max(72, p.w * 0.84);
    if (tp.effects.fragile && p.type === 'plate' && R() < 0.34) p.type = 'cheese';
  }
  const type = BIOMES[tp.theme].trap;
  let nextRow = tp.N >= MOUSETRAP_TOWER && hasTrapDebut(tp.N) ? 3 : 1;
  for (const p of platforms.slice().sort((a,b) => a.row - b.row)) {
    if (type === 'knife') break; // The kitchen has its own board placement and clearance tests.
    if (p.row < nextRow || p.room || p.cp || p.roof || p.type === 'tray' || p.type === 'cheese') continue;
    if ((type === 'brew' && p.type !== 'teaLift') || (type === 'smoke' && p.type !== 'damper')) continue;
    const side = p.x < W / 2 ? -1 : 1;
    const h = { id: 20000 + p.id, type, host: p.id, phase: 'idle', time: 0, seen: false,
      x: p.x + side * (p.w / 2 - 18), y: p.y - 16, dir: -side, gone: false };
    if (type === 'icicle') { h.y = p.y - 178; h.limit = p.y; h.drop = 0; }
    if (type === 'flour') { h.y=p.y-175; h.limit=p.y; h.drop=0; }
    if (type === 'steam') { h.x = side < 0 ? 15 : W - 15; h.y = p.y - 82; }
    if (type === 'brew' || type === 'smoke') {
      // Spout and outlet point toward the passage, leaving the landing open.
      h.x = clamp(p.x - side * (p.w/2 + 28), 42, W-42);
      h.y = p.y - (type === 'brew' ? 188 : 116);
    }
    if (type === 'rat') { h.left = p.x - p.w / 2 + RAT_PATROL_INSET; h.right = p.x + p.w / 2 - RAT_PATROL_INSET; }
    if (type === 'pepper') h.y = p.y - 22;
    hazards.push(h);
    items.push(mkFood(R, clamp(p.x - side * 12, 25, W - 25), p.y - 55));
    nextRow = type === 'smoke' ? p.row + 1 : p.row + 7 + Math.floor(R() * 4);
  }
  const pool = chooseTrapPool(tp.N,worldSeed);
  tp.trapPool = pool;
  if (pool.includes('pendulum')) addPendulum(level, worldSeed);
  if (pool.includes('mousetrap')) addMousetrap(level, worldSeed);
  addWorkshopTraps(level, worldSeed);
  addKitchenTraps(level,worldSeed);
  if (platforms.some(p => p.lesson)) {
    for (let i = hazards.length - 1; i >= 0; i--) {
      const h = hazards[i];
      if (h.type !== type && h.y > -3 * ROW_H) hazards.splice(i, 1);
    }
  }
  const quiet = platforms.filter(p => p.room === 'safe' || p.room === 'pantry');
  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i];
    if (h.type === 'fork' && platforms.some(p => p.id === h.host && p.room === 'rich')) continue;
    if (!quiet.some(p => h.y >= p.y - 230 && h.y <= p.y + 160)) continue;
    if (h.board !== undefined) platforms.find(p => p.id === h.board).type = 'plate';
    hazards.splice(i, 1);
  }
  if (tp.effects.feast) {
    for (const it of items.slice()) {
      const x = it.x > W / 2 ? it.x - 43 : it.x + 43;
      items.push(mkFood(R, x, it.y - 21));
    }
  }
}
function trapEvent(h, berserk, x, y) {
  if (berserk) { h.gone = true; return { type: 'smash', h, x, y }; }
  return { type: 'hit', reason: h.type, h, x, y };
}
function fleeAfterBite(h) {
  h.phase = 'flee'; h.time = 0;
  h.dir = Math.sign(h.x - ball.x) || -h.dir;
  h.shelfY = h.y;
}
function advanceFleeingRat(h, dt) {
  h.time += dt;
  h.x += h.dir * RAT_FLEE_SPEED * dt;
  const edge = h.dir > 0 ? h.right + RAT_PATROL_INSET : h.left - RAT_PATROL_INSET;
  const airTime = Math.max(0, (h.x - edge) * h.dir / RAT_FLEE_SPEED);
  h.y = h.shelfY + airTime * (0.5 * GRAV * airTime - 220);
  if (h.x < -46 || h.x > W + 46) h.gone = true; // хвост тоже покинул кадр
}
function tickBiomeTrap(h, dt, env) {
  // A grounded sighting arms the encounter. A pepper can then be touched and an icicle
  // passed under during a jump, with a full tell before either can hurt the player.
  if (h.type === 'smoke' && ball.onPlatform === h.host) {
    if (h.phase !== 'vent') tone(390, 590, .14, 'triangle', .06);
    h.phase = 'vent'; h.time = 2.4;
    return;
  }
  if (h.phase === 'vent') {
    h.time -= dt;
    if (h.time <= 0) h.phase = 'idle';
    return;
  }
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
      case 'brew': case 'smoke':
        trigger = Math.abs(below) < 310 && ball.onPlatform !== null;
        break;
      case 'flour': trigger=ball.onPlatform!==null && below>0 && below<300 && Math.abs(ball.x-h.x)<190; break;
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
    case 'brew': {
      const reach = Math.min(175, h.time * 490);
      if (h.time >= .95) { h.phase = 'cool'; h.time = 2.1; break; }
      if (Math.abs(ball.x-h.x) < r+5 && ball.y+r >= h.y && ball.y-r <= h.y+reach)
        return trapEvent(h,env.berserk,ball.x,ball.y);
      break;
    }
    case 'smoke': {
      if (h.time >= 2.2) { h.phase = 'cool'; h.time = 1.65; break; }
      const reach = Math.min(98, h.time*265), dx = (ball.x-h.x)*h.dir;
      if (dx > -r && dx < reach+r && Math.abs(ball.y-h.y) < r+14)
        return trapEvent(h,env.berserk,ball.x,ball.y);
      break;
    }
    case 'flour': {
      const floor=h.limit-h.y-8;
      h.drop=Math.min(floor,540*h.time*h.time);
      if (h.time>.99) { h.phase='cool'; h.time=2.8; h.hit=false; return; }
      const y=h.y+h.drop-9;
      if (h.drop<floor && !h.hit && (env.berserk || !env.invuln) && Math.hypot(ball.x-h.x,ball.y-y)<r+13) {
        h.hit=true; return trapEvent(h,env.berserk,h.x,y);
      }
      break;
    }
    case 'rat': {
      const speed = env.tp.N >= 16 ? 85 : 58;
      h.x += h.dir * dt * speed;
      if (h.x <= h.left || h.x >= h.right) {
        h.x = clamp(h.x, h.left, h.right); h.dir *= -1;
      }
      if ((env.berserk || !env.invuln) && Math.hypot((ball.x - h.x) * 0.85, ball.y - h.y) < r + 10) {
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
expose({ BIOMES, towerMilestones, biomeRules, TRAP_WARN, PEPPER_RADIUS, tickBiomeTrap, pendulumAngle, PENDULUM_TOWER, PENDULUM_WARN });
