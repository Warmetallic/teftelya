// node tools/test_platforms.js — посадка сверху с учётом пройденного пути, стояние и сход с края, поднос везёт, сковородка жжёт, сыр крошится
const assert = require('assert');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
(async () => {
  const g = require('./_env')(ctx); const d = g.dbg(); const ball = d.ball; const tp = d.towerParams(1);
  const plate = { id: 1, type: 'plate', x: 240, y: -120, w: 140 }, pan = { id: 2, type: 'pan', x: 240, y: -240, w: 140 };
  const tray = { id: 3, type: 'tray', x: 200, y: -360, w: 130, x0: 160, x1: 240, dir: 1, speed: 100 };
  const P = [plate, pan, tray];
  const put = (x, y, vy) => { ball.x = x; ball.y = y; ball.vy = vy; ball.vx = 0; ball.r = 34; ball.onPlatform = null; };
  // посадка: низ был над платформой, стал ниже — сели, скорость обнулена
  put(240, -120 - 34 + 10, 300); assert.strictEqual(d.tryLand(P, -150), plate);
  assert.strictEqual(ball.y, plate.y - 34); assert.strictEqual(ball.vy, 0); assert.strictEqual(ball.onPlatform, 1);
  // быстрый пролёт: за кадр низ ушёл далеко ниже верха — всё равно ловим (swept)
  put(240, -120 + 40, 900); assert.strictEqual(d.tryLand(P, -120 - 30), plate, 'высокая скорость не туннелирует');
  // снизу (vy < 0) — проницаема; уже под платформой в прошлом кадре — не ловим
  put(240, -120 + 10, -400); assert.strictEqual(d.tryLand(P, -120 + 44), null);
  put(240, -120 + 40, 300); assert.strictEqual(d.tryLand(P, -120 + 30), null, 'был ниже — пролетает');
  // край: свисание до 35% радиуса стоит, дальше нет
  put(240 + 70 + 10, -120 - 34, 100); assert.strictEqual(d.tryLand(P, -120 - 5), plate, 'свисает на 10 px — стоит');
  put(240 + 70 + 20, -120 - 34, 100); assert.strictEqual(d.tryLand(P, -120 - 5), null, 'свисает на 20 px (> 0.35·34) — мимо');
  // стоит: обновление держит на платформе; ушла за край — падает
  put(240, -120 - 34, 0); d.landOn(plate); d.updatePlatforms(0.016, P, tp); assert.strictEqual(ball.onPlatform, 1);
  ball.x = 240 + 70 + 30; d.updatePlatforms(0.016, P, tp); assert.strictEqual(ball.onPlatform, null, 'сошла с края');
  // поднос везёт Тефу и разворачивается на границах
  tray.x = 200; tray.dir = 1; // поднос ехал в предыдущих секциях (updatePlatforms двигает все подносы) — ставим в исходное
  put(200, -360 - 34, 0); d.landOn(tray); const x0 = ball.x;
  d.updatePlatforms(0.1, P, tp); assert.ok(Math.abs(ball.x - x0 - 10) < 1e-6, 'проехала 10 px вместе с подносом');
  for (let i = 0; i < 4; i++) d.updatePlatforms(0.1, P, tp); assert.strictEqual(tray.x, 240); assert.strictEqual(tray.dir, -1, 'развернулся на границе');
  for (let i = 0; i < 16; i++) d.updatePlatforms(0.1, P, tp); assert.ok(tray.x >= 160 && tray.x <= 240, 'в границах'); assert.strictEqual(ball.onPlatform, 3, 'едет вместе с подносом');
  // сковородка: таймер копится только пока стоишь, через panTime — ожог, таймер сброшен; уходишь — остывает
  assert.strictEqual(d.panTime(tp), 2 - tp.heat); d.save.up.crust = 4; assert.ok(Math.abs(d.panTime(tp) - (3 - tp.heat)) < 1e-9, '+0.25 с за уровень корочки'); d.save.up.crust = 0;
  assert.strictEqual(d.panTime({ heat: 10 }), d.PAN_MIN, 'не ниже PAN_MIN');
  put(240, -240 - 34, 0); d.landOn(pan); let burns = 0;
  for (let i = 0; i < 130; i++) for (const e of d.updatePlatforms(0.016, P, tp)) if (e.type === 'burn') burns++;
  assert.strictEqual(burns, 1, 'один ожог за ~2.08 с'); assert.ok(pan.hotT < 0.2, 'таймер сброшен');
  assert.ok(d.panHeat(pan, tp) >= 0 && d.panHeat(pan, tp) <= 1);
  ball.onPlatform = null; pan.hotT = 1; d.updatePlatforms(0.25, P, tp); assert.ok(pan.hotT < 1, 'остывает без Тефы');
  // сыр: посадка запускает крошение, через 0.5 с он пропадает и Тефа падает, пропавший не ловит, через 3 с отрастает
  const cheese = { id: 4, type: 'cheese', x: 240, y: -480, w: 120 }, P2 = [cheese]; let crumbled = 0;
  put(240, -480 - 34, 0); d.landOn(cheese);
  for (let i = 0; i < 20; i++) for (const e of d.updatePlatforms(0.016, P2, tp)) if (e.type === 'crumble') crumbled++;
  assert.strictEqual(crumbled, 0, 'полсекунды держит'); assert.strictEqual(ball.onPlatform, 4);
  for (let i = 0; i < 20; i++) for (const e of d.updatePlatforms(0.016, P2, tp)) if (e.type === 'crumble') crumbled++;
  assert.strictEqual(crumbled, 1, 'раскрошился один раз'); assert.ok(cheese.gone); assert.strictEqual(ball.onPlatform, null, 'Тефа падает');
  put(240, -480 - 34 + 10, 300); assert.strictEqual(d.tryLand(P2, -520), null, 'пропавший сыр не ловит');
  for (let i = 0; i < 190; i++) d.updatePlatforms(0.016, P2, tp); assert.ok(!cheese.gone, 'через 3 с отрос');
  put(240, -480 - 34 + 10, 300); assert.strictEqual(d.tryLand(P2, -520), cheese, 'и снова держит');
  assert.strictEqual(d.platformById(P, 2), pan); assert.strictEqual(d.platformById(P, null), null); assert.strictEqual(d.platformById(P, 99), null);
  // полка (спека v2.2a §6.1): при посадке Тефа сохраняет SHELF_KEEP скорости полёта и скользит с торможением SHELF_FRICTION;
  // съехала за край дальше LAND_TOL·r — падает; без боковой скорости стоит на месте
  const shelf = { id: 5, type: 'shelf', x: 240, y: -600, w: 120 }, P3 = [shelf];
  const slideOn = (x, vx) => { put(x, -600 - 34, 0); ball.vx = vx; d.landOn(shelf); for (let i = 0; i < 120 && ball.onPlatform !== null; i++) d.updatePlatforms(1 / 60, P3, tp); };
  slideOn(240, 300); { const want = (d.SHELF_KEEP * 300) ** 2 / (2 * d.SHELF_FRICTION); assert.strictEqual(ball.onPlatform, 5, 'остановилась на полке'); assert.ok(Math.abs(ball.x - 240 - want) < 4, 'проскользнула ≈ ' + want.toFixed(1) + ' px: ' + (ball.x - 240).toFixed(1)); }
  slideOn(240, 0); assert.strictEqual(ball.x, 240, 'без боковой скорости не скользит');
  slideOn(240 + 50, 420); assert.strictEqual(ball.onPlatform, null, 'съехала с края — падает');
  // тостер (спека v2.2a §6.2): стоящую Тефу подбрасывает через TOASTER_T; ушла раньше — отсчёт сбрасывается
  const toaster = { id: 6, type: 'toaster', x: 240, y: -720, w: 110 }, P4 = [toaster]; let tev = [];
  put(240, -720 - 34, 0); d.landOn(toaster);
  for (let i = 0; i < Math.round(d.TOASTER_T * 60) - 3; i++) tev.push(...d.updatePlatforms(1 / 60, P4, tp));
  assert.ok(!tev.some(e => e.type === 'launch'), 'до конца отсчёта не подбрасывает');
  for (let i = 0; i < 6; i++) tev.push(...d.updatePlatforms(1 / 60, P4, tp));
  assert.strictEqual(tev.filter(e => e.type === 'launch' && e.p === toaster).length, 1, 'тостер подбросил один раз');
  put(240, -720 - 34, 0); d.landOn(toaster); for (let i = 0; i < 30; i++) d.updatePlatforms(1 / 60, P4, tp);
  ball.onPlatform = null; d.updatePlatforms(1 / 60, P4, tp); assert.strictEqual(toaster.toastT, 0, 'ушла с тостера — отсчёт сброшен');
  // лопатка-батут (§6.4): подбрасывает сразу
  const spatula = { id: 7, type: 'spatula', x: 240, y: -840, w: 110 }; put(240, -840 - 34, 0); d.landOn(spatula);
  assert.ok(d.updatePlatforms(1 / 60, [spatula], tp).some(e => e.type === 'launch' && e.p === spatula), 'лопатка подбрасывает сразу');
  console.log('test_platforms ok');
})().catch(e => { console.error(e); process.exit(1); });
