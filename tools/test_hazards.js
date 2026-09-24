// node tools/test_hazards.js — муха (предупреждение, погоня, укус, отставание, съедание), масло, нож, лопасти, политика влёта
const assert = require('assert');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
(async () => {
  const g = require('./_env')(ctx); const d = g.dbg(); const ball = d.ball; const tp = d.towerParams(1);
  const env = { tp, berserk: false, invuln: 0 };
  const run = (hz, n, dt = 0.016) => { const out = []; for (let i = 0; i < n; i++) out.push(...d.updateHazards(dt, hz, env)); return out; };
  ball.x = 240; ball.y = -500; ball.r = 34; ball.vx = 0; ball.vy = 0;
  // муха: предупреждение FLY_WARN без движения, потом летит к Тефе и кусает
  d.resetFlies(); d.spawnFly(true); assert.strictEqual(d.flies.length, 1); const f = d.flies[0]; assert.ok(f.x < 0 && f.warnT > 0);
  run([], 40); assert.ok(f.x < 0, 'во время предупреждения не влетает'); run([], 5); assert.ok(f.warnT <= 0);
  let ev = []; for (let i = 0; i < 300 && !ev.some(e => e.type === 'hit'); i++) ev.push(...run([], 1));
  assert.ok(ev.some(e => e.type === 'hit' && e.reason === 'fly'), 'укус'); assert.strictEqual(d.flies.length, 0, 'после укуса улетела');
  // муха отстаёт через flyChase(), если не догнала: Тефа далеко и убегает
  d.resetFlies(); d.spawnFly(true); ball.x = 460; ball.y = -3000; ev = [];
  for (let i = 0; i < 600; i++) { ball.y -= 6; ev.push(...run([], 1)); }
  assert.ok(ev.some(e => e.type === 'flyGaveUp'), 'отстала'); assert.strictEqual(d.flies.length, 0);
  assert.strictEqual(d.flyChase(), 6); d.save.up.repel = 20; assert.strictEqual(d.flyChase(), d.FLY_CHASE_MIN, 'репеллент не ниже минимума'); d.save.up.repel = 0;
  // в берсерке муху съедают
  d.resetFlies(); ball.x = 240; ball.y = -500; d.spawnFly(false); env.berserk = true; ev = [];
  for (let i = 0; i < 400 && !ev.some(e => e.type === 'flyEaten'); i++) ev.push(...run([], 1));
  assert.ok(ev.some(e => e.type === 'flyEaten'), 'съедена'); env.berserk = false;
  // политика влёта: лень 3 с — всегда; берсерк — никогда; лимит 3; серия < 6 — никогда; серия ≥ 6 — по вероятности
  d.resetFlies(); assert.strictEqual(d.flyWanted(0.016, 0, 3.1, false), true); assert.strictEqual(d.flyWanted(0.016, 20, 3.1, true), false);
  assert.strictEqual(d.flyWanted(0.016, 0, 0, false), false); assert.strictEqual(d.flyWanted(0.016, 5, 0, false), false);
  const rnd0 = Math.random; Math.random = () => 0; assert.strictEqual(d.flyWanted(0.016, 6, 0, false), true); Math.random = () => 0.999; assert.strictEqual(d.flyWanted(0.016, 6, 0, false), false); Math.random = rnd0;
  d.spawnFly(); d.spawnFly(); d.spawnFly(); assert.strictEqual(d.flyWanted(0.016, 0, 9, false), false, 'не больше FLY_MAX'); d.resetFlies();
  // масло: капля раз в OIL_T, падает вниз, шлёпается на floorY; попадание — hit
  const oil = { id: 1, type: 'oil', x: 240, y: -640, floorY: -500, t: 0, drops: [] };
  ball.x = 240; ball.y = -560; run([oil], Math.ceil(d.OIL_T / 0.016) + 1); assert.ok(oil.drops.length >= 1, 'капля появилась');
  ev = run([oil], 60); assert.ok(ev.some(e => e.type === 'hit' && e.reason === 'oil'), 'капля попала');
  ball.x = 100; oil.drops = []; oil.t = d.OIL_T; ev = run([oil], 200); assert.ok(!ev.some(e => e.type === 'hit')); assert.ok(oil.drops.every(dr => dr.y <= -500), 'капли не ниже пола');
  // нож: фазы по кругу; бьёт только в ударе и только под собой
  assert.strictEqual(d.knifePhase(0).phase, 'rest'); assert.strictEqual(d.knifePhase(1.3).phase, 'wind'); assert.strictEqual(d.knifePhase(1.95).phase, 'strike');
  const knife = { id: 2, type: 'knife', x: 240, y: -500, t: 0, phase: 'rest', by: -650 };
  ball.x = 240; ball.y = -560; ev = run([knife], 70); assert.ok(!ev.some(e => e.type === 'hit'), 'в паузе не бьёт');
  ev = run([knife], 70); assert.ok(ev.some(e => e.type === 'hit' && e.reason === 'knife'), 'удар'); assert.ok(d.knifeY(knife) <= -500 - 20 + 1);
  ball.x = 120; knife.t = 0; ev = run([knife], 140); assert.ok(!ev.some(e => e.type === 'hit'), 'мимо по x');
  // лопасти: смерть; в берсерке — разлетаются
  const bl = { id: 3, type: 'blades', x: 240, y: -560, ang: 0, gone: false };
  ball.x = 240; ball.y = -560; ev = run([bl], 1); assert.ok(ev.some(e => e.type === 'kill' && e.reason === 'blades'));
  env.berserk = true; ev = run([bl], 1); assert.ok(ev.some(e => e.type === 'smash') && bl.gone, 'в берсерке снесены'); env.berserk = false;
  ball.x = 240; ball.y = -700; const bl2 = { id: 4, type: 'blades', x: 240, y: -560, ang: 0, gone: false }; ev = run([bl2], 5); assert.ok(!ev.length, 'вне радиуса не задевают'); assert.ok(bl2.ang > 0, 'крутятся');
  console.log('test_hazards ok');
})().catch(e => { console.error(e); process.exit(1); });
