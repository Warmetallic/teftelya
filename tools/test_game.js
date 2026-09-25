// node tools/test_game.js — забег: старт, прыжок и заряды, посадка и шкала силы, урон и смерть, лечение, продолжить, чекпоинт, финиш и рейтинг, еда, суперсила, мухи, god-режим
const assert = require('assert');
const bot = require('./bot');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
(async () => {
  const g = require('./_env')(ctx); const d = g.dbg(); await d.YG.init(); await d.loadSave();
  const ball = d.ball;
  const steps = (n, dt = 0.016) => { for (let i = 0; i < n; i++) d.update(dt); };
  const untilOn = (id, n = 120) => { for (let i = 0; i < n; i++) { d.update(0.016); if (ball.onPlatform === id) return true; } return false; };
  const dropOn = (p) => { ball.onPlatform = null; ball.x = p.x; ball.y = p.y - ball.r - 30; ball.vx = 0; ball.vy = 200; d.setCamY(p.y - 500); };
  // старт башни 1: Тефа на стартовой тарелке с полной массой 4 из 4, 3 заряда
  d.startTower(1); d.state = 'play';
  assert.strictEqual(d.tower.tp.N, 1); assert.strictEqual(ball.mass, 4, 'башня начинается с полной массой'); assert.strictEqual(d.massMax(), 4); assert.strictEqual(ball.charges, 3);
  assert.strictEqual(ball.onPlatform, 0); assert.strictEqual(ball.y, -ball.r); assert.ok(d.run.foodTotal > 0); assert.strictEqual(d.run.deaths, 0);
  // прыжок тратит заряд; в воздухе ещё два; без зарядов — нет
  assert.ok(d.jumpTo(300, -200)); assert.strictEqual(ball.charges, 2); assert.strictEqual(ball.onPlatform, null); assert.ok(ball.vy < 0);
  assert.ok(d.jumpTo(300, -300)); assert.ok(d.jumpTo(300, -400)); assert.strictEqual(d.jumpTo(300, -500), false, 'заряды кончились');
  // посадка на первую платформу пути: заряды полные, шкала и серия для мух +1 за первую посадку, повтор не растит
  d.startTower(1); d.state = 'play'; const p1 = d.platforms.find(p => p.id === d.tower.path[1]);
  for (const it of d.items) it.dead = true; d.resetPours(1e9); d.setGod(true); // еда и масло по пути не должны влиять на проверку посадки
  { const st = {}; for (let i = 0; i < 300 && ball.onPlatform !== p1.id; i++) { bot.botAct(d, st); d.update(0.016); } }
  assert.strictEqual(ball.onPlatform, p1.id, 'села на первую платформу пути'); assert.strictEqual(ball.charges, 3); assert.strictEqual(d.power.v, 1); assert.strictEqual(d.power.flyStreak, 1);
  d.jumpTo(p1.x, p1.y); assert.ok(untilOn(p1.id)); assert.strictEqual(d.power.v, 1, 'та же платформа шкалу не растит'); d.setGod(false);
  // урон: −1 масса, неуязвимость, четверть шкалы и серия для мух сняты, отброс; повтор в неуязвимости не проходит; ноль массы — смерть с банком монет
  d.setRunCoins(7); const earned0 = d.save.earned; d.YG.gameplayStart();
  assert.ok(d.damage(1, 'oil', ball.x + 10, ball.y)); assert.strictEqual(ball.mass, 3); assert.ok(d.run.invuln > 0.9); assert.strictEqual(d.power.v, 0); assert.strictEqual(d.power.flyStreak, 0); assert.strictEqual(ball.onPlatform, null);
  assert.strictEqual(d.damage(1, 'oil', ball.x, ball.y), false, 'в неуязвимости урона нет');
  d.run.invuln = 0; d.damage(5, 'knife', ball.x, ball.y); assert.strictEqual(d.state, 'dead'); assert.strictEqual(d.run.reason, 'knife'); assert.strictEqual(d.run.deaths, 1);
  assert.strictEqual(d.save.earned, earned0 + 7, 'монеты забега в сохранении'); assert.strictEqual(d.YG.log.at(-1), 'stop');
  // продолжить: на последней платформе, полная масса, неуязвимость 1.5 с, usedContinue; падение за экран; с чекпоинта
  d.continueRun(); assert.strictEqual(d.state, 'play'); assert.ok(ball.alive); assert.strictEqual(ball.onPlatform, p1.id); assert.strictEqual(ball.mass, 4, 'продолжение с полной массой'); assert.ok(d.run.invuln >= 1.5); assert.strictEqual(d.run.usedContinue, 1);
  ball.onPlatform = null; ball.y = d.camY + 854 + 200; d.update(0.016); assert.strictEqual(d.state, 'dead'); assert.strictEqual(d.run.reason, 'fall'); assert.strictEqual(d.run.deaths, 2);
  d.run.cp = 1; d.restartFromCp(); assert.strictEqual(d.state, 'play'); assert.strictEqual(ball.onPlatform, d.platforms.find(p => p.cp === 1).id); assert.strictEqual(ball.mass, 4, 'с чекпоинта — полная масса'); assert.strictEqual(d.run.deaths, 2, 'смерти остаются');
  // чекпоинт: посадка на платформу с cp пишет run.cp и save.cp и лечит до полной
  d.startTower(1); d.state = 'play'; const cp1 = d.platforms.find(p => p.cp === 1); ball.mass = 2; dropOn(cp1); steps(20);
  assert.strictEqual(ball.onPlatform, cp1.id); assert.strictEqual(d.run.cp, 1); assert.strictEqual(ball.mass, 4, 'чекпоинт лечит до полной'); assert.strictEqual(JSON.parse(g.store.get('teft_save')).cp, 1, 'чекпоинт сохранён');
  // финиш: крыша → finish, рейтинг S, награда, летопись, следующая башня
  d.startTower(1); d.state = 'play'; d.YG.gameplayStart(); const roof = d.platforms.find(p => p.roof);
  d.run.foodEaten = d.run.foodTotal; d.setRunCoins(10); dropOn(roof); steps(20);
  assert.strictEqual(d.state, 'finish'); assert.strictEqual(d.run.rating.letter, 'S'); assert.strictEqual(d.run.bonus, 40); assert.strictEqual(d.run.runCoins, 50);
  assert.strictEqual(d.save.log[1].r, 'S'); assert.strictEqual(d.save.tower, 2); assert.strictEqual(d.save.cp, 0); assert.strictEqual(d.YG.log.at(-1), 'stop');
  assert.strictEqual(JSON.parse(g.store.get('teft_save')).tower, 2);
  // монеты: удвоение после финиша добавляет ровно столько же; смерть → продолжить → смерть банкует один раз
  { const c0 = d.coins(); d.doubleCoins(); assert.strictEqual(d.coins(), c0 + 50, '×2 добавляет столько же, сколько было'); assert.strictEqual(d.run.runCoins, 100); assert.ok(d.run.usedDouble); }
  d.nextTower(); assert.strictEqual(d.tower.tp.N, 2); assert.strictEqual(d.state, 'play'); assert.strictEqual(d.run.deaths, 0);
  { d.startTower(1); d.state = 'play'; const cA = d.coins(); d.setRunCoins(30); d.die('oil'); assert.strictEqual(d.coins(), cA + 30);
    d.continueRun(); d.die('oil'); assert.strictEqual(d.coins(), cA + 30, 'после продолжения те же монеты не банкуются повторно');
    d.continueRun(); d.setRunCoins(45); d.die('oil'); assert.strictEqual(d.coins(), cA + 45, 'банкуется только прирост'); }
  // таблица рейтинга и награда
  const tp = d.towerParams(1), R = r => d.ratingFor(Object.assign({ deaths: 0, time: 10, foodEaten: 10, foodTotal: 10, usedContinue: 0 }, r), tp).letter;
  assert.strictEqual(R({}), 'S'); assert.strictEqual(R({ deaths: 1 }), 'A'); assert.strictEqual(R({ deaths: 1, time: 999 }), 'B'); assert.strictEqual(R({ deaths: 1, time: 999, foodEaten: 1 }), 'C'); assert.strictEqual(R({ usedContinue: 1 }), 'D');
  assert.strictEqual(R({ foodEaten: 8 }), 'S', '80% еды хватает'); assert.strictEqual(R({ foodEaten: 7 }), 'A'); assert.strictEqual(d.bonusCoins(3, 'A'), 90);
  // еда: монеты с множителем башни и специй, шкала +1 (в полёте +2); массу еда не возвращает (спека v2.1.1 §5)
  d.startTower(1); d.state = 'play'; const it = d.items[0]; ball.mass = 2; it.x = ball.x; it.y = ball.y; d.update(0.016);
  assert.ok(it.dead); assert.strictEqual(ball.mass, 2, 'еда не лечит'); assert.strictEqual(d.run.foodEaten, 1); assert.strictEqual(d.run.runCoins, d.coinsFor(it.kind)); assert.strictEqual(d.power.v, 1);
  ball.onPlatform = null; ball.vy = 0; const it3 = d.items[1]; it3.x = ball.x; it3.y = ball.y; d.update(0.016); assert.ok(it3.dead); assert.strictEqual(d.power.v, 3, 'еда в полёте — +2');
  d.save.up.spice = 4; assert.strictEqual(d.coinsFor('meat'), Math.round(3 * 1.2)); d.save.up.spice = 0;
  // шкала впервые за сессию полна — над Тефой подсказка «Тапни по Тефе!»; в следующий раз её нет (спека v2.1.1 §4.1)
  const hints = () => d.texts.filter(t => t.str === 'Тапни по Тефе!').length;
  for (const [k, want, msg] of [[2, 1, 'подсказка при первой полной шкале'], [3, 0, 'за сессию подсказка одна']]) {
    d.startTower(1); d.state = 'play'; d.resetFx(); d.power.v = d.POWER_FULL - 1;
    const food = d.items[k]; food.x = ball.x; food.y = ball.y; d.update(0.016);
    assert.ok(d.powerReady()); assert.strictEqual(hints(), want, msg);
  }
  // муха отстала: +3 к шкале и +3 к скрытой серии для мух (спека v2.1.1 §4.1, §4.4)
  d.startTower(1); d.state = 'play'; d.resetFlies(); d.spawnFly(true);
  { const f = d.flies[0], v0 = d.power.v, s0 = d.power.flyStreak; f.warnT = 0; f.chaseT = d.flyChase(); d.update(0.016);
    assert.strictEqual(d.flies.length, 0, 'муха отстала и улетела');
    assert.strictEqual(d.power.v, v0 + 3, 'муха отстала — +3 к шкале'); assert.strictEqual(d.power.flyStreak, s0 + 3, 'и +3 к серии для мух'); }
  // берсерк по полной шкале: неуязвимость, монеты ×2, муха съедается и лечит
  d.startTower(1); d.state = 'play'; assert.strictEqual(d.tryActivatePower(), false, 'пустая шкала'); d.powerAdd(d.POWER_FULL); assert.ok(d.tryActivatePower()); assert.ok(d.isBerserk());
  assert.strictEqual(d.damage(1, 'oil', ball.x, ball.y), false, 'в берсерке урона нет'); assert.strictEqual(d.coinsFor('ketchup'), 2);
  d.spawnFly(true); d.flies[0].warnT = 0; d.flies[0].x = ball.x; d.flies[0].y = ball.y; ball.mass = 2; d.update(0.016);
  assert.strictEqual(d.flies.length, 0); assert.strictEqual(ball.mass, 3, 'муха съедена: +1 масса');
  // масло: капля попадает — кусок; в берсерке съедена — кусок назад (спека v2.1.1 §5)
  d.startTower(1); d.state = 'play'; d.resetPours(1e9); d.drops.push({ x: ball.x, y: ball.y - 5, dead: false }); d.update(0.016); assert.strictEqual(ball.mass, 3, 'капля ранит');
  d.run.invuln = 0; d.powerAdd(d.POWER_FULL); d.tryActivatePower(); d.drops.push({ x: ball.x, y: ball.y - 5, dead: false }); d.update(0.016); assert.strictEqual(ball.mass, 4, 'в берсерке капля лечит');
  // лень: 3 с на платформе → муха прилетает
  d.startTower(1); d.state = 'play'; d.resetFlies(); steps(200); assert.strictEqual(d.flies.length, 1, 'муха за лень');
  // god-режим для smoke: урон и падение не убивают, Тефа возвращается на последнюю платформу
  d.startTower(1); d.state = 'play'; d.setGod(true); assert.strictEqual(d.damage(9, 'knife', 0, 0), false);
  ball.onPlatform = null; ball.y = d.camY + 2000; d.update(0.016); assert.strictEqual(d.state, 'play'); assert.strictEqual(ball.onPlatform, 0); d.setGod(false);
  // ожог сковородки: урон и подброс строго вверх, без бокового сноса
  d.startTower(3); d.state = 'play'; d.hazards.length = 0; d.resetPours(1e9); for (const it of d.items) it.dead = true; // опасности, масло и еда не должны мешать таймеру сковородки
  const pan = d.platforms.find(p => p.type === 'pan'); assert.ok(pan, 'в башне 3 есть сковородка');
  dropOn(pan); assert.ok(untilOn(pan.id), 'Тефа стоит на сковородке');
  { const m0 = ball.mass; let burned = false;
    for (let i = 0; i < 400 && !burned; i++) { d.update(0.016); burned = ball.mass === m0 - 1; }
    assert.ok(burned, 'сковородка сожгла'); assert.strictEqual(ball.vy, -700, 'подброс вверх');
    assert.strictEqual(ball.vx, 0, 'вбок не сносит'); assert.strictEqual(ball.onPlatform, null, 'сковородка отпустила'); }
  // берсерк: сковородка не жжёт — ни урона, ни подброса
  d.startTower(3); d.state = 'play'; d.hazards.length = 0; d.resetPours(1e9); for (const it of d.items) it.dead = true;
  const pan2 = d.platforms.find(p => p.type === 'pan'); dropOn(pan2); assert.ok(untilOn(pan2.id));
  d.powerAdd(d.POWER_FULL); assert.ok(d.tryActivatePower());
  { const m0 = ball.mass; steps(190); // 3.04 с — дольше таймера сковородки башни 3 (1.85 с) и короче берсерка (6 с)
    assert.strictEqual(ball.mass, m0, 'в берсерке масса на сковородке не меняется'); assert.strictEqual(ball.onPlatform, pan2.id, 'и подброса нет'); }
  // лопасти снимают один кусок, как любая опасность; в неуязвимости — ничего (спека v2.1.1 §7.1)
  d.startTower(3); d.state = 'play'; d.resetPours(1e9); for (const it of d.items) it.dead = true;
  const bl = d.hazards.find(h => h.type === 'blades'); assert.ok(bl, 'в башне 3 есть лопасти');
  d.hazards.length = 0; d.hazards.push(bl); // остальные опасности убрать: проверяем только лопасти
  const inBlades = () => { ball.x = bl.x; ball.y = bl.y; ball.onPlatform = null; ball.vy = 0; d.setCamY(bl.y - 400); };
  d.run.invuln = 1.5; inBlades(); d.update(0.016); assert.strictEqual(ball.mass, 4, 'в неуязвимости лопасти не ранят');
  d.run.invuln = 0; inBlades(); d.update(0.016); assert.strictEqual(d.state, 'play', 'лопасти не убивают сразу'); assert.strictEqual(ball.mass, 3, 'снят один кусок');
  // «Продолжить»: шкала и потраченный берсерк смерть переживают, берсерк и серия для мух — нет; «Заново» обнуляет всё
  d.startTower(1); d.state = 'play'; d.powerAdd(10); d.flyStreakAdd(5);
  d.die('fall'); d.continueRun(); assert.strictEqual(d.power.flyStreak, 0, 'серия для мух обнулена'); assert.strictEqual(d.power.v, 10, 'шкала пережила смерть');
  d.powerAdd(d.POWER_FULL); assert.ok(d.tryActivatePower()); d.die('fall'); assert.ok(!d.isBerserk(), 'смерть заканчивает берсерк');
  d.continueRun(); assert.strictEqual(d.power.used, 1, 'смерть не возвращает берсерк'); d.powerAdd(d.POWER_FULL); assert.strictEqual(d.power.v, 0, 'лимит исчерпан — шкала не копится');
  d.restartTower(); assert.strictEqual(d.power.used, 0); assert.strictEqual(d.power.v, 0, '«Заново» обнуляет шкалу');
  // подброс тостером и лопаткой (спека v2.2a §6.2, §6.4): вертикально на LAUNCH_H, vx = 0, заряды полные
  { d.startTower(3); d.state = 'play'; d.resetPours(1e9); d.hazards.length = 0; d.resetFlies(); for (const it of d.items) it.dead = true;
    const sp = { id: 9100, type: 'spatula', x: 240, y: ball.y + ball.r - 360, w: 110, row: 3 }; d.platforms.push(sp);
    ball.onPlatform = null; ball.x = 240; ball.vx = 0; ball.y = sp.y - ball.r - 20; ball.vy = 100; ball.charges = 1;
    let top = Infinity, launched = false;
    for (let i = 0; i < 120 && d.state === 'play'; i++) { d.update(1 / 60); if (ball.vy < -700) launched = true; if (launched) top = Math.min(top, ball.y + ball.r); if (launched && ball.vy > 0) break; }
    assert.ok(launched, 'лопатка подбросила'); assert.strictEqual(ball.charges, d.chargesMax(), 'после подброса заряды полные'); assert.strictEqual(ball.vx, 0, 'подброс вертикальный');
    assert.ok(Math.abs(sp.y - top - d.LAUNCH_H) < 12, 'подъём ≈ LAUNCH_H: ' + (sp.y - top).toFixed(0)); }
  // миска (спека v2.2a §6.3): липкая — первый тап отлепляет и тратит заряд, не прыгая; второй прыгает; новая посадка — снова липко
  { d.startTower(4); d.state = 'play'; d.resetPours(1e9); d.hazards.length = 0; d.resetFlies(); for (const it of d.items) it.dead = true;
    const bowl = { id: 9200, type: 'bowl', x: 240, y: ball.y + ball.r - 240, w: 120, row: 2 }; d.platforms.push(bowl);
    const dropIn = () => { ball.onPlatform = null; ball.x = 240; ball.vx = 0; ball.y = bowl.y - ball.r - 20; ball.vy = 100; for (let i = 0; i < 30 && ball.onPlatform !== 9200; i++) d.update(1 / 60); };
    dropIn(); assert.strictEqual(ball.onPlatform, 9200); assert.strictEqual(ball.charges, d.chargesMax());
    assert.ok(d.jumpTo(240, bowl.y - 200), 'тап принят'); assert.strictEqual(ball.onPlatform, 9200, 'первый тап только отлепляет'); assert.strictEqual(ball.charges, d.chargesMax() - 1, 'и тратит заряд');
    assert.ok(d.jumpTo(240, bowl.y - 200)); assert.strictEqual(ball.onPlatform, null, 'второй тап прыгает'); assert.strictEqual(ball.charges, d.chargesMax() - 2, 'прыжок из миски стоит двух зарядов');
    dropIn(); d.jumpTo(240, bowl.y - 200); assert.strictEqual(ball.onPlatform, 9200, 'после новой посадки снова липко'); }
  // нижняя граница (спека v2.2a §4): смерть, как только низ Тефы ушёл в полосу внизу экрана глубже BAND_SINK; платформа,
  // прикрытая полосой не глубже BAND_SINK, ещё ловит, более глубокая — нет (раньше под экраном была невидимая полоса спасения)
  { const bandTop = () => d.camY + 854 - d.BAND_H, fall = (y, vy) => { ball.onPlatform = null; ball.vx = 0; ball.vy = vy; ball.y = y; ball.x = 240; };
    const clean = () => { d.startTower(1); d.state = 'play'; d.resetPours(1e9); d.hazards.length = 0; d.resetFlies(); for (const it of d.items) it.dead = true; };
    clean(); fall(bandTop() + d.BAND_SINK - ball.r - 3, 0); d.update(0.016); assert.strictEqual(d.state, 'play', 'низ выше порога — жива');
    clean(); fall(bandTop() + d.BAND_SINK - ball.r + 3, 0); d.update(0.016); assert.strictEqual(d.state, 'dead', 'низ в полосе глубже порога — смерть'); assert.strictEqual(d.run.reason, 'fall');
    clean(); const saveP = { id: 9001, type: 'plate', x: 240, y: bandTop() + 8, w: 200, row: -1 }; d.platforms.push(saveP); fall(saveP.y - ball.r - 30, 100);
    for (let i = 0; i < 60 && d.state === 'play' && ball.onPlatform !== 9001; i++) d.update(0.016);
    assert.strictEqual(ball.onPlatform, 9001, 'платформа, прикрытая полосой на 8 px, ловит');
    clean(); const deep = { id: 9002, type: 'plate', x: 240, y: bandTop() + 30, w: 200, row: -1 }; d.platforms.push(deep); fall(deep.y - ball.r - 40, 100);
    for (let i = 0; i < 60 && d.state === 'play' && ball.onPlatform !== 9002; i++) d.update(0.016);
    assert.strictEqual(d.state, 'dead', 'на платформу глубже порога не встать: смерть раньше'); }
  { d.startTower(1); d.state = 'play'; d.resetPours(1e9); d.hazards.length = 0; d.resetFlies(); d.powerAdd(d.POWER_FULL); assert.ok(d.tryActivatePower());
    ball.onPlatform = null; ball.vx = 0; ball.vy = 0; ball.x = 240; ball.y = d.camY + 854 - d.BAND_H + d.BAND_SINK - ball.r + 3; d.update(0.016);
    assert.strictEqual(d.state, 'dead', 'в берсерке полоса тоже убивает: от падения сила не спасает'); }
  console.log('test_game ok');
})().catch(e => { console.error(e); process.exit(1); });
