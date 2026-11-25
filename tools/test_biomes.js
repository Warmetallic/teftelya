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
  // Кусок появляется у крысы только при настоящем уроне, в том числе при последнем укусе.
  for (const dir of [-1, 1]) {
    d.startTower(4); d.state = 'play';
    const rat = d.hazards.find(h => h.type === 'rat');
    const shelf = d.platforms.find(p => p.id === rat.host);
    rat.x = shelf.x; rat.dir = -dir; rat.seen = true; rat.phase = 'active';
    b.mass = dir > 0 ? 1 : 4; b.r = d.radiusFor(b.mass);
    b.x = shelf.x - dir * 12; d.landOn(shelf); d.setCamY(shelf.y - 450);
    const mass = b.mass;
    d.run.invuln = 1; d.update(1/60);
    assert.equal(b.mass, mass); assert.equal(rat.phase, 'active');
    d.run.invuln = 0; d.update(1/60);
    assert.equal(b.mass, mass - 1); assert.equal(rat.phase, 'flee'); assert.equal(rat.dir, dir);
    assert.equal(d.state, mass === 1 ? 'dead' : 'play');
    // Повторный контакт после укуса, даже без защиты, больше не отнимает жизнь.
    if (b.alive) { b.x = rat.x; d.landOn(shelf); d.run.invuln = 0; }
    let leapt = false;
    for (let i = 0; i < 160 && !rat.gone; i++) {
      const x = rat.x; d.update(1/60);
      assert.ok((rat.x - x) * dir > 0); assert.equal(b.mass, mass - 1);
      if (rat.y < rat.shelfY) leapt = true;
    }
    assert.ok(leapt && rat.gone); assert.ok(dir > 0 ? rat.x > 480 : rat.x < 0);
    const end = rat.x;
    for (let i = 0; i < 180; i++) d.update(1/60);
    assert.equal(rat.x, end); assert.ok(rat.gone);
  }
  // Первое знакомство: на стартовой тарелке можно переждать любой размах.
  assert.ok(!d.buildTower(5,42).hazards.some(h => h.type === 'pendulum'));
  assert.ok(!d.buildTower(6,42).hazards.some(h => h.type === 'mousetrap'));
  for (let seed = 0; seed < 64; seed++) {
    const level = d.buildTower(7, seed);
    const [trap] = level.hazards.filter(h => h.y >= -300);
    assert.deepEqual(level.hazards.filter(h => h.y >= -300).map(h => h.type), ['mousetrap']);
    const shelf = level.platforms.find(p => p.id === trap.host);
    assert.equal(shelf.type, 'shelf'); assert.equal(shelf.row, 1);
    assert.ok(level.items.some(it => it.y === shelf.y - 55 && Math.abs(it.x - shelf.x) === 30));
    for (const type of ['pendulum','icicle']) assert.ok(level.hazards.some(h => h.type === type));
  }
  d.save.worldSeed = 42;
  for (const action of ['wait','jump','berserk','invulnerable']) {
    d.startTower(7); d.state = 'play';
    const h = d.hazards.find(h => h.type === 'mousetrap'), mass = b.mass;
    assert.ok(d.jumpTo(h.x, h.y));
    for (let i = 0; i < 60 && b.onPlatform !== h.host; i++) {
      assert.equal(h.phase, 'idle'); d.update(1/60);
    }
    assert.equal(b.onPlatform, h.host); assert.equal(h.phase,'warn');
    for (let i = 0; i < 29; i++) d.update(1/60);
    assert.equal(b.mass, mass); assert.equal(h.phase,'warn');
    if (action === 'jump') assert.ok(d.jumpTo(h.x, h.y - 120));
    if (action === 'berserk') { d.powerAdd(d.POWER_FULL); assert.ok(d.tryActivatePower()); }
    if (action === 'invulnerable') d.run.invuln = 1;
    d.update(1/60);
    if (action === 'berserk') assert.ok(h.gone);
    else {
      assert.equal(h.phase,'snap');
      assert.equal(b.mass, action === 'wait' ? mass - 1 : mass);
      for (let i = 0; i < 10; i++) d.update(1/60);
      assert.equal(h.phase, 'spent');
      b.x = h.x; d.landOn(d.platforms.find(p => p.id === h.host)); d.run.invuln = 0;
      const after = b.mass;
      for (let i = 0; i < 36; i++) d.update(1/60);
      assert.equal(b.mass, after);
    }
  }
  d.save.worldSeed = 0;
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
  for (const [n,type] of [[8,'burner'],[9,'tape'],[10,'mallet']]) {
    for (let seed=0; seed<64; seed++) {
      const tower = d.buildTower(n,seed), near = tower.hazards.filter(h => h.y >= -300);
      assert.deepEqual(near.map(h=>h.type),[type],'отдельная встреча в башне '+n+' / '+seed);
      assert.ok(tower.items.some(i => Math.abs(i.x-near[0].x) < 40 && Math.abs(i.y-near[0].y)<80));
      assert.ok(!d.buildTower(n-1,seed).hazards.some(h=>h.type===type));
    }
    d.startTower(n); d.state='play';
    const h=d.hazards.find(h=>h.type===type), env={camY:d.camY,tp:d.tower.tp,invuln:0};
    const tick=()=>d.updateHazards(1/60,[h],env);
    b.onPlatform=null;
    for(let i=0;i<100;i++) assert.deepEqual(tick(),[]);
    assert.equal(h.phase,'idle');
    d.landOn(d.platforms[0]); tick();
    if (type==='tape') {
      assert.ok(d.jumpTo(h.x,h.y));
      for(let i=0;i<55 && !b.tape;i++) d.update(1/60);
      assert.equal(b.tape,h); const x=b.x,y=b.y;
      for(let i=0;i<70;i++) d.update(1/60);
      assert.deepEqual([b.x,b.y],[x,y]);
      b.charges=0; assert.ok(d.jumpTo(h.x+70,h.y-100));
      assert.ok(b.vy<0 && b.vx>0 && h.gone); assert.equal(b.tape,null);
    } else {
      assert.equal(h.phase,'warn');
      for(let i=0;i<50;i++) assert.deepEqual(tick(),[]);
      assert.equal(h.phase,'warn');
      b.x=h.x; b.y=h.y-25; let hits=[];
      while(h.phase!=='cool') hits.push(...tick());
      assert.deepEqual(hits.map(e=>e.reason),[type]);
      for(let i=0;i<150;i++) { b.onPlatform=null; assert.deepEqual(tick(),[]); }
      assert.equal(h.phase,'idle');
      d.landOn(d.platforms[0]); b.x=h.x; env.berserk=true;
      for(let i=0;i<125 && !h.gone;i++) hits=tick();
      assert.equal(hits[0]?.type,'smash'); assert.ok(h.gone);
    }
  }
  for (const [n,type] of [[11,'roller'],[12,'hood'],[13,'fork'],[14,'splash'],[15,'grater']]) {
    for (let seed=0;seed<16;seed++) {
      const level=d.buildTower(n,seed);
      assert.deepEqual(level.hazards.filter(h=>h.y>=-300).map(h=>h.type),[type]);
      assert.ok(!d.buildTower(n-1,seed).hazards.some(h=>h.type===type));
    }
    d.startTower(n); d.state='play';
    const h=d.hazards.find(h=>h.type===type), env={camY:d.camY,tp:d.tower.tp,invuln:0};
    const tick=()=>d.updateHazards(1/60,[h],env);
    b.onPlatform=null; tick(); assert.equal(h.phase,'idle');
    d.landOn(d.platforms[0]); tick();
    if (type==='roller') {
      let hits=0; assert.equal(h.phase,'warn');
      for(let i=0;i<245;i++) hits+=tick().filter(e=>e.reason==='roller').length;
      assert.ok(h.gone); assert.equal(hits,1);
    } else if(type==='hood') {
      b.x=h.x+h.dir*64; b.y=h.y; b.vx=0; tick(); assert.equal(b.vx,0);
      b.onPlatform=null; tick(); assert.ok(h.dir*b.vx>0);
      b.vx=0; b.y=h.y+80; tick(); assert.equal(b.vx,0);
    } else if(type==='fork') {
      b.x=h.x; b.y=h.y+16; assert.deepEqual(tick(),[]);
      b.y=h.y-60; env.invuln=1; assert.deepEqual(tick(),[]);
      env.invuln=0; assert.equal(tick()[0]?.reason,'fork');
    } else if(type==='splash') {
      assert.equal(h.phase,'warn');
      while(h.phase==='warn') assert.deepEqual(tick(),[]);
      h.time=.50;
      const a=d.splashPosition(h,0), c=d.splashPosition(h,2);
      assert.ok((a.x-c.x)*h.dir>0 && a.y<c.y);
      b.x=a.x; b.y=a.y; assert.equal(tick()[0]?.reason,'splash'); assert.deepEqual(tick(),[]);
    } else {
      b.onPlatform=null;
      for(const [offset,expectsBounce] of [[0,false],[-140,true]]) {
        b.x=h.dir>0 ? b.r-1 : 480-b.r+1; b.y=h.y+offset;
        b.vx=-h.dir*180; b.vy=0; d.update(1/60);
        assert.equal(b.vx*h.dir>0,expectsBounce);
      }
    }
  }
  let pantries=0;
  for(let seed=0;seed<24;seed++) {
    const pair=d.buildTower(16,seed).hazards.filter(h=>h.type==='pendulum');
    assert.equal(pair.length,2); assert.equal(pair[0].y,pair[1].y); assert.equal(pair[0].dir,-pair[1].dir);
    const richTower=d.buildTower(18,seed), safe=richTower.platforms.find(p=>p.room==='safe');
    const rich=richTower.platforms.find(p=>p.room==='rich');
    assert.ok(richTower.path.includes(safe.id) && !richTower.path.includes(rich.id));
    assert.equal(richTower.hazards.find(h=>h.type==='fork')?.host,rich.id);
    assert.ok(richTower.items.filter(it=>it.kind==='meat' && Math.abs(it.y-rich.y)<100 && Math.abs(it.x-rich.x)<85).length>=4);
    for(const n of [21,25]) {
      const level=d.buildTower(n,seed), pantry=level.platforms.find(p=>p.room==='pantry');
      if(n===21) {
        assert.equal(level.tp.theme,'bakery'); assert.ok(level.platforms.some(p=>p.row===1 && p.type==='dough'));
        assert.ok(pantry);
      } else if(pantry) pantries++;
      if(pantry) {
        assert.ok(level.items.filter(it=>Math.abs(it.x-pantry.x)<100 && Math.abs(it.y-pantry.y)<100).length>=7);
        assert.ok(!level.hazards.some(h=>h.y>=pantry.y-230 && h.y<=pantry.y+160));
      }
    }
  }
  assert.ok(pantries>0 && pantries<24);
  d.startTower(21); d.state='play';
  {
    const dough=d.platforms.find(p=>p.row===1), h=d.hazards.find(h=>h.type==='flour');
    d.landOn(dough); b.x=dough.x;
    for(let i=0;i<16;i++) assert.ok(!d.updatePlatforms(1/60,d.platforms,d.tower.tp).some(e=>e.type==='launch'));
    d.update(1/60); assert.ok(b.onPlatform===null && b.vy<0 && b.charges===d.chargesMax());
    d.landOn(dough); b.x=h.x; h.phase='idle';
    const tick=()=>d.updateHazards(1/60,[h],{tp:d.tower.tp,camY:h.y-150,invuln:0});
    assert.deepEqual(tick(),[]); assert.equal(h.phase,'warn');
    let hits=0;
    for(let i=0;i<135;i++) hits+=tick().filter(e=>e.reason==='flour').length;
    assert.equal(hits,1); assert.equal(h.phase,'cool');
  }
  assert.deepEqual([21,24,27,29,32,33].map(n=>d.themeFor(n).id),
    ['bakery','tea','bakery','smokehouse','tea','bakery']);
  for (let seed=0;seed<12;seed++) {
    for (const n of [2,3,4,5,24,29]) {
      const t=d.buildTower(n,seed), p=t.platforms.find(p=>p.lesson);
      assert.ok(p && p.row===1 && t.path[1]===p.id);
      const trap=d.BIOMES[t.tp.theme].trap;
      assert.ok(t.hazards.some(h=>h.type===trap && h.host===p.id));
      if (n===29) for (const damper of t.platforms.filter(p=>p.type==='damper'))
        assert.ok(t.hazards.some(h=>h.type==='smoke' && h.host===damper.id));
    }
  }
  d.startTower(24);
  {
    const p=d.platforms.find(p=>p.lesson), h=d.hazards.find(h=>h.type==='brew');
    const base=p.y; b.x=p.x; d.landOn(p);
    for(let i=0;i<90;i++) d.updatePlatforms(1/60,d.platforms,d.tower.tp);
    assert.equal(p.y,base-72); assert.equal(b.y,p.y-b.r);
    b.onPlatform=null;
    for(let i=0;i<100;i++) d.updatePlatforms(1/60,d.platforms,d.tower.tp);
    assert.equal(p.y,base);
    Object.assign(b,{x:h.x,y:h.y+90,onPlatform:0});
    const tick=()=>d.tickBiomeTrap(h,1/60,{camY:h.y-180,invuln:0,tp:d.tower.tp});
    for(let i=0;i<120;i++) assert.equal(tick(),undefined);
    assert.equal(h.phase,'idle'); b.onPlatform=p.id;
    assert.equal(tick(),undefined); assert.equal(h.phase,'warn'); assert.equal(h.time,1.5);
    for(let i=0;i<85;i++) assert.equal(tick(),undefined);
    assert.ok(Array.from({length:45},tick).some(e=>e?.reason==='brew'));
    b.x+=100; for(let i=0;i<120;i++) assert.equal(tick(),undefined);
  }
  d.startTower(29);
  {
    const p=d.platforms.find(p=>p.lesson), h=d.hazards.find(h=>h.host===p.id && h.type==='smoke');
    const tick=()=>d.tickBiomeTrap(h,1/60,{camY:h.y-180,invuln:0,tp:d.tower.tp});
    Object.assign(b,{x:h.x+30*h.dir,y:h.y,onPlatform:0});
    assert.equal(tick(),undefined); assert.equal(h.phase,'warn');
    for(let i=0;i<66;i++) assert.equal(tick(),undefined);
    assert.ok(Array.from({length:35},tick).some(e=>e?.reason==='smoke'));
    b.onPlatform=p.id; assert.equal(tick(),undefined); assert.equal(h.phase,'vent');
    b.onPlatform=null;
    for(let i=0;i<140;i++) {assert.equal(tick(),undefined); assert.equal(h.phase,'vent');}
    for(let i=0;i<8;i++) tick();
    assert.equal(h.phase,'idle');
  }
  // A new player can stop to read the setup and make the first pair of aimed jumps at base health.
  for (const n of [24,29]) for (const seed of [0,4,9,42]) for (const wait of [0,90,132]) {
    d.save.worldSeed=seed; d.startTower(n); d.state='play';
    const t=d.tower, first=d.platforms.find(p=>p.lesson), next=d.platforms.find(p=>p.id===t.path[2]);
    const advance=frames=>{for(let i=0;i<frames;i++)d.update(1/60);};
    function jumpOnto(p) {
      assert.ok(d.jumpTo(p.x,p.y));
      for(let i=0;i<120 && b.onPlatform!==p.id;i++)advance(1);
      assert.equal(b.onPlatform,p.id);
    }
    advance(wait); jumpOnto(first); advance(n===24?50:8); jumpOnto(next);
    assert.equal(b.mass,d.massMax());
  }
  // Preview navigation and its checkpoint/finish writes must be isolated from the real save.
  for (let n=1;n<=30;n++) {
    global.location = {protocol:'file:',hostname:'',search:'?biome='+n};
    const pg = require('./_env')(ctx), originalSave = JSON.stringify({v:5,worldSeed:71,tower:44,cp:2});
    pg.store.set('teft_save', originalSave);
    await pg.boot(); const pd = pg.dbg(); assert.equal(pd.tower.tp.N,n);
    pd.finishTower(); assert.equal(pg.store.get('teft_save'),originalSave);
  }
  delete global.location;
  console.log('test_biomes ok');
})().catch(error => { console.error(error); process.exitCode = 1; });
