'use strict';
const BURNER_HEIGHT = 158, BURNER_RADIUS = 16;
const MALLET_LIFT = 110, MALLET_HALF = 20, MALLET_FACE = 31;
const TOOL_CYCLE = {
  burner: { warn: 1.05, active: .87, cool: 1.65 },
  mallet: { warn: .92, active: .56, cool: 1.85 },
};

// At the debut the player can watch from the centre of the starting plate.
// Later, sample free space next to a stable ledge, outside the first two rows.
function addWorkshopTraps(level, worldSeed) {
  const { tp, platforms, hazards, items } = level;
  for (const {tower: debut, type} of WORKSHOP_UNLOCKS) {
    if (tp.N < debut) break;
    if (!tp.trapPool.includes(type)) continue;
    const rng = towerRng(tp.N, worldSeed, 8413 * debut);
    const first = tp.N === debut;
    const hosts = first ? [platforms[0]] : platforms.filter(p =>
      p.row >= 6 && p.type === 'plate' && !p.room && !p.roof && !p.cp && !hazards.some(h => h.host === p.id));
    const candidates = [];
    for (const p of hosts) for (const dir of [-1, 1]) {
      const offset = type === 'burner' ? p.w/2 + 33 : type === 'mallet' ? p.w/2 - 25 : 65;
      const x = p.x + dir*offset, y = p.y - (type === 'tape' ? 106 : 0);
      if (x < 32 || x > W-32 || hazards.some(h => Math.hypot(x-h.x, y-65-h.y) < 205)) continue;
      // Avoid a shelf cutting through a jet or through a suspended tool.
      const ceiling = type === 'tape' ? y-103 : type === 'mallet' ? y-237 : y-BURNER_HEIGHT;
      const obstructed = platforms.some(q => q !== p && q.y >= ceiling && q.y <= y &&
        x >= (q.x0 ?? q.x)-q.w/2-23 && x <= (q.x1 ?? q.x)+q.w/2+23);
      if (!obstructed || first) candidates.push({ x, y, dir, host: p.id, obstructed });
    }
    const clear = candidates.filter(c => !c.obstructed);
    const options = clear.length ? clear : candidates;
    if (!options.length) continue;
    const {x, y, dir, host} = options[Math.floor(rng()*options.length)];
    hazards.push({ type, id: 30000 + debut, host, dir, x, y, phase:'idle', time:0 });
    items.push(mkFood(rng, clamp(x - dir*32, 22, W-22), y-(type === 'tape' ? 6 : 65)));
  }
}
function burnerHeight(h) {
  if (h.phase !== 'active') return 0;
  const t = h.time;
  return BURNER_HEIGHT * clamp(Math.min(t/.14, (TOOL_CYCLE.burner.active-t)/.18), 0, 1);
}
function malletBottom(h) {
  if (h.phase === 'warn') return -MALLET_LIFT - 8*Math.min(1,h.time/.24);
  if (h.phase !== 'active') return -MALLET_LIFT;
  if (h.time < .14) return -(MALLET_LIFT+8)*(1-(h.time/.14)**2);
  return -MALLET_LIFT * clamp((h.time-.27)/(.56-.27), 0, 1);
}
function overlapsTool(h, top, bottom, halfWidth) {
  const dx = ball.x-h.x, dy = ball.y-h.y;
  return Math.hypot(dx-clamp(dx,-halfWidth,halfWidth), dy-clamp(dy,top,bottom)) < ball.r;
}
function tickWorkshopTrap(h, dt, env) {
  if (h.phase === 'idle') {
    const y = h.y-env.camY;
    if (ball.onPlatform === null || y < 45 || y > H-BAND_H || Math.abs(ball.y-h.y) > 290) return;
    h.phase = h.type === 'tape' ? 'ready' : 'warn'; h.time = 0;
    if (h.type === 'burner') tone(210, 480, .17, 'triangle', .08);
    return;
  }
  if (h.type === 'tape') {
    if (ball.onPlatform !== null || !overlapsTool(h,-42,5,8)) return;
    if (env.berserk) return trapEvent(h,true,ball.x,ball.y);
    if (!ball.tape && !env.invuln) {
      ball.tape = h; ball.vx = 0; ball.vy = 0;
      tone(360,175,.12,'triangle',.07);
    }
    return;
  }
  const cycle = TOOL_CYCLE[h.type];
  h.time += dt;
  if (h.time + 1e-8 >= cycle[h.phase]) {
    if (h.phase === 'cool') { h.phase = 'idle'; h.time = 0; return; }
    h.time = Math.max(0,h.time-cycle[h.phase]);
    h.phase = h.phase === 'warn' ? 'active' : 'cool';
    h.hit = false;
    if (h.phase === 'active' && h.type === 'mallet') tone(142,53,.12,'triangle',.12);
  }
  if (h.phase !== 'active' || (env.invuln && !env.berserk) || (h.hit && !env.berserk)) return;
  if (h.type === 'burner') {
    const reach = burnerHeight(h);
    if (reach < 3 || !overlapsTool(h,-reach,-2,BURNER_RADIUS)) return;
  } else {
    const base = malletBottom(h);
    if (h.time > .27 || !overlapsTool(h,base-MALLET_FACE,base,MALLET_HALF)) return;
  }
  h.hit = true;
  return trapEvent(h,env.berserk,ball.x,ball.y);
}
