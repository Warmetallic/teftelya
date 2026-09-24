// node tools/test_render.js — рендер и экраны не падают на proxy-контексте; кнопки и тексты результатов
const assert = require('assert');
const noop = () => {};
const texts = [];
const ctx = new Proxy({}, { get: (t, k) => k === 'fillText' ? s => texts.push(String(s)) : /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
(async () => {
  for (const size of [[480, 854], [1280, 720]]) {
    const g = require('./_env')(ctx, { width: size[0], height: size[1] }); const d = g.dbg();
    d.drawTefa(ctx, 100, 100, 40, { sx: 1.1, sy: 0.9, tilt: 0.2, face: 0.5, mouth: 0.5, blink: true, hot: 0.5, berserk: true, alpha: 0.5 }); // Тефа не падает на proxy-контексте
    await d.YG.init(); await d.loadSave(); d.reset();
    d.state = 'title'; d.drawBg(); d.drawWorld(); d.titleScreen(); d.loadingScreen();
    d.state = 'play'; d.ball.mass = 9; d.popText(240, 0, '+5', '#fff', true);
    for (let i = 0; i < 30; i++) d.update(0.016);
    d.drawBg(); d.drawWorld(); d.drawHUD(); d.pausedScreen(true); d.pausedScreen(false);
    d.YG.adStub = { kind: 'rewarded', until: 0 }; d.adStubScreen(); d.YG.adStub = null; d.adStubScreen();
  }
  const g = require('./_env')(ctx); const d = g.dbg(); await d.YG.init(); await d.loadSave();
  // экран результатов: набор кнопок зависит от флагов
  d.reset(); d.state = 'play'; d.setRunCoins(20); d.die();
  d.resultsScreen(false); assert.strictEqual(d.buttons.length, 0, 'до 0.6 с кнопок нет');
  d.resultsScreen(true);
  assert.deepStrictEqual(d.buttons.map(b => b.id), ['continue', 'double', 'again', 'shop']);
  const dbl = d.buttons[1]; assert.strictEqual(d.hitButton(dbl.x, dbl.y).id, 'double');
  assert.strictEqual(d.hitButton(dbl.x + dbl.w, dbl.y), null);
  d.doubleCoins(); texts.length = 0; d.resultsScreen(true); assert.deepStrictEqual(d.buttons.map(b => b.id), ['continue', 'again', 'shop']);
  assert.ok(texts.some(t => t.includes('×2')), 'после удвоения на экране результатов есть отметка ×2');
  d.continueRun(); d.die(); d.resultsScreen(true); assert.deepStrictEqual(d.buttons.map(b => b.id), ['again', 'shop']);
  d.reset(); d.state = 'play'; d.setRunCoins(9); d.die(); d.resultsScreen(true);
  assert.deepStrictEqual(d.buttons.map(b => b.id), ['continue', 'again', 'shop'], '×2 только от 10 монет');
  // локализованные тексты
  texts.length = 0; d.setLang('ru'); d.resultsScreen(true); assert.ok(texts.includes('Шлёп!') && texts.includes('Ещё раз'));
  texts.length = 0; d.setLang('en'); d.resultsScreen(true); assert.ok(texts.includes('Splat!') && texts.includes('Again'));
  texts.length = 0; d.titleScreen(); assert.ok(texts.includes('Meatball'));
  // магазин: кнопки, тексты эффектов, бейдж и покупка
  d.setLang('ru'); d.save.earned = 0; d.save.spent = 0; d.reset(); d.state = 'title'; texts.length = 0; d.titleScreen();
  let sb = d.buttons.find(b => b.id === 'shop'); assert.ok(sb, 'кнопка Магазин на титуле'); assert.ok(!sb.badge, 'без монет точки нет');
  assert.ok(texts.includes('Магазин'));
  d.state = 'play'; d.setRunCoins(20); d.die(); d.resultsScreen(true);
  assert.deepStrictEqual(d.buttons.map(b => b.id), ['continue', 'double', 'again', 'shop'], 'Магазин — четвёртая кнопка');
  d.save.earned = 500; d.resultsScreen(true); sb = d.buttons.find(b => b.id === 'shop'); assert.ok(sb.badge, 'монет хватает — точка');
  texts.length = 0; d.shopScreen();
  assert.deepStrictEqual(d.buttons.map(b => b.id), ['buy:jumps', 'buy:magnet', 'back']);
  assert.ok(texts.includes('Прыжков: 4 → 5') && texts.includes('Радиус: нет → 60') && texts.includes('Купить 60') && texts.includes('Купить 80'), 'эффекты и цены');
  assert.strictEqual(d.upEffectText('jumps'), 'Прыжков: 4 → 5');
  assert.ok(d.buy('magnet')); d.flashCard('magnet'); texts.length = 0; d.shopScreen();
  assert.ok(texts.includes('Радиус: 60 → 90') && texts.includes('Купить 180'));
  assert.ok(d.shopFlash && d.shopFlash.id === 'magnet');
  d.openShop('title'); assert.strictEqual(d.shopFlash, null, 'вход в магазин сбрасывает подсветку'); d.closeShop();
  d.save.spent = 0; d.save.up.jumps = 2; texts.length = 0; d.shopScreen(); assert.ok(texts.includes('Прыжков: 6') && texts.includes('Макс'), 'на максимуме — Макс');
  texts.length = 0; d.setLang('en'); d.shopScreen(); assert.ok(texts.includes('Shop') && texts.includes('Back'));
  texts.length = 0; d.setLang('tr'); d.shopScreen(); assert.ok(texts.includes('Mağaza') && texts.includes('Geri'));
  d.setLang('ru');
  // этажи: селектор на титуле только при пройденных этажах; строки результатов
  d.save.floor = 0; d.save.startFloor = 1; d.reset(); d.state = 'title'; d.titleScreen();
  assert.ok(!d.buttons.some(b => b.id === 'floor-' || b.id === 'floor+'), 'без пройденных этажей селектора нет');
  d.save.floor = 2; d.save.startFloor = 3; texts.length = 0; d.titleScreen();
  const fm = d.buttons.find(b => b.id === 'floor-'), fp = d.buttons.find(b => b.id === 'floor+');
  assert.ok(fm && fp, 'кнопки селектора'); assert.ok(texts.includes('Этаж 3'), 'текущий стартовый этаж');
  assert.ok(fm.y === fp.y && fm.y < d.buttons.find(b => b.id === 'shop').y, 'селектор выше кнопки Магазин');
  d.save.floor = 0; d.save.startFloor = 1; d.reset(1); d.state = 'play'; d.spawnHatch(1); d.ball.mass = 5; d.ball.y = d.hatches[0].y + 12 + d.ball.r + 4; d.ball.vy = -300; d.update(0.016);
  assert.strictEqual(d.run.newUnlock, 2); d.die(); texts.length = 0; d.resultsScreen(true);
  assert.ok(texts.includes('Этаж 1') && texts.includes('Открыт этаж 2'), 'строки этажа на результатах: достигнут 1-й, открыт 2-й');
  texts.length = 0; d.setLang('en'); d.resultsScreen(true); assert.ok(texts.includes('Floor 2 unlocked')); d.setLang('ru');
  texts.length = 0; d.state = 'play'; d.drawHUD(); assert.ok(texts.some(t => t.startsWith('Этаж ')), 'HUD показывает этаж');
  d.save.floor = 0; d.save.startFloor = 1;
  console.log('test_render ok');
})().catch(e => { console.error(e); process.exit(1); });
