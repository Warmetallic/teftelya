// node tools/test_hazards.js — муха (предупреждение, погоня, укус, отставание, съедание), масло сверху, нож, лопасти (кусок, не смерть), политика влёта
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
  for (let i = 0; i < 400 && !ev.some(e => e.type === 'eaten'); i++) ev.push(...run([], 1));
  assert.ok(ev.some(e => e.type === 'eaten' && e.what === 'fly'), 'съедена'); env.berserk = false;
  // политика влёта: лень 3 с — всегда; берсерк — никогда; лимит 3; серия < 6 — никогда; серия ≥ 6 — по вероятности
  d.resetFlies(); assert.strictEqual(d.flyWanted(0.016, 0, 3.1, false), true); assert.strictEqual(d.flyWanted(0.016, 20, 3.1, true), false);
  assert.strictEqual(d.flyWanted(0.016, 0, 0, false), false); assert.strictEqual(d.flyWanted(0.016, 5, 0, false), false);
  const rnd0 = Math.random; Math.random = () => 0; assert.strictEqual(d.flyWanted(0.016, 6, 0, false), true); Math.random = () => 0.999; assert.strictEqual(d.flyWanted(0.016, 6, 0, false), false);
  Math.random = () => 0.002; assert.strictEqual(d.flyWanted(0.016, 6, 0, false, false), false); assert.strictEqual(d.flyWanted(0.016, 6, 0, false, true), true, 'полная шкала удваивает шанс мухи'); Math.random = rnd0;
  d.spawnFly(); d.spawnFly(); d.spawnFly(); assert.strictEqual(d.flyWanted(0.016, 0, 9, false), false, 'не больше FLY_MAX'); d.resetFlies();
  // масло сверху: предупреждение POUR_WARN без капель, потом капли от верхнего края экрана; попадание — hit (спека v2.1.1 §7.2)
  const penv = { tp, berserk: false, camY: -1000, platforms: [] };
  const pr = n => { const out = []; for (let i = 0; i < n; i++) out.push(...d.updatePours(0.016, penv)); return out; };
  assert.strictEqual(d.pourInterval(1), 9); assert.strictEqual(d.pourInterval(100), 3, 'не чаще раза в 3 с');
  d.resetPours(100); ball.x = 240; ball.y = -700; ball.r = 34; ball.onPlatform = null; d.startPour(240);
  assert.strictEqual(d.pours.length, 1); pr(30); assert.strictEqual(d.drops.length, 0, 'во время предупреждения не капает');
  pr(10); assert.ok(d.drops.length >= 1, 'капли пошли'); assert.ok(d.drops.every(dr => dr.y <= -1000 + d.LADLE_Y + 6 + 700 * 0.2), 'капли падают от половника у верхнего края экрана');
  ev = []; for (let i = 0; i < 80 && !ev.some(e => e.type === 'hit'); i++) ev.push(...pr(1));
  assert.ok(ev.some(e => e.type === 'hit' && e.reason === 'oil'), 'капля попала');
  // пятно: капля на платформе оставляет пятно, стоящую рядом Тефу оно жжёт, через секунду высыхает
  const plt = { id: 50, type: 'plate', x: 300, y: -600, w: 140 }; penv.platforms = [plt]; d.resetPours(100);
  ball.x = 100; ball.y = -900; d.startPour(300); ev = pr(100);
  assert.ok(!ev.some(e => e.type === 'hit'), 'Тефа в стороне — мимо'); assert.ok(d.splats.length >= 1, 'на платформе пятно');
  ball.x = 300; ball.y = plt.y - 34; ball.onPlatform = 50;
  penv.berserk = true; ev = pr(1); assert.ok(!ev.some(e => e.type === 'hit'), 'в берсерке пятно не жжёт'); penv.berserk = false;
  ev = pr(1); assert.ok(ev.some(e => e.type === 'hit' && e.reason === 'oil'), 'пятно жжёт');
  pr(80); assert.strictEqual(d.splats.length, 0, 'пятно высохло'); ball.onPlatform = null; penv.platforms = [];
  // в берсерке капли съедаются, а не ранят
  penv.berserk = true; d.resetPours(100); ball.x = 240; ball.y = -700; d.startPour(240); ev = [];
  for (let i = 0; i < 120 && !ev.some(e => e.type === 'eaten'); i++) ev.push(...pr(1));
  assert.ok(ev.some(e => e.type === 'eaten' && e.what === 'oil'), 'в берсерке капля съедена'); assert.ok(!ev.some(e => e.type === 'hit')); penv.berserk = false;
  // расписание: налив сам по таймеру; передышка после чекпоинта отодвигает его
  d.resetPours(0.5); pr(40); assert.ok(d.pours.length + d.drops.length >= 1, 'налив по расписанию');
  d.resetPours(1); d.delayPours(4); pr(100); assert.strictEqual(d.pours.length + d.drops.length, 0, 'передышка 4 с');
  // столб целится по ходу Тефы; с башни 6 иногда второй налив в другом столбе на 0.4 с позже
  const rnd1 = Math.random; Math.random = () => 0.5; // rnd(−100, 100) = 0, второй налив не выпадает: 0.5 ≥ 0.3
  ball.x = 200; ball.vx = 300; d.resetPours(0); pr(1); assert.strictEqual(d.pours.length, 1); assert.strictEqual(d.pours[0].x, 200 + 300 * 0.3, 'столб по ходу: x + vx·0.3');
  Math.random = () => 0.1; penv.tp = d.towerParams(6); d.resetPours(0); pr(1); // второй выпадает: влево на 120 + 8 px
  assert.strictEqual(d.pours.length, 2, 'с башни 6 бывает два столба'); assert.ok(Math.abs(d.pours[1].x - d.pours[0].x) >= 100, 'второй в другом столбе');
  assert.ok(Math.abs(d.pours[1].warnT - d.pours[0].warnT - 0.4) < 1e-9, 'и на 0.4 с позже');
  penv.tp = d.towerParams(5); d.resetPours(0); pr(1); assert.strictEqual(d.pours.length, 1, 'до башни 6 столб один');
  Math.random = rnd1; penv.tp = tp; ball.vx = 0; d.resetPours(100);
  // нож: фазы по кругу; бьёт только в ударе и только под собой
  assert.strictEqual(d.knifePhase(0).phase, 'rest'); assert.strictEqual(d.knifePhase(1.3).phase, 'wind'); assert.strictEqual(d.knifePhase(1.95).phase, 'strike');
  const knife = { id: 2, type: 'knife', x: 240, y: -500, t: 0, phase: 'rest', by: -650 };
  ball.x = 240; ball.y = -560; ev = run([knife], 70); assert.ok(!ev.some(e => e.type === 'hit'), 'в паузе не бьёт');
  ev = run([knife], 70); assert.ok(ev.some(e => e.type === 'hit' && e.reason === 'knife'), 'удар'); assert.ok(d.knifeY(knife) <= -500 - 20 + 1);
  ball.x = 120; knife.t = 0; ev = run([knife], 140); assert.ok(!ev.some(e => e.type === 'hit'), 'мимо по x');
  // лопасти: снимают кусок, как любая опасность (спека v2.1.1 §7.1); в берсерке — разлетаются
  const bl = { id: 3, type: 'blades', x: 240, y: -560, ang: 0, gone: false };
  ball.x = 240; ball.y = -560; ev = run([bl], 1); assert.ok(ev.some(e => e.type === 'hit' && e.reason === 'blades'), 'лопасти ранят'); assert.ok(!ev.some(e => e.type === 'kill'), 'и не убивают сразу');
  env.berserk = true; ev = run([bl], 1); assert.ok(ev.some(e => e.type === 'smash') && bl.gone, 'в берсерке снесены'); env.berserk = false;
  ball.x = 240; ball.y = -700; const bl2 = { id: 4, type: 'blades', x: 240, y: -560, ang: 0, gone: false }; ev = run([bl2], 5); assert.ok(!ev.length, 'вне радиуса не задевают'); assert.ok(bl2.ang > 0, 'крутятся');
  console.log('test_hazards ok');
})().catch(e => { console.error(e); process.exit(1); });
