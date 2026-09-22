// node tools/smoke.js [--dist] — полный поток экранов на заглушке SDK и на фальшивом YaGames; падает при любой ошибке.
// --dist прогоняет собранный dist/index.html вместо src/*.js.
const assert = require('assert');
const { fakeYaGames } = require('./test_sdk');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
const dist = process.argv.includes('--dist');
const btn = (d, id) => d.buttons.find(b => b.id === id);
const steps = (g, n, tapEvery = 0) => { for (let i = 0; i < n; i++) { if (tapEvery && i % tapEvery === 0) g.tap(Math.random() * 480); g.step(); } };

async function runFlow(opts) {
  const g = require('./_env')(ctx, Object.assign({ dist }, opts)); const d = g.dbg();
  g.step(); // кадр до загрузки — экран «Загрузка…» не падает
  await g.boot();
  assert.strictEqual(d.state, 'title');
  assert.deepStrictEqual(d.YG.log, ['ready'], 'ready ровно один раз, когда виден титул');
  g.tap(240); assert.strictEqual(d.state, 'play'); assert.strictEqual(d.YG.log.at(-1), 'start');
  steps(g, 3000, 25);
  if (d.state === 'play') d.die();
  assert.strictEqual(d.state, 'dead'); assert.strictEqual(d.YG.log.at(-1), 'stop');
  steps(g, 60);
  // «Продолжить» за рекламу: ввод во время рекламы заблокирован
  const cont = btn(d, 'continue'); assert.ok(cont, 'кнопка Продолжить');
  g.tap(cont.x, cont.y); assert.ok(d.adBusy, 'во время рекламы ввод заблокирован'); g.tap(240);
  await g.flush(); g.step();
  assert.strictEqual(d.state, 'play'); assert.ok(d.ball.mass >= 3); assert.ok(d.run.usedContinue); assert.ok(d.run.invuln > 0);
  assert.strictEqual(d.YG.log.at(-1), 'start');
  steps(g, 200, 30);
  if (d.state === 'play') d.die();
  steps(g, 60);
  assert.ok(!btn(d, 'continue'), 'второго Продолжить нет');
  // «Монеты ×2»
  d.setRunCoins(20); g.step();
  const dbl = btn(d, 'double'); assert.ok(dbl, 'кнопка ×2');
  const total = d.save.coins;
  g.tap(dbl.x, dbl.y); await g.flush(); g.step();
  assert.strictEqual(d.run.runCoins, 40); assert.strictEqual(d.save.coins, total + 20); assert.ok(!btn(d, 'double'));
  assert.strictEqual(d.state, 'dead', 'после ×2 остаёмся на результатах');
  // «Ещё раз»: первый рестарт сессии без рекламы
  const inters = () => d.YG.log.filter(x => x === 'inter').length;
  const n0 = inters();
  let again = btn(d, 'again'); g.tap(again.x, again.y); await g.flush(); g.step();
  assert.strictEqual(d.state, 'play'); assert.strictEqual(inters(), n0, 'первый рестарт без рекламы');
  assert.deepStrictEqual([d.run.usedContinue, d.run.usedDouble, d.run.runCoins], [false, false, 0], 'флаги забега сброшены');
  // второй рестарт при истёкшем интервале — реклама показана
  d.die(); steps(g, 60); d.forceAdReady();
  again = btn(d, 'again'); g.tap(again.x, again.y);
  assert.ok(d.adBusy); g.tap(240);
  await g.flush(); g.step();
  assert.strictEqual(inters(), n0 + 1); assert.strictEqual(d.state, 'play'); assert.strictEqual(d.YG.log.at(-1), 'start');
  // третий рестарт сразу после — интервал не истёк, рекламы нет
  d.die(); steps(g, 60); again = btn(d, 'again'); g.tap(again.x, again.y); await g.flush(); g.step();
  assert.strictEqual(inters(), n0 + 1, 'интервал 180 с соблюдён');
  // пауза / резюм во время забега
  steps(g, 30);
  g.fire('blur'); assert.ok(d.paused); assert.strictEqual(d.YG.log.at(-1), 'stop'); assert.ok(d.audioMuted);
  const y0 = d.ball.y; steps(g, 3); assert.strictEqual(d.ball.y, y0, 'в паузе мир стоит');
  g.tap(240); assert.ok(d.paused, 'тап паузу не снимает');
  g.fire('focus'); assert.ok(!d.paused); assert.ok(d.awaitTap); assert.ok(!d.audioMuted);
  steps(g, 3); assert.strictEqual(d.ball.y, y0, 'до тапа мир стоит');
  const jumps = d.ball.jumps; g.tap(240);
  assert.ok(!d.awaitTap); assert.strictEqual(d.YG.log.at(-1), 'start'); assert.strictEqual(d.ball.jumps, jumps, 'тап после паузы — не прыжок');
  steps(g, 30, 10); assert.notStrictEqual(d.ball.y, y0);
  // пауза на экране результатов не трогает геймплей-API
  d.die(); const len = d.YG.log.length; g.fire('blur'); g.fire('focus'); assert.strictEqual(d.YG.log.length, len);
  // клавиатура: пробел на результатах = «Ещё раз», стрелка — прыжок в сторону
  steps(g, 60); g.key('Space'); await g.flush(); assert.strictEqual(d.state, 'play');
  g.key('ArrowLeft'); assert.ok(d.ball.vx < 0);
  // start/stop строго чередуются, начиная со start
  const ss = d.YG.log.filter(x => x === 'start' || x === 'stop');
  assert.strictEqual(ss[0], 'start');
  for (let i = 1; i < ss.length; i++) assert.notStrictEqual(ss[i], ss[i - 1], 'start/stop чередуются: ' + ss.join(','));
  return d;
}
(async () => {
  const d1 = await runFlow({});
  assert.strictEqual(d1.lang, 'ru');
  const log = []; const d2 = await runFlow({ YaGames: fakeYaGames(log) });
  assert.strictEqual(d2.lang, 'en');
  for (const k of ['ready', 'start', 'stop', 'inter', 'reward', 'setData', 'on:game_api_pause', 'on:game_api_resume']) assert.ok(log.includes(k), 'реальный API вызван: ' + k);
  console.log('smoke ok' + (dist ? ' (dist)' : ''));
})().catch(e => { console.error(e); process.exit(1); });
