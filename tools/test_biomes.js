const assert = require('node:assert/strict');
const { climbLive } = require('./bot');
const noop = () => {};
const ctx = new Proxy({}, { get: (_, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop });

(async () => {
  const g = require('./_env')(ctx), d = g.dbg(), b = d.ball;
  await d.YG.init(); await d.loadSave();
  for (const n of [2, 3, 4, 5]) {
    d.startTower(n);
    const { tp } = d.tower, type = d.BIOMES[tp.theme].trap;
    const h = d.hazards.find(h => h.type === type), host = d.platforms.find(p => p.id === h.host);
    assert.ok(host.row < 10 && tp.effects[d.BIOMES[tp.theme].effect]);
    const env = { camY: h.y - 200, invuln: 0, tp }, tick = () => d.updateHazards(1/60, [h], env);
    Object.assign(b, { x: h.x, y: h.y + (type === 'icicle' ? 55 : 0), onPlatform: host.id });
    assert.deepEqual(tick(), []); assert.equal(h.phase, 'warn');
    for (let i = 0; i < Math.floor(d.TRAP_WARN[type] * 60) - 1; i++) assert.deepEqual(tick(), []);
    assert.equal(h.phase, 'warn');
    let hits = [];
    for (let i = 0; i < 65; i++) hits.push(...tick());
    assert.ok(hits.some(e => e.type === 'hit' && e.reason === type), type + ' hits after warning');
    if (type === 'pepper') assert.equal(h.gone, true);
    if (type === 'icicle' || type === 'steam') assert.equal(h.phase, 'cool');
    if (type === 'rat') assert.ok(h.x >= h.left && h.x <= h.right);
    // Walk out of range after triggering: no damage during the whole attack.
    d.startTower(n); const fresh = d.hazards.find(o => o.type === type);
    Object.assign(b, { x: fresh.x, y: fresh.y + (type === 'icicle' ? 55 : 0), onPlatform: host.id });
    d.updateHazards(1/60, [fresh], env); b.y = fresh.y - 170;
    for (let i = 0; i < 125; i++) assert.equal(d.updateHazards(1/60, [fresh], env).length, 0, type + ' evaded');
  }
  // Первое знакомство: на стартовой тарелке можно переждать любой размах.
  assert.ok(!d.buildTower(5,42).hazards.some(h => h.type === 'pendulum'));
  for (let seed = 0; seed < 64; seed++) {
    const level = d.buildTower(6, seed);
    assert.deepEqual(level.hazards.filter(h => h.y >= -300).map(h => h.type), ['pendulum']);
    assert.ok(level.hazards.some(h => h.type === 'knife' && h.board !== undefined));
  }
  for (const seed of [0,42,71,0xffffffff]) {
    d.save.worldSeed = seed; d.startTower(6);
    const h = d.hazards.find(h => h.type === 'pendulum');
    assert.equal(h.host, b.onPlatform);
    assert.ok(d.items.some(i => i.x === h.x && i.y === h.y + 130));
    const env = { camY: d.camY, tp: d.tower.tp, invuln: 0 };
    const tick = () => d.updateHazards(1/60, [h], env);
    b.onPlatform = null;
    for (let i = 0; i < 80; i++) assert.deepEqual(tick(), []);
    assert.equal(h.phase,'idle');
    b.onPlatform = h.host; tick();
    assert.equal(h.phase,'warn');
    for (let i = 0; i < Math.floor(d.PENDULUM_WARN * 60) - 1; i++) assert.deepEqual(tick(), []);
    assert.equal(h.phase,'warn');
    for (let i = 0; i < 375; i++) assert.deepEqual(tick(), []);
    assert.equal(h.phase,'active');
    b.onPlatform = null;
    function placeOnSwing(distance) {
      const a = d.pendulumAngle(h);
      b.x = h.x - Math.sin(a) * distance; b.y = h.y + Math.cos(a) * distance;
    }
    placeOnSwing(24); assert.deepEqual(tick(), []);
    placeOnSwing(133); assert.equal(tick()[0]?.reason,'pendulum');
    env.invuln = 1; assert.deepEqual(tick(), []);
    env.berserk = true; assert.equal(tick()[0]?.type,'smash');
    assert.ok(h.gone); assert.deepEqual(tick(), []);
  }
  d.save.worldSeed = 0;
  d.startTower(2);
  const frozen = d.platforms.find(p => p.type === 'plate');
  assert.ok(d.platforms.every(p => p.ice)); b.x = frozen.x; b.vx = 300;
  d.landOn(frozen); d.updatePlatforms(.05, d.platforms, d.tower.tp); assert.ok(b.x > frozen.x);
  d.startTower(3); const t = d.tower;
  for (const type of ['plate','tray','pan']) {
    const p = t.platforms.find(p => p.type === type);
    b.x = p.x; d.landOn(p); let burnt = false;
    for (let i = 0; i < 210; i++) if (d.updatePlatforms(1/60,t.platforms,t.tp).some(e => e.type === 'burn' && e.p === p)) burnt = true;
    assert.ok(burnt, 'oven heats ' + type);
  }
  d.startTower(5); const food = d.items;
  assert.equal(food.length % 2, 0);
  for (let i = 0; i < food.length / 2; i++) {
    const extra = food[food.length/2+i]; assert.equal(Math.abs(food[i].x-extra.x),43); assert.equal(food[i].y-extra.y,21);
  }
  assert.equal(d.flyWanted(0,0,0,false,false,true,3), true);
  assert.equal(d.flyWanted(0,0,0,true,false,true,3), false);
  assert.equal(d.flyWanted(0,0,2,false,false,true), true);
  assert.equal(d.flyWanted(0,0,2,false,false,false), false);
  for (let n = 1; n <= 100; n++) {
    const rules = d.biomeRules(n,42);
    assert.equal(rules.mods.length, Math.min(3, d.loopOf(n)-1));
    assert.equal(new Set(rules.mods).size, rules.mods.length);
    assert.ok(!rules.mods.includes(d.BIOMES[d.themeFor(n).id].effect));
    assert.deepEqual(rules, d.biomeRules(n,42));
  }
  for (const name of ['speedMul', 'flySpeed']) assert.equal(d.towerParams(100)[name], d.towerParams(10000)[name]);
  d.startTower(18); d.state = 'play'; d.finishTower();
  assert.equal(d.run.bonus, Math.round(20*18*({S:2,A:1.5,B:1.2,C:1,D:.8}[d.run.rating.letter])*(1+d.tower.tp.bonusPct/100)));
  const original = Math.random;
  try {
    for (const seed of [0,42,0xffffffff]) {
      d.save.worldSeed = seed; let retries = 0;
      for (let n = 1; n <= 100; n++) {
        Math.random = d.mulberry32((n*3109)^seed);
        d.startTower(n); d.state = 'play';
        const attempt = climbLive(d);
        assert.equal(attempt.state, 'finish', 'live playtest, world '+seed+', tower '+n);
        retries += attempt.retries;
      }
      console.log('World %d: 100 towers cleared, %d free retries', seed, retries);
    }
  } finally { Math.random = original; }
  // Preview navigation and its checkpoint/finish writes must be isolated from the real save.
  for (const n of [1,2,3,4,5,6]) {
    global.location = {protocol:'file:',hostname:'',search:'?biome='+n};
    const pg = require('./_env')(ctx), originalSave = JSON.stringify({v:5,worldSeed:71,tower:44,cp:2});
    pg.store.set('teft_save', originalSave);
    await pg.boot(); const pd = pg.dbg(); assert.equal(pd.tower.tp.N,n);
    pd.finishTower(); assert.equal(pg.store.get('teft_save'),originalSave);
  }
  delete global.location;
  console.log('test_biomes ok');
})().catch(error => { console.error(error); process.exitCode = 1; });
