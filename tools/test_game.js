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
  d.YG.gameplayStart(); const coins0 = d.coins(); d.setRunCoins(12); ball.mass = 1;
  d.items.push(item(d, 'dirt', true, ball.x, ball.y)); d.update(0.016);
  assert.strictEqual(d.state, 'dead'); assert.strictEqual(ball.alive, false);
  assert.strictEqual(d.coins(), coins0 + 12); assert.strictEqual(d.YG.log.at(-1), 'stop');
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
  const c1 = d.coins(); d.doubleCoins();
  assert.strictEqual(d.run.runCoins, 30); assert.strictEqual(d.coins(), c1 + 15); assert.ok(d.run.usedDouble);
  // рекорд высоты и падение за нижний край
  d.reset(); d.state = 'play'; ball.y = -5000; d.update(0.016); assert.ok(d.run.maxHeight >= 499);
  ball.y = d.camY + 854 + 200; d.update(0.016); assert.strictEqual(d.state, 'dead');
  // удар о стену быстрее WALL_HIT отрывает мясо, в неуязвимости — нет
  d.reset(); d.state = 'play'; ball.mass = 5; ball.x = ball.r - 5; ball.vx = -400; d.update(0.016);
  assert.strictEqual(ball.mass, 4, 'удар о стену быстрее WALL_HIT отрывает мясо'); assert.ok(ball.vx > 0, 'отскок');
  d.reset(); d.state = 'play'; ball.mass = 5; d.die(); d.continueRun();
  ball.x = ball.r - 5; ball.vx = -400; d.update(0.016);
  assert.strictEqual(ball.mass, 5, 'в неуязвимости стена мясо не отрывает');
  // монеты через «Продолжить» считаются один раз
  { d.reset(); d.state = 'play'; const c0 = d.coins(); d.setRunCoins(20); d.die(); d.continueRun();
    d.items.push(item(d, 'meat', false, ball.x, ball.y)); d.update(0.016); d.setRunCoins(30); d.die();
    assert.strictEqual(d.coins(), c0 + 30, 'смерть → продолжить → смерть: +30, не +50'); }
  { d.reset(); d.state = 'play'; const c0 = d.coins(); d.setRunCoins(20); d.die(); d.doubleCoins(); d.continueRun();
    d.setRunCoins(50); d.die();
    assert.strictEqual(d.coins(), c0 + 50, 'смерть → ×2 → продолжить → смерть: +50, не +90'); }
  // множитель: ×1.5 / ×2 / ×3 / ×4 с массы 4 / 7 / 10 / 14
  for (const [m, k] of [[1, 1], [3, 1], [4, 1.5], [6, 1.5], [7, 2], [9, 2], [10, 3], [13, 3], [14, 4], [20, 4]]) { ball.mass = m; assert.strictEqual(d.coinMult(), k, 'масса ' + m); }
  // гейты мусора: до 60 м только еда, 60–130 только волосы, 130–220 без мухи
  assert.deepStrictEqual(Object.keys(d.trashPoolFor(10)), []);
  assert.deepStrictEqual(Object.keys(d.trashPoolFor(70)), ['hair']);
  assert.deepStrictEqual(Object.keys(d.trashPoolFor(150)), ['hair', 'dirt']);
  assert.deepStrictEqual(Object.keys(d.trashPoolFor(300)), ['hair', 'dirt', 'fly']);
  { const all = []; for (let i = 0; i < 30; i++) { d.reset(); d.state = 'play'; d.update(0.016); all.push(...d.items); }
    const hOf = it => -it.y / 10; // предмет может лежать на ±2.5 м от строки спавна, поэтому запас 3 м
    assert.ok(all.some(it => it.trash), 'мусор вообще спавнится');
    assert.ok(!all.some(it => it.trash && hOf(it) < 57), 'ниже 60 м мусора нет');
    assert.ok(!all.some(it => it.trash && it.kind !== 'hair' && hOf(it) < 127), 'ниже 130 м только волосы');
    assert.ok(!all.some(it => it.kind === 'fly' && hOf(it) < 217), 'ниже 220 м мухи нет'); }
  // заряды по апгрейду: максимум 6, еда и регенерация наполняют до него, «Продолжить» даёт полный
  d.save.up.jumps = 2; d.reset(); d.state = 'play';
  assert.strictEqual(ball.jumps, 6); d.jump(1); d.jump(1); d.jump(1);
  d.items.push(item(d, 'meat', false, ball.x, ball.y)); d.update(0.016); assert.strictEqual(ball.jumps, 6, 'еда наполняет до 6');
  ball.x = 240; ball.y = 0; ball.vx = 0; ball.vy = 0; // вернуть на тарелку: после трёх прыжков вбок тефтеля улетела бы со сцены и погибла до конца регенерации
  ball.jumps = 5; for (let i = 0; i < 110; i++) d.update(0.016); assert.strictEqual(d.state, 'play'); assert.strictEqual(ball.jumps, 6, 'регенерация до 6');
  d.die(); d.continueRun(); assert.strictEqual(ball.jumps, 6);
  d.save.up.jumps = 0; d.reset(); assert.strictEqual(ball.jumps, 4);
  // магнит: еда в радиусе подтягивается, мусор и еда вне радиуса — нет
  d.save.up.magnet = 1; d.reset(); d.state = 'play';
  const near = item(d, 'ketchup', false, ball.x + ball.r + 50, ball.y), far = item(d, 'ketchup', false, ball.x + ball.r + 200, ball.y), junk = item(d, 'hair', true, ball.x - ball.r - 50, ball.y);
  d.items.push(near, far, junk); const nx = near.x, fx = far.x, jx = junk.x; d.update(0.016);
  assert.ok(near.x < nx - 3 && !near.dead, 'еда в радиусе подтянулась и ещё не съедена');
  assert.strictEqual(far.x, fx, 'еда вне радиуса на месте'); assert.strictEqual(junk.x, jx, 'мусор не притягивается');
  d.save.up.magnet = 0; d.reset(); d.state = 'play';
  const n2 = item(d, 'ketchup', false, ball.x + ball.r + 50, ball.y); d.items.push(n2); const n2x = n2.x; d.update(0.016);
  assert.strictEqual(n2.x, n2x, 'без апгрейда магнита нет');
  // смерть и ×2 пишут в earned
  d.reset(); d.state = 'play'; const e0 = d.save.earned; d.setRunCoins(7); d.die(); assert.strictEqual(d.save.earned, e0 + 7);
  d.doubleCoins(); assert.strictEqual(d.save.earned, e0 + 14);
  // reset сбрасывает флаги забега
  d.reset(); assert.deepStrictEqual([d.run.usedContinue, d.run.usedDouble, d.run.runCoins, d.run.invuln], [false, false, 0, 0]);
  console.log('test_game ok');
})().catch(e => { console.error(e); process.exit(1); });
