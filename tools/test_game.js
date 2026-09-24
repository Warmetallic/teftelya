// node tools/test_game.js — забег v2.1: старт, прыжок и заряды, посадка и серия, урон и смерть, продолжить, чекпоинт, финиш и рейтинг, еда, берсерк, мухи, god-режим
const assert = require('assert');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
(async () => {
  const g = require('./_env')(ctx); const d = g.dbg(); await d.YG.init(); await d.loadSave();
  const ball = d.ball;
  const steps = (n, dt = 0.016) => { for (let i = 0; i < n; i++) d.update(dt); };
  const untilOn = (id, n = 120) => { for (let i = 0; i < n; i++) { d.update(0.016); if (ball.onPlatform === id) return true; } return false; };
  const dropOn = (p) => { ball.onPlatform = null; ball.x = p.x; ball.y = p.y - ball.r - 30; ball.vx = 0; ball.vy = 200; d.setCamY(p.y - 500); };
  // старт башни 1: Тефа на стартовой тарелке, масса 3 из 4, 3 заряда
  d.startTower(1); d.state = 'play';
  assert.strictEqual(d.tower.tp.N, 1); assert.strictEqual(ball.mass, 3); assert.strictEqual(d.massMax(), 4); assert.strictEqual(ball.charges, 3);
  assert.strictEqual(ball.onPlatform, 0); assert.strictEqual(ball.y, -ball.r); assert.ok(d.run.foodTotal > 0); assert.strictEqual(d.run.deaths, 0);
  // прыжок тратит заряд; в воздухе ещё два; без зарядов — нет
  assert.ok(d.jumpTo(300, -200)); assert.strictEqual(ball.charges, 2); assert.strictEqual(ball.onPlatform, null); assert.ok(ball.vy < 0);
  assert.ok(d.jumpTo(300, -300)); assert.ok(d.jumpTo(300, -400)); assert.strictEqual(d.jumpTo(300, -500), false, 'заряды кончились');
  // посадка на платформу ряда 1: заряды полные, серия +1 за новую платформу, повтор не растит
  d.startTower(1); d.state = 'play'; const p1 = d.platforms.find(p => p.row === 1);
  for (const it of d.items) it.dead = true; d.setGod(true); // еда и масло по пути не должны влиять на проверку посадки
  d.jumpTo(p1.x, p1.y); assert.ok(untilOn(p1.id), 'села на платформу ряда 1'); assert.strictEqual(ball.charges, 3); assert.strictEqual(d.streak.n, 1);
  d.jumpTo(p1.x, p1.y); assert.ok(untilOn(p1.id)); assert.strictEqual(d.streak.n, 1, 'та же платформа серию не растит'); d.setGod(false);
  // урон: −1 масса, неуязвимость, серия обнулена, отброс; повтор в неуязвимости не проходит; ноль массы — смерть с банком монет
  d.setRunCoins(7); const earned0 = d.save.earned; d.YG.gameplayStart();
  assert.ok(d.damage(1, 'oil', ball.x + 10, ball.y)); assert.strictEqual(ball.mass, 2); assert.ok(d.run.invuln > 0.9); assert.strictEqual(d.streak.n, 0); assert.strictEqual(ball.onPlatform, null);
  assert.strictEqual(d.damage(1, 'oil', ball.x, ball.y), false, 'в неуязвимости урона нет');
  d.run.invuln = 0; d.damage(5, 'knife', ball.x, ball.y); assert.strictEqual(d.state, 'dead'); assert.strictEqual(d.run.reason, 'knife'); assert.strictEqual(d.run.deaths, 1);
  assert.strictEqual(d.save.earned, earned0 + 7, 'монеты забега в сохранении'); assert.strictEqual(d.YG.log.at(-1), 'stop');
  // продолжить: на последней платформе, масса ≥ 2, неуязвимость 1.5 с, usedContinue; падение за экран; с чекпоинта
  d.continueRun(); assert.strictEqual(d.state, 'play'); assert.ok(ball.alive); assert.strictEqual(ball.onPlatform, p1.id); assert.strictEqual(ball.mass, 2); assert.ok(d.run.invuln >= 1.5); assert.strictEqual(d.run.usedContinue, 1);
  ball.onPlatform = null; ball.y = d.camY + 854 + 200; d.update(0.016); assert.strictEqual(d.state, 'dead'); assert.strictEqual(d.run.reason, 'fall'); assert.strictEqual(d.run.deaths, 2);
  d.run.cp = 1; d.restartFromCp(); assert.strictEqual(d.state, 'play'); assert.strictEqual(ball.onPlatform, d.platforms.find(p => p.cp === 1).id); assert.strictEqual(ball.mass, 3); assert.strictEqual(d.run.deaths, 2, 'смерти остаются');
  // чекпоинт: посадка на платформу с cp пишет run.cp и save.cp
  d.startTower(1); d.state = 'play'; const cp1 = d.platforms.find(p => p.cp === 1); dropOn(cp1); steps(20);
  assert.strictEqual(ball.onPlatform, cp1.id); assert.strictEqual(d.run.cp, 1); assert.strictEqual(JSON.parse(g.store.get('teft_save')).cp, 1, 'чекпоинт сохранён');
  // финиш: крыша → finish, рейтинг S, награда, летопись, следующая башня
  d.startTower(1); d.state = 'play'; d.YG.gameplayStart(); const roof = d.platforms.find(p => p.roof);
  d.run.foodEaten = d.run.foodTotal; d.setRunCoins(10); dropOn(roof); steps(20);
  assert.strictEqual(d.state, 'finish'); assert.strictEqual(d.run.rating.letter, 'S'); assert.strictEqual(d.run.bonus, 40); assert.strictEqual(d.run.runCoins, 50);
  assert.strictEqual(d.save.log[1].r, 'S'); assert.strictEqual(d.save.tower, 2); assert.strictEqual(d.save.cp, 0); assert.strictEqual(d.YG.log.at(-1), 'stop');
  assert.strictEqual(JSON.parse(g.store.get('teft_save')).tower, 2);
  d.nextTower(); assert.strictEqual(d.tower.tp.N, 2); assert.strictEqual(d.state, 'play'); assert.strictEqual(d.run.deaths, 0);
  // таблица рейтинга и награда
  const tp = d.towerParams(1), R = r => d.ratingFor(Object.assign({ deaths: 0, time: 10, foodEaten: 10, foodTotal: 10, usedContinue: 0 }, r), tp).letter;
  assert.strictEqual(R({}), 'S'); assert.strictEqual(R({ deaths: 1 }), 'A'); assert.strictEqual(R({ deaths: 1, time: 999 }), 'B'); assert.strictEqual(R({ deaths: 1, time: 999, foodEaten: 1 }), 'C'); assert.strictEqual(R({ usedContinue: 1 }), 'D');
  assert.strictEqual(R({ foodEaten: 8 }), 'S', '80% еды хватает'); assert.strictEqual(R({ foodEaten: 7 }), 'A'); assert.strictEqual(d.bonusCoins(3, 'A'), 90);
  // еда: +1 масса до максимума, монеты с множителем башни и специй, серия +1
  d.startTower(1); d.state = 'play'; const it = d.items[0]; ball.mass = 2; it.x = ball.x; it.y = ball.y; d.update(0.016);
  assert.ok(it.dead); assert.strictEqual(ball.mass, 3); assert.strictEqual(d.run.foodEaten, 1); assert.strictEqual(d.run.runCoins, d.coinsFor(it.kind)); assert.strictEqual(d.streak.n, 1);
  ball.mass = 4; const it2 = d.items[1]; it2.x = ball.x; it2.y = ball.y; d.update(0.016); assert.strictEqual(ball.mass, 4, 'выше максимума не растёт');
  d.save.up.spice = 4; assert.strictEqual(d.coinsFor('meat'), Math.round(3 * 1.2)); d.save.up.spice = 0;
  // берсерк: серия до порога → неуязвимость, монеты ×2, муха съедается
  d.startTower(1); d.state = 'play'; for (let i = 0; i < 12; i++) d.streakAdd(1); assert.ok(d.isBerserk());
  assert.strictEqual(d.damage(1, 'oil', ball.x, ball.y), false, 'в берсерке урона нет'); assert.strictEqual(d.coinsFor('ketchup'), 2);
  d.spawnFly(true); d.flies[0].warnT = 0; d.flies[0].x = ball.x; d.flies[0].y = ball.y; ball.mass = 2; d.update(0.016);
  assert.strictEqual(d.flies.length, 0); assert.strictEqual(ball.mass, 3, 'муха съедена: +1 масса');
  // лень: 3 с на платформе → муха прилетает
  d.startTower(1); d.state = 'play'; d.resetFlies(); steps(200); assert.strictEqual(d.flies.length, 1, 'муха за лень');
  // god-режим для smoke: урон и падение не убивают, Тефа возвращается на последнюю платформу
  d.startTower(1); d.state = 'play'; d.setGod(true); assert.strictEqual(d.damage(9, 'knife', 0, 0), false);
  ball.onPlatform = null; ball.y = d.camY + 2000; d.update(0.016); assert.strictEqual(d.state, 'play'); assert.strictEqual(ball.onPlatform, 0); d.setGod(false);
  console.log('test_game ok');
})().catch(e => { console.error(e); process.exit(1); });
