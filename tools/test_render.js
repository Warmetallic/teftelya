// node tools/test_render.js — рендер и экраны не падают на proxy-контексте; тексты HUD, титула, смерти и финиша; локализация
const assert = require('assert');
const noop = () => {};
const texts = [];
const ctx = new Proxy({}, { get: (t, k) => k === 'fillText' ? s => texts.push(String(s)) : /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
(async () => {
  for (const size of [[480, 854], [1280, 720]]) {
    const g = require('./_env')(ctx, { width: size[0], height: size[1] }); const d = g.dbg(); await d.YG.init(); await d.loadSave();
    d.drawTefa(ctx, 100, 100, 40, { sx: 1.1, sy: 0.9, tilt: 0.2, face: 0.5, mouth: 0.5, blink: true, hot: 0.5, berserk: true, alpha: 0.5 });
    d.startTower(3); d.state = 'title'; d.drawBg(); d.drawWorld(); d.titleScreen(); d.loadingScreen();
    d.state = 'play'; d.spawnFly(true); d.popText(240, 0, '+5', '#fff', true); for (let i = 0; i < 30; i++) d.update(0.016);
    for (const h of d.hazards) { h.y = d.ball.y; if (h.type === 'oil') h.drops.push({ y: h.y + 30, splat: 0, dead: false }, { y: h.floorY, splat: 0.3, dead: false }); if (h.type === 'knife') h.phase = 'wind'; }
    for (const p of d.platforms) if (p.type === 'pan') p.hotT = 1.5;
    d.drawBg(); d.drawWorld(); d.drawHUD(); d.pausedScreen(true); d.pausedScreen(false);
    d.YG.adStub = { kind: 'rewarded', until: 0 }; d.adStubScreen(); d.YG.adStub = null; d.adStubScreen();
  }
  const g = require('./_env')(ctx); const d = g.dbg(); await d.YG.init(); await d.loadSave(); d.startTower(1);
  // титул: башня, тема, кнопка «Играть»; с чекпоинтом — строка чекпоинта
  texts.length = 0; d.state = 'title'; d.titleScreen(); assert.ok(texts.includes('Башня 1') && texts.includes('Кухня')); assert.deepStrictEqual(d.buttons.map(b => b.id), ['play']);
  d.save.cp = 1; texts.length = 0; d.titleScreen(); assert.ok(texts.includes('Чекпоинт 1')); d.save.cp = 0;
  // HUD: серия, монеты, башня; в берсерке — «Берсерк!»
  d.state = 'play'; d.setRunCoins(12); d.streakAdd(4); texts.length = 0; d.drawHUD(); assert.ok(texts.includes('Серия 4') && texts.includes('● 12') && texts.includes('Башня 1'));
  for (let i = 0; i < 8; i++) d.streakAdd(1); texts.length = 0; d.drawHUD(); assert.ok(texts.includes('Берсерк!'));
  // смерть: причина, кнопки по флагам
  d.startTower(1); d.state = 'play'; d.die('blades'); d.deadScreen(false); assert.strictEqual(d.buttons.length, 0, 'до 0.6 с кнопок нет');
  texts.length = 0; d.deadScreen(true); assert.ok(texts.includes('Шлёп!') && texts.includes('Лопасти')); assert.deepStrictEqual(d.buttons.map(b => b.id), ['continue', 'restart']);
  d.run.cp = 1; d.deadScreen(true); assert.deepStrictEqual(d.buttons.map(b => b.id), ['continue', 'cp', 'restart']);
  d.continueRun(); d.die('fall'); d.deadScreen(true); assert.deepStrictEqual(d.buttons.map(b => b.id), ['cp', 'restart'], 'продолжить один раз');
  const b = d.buttons[0]; assert.strictEqual(d.hitButton(b.x, b.y).id, 'cp'); assert.strictEqual(d.hitButton(b.x + b.w, b.y), null);
  // финиш: буква, галочки, награда, кнопки; после удвоения кнопки ×2 нет
  d.startTower(1); d.state = 'play'; d.run.foodEaten = d.run.foodTotal; d.setRunCoins(3); d.finishTower(); texts.length = 0; d.finishScreen(true);
  assert.ok(texts.includes('Башня 1 пройдена!') && texts.includes('S') && texts.some(t => t.startsWith('✓ Без смертей')) && texts.some(t => t.includes('Награда +40')));
  assert.deepStrictEqual(d.buttons.map(b => b.id), ['double', 'next']);
  d.doubleCoins(); texts.length = 0; d.finishScreen(true); assert.deepStrictEqual(d.buttons.map(b => b.id), ['next']); assert.ok(texts.some(t => t.includes('×2')));
  d.startTower(1); d.state = 'play'; d.run.deaths = 1; d.run.foodEaten = d.run.foodTotal; d.finishTower(); texts.length = 0; d.finishScreen(true); assert.ok(texts.includes('A') && texts.some(t => t.startsWith('✗ Без смертей')));
  // локализация и тексты без гендерных форм
  d.setLang('en'); texts.length = 0; d.finishScreen(true); assert.ok(texts.includes('Tower 1 cleared!'));
  d.setLang('tr'); texts.length = 0; d.deadScreen(true); assert.ok(texts.includes('Pat!'));
  d.setLang('ru'); for (const k of ['die.fall', 'die.fly', 'die.blades', 'die.pan', 'die.oil', 'die.knife']) assert.ok(!/упал|сгорел|умер/i.test(d.T(k)), k);
  assert.strictEqual(d.fmtTime(75), '1:15');
  console.log('test_render ok');
})().catch(e => { console.error(e); process.exit(1); });
