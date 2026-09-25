// node tools/test_render.js — рендер и экраны не падают на proxy-контексте; тексты HUD, титула, смерти и финиша; локализация
const assert = require('assert');
const noop = () => {};
const texts = [], styles = [], dashes = [], glows = []; // styles: цвета заливки и обводки; dashes: setLineDash; glows: shadowBlur > 0
const ctx = new Proxy({}, { get: (t, k) => k === 'fillText' ? s => texts.push(String(s)) : k === 'setLineDash' ? a => dashes.push(a)
    : /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop,
  set: (t, k, v) => { if (k === 'fillStyle' || k === 'strokeStyle') styles.push(String(v)); if (k === 'shadowBlur' && v > 0) glows.push(v); return true; } });
(async () => {
  for (const size of [[480, 854], [1280, 720]]) {
    const g = require('./_env')(ctx, { width: size[0], height: size[1] }); const d = g.dbg(); await d.YG.init(); await d.loadSave();
    d.drawTefa(ctx, 100, 100, 40, { sx: 1.1, sy: 0.9, tilt: 0.2, face: 0.5, mouth: 0.5, blink: true, hot: 0.5, berserk: true, alpha: 0.5 });
    for (const cur of [4, 3, 2, 1]) for (const extra of [{}, { heal: 0.5 }, { tint: 1 }, { charged: true }, { berserk: true }, { blink: true, mouth: 0.8, face: -1, hot: 0.7 }])
      d.drawTefa(ctx, 100, 100, 40, Object.assign({ hp: { cur, max: 4 } }, extra)); // все состояния жизней с эффектами
    d.startTower(3); d.state = 'title'; d.drawBg(); d.drawWorld(); d.titleScreen(); d.loadingScreen();
    d.state = 'play'; d.spawnFly(true); d.popText(240, 0, '+5', '#fff', true); d.resetPours(100); d.startPour(200); for (let i = 0; i < 30; i++) d.update(0.016);
    d.drawWorld(); for (let i = 0; i < 30; i++) d.update(0.016); // предупреждение налива, потом капли и пятна
    for (const h of d.hazards) { h.y = d.ball.y; if (h.type === 'knife') h.phase = 'wind'; }
    for (const p of d.platforms) if (p.type === 'pan') p.hotT = 1.5;
    for (const kind of ['ketchup', 'pasta', 'meat']) d.drawItem({ kind, x: 100, y: d.camY + 300, seed: 0 }); // новые формы еды
    d.drawPlatform({ id: 900, type: 'cheese', x: 240, y: d.camY + 400, w: 120, crumbleT: 0.2 }); d.drawPlatform({ id: 901, type: 'cheese', x: 240, y: d.camY + 500, w: 120, gone: true }); // сыр целый, крошится и пропавший
    d.drawBg(); d.drawWorld(); d.drawHUD(); d.pausedScreen(true); d.pausedScreen(false);
    d.YG.adStub = { kind: 'rewarded', until: 0 }; d.adStubScreen(); d.YG.adStub = null; d.adStubScreen();
  }
  const g = require('./_env')(ctx); const d = g.dbg(); await d.YG.init(); await d.loadSave(); d.startTower(1);
  // уровни жизней по таблице спеки v2.1.1 §3.2: последний кусок — паника при любом максимуме
  const lv = (c, m) => d.tefaHpLevel(c, m);
  assert.deepStrictEqual([lv(4, 4), lv(3, 4), lv(2, 4), lv(1, 4)], [0, 1, 2, 3]);
  assert.deepStrictEqual([lv(6, 6), lv(5, 6), lv(4, 6), lv(3, 6), lv(2, 6), lv(1, 6)], [0, 1, 1, 2, 2, 3]);
  // Тефа рисуется без светлого ободка: ни одного stroke-эллипса вокруг неё в drawWorld нет (проверяется глазами на снимках)
  // титул: башня, тема, кнопка «Играть»; с чекпоинтом — строка чекпоинта
  texts.length = 0; d.state = 'title'; d.titleScreen(); assert.ok(texts.includes('Башня 1') && texts.includes('Кухня')); assert.deepStrictEqual(d.buttons.map(b => b.id), ['play']);
  d.save.cp = 1; texts.length = 0; d.titleScreen(); assert.ok(texts.includes('Чекпоинт 1')); d.save.cp = 0;
  // темы (спека v2.2a §5): фон каждой темы рисуется, на титуле её название; при старте башни плашка «Башня N · Тема» на 1.5 с
  for (let n = 1; n <= 6; n++) { d.startTower(n); d.state = 'title'; d.drawBg(); d.drawWorld(); d.drawBand(); texts.length = 0; d.titleScreen(); assert.ok(texts.includes(d.T('theme.' + d.themeFor(n).id)), 'на титуле тема башни ' + n); }
  d.startTower(2); d.state = 'play'; texts.length = 0; d.drawHUD(); assert.ok(texts.includes('Башня 2 · Холодильник'), 'плашка темы при старте');
  for (let i = 0; i < 100; i++) d.update(0.016); texts.length = 0; d.drawHUD(); assert.ok(!texts.some(t => t.includes(' · ')), 'через 1.6 с плашки нет');
  for (const [lang, want] of [['en', 'Tower 2 · Fridge'], ['tr', 'Kule 2 · Buzdolabı']]) { d.setLang(lang); d.startTower(2); d.state = 'play'; texts.length = 0; d.drawHUD(); assert.ok(texts.includes(want), lang + ': плашка ' + want); }
  d.setLang('ru');
  d.startTower(1);
  // HUD: шкала силы, монеты, башня; панели серии и иконок массы нет; при лимите больше одного — остаток берсерков
  d.state = 'play'; d.setRunCoins(12); d.powerAdd(12); texts.length = 0; d.drawHUD(); assert.ok(texts.includes('● 12') && texts.includes('Башня 1'));
  assert.ok(!texts.some(t => /Серия|Streak/.test(t)), 'панели серии нет'); assert.ok(!texts.some(t => t.startsWith('×')), 'при лимите 1 число не пишется');
  d.powerAdd(d.POWER_FULL); d.drawWorld(); d.drawHUD(); d.tryActivatePower(); d.drawWorld(); d.drawHUD(); // полная шкала и берсерк рисуются
  d.startTower(1); d.state = 'play'; d.save.up.fury = 1; texts.length = 0; d.drawHUD(); assert.ok(texts.includes('×2'), 'остаток берсерков'); d.save.up.fury = 0;
  // всплывающие надписи из одной точки не налезают: следующая встаёт на высоту строки выше (крупная 34 px, мелкая 26)
  d.resetFx(); d.popText(200, 500, 'Берсерк!', '#fff', true); d.popText(200, 500, '+6', '#fff', true); d.popText(210, 505, '+1', '#fff');
  assert.deepStrictEqual(d.texts.map(t => t.y), [500, 466, 432]);
  d.resetFx(); d.popText(240, 500, 'Тапни по Тефе!', '#fff', true); d.popText(330, 500, '+2', '#fff');
  assert.ok(d.texts[1].y <= 500 - 34, 'широкая надпись мешает соседке по своей ширине, а не только по центру');
  d.resetFx(); d.popText(200, 500, 'a', '#fff'); d.texts[0].t = 0.5; d.popText(200, 500, 'b', '#fff'); assert.strictEqual(d.texts[1].y, 500, 'старая надпись уже уплыла вверх');
  d.resetFx(); d.popText(200, 500, 'a', '#fff'); d.texts[0].t = 0.25; d.popText(200, 500, 'b', '#fff'); assert.strictEqual(d.texts[1].y, 500 - 0.25 * 70 - 26, 'новая встаёт над текущим положением всплывающей');
  // надпись у края целиком в поле: центр сдвигается внутрь по оценке ширины (крупный шрифт до 9.5 px на половину буквы, мелкий до 6.6)
  d.resetFx(); d.popText(470, 500, 'Тапни по Тефе!', '#fff', true); d.popText(5, 400, '+3', '#fff');
  assert.ok(d.texts[0].x < 470 && d.texts[0].x + 14 * 9.5 <= 480 - 8, 'крупная надпись не вылезает за правый край: ' + d.texts[0].x);
  assert.ok(d.texts[1].x - 2 * 6.6 >= 8, 'мелкая надпись не вылезает за левый край: ' + d.texts[1].x);
  // предупреждения об опасности без пунктира (плейтест 2026-09-25, вариант A листа shots/design_warn_round1.png): столб налива —
  // мягкий свет, нож на замахе вспыхивает, у лопастей красный ореол
  d.startTower(3); d.state = 'play'; dashes.length = 0; glows.length = 0;
  d.drawHazard({ type: 'knife', x: 240, y: d.camY + 300, by: d.camY + 150, t: 0.3, phase: 'rest' }); assert.strictEqual(glows.length, 0, 'нож в покое не светится');
  d.drawHazard({ type: 'knife', x: 240, y: d.camY + 300, by: d.camY + 150, t: 1.5, phase: 'wind' }); assert.ok(glows.length > 0, 'нож на замахе вспыхивает');
  d.drawHazard({ type: 'blades', x: 240, y: d.camY + 300, ang: 0 });
  d.resetPours(1e9); d.startPour(200); d.drawPours(); d.resetPours(1e9);
  assert.ok(!dashes.some(a => a && a.length), 'предупреждения без пунктира');
  // язык цветов (спека v2.1.1 §8): шкала силы золотая и не берёт оранжевый масла и красный опасности ни в одном состоянии;
  // у лопастей оранжево-красная ступица, у ножа на замахе оранжево-красная кромка
  const DANGER = /^#ff(9a2a|5a36|7a2a)$/i;
  d.startTower(1); d.state = 'play';
  for (const [name, setup] of [['копится', () => d.powerAdd(10)], ['готова', () => d.powerAdd(d.POWER_FULL)], ['берсерк', () => d.tryActivatePower()]]) {
    setup(); styles.length = 0; d.drawPowerMeter();
    assert.ok(styles.length && !styles.some(s => DANGER.test(s)), 'шкала «' + name + '» без цветов опасности: ' + styles.join(' '));
  }
  styles.length = 0; d.drawHazard({ type: 'blades', x: 240, y: d.camY + 300, ang: 0 }); assert.ok(styles.includes('#ff5a36'), 'ступица лопастей оранжево-красная');
  styles.length = 0; d.drawHazard({ type: 'knife', x: 240, y: d.camY + 300, by: d.camY + 150, t: 1.5, phase: 'wind' }); assert.ok(styles.includes('#ff5a36'), 'кромка ножа на замахе оранжево-красная');
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
  // названия тем на трёх языках
  for (const lang of ['ru', 'en', 'tr']) { d.setLang(lang); for (const id of ['kitchen', 'fridge', 'oven', 'sink', 'feast']) assert.ok(d.T('theme.' + id) && d.T('theme.' + id) !== 'theme.' + id, lang + ': название темы ' + id); }
  d.setLang('ru');
  assert.deepStrictEqual(['kitchen', 'fridge', 'oven', 'sink', 'feast'].map(id => d.T('theme.' + id)), ['Кухня', 'Холодильник', 'Духовка', 'Раковина', 'Праздничный стол']);
  // локализация и тексты без гендерных форм
  d.setLang('en'); texts.length = 0; d.finishScreen(true); assert.ok(texts.includes('Tower 1 cleared!'));
  d.setLang('tr'); texts.length = 0; d.deadScreen(true); assert.ok(texts.includes('Pat!'));
  d.setLang('ru'); for (const k of ['die.fall', 'die.fly', 'die.blades', 'die.pan', 'die.oil', 'die.knife']) assert.ok(!/упал|сгорел|умер/i.test(d.T(k)), k);
  assert.strictEqual(d.fmtTime(75), '1:15');
  // заживление в браузере берёт тело и сырой фарш из кэша: без кэша кадр — около 28 тысяч операций рисования
  // (зерно заново, ~10 мс в Chrome), из кэша — около 1200 (контуры укуса и две готовые картинки)
  let ops = 0; const cctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop })
    : ['save', 'restore', 'translate', 'rotate', 'scale', 'setTransform', 'setLineDash'].includes(k) ? noop : () => { ops++; }, set: () => true });
  document.createElement = () => ({ width: 0, height: 0, getContext: () => cctx }); // canvas-заглушка включает кэш
  const healPose = h => ({ hp: { cur: 3, max: 4 }, heal: h }), cache0 = d.tefaCacheSize;
  d.drawTefa(cctx, 100, 100, 40, healPose(0.3)); // первый кадр печёт тело уровня и сырой фарш
  assert.ok(d.tefaCacheSize - cache0 <= 2, 'заживление добавляет в кэш не больше двух картинок');
  ops = 0; d.drawTefa(cctx, 100, 100, 40, healPose(0.6));
  assert.ok(ops < 3000, 'кадр заживления из кэша, без зерна: ' + ops + ' операций');
  // тело печётся под целевой радиус массы (pose.bake), а не под радиус, который плавно догоняет массу после удара:
  // промежуточные радиусы не пекут новых тел (финальное ревью v2.1.1: каждое перепекание — рывок в 10+ мс)
  d.drawTefa(cctx, 100, 100, 38, { hp: { cur: 3, max: 4 }, bake: 34 }); const baked = d.tefaCacheSize;
  for (const r of [37, 36, 35, 34.2]) { ops = 0; d.drawTefa(cctx, 100, 100, r, { hp: { cur: 3, max: 4 }, bake: 34 }); assert.ok(ops < 300, 'радиус ' + r + ': тело из кэша, ' + ops + ' операций'); }
  assert.strictEqual(d.tefaCacheSize, baked, 'пока радиус догоняет массу, кэш не растёт');
  // вытесняется давно неиспользованная картинка: тело, которое рисуется каждый кадр, не перепекается, сколько бы
  // других размеров ни прошло через кэш
  let rebakes = 0; d.drawTefa(cctx, 100, 100, 38, { hp: { cur: 4, max: 4 }, bake: 38 }); // частое тело испечено заранее
  for (let k = 0; k < 24; k++) {
    d.drawTefa(cctx, 100, 100, 20 + 4 * k, { hp: { cur: 4, max: 4 }, bake: 20 + 4 * k });
    ops = 0; d.drawTefa(cctx, 100, 100, 38, { hp: { cur: 4, max: 4 }, bake: 38 }); if (ops > 3000) rebakes++;
  }
  assert.strictEqual(rebakes, 0, 'частое тело не вытесняется из кэша');
  delete document.createElement;
  console.log('test_render ok');
})().catch(e => { console.error(e); process.exit(1); });
