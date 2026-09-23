// node tools/test_floors.js — этажи: разметка, старт с этажа, люк и буфет, пробитие/отскок/вентиляция
const assert = require('assert');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
(async () => {
  const g = require('./_env')(ctx); const d = g.dbg(); await d.YG.init(); await d.loadSave();
  const ball = d.ball;
  // разметка и числа этажей
  for (const [h, f] of [[0, 1], [149.9, 1], [150, 2], [151, 2], [1500, 11]]) assert.strictEqual(d.floorOf(h), f, 'floorOf ' + h);
  for (const [n, m] of [[1, 1], [2, 3], [5, 6], [11, 12], [20, 12]]) assert.strictEqual(d.startMass(n), m, 'startMass ' + n);
  for (const [n, m] of [[1, 4], [5, 8], [12, 15], [20, 15]]) assert.strictEqual(d.hatchMass(n), m, 'hatchMass ' + n);
  assert.strictEqual(d.hatchBonus(1), 10); assert.strictEqual(d.hatchBonus(5), 30);
  assert.strictEqual(d.hatchY(1), -1500); assert.strictEqual(d.floorBaseY(3), -3000);
  for (const [h, z] of [[129, false], [131, true], [149, true], [150, false], [281, true]]) assert.strictEqual(d.inBuffetZone(h), z, 'buffet zone ' + h);
  // старт с этажа 3: тарелка на полу этажа, стартовая масса, камера, счётчики
  d.reset(3); d.state = 'play';
  assert.strictEqual(ball.y, -3000); assert.strictEqual(ball.mass, 4); assert.strictEqual(d.plates[0].y, -2970);
  assert.strictEqual(d.camY, -3000 - 854 + 120); assert.strictEqual(d.run.maxHeight, 300); assert.strictEqual(d.run.floorReached, 3);
  assert.strictEqual(d.hatches.length, 0); assert.strictEqual(d.nextHatchFloor, 3);
  for (let i = 0; i < 30; i++) d.update(0.016);
  assert.strictEqual(d.state, 'play', 'на тарелке этажа не умирает'); assert.strictEqual(d.run.floorReached, 3);
  // люк и буфет появляются, когда спавн проходит потолок этажа; в зоне буфета обычных предметов нет
  d.reset(1); d.state = 'play'; d.update(0.016);
  assert.strictEqual(d.hatches.length, 0, 'до потолка люка нет');
  ball.y = -1400; for (let i = 0; i < 8; i++) d.update(0.016);
  assert.strictEqual(d.hatches.length, 1); assert.strictEqual(d.hatches[0].floor, 1); assert.strictEqual(d.hatches[0].need, 4); assert.strictEqual(d.hatches[0].y, -1500);
  const meat = d.items.find(it => it.buffet && it.kind === 'meat'), pasta = d.items.find(it => it.buffet && it.kind === 'pasta');
  assert.ok(meat && meat.x === 160 && meat.y === -1380, 'мясо буфета'); assert.ok(pasta && pasta.x === 320 && pasta.y === -1440, 'макароны буфета');
  assert.ok(!d.items.some(it => !it.buffet && d.inBuffetZone(-it.y / 10)), 'под люком обычного спавна нет');
  assert.strictEqual(d.nextHatchFloor, 2);
  // следующий люк — для следующего этажа
  ball.y = -2900; for (let i = 0; i < 20; i++) d.update(0.016);
  // люк первого этажа к этому моменту ушёл под экран и удалён pruneHatches — проверяем только второй
  assert.ok(d.hatches.some(h => h.floor === 2 && h.need === 5), 'люк второго этажа создан'); assert.strictEqual(d.nextHatchFloor, 3);
  // стартовый этаж зажат в [1, floor + 1] и сохраняется
  d.save.floor = 2; d.setStartFloor(9); assert.strictEqual(d.save.startFloor, 3); d.setStartFloor(0); assert.strictEqual(d.save.startFloor, 1);
  assert.strictEqual(JSON.parse(g.store.get('teft_save')).startFloor, 1, 'стартовый этаж записан');
  // люки ниже экрана удаляются
  d.reset(1); d.state = 'play'; d.hatches.push({ floor: 0, y: 5000, need: 1, broken: true, vented: false, underT: 0, bounceT: 0 }); d.update(0.016);
  assert.strictEqual(d.hatches.length, 0, 'люк за нижним краем удалён');
  const under = h => { ball.y = h.y + 12 + ball.r + 4; ball.vy = -300; ball.vx = 0; }; // подвести к люку снизу и лететь вверх
  // пробитие: масса ≥ need → люк сломан, бонус, этаж засчитан и сохранён, следующий старт открыт
  d.save.floor = 0; d.save.startFloor = 1; // часть 1 оставила floor = 2 для проверки зажима — сбрасываем прогресс
  d.reset(1); d.state = 'play'; d.spawnHatch(1); ball.mass = 5; under(d.hatches[0]); d.YG.gameplayStart();
  const c0 = d.run.runCoins; d.update(0.016);
  assert.ok(d.hatches[0].broken, 'люк пробит'); assert.strictEqual(d.run.runCoins, c0 + 10, 'бонус 5+5·1');
  assert.deepStrictEqual(d.run.clearedThisRun, [1]); assert.strictEqual(d.run.newUnlock, 2); assert.strictEqual(d.save.floor, 1);
  assert.strictEqual(JSON.parse(g.store.get('teft_save')).floor, 1, 'прогресс сохранён'); assert.ok(ball.vy < 0, 'летит дальше вверх');
  // повторное пробитие того же этажа не двигает save.floor и не открывает ничего нового
  d.reset(1); d.state = 'play'; d.spawnHatch(1); ball.mass = 5; under(d.hatches[0]); d.update(0.016);
  assert.strictEqual(d.save.floor, 1); assert.strictEqual(d.run.newUnlock, 0); assert.deepStrictEqual(d.run.clearedThisRun, [1]);
  // отскок: масса < need → люк цел, тефтеля ниже люка, летит вниз, масса не меняется
  // масса 1: радиус равен radiusFor(1) и не «доезжает» лерпом в этом же кадре — позицию можно сверять точно
  d.reset(1); d.state = 'play'; d.spawnHatch(1); ball.mass = 1; under(d.hatches[0]); d.update(0.016);
  assert.ok(!d.hatches[0].broken); assert.strictEqual(ball.mass, 1); assert.ok(ball.vy > 0, 'отскок вниз');
  assert.ok(Math.abs(ball.y - (d.hatches[0].y + 12 + ball.r)) < 1e-6, 'выставлена под люк'); assert.strictEqual(d.run.runCoins, 0);
  // вентиляция: 8 с под люком без пробития → люк открыт без бонуса и без прогресса; после него проход свободен
  d.reset(1); d.state = 'play'; d.spawnHatch(1); ball.mass = 6; d.save.floor = 0; // масса 6: случайный мусор не убьёт, а без vy < 0 пробития нет
  for (let i = 0; i < 520; i++) { ball.y = d.hatches[0].y + 200; ball.vy = 0; d.update(0.016); }
  assert.ok(d.hatches[0].vented, 'вентиляция'); assert.ok(!d.hatches[0].broken); assert.strictEqual(d.run.runCoins, 0); assert.strictEqual(d.save.floor, 0);
  under(d.hatches[0]); d.update(0.016); assert.ok(ball.vy < 0 && ball.y < d.hatches[0].y + 12 + ball.r, 'через вентиляцию проходит без отскока');
  // вне зоны под люком таймер не копится
  d.reset(1); d.state = 'play'; d.spawnHatch(1); ball.mass = 6;
  for (let i = 0; i < 100; i++) { ball.y = d.hatches[0].y + 600; ball.vy = 0; d.update(0.016); }
  assert.strictEqual(d.hatches[0].underT, 0, 'дальше 300 px таймер стоит');
  // рисование не падает
  d.drawHatch(d.hatches[0]); d.hatches[0].broken = true; d.drawHatch(d.hatches[0]); d.hatches[0].broken = false; d.hatches[0].vented = true; d.drawHatch(d.hatches[0]);
  d.drawWorld(); d.drawHUD();
  console.log('test_floors part1 ok');
  console.log('test_floors ok');
})().catch(e => { console.error(e); process.exit(1); });
