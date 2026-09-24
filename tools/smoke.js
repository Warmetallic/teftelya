// node tools/smoke.js [--dist] — полный поток: титул → башня 1 до крыши по пути генератора → финиш → ×2 → башня 2; смерть, продолжить, заново; пауза; клавиатура.
// На заглушке SDK и на фальшивом YaGames; --dist прогоняет собранный dist/index.html.
const assert = require('assert');
const { fakeYaGames } = require('./test_sdk');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
const dist = process.argv.includes('--dist');
const btn = (d, id) => d.buttons.find(b => b.id === id);
const steps = (g, n) => { for (let i = 0; i < n; i++) g.step(); };
// поднимается по ближайшей платформе следующего ряда; god-режим: урон и падение не мешают проверить путь генератора
function climb(g, d, maxFrames = 20000) {
  d.setGod(true);
  for (let i = 0; i < maxFrames && d.state === 'play'; i++) {
    const p = d.platforms.find(q => q.id === d.ball.onPlatform);
    if (p && !p.roof) { const next = d.platforms.filter(q => q.row === p.row + 1).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0]; d.jumpTo(next.x, next.y); }
    g.step();
  }
  d.setGod(false);
}
async function runFlow(opts) {
  const g = require('./_env')(ctx, Object.assign({ dist }, opts)); const d = g.dbg();
  g.step(); // кадр до загрузки — экран «Загрузка…» не падает
  await g.boot();
  assert.strictEqual(d.state, 'title'); assert.deepStrictEqual(d.YG.log, ['ready'], 'ready ровно один раз, когда виден титул');
  g.tap(240, 100); assert.strictEqual(d.state, 'title', 'тап мимо кнопки не стартует');
  const play = btn(d, 'play'); g.tap(play.x, play.y); await g.flush(); assert.strictEqual(d.state, 'play'); assert.strictEqual(d.YG.log.at(-1), 'start');
  const c0 = d.ball.charges; g.tap(300, 300); assert.strictEqual(d.ball.charges, c0 - 1, 'тап в игре — прыжок');
  climb(g, d); assert.strictEqual(d.state, 'finish', 'дошли до крыши башни 1'); assert.strictEqual(d.YG.log.at(-1), 'stop');
  assert.ok(d.run.rating && 'SABCD'.includes(d.run.rating.letter)); assert.strictEqual(d.save.tower, 2); assert.ok(d.save.log[1]);
  assert.strictEqual(JSON.parse(g.store.get('teft_save')).tower, 2, 'прогресс сохранён');
  steps(g, 60);
  // «Монеты ×2» за рекламу: ввод во время рекламы заблокирован, вторая реклама не запускается
  const dbl = btn(d, 'double'); assert.ok(dbl, 'кнопка ×2');
  g.tap(dbl.x, dbl.y); assert.ok(d.adBusy, 'во время рекламы ввод заблокирован'); g.fire('blur'); assert.ok(!d.paused, 'пауза во время рекламы игнорируется');
  const rewardsBefore = d.YG.log.filter(x => x === 'reward').length; g.tap(dbl.x, dbl.y);
  await g.flush(); g.step(); assert.strictEqual(d.YG.log.filter(x => x === 'reward').length, rewardsBefore, 'второй тап во время рекламы не запускает вторую');
  assert.ok(d.run.usedDouble);
  // следующая башня → башня 2, межстраничная по интервалу
  d.forceAdReady(); const next = btn(d, 'next'); g.tap(next.x, next.y); await g.flush(); g.step();
  assert.strictEqual(d.state, 'play'); assert.strictEqual(d.tower.tp.N, 2); assert.ok(d.YG.log.includes('inter'), 'межстраничная перед следующей башней'); assert.strictEqual(d.YG.log.at(-1), 'start');
  // смерть от лопастей → экран смерти → продолжить за rewarded → на последней платформе
  d.die('blades'); steps(g, 60); assert.strictEqual(d.state, 'dead');
  const cont = btn(d, 'continue'); assert.ok(cont); g.tap(cont.x, cont.y); await g.flush(); g.step();
  assert.strictEqual(d.state, 'play'); assert.ok(d.ball.alive); assert.strictEqual(d.YG.log.at(-1), 'start');
  // вторая смерть: «Продолжить» больше нет; «Заново» строит башню с нуля
  d.die('fall'); steps(g, 60); assert.ok(!btn(d, 'continue')); const rs = btn(d, 'restart'); g.tap(rs.x, rs.y); await g.flush(); g.step();
  assert.strictEqual(d.state, 'play'); assert.strictEqual(d.run.deaths, 0); assert.strictEqual(d.ball.onPlatform, 0);
  // пауза по скрытию вкладки: возврат по тапу без прыжка; клавиатура прыгает
  const ch = d.ball.charges; g.hide(); assert.ok(d.paused); g.show(); assert.ok(d.awaitTap); g.tap(240, 300); assert.ok(!d.awaitTap); assert.strictEqual(d.ball.charges, ch, 'тап после паузы — не прыжок');
  g.key('ArrowLeft'); assert.strictEqual(d.ball.charges, ch - 1);
  return d;
}
(async () => {
  await runFlow({});
  const log = []; const d2 = await runFlow({ YaGames: fakeYaGames(log), lang: 'en-US' });
  assert.strictEqual(d2.lang, 'en');
  for (const k of ['ready', 'start', 'stop', 'inter', 'reward', 'setData']) assert.ok(log.includes(k), 'реальный API вызван: ' + k);
  console.log('smoke ok' + (dist ? ' (dist)' : ''));
})().catch(e => { console.error(e); process.exit(1); });
