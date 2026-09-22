// node tools/test_game.js — правила забега без рендера: прыжок, еда, мусор, смерть, продолжить, ×2, неуязвимость
const assert = require('assert');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
const item = (d, kind, trash, x, y) => ({ kind, trash, def: trash ? d.TRASH[kind] : d.FOOD[kind], x, y, r: (trash ? d.TRASH : d.FOOD)[kind].r, vx: 0, seed: 0, dead: false });
(async () => {
  const g = require('./_env')(ctx); const d = g.dbg(); await d.YG.init(); await d.loadSave();
  const ball = d.ball;
  // прыжок тратит заряд и даёт скорость вверх; сила не зависит от массы
  d.reset(); d.state = 'play';
  assert.strictEqual(ball.mass, 1); assert.strictEqual(ball.jumps, 4);
  d.jump(1); assert.strictEqual(ball.jumps, 3); assert.strictEqual(ball.vy, -690); assert.ok(ball.vx > 0);
  ball.mass = 9; ball.vy = 0; d.jump(-1); assert.strictEqual(ball.vy, -690); assert.strictEqual(ball.jumps, 2);
  // без зарядов прыжка нет; регенерация +1 за 1.6 с
  d.reset(); d.state = 'play'; ball.jumps = 0; ball.vy = 0;
  d.jump(1); assert.strictEqual(ball.vy, 0);
  for (let i = 0; i < 110; i++) d.update(0.016);
  assert.ok(ball.jumps >= 1, 'заряд восстановился'); assert.strictEqual(d.state, 'play', 'на тарелке не умирает');
  // еда: масса, монеты, заряды; множитель монет от массы
  d.reset(); d.state = 'play';
  d.items.push(item(d, 'meat', false, ball.x, ball.y)); d.update(0.016);
  assert.strictEqual(ball.mass, 3); assert.strictEqual(d.run.runCoins, 5); assert.strictEqual(ball.jumps, 4);
  ball.mass = 5; d.items.push(item(d, 'ketchup', false, ball.x, ball.y)); d.update(0.016);
  assert.strictEqual(d.run.runCoins, 7, 'кетчуп при ×1.5 = 2 монеты');
  // мусор: волос при массе ≥ 6 безвреден, грязь −2
  ball.mass = 6; d.items.push(item(d, 'hair', true, ball.x, ball.y)); d.update(0.016); assert.strictEqual(ball.mass, 6, 'пф');
  d.items.push(item(d, 'dirt', true, ball.x, ball.y)); d.update(0.016); assert.strictEqual(ball.mass, 4);
  // смерть от массы < 1: монеты в сохранение, стоп геймплея
  d.YG.gameplayStart(); const coins0 = d.save.coins; d.setRunCoins(12); ball.mass = 1;
  d.items.push(item(d, 'dirt', true, ball.x, ball.y)); d.update(0.016);
  assert.strictEqual(d.state, 'dead'); assert.strictEqual(ball.alive, false);
  assert.strictEqual(d.save.coins, coins0 + 12); assert.strictEqual(d.YG.log.at(-1), 'stop');
  // продолжить: тарелка внизу, масса ≥ 3, заряды полные, неуязвимость, мусор рядом убран
  const py = d.camY + 854 - 90;
  d.items.push(item(d, 'hair', true, 240, py - 40)); d.continueRun();
  assert.strictEqual(d.state, 'play'); assert.ok(ball.alive); assert.strictEqual(ball.mass, 3); assert.strictEqual(ball.jumps, 4);
  assert.ok(d.run.invuln > 1.4); assert.ok(d.run.usedContinue);
  assert.ok(!d.items.some(it => it.kind === 'hair' && Math.abs(it.y - ball.y) < 200), 'мусор у точки появления удалён');
  assert.ok(d.plates.some(p => p.y === py), 'добавлена тарелка у нижнего края');
  d.items.push(item(d, 'dirt', true, ball.x, ball.y)); d.update(0.016); assert.strictEqual(ball.mass, 3, 'в неуязвимости мусор не бьёт');
  for (let i = 0; i < 120; i++) d.update(0.016);
  assert.strictEqual(d.run.invuln, 0); assert.ok(ball.mass < 3 || d.state === 'dead', 'после неуязвимости мусор бьёт');
  // «Продолжить» с большой массой сохраняет её
  d.reset(); d.state = 'play'; ball.mass = 8; d.die(); d.continueRun(); assert.strictEqual(ball.mass, 8);
  // ×2
  d.reset(); d.state = 'play'; d.setRunCoins(15); d.die();
  const c1 = d.save.coins; d.doubleCoins();
  assert.strictEqual(d.run.runCoins, 30); assert.strictEqual(d.save.coins, c1 + 15); assert.ok(d.run.usedDouble);
  // рекорд высоты и падение за нижний край
  d.reset(); d.state = 'play'; ball.y = -5000; d.update(0.016); assert.ok(d.run.maxHeight >= 499);
  ball.y = d.camY + 854 + 200; d.update(0.016); assert.strictEqual(d.state, 'dead'); assert.ok(d.save.best >= 499);
  // удар о стену быстрее WALL_HIT отрывает мясо, в неуязвимости — нет
  d.reset(); d.state = 'play'; ball.mass = 5; ball.x = ball.r - 5; ball.vx = -400; d.update(0.016);
  assert.strictEqual(ball.mass, 4, 'удар о стену быстрее WALL_HIT отрывает мясо'); assert.ok(ball.vx > 0, 'отскок');
  d.reset(); d.state = 'play'; ball.mass = 5; d.die(); d.continueRun();
  ball.x = ball.r - 5; ball.vx = -400; d.update(0.016);
  assert.strictEqual(ball.mass, 5, 'в неуязвимости стена мясо не отрывает');
  // монеты через «Продолжить» считаются один раз
  { d.reset(); d.state = 'play'; const c0 = d.save.coins; d.setRunCoins(20); d.die(); d.continueRun();
    d.items.push(item(d, 'meat', false, ball.x, ball.y)); d.update(0.016); d.setRunCoins(30); d.die();
    assert.strictEqual(d.save.coins, c0 + 30, 'смерть → продолжить → смерть: +30, не +50'); }
  { d.reset(); d.state = 'play'; const c0 = d.save.coins; d.setRunCoins(20); d.die(); d.doubleCoins(); d.continueRun();
    d.setRunCoins(50); d.die();
    assert.strictEqual(d.save.coins, c0 + 50, 'смерть → ×2 → продолжить → смерть: +50, не +90'); }
  // reset сбрасывает флаги забега
  d.reset(); assert.deepStrictEqual([d.run.usedContinue, d.run.usedDouble, d.run.runCoins, d.run.invuln], [false, false, 0, 0]);
  console.log('test_game ok');
})().catch(e => { console.error(e); process.exit(1); });
