// node tools/smoke.js [--dist] — полный поток: титул → башня 1 до крыши по пути генератора → финиш → ×2 → башня 2; смерть, продолжить, заново; пауза; клавиатура.
// На заглушке SDK и на фальшивом YaGames; --dist прогоняет собранный dist/index.html.
const assert = require('assert');
const { fakeYaGames } = require('./test_sdk');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
const dist = process.argv.includes('--dist');
const bot = require('./bot');
const btn = (d, id) => d.buttons.find(b => b.id === id);
const steps = (g, n) => { for (let i = 0; i < n; i++) g.step(); };
// подъём до крыши по безопасному пути генератора; god-режим: урон и падение не мешают проверить поток экранов
function climb(g, d) { d.setGod(true); bot.climb(g, d); d.setGod(false); }
async function runFlow(opts) {
  const g = require('./_env')(ctx, Object.assign({ dist }, opts)); const d = g.dbg();
  g.step(); // кадр до загрузки — экран «Загрузка…» не падает
  await g.boot();
  assert.strictEqual(d.state, 'title'); assert.deepStrictEqual(d.YG.log, ['ready'], 'ready ровно один раз, когда виден титул');
  g.tap(240, 100); assert.strictEqual(d.state, 'title', 'тап мимо кнопки не стартует');
  const play = btn(d, 'play'); g.tap(play.x, play.y); await g.flush(); assert.strictEqual(d.state, 'play'); assert.strictEqual(d.YG.log.at(-1), 'start');
  const c0 = d.ball.charges; g.tap(300, 300); assert.strictEqual(d.ball.charges, c0 - 1, 'тап в игре — прыжок');
  // тап по Тефе (спека v2.1.1 §3.4): при полной шкале — суперсила без траты заряда, и в воздухе тоже;
  // при неполной шкале, во время берсерка и после исчерпанного лимита — обычный прыжок
  const tapTefa = () => g.tap(d.ball.x, d.ball.y - d.camY);
  d.ball.charges = 3; tapTefa(); assert.ok(!d.isBerserk() && d.ball.charges === 2, 'неполная шкала — тап по Тефе остаётся прыжком');
  d.powerAdd(d.POWER_FULL); assert.strictEqual(d.ball.onPlatform, null, 'Тефа в воздухе');
  { const c1 = d.ball.charges; tapTefa(); assert.ok(d.isBerserk(), 'тап по Тефе при полной шкале — суперсила'); assert.strictEqual(d.ball.charges, c1, 'и не прыжок'); }
  { const c2 = d.ball.charges; tapTefa(); assert.strictEqual(d.ball.charges, c2 - 1, 'во время берсерка тап по Тефе — прыжок'); } d.endBerserk();
  d.ball.charges = 3; d.powerAdd(d.POWER_FULL); tapTefa(); assert.ok(!d.isBerserk() && d.ball.charges === 2, 'лимит исчерпан — тап по Тефе остаётся прыжком');
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
  // межстраничная по интервалу: сразу после рекламы её нет, после forceAdReady есть, следом снова нет
  const inters = () => d.YG.log.filter(x => x === 'inter').length; const n0 = inters();
  d.die('fall'); steps(g, 60); { const b = btn(d, 'restart'); g.tap(b.x, b.y); } await g.flush(); g.step();
  assert.strictEqual(d.state, 'play'); assert.strictEqual(inters(), n0, 'интервал 180 с не истёк после рекламы перед башней 2');
  d.die('fall'); steps(g, 60); d.forceAdReady(); { const b = btn(d, 'restart'); g.tap(b.x, b.y); }
  assert.ok(d.adBusy, 'во время межстраничной ввод заблокирован'); g.tap(240, 300); await g.flush(); g.step();
  assert.strictEqual(inters(), n0 + 1); assert.strictEqual(d.state, 'play'); assert.strictEqual(d.YG.log.at(-1), 'start');
  d.die('fall'); steps(g, 60); { const b = btn(d, 'restart'); g.tap(b.x, b.y); } await g.flush(); g.step();
  assert.strictEqual(inters(), n0 + 1, 'интервал 180 с соблюдён');
  // пауза по скрытию вкладки: возврат по тапу без прыжка; клавиатура прыгает
  const ch = d.ball.charges; d.powerAdd(d.POWER_FULL); g.hide(); assert.ok(d.paused); g.show(); assert.ok(d.awaitTap);
  g.tap(d.ball.x, d.ball.y - d.camY); assert.ok(!d.awaitTap); assert.strictEqual(d.ball.charges, ch, 'тап после паузы — не прыжок');
  assert.ok(!d.isBerserk(), 'и не суперсила, даже по Тефе с полной шкалой');
  g.key('ArrowLeft'); assert.strictEqual(d.ball.charges, ch - 1);
  d.powerAdd(d.POWER_FULL); g.key('KeyE'); assert.ok(d.isBerserk(), 'клавиша E включает суперсилу'); d.endBerserk();
  { // клавиатура в миске (спека v2.2a §6.3): первая клавиша прыжка только отлепляет и тратит заряд, вторая прыгает
    const b = d.ball, bowl = { id: 9300, type: 'bowl', x: b.x, y: b.y + b.r, w: 120, row: 0 }; d.platforms.push(bowl);
    b.onPlatform = null; d.landOn(bowl); b.charges = 3;
    g.key('ArrowUp'); assert.ok(b.onPlatform === 9300 && b.charges === 2, 'клавиша в миске отлепляет, не прыгая');
    g.key('ArrowUp'); assert.ok(b.onPlatform === null && b.charges === 1, 'вторая клавиша прыгает'); d.platforms.pop(); }
  const ss = d.YG.log.filter(x => x === 'start' || x === 'stop'); // GameplayAPI: ни двух start подряд, ни двух stop
  for (let i = 1; i < ss.length; i++) assert.notStrictEqual(ss[i], ss[i - 1], 'start/stop чередуются');
  return d;
}
// башня 1 проходима без god: путь генератора без урона, смертей и случайностей
async function runClimbNoGod() {
  const g = require('./_env')(ctx, { dist }); const d = g.dbg();
  await g.boot();
  const play = btn(d, 'play'); g.tap(play.x, play.y); await g.flush();
  d.hazards.length = 0; d.resetPours(1e9);         // опасности и масло сняты: проверяем путь генератора, а не уклонение
  const rnd0 = Math.random; Math.random = () => 1;  // муха по серии не влетает; тап каждый кадр — лени тоже нет
  bot.climb(g, d, { noHazards: true });
  Math.random = rnd0;
  assert.strictEqual(d.state, 'finish', 'башня 1 проходима без god');
  assert.strictEqual(d.run.deaths, 0);
}
// награды не дали: «Продолжить» не воскрешает
async function runNoReward(opts) {
  const g = require('./_env')(ctx, Object.assign({ dist }, opts)); const d = g.dbg();
  await g.boot();
  const play = btn(d, 'play'); g.tap(play.x, play.y); await g.flush();
  d.die('blades'); steps(g, 60);
  const cont = btn(d, 'continue'); assert.ok(cont); g.tap(cont.x, cont.y); await g.flush(); g.step();
  assert.strictEqual(d.state, 'dead', 'награды нет → остаёмся на экране смерти'); assert.ok(!d.ball.alive);
  return d;
}
(async () => {
  await runFlow({});
  await runClimbNoGod();
  const log = []; const d2 = await runFlow({ YaGames: fakeYaGames(log), lang: 'en-US' });
  assert.strictEqual(d2.lang, 'en');
  for (const k of ['ready', 'start', 'stop', 'inter', 'reward', 'setData']) assert.ok(log.includes(k), 'реальный API вызван: ' + k);
  const log3 = []; const d3 = await runNoReward({ YaGames: fakeYaGames(log3, { noReward: true }) });
  assert.ok(log3.includes('reward'), 'rewarded показан'); assert.strictEqual(d3.run.usedContinue, 0, 'без награды продолжение не потрачено');
  console.log('smoke ok' + (dist ? ' (dist)' : ''));
})().catch(e => { console.error(e); process.exit(1); });
