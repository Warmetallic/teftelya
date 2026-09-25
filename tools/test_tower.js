// node tools/test_tower.js — башня из фрагментов: детерминизм, параметры роста, структура и путь, края поля, доли платформ,
// лопасти и ножи, еда; бот проходит башни 1–100 без режима бога (спека v2.1.1 §6)
const assert = require('assert');
const bot = require('./bot');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
(async () => {
  const g = require('./_env')(ctx); const d = g.dbg(); await d.YG.init(); await d.loadSave();
  const t1 = d.buildTower(1), t1b = d.buildTower(1), t2 = d.buildTower(2);
  assert.strictEqual(JSON.stringify(t1), JSON.stringify(t1b), 'одинаковая раскладка при том же N');
  assert.notStrictEqual(JSON.stringify(t1.platforms), JSON.stringify(t2.platforms), 'другая башня — другая раскладка');
  // темы по кругу и их уникальности (спека v2.2a §3): башни 1–5 — первый круг, 6–10 — второй; кухня получает доску со второго круга
  assert.deepStrictEqual([1, 2, 3, 4, 5, 6, 7, 11].map(n => d.themeFor(n).id), ['kitchen', 'fridge', 'oven', 'sink', 'feast', 'kitchen', 'fridge', 'kitchen']);
  assert.deepStrictEqual([1, 5, 6, 10, 11].map(d.loopOf), [1, 1, 2, 2, 3]);
  assert.deepStrictEqual([1, 2, 3, 4, 5, 6, 7].map(n => d.uniquesFor(n)), [[], ['shelf'], ['toaster'], ['bowl'], ['spatula'], ['board'], ['shelf']]);
  for (const n of [1, 2, 6, 9]) { const tp = d.towerParams(n); assert.strictEqual(tp.theme, d.themeFor(n).id); assert.deepStrictEqual(tp.uniques, d.uniquesFor(n)); }
  // параметры роста
  const p1 = d.towerParams(1), p5 = d.towerParams(5), p9 = d.towerParams(9), p50 = d.towerParams(50);
  assert.strictEqual(p1.rows, 45); assert.strictEqual(p50.rows, 160); assert.strictEqual(p9.dmg, undefined, 'урон не растёт с номером башни');
  assert.ok(p9.pHaz > p1.pHaz && p9.heat > p1.heat && p9.flySpeed > p1.flySpeed); assert.strictEqual(p1.par, 45 * 2.4); assert.strictEqual(p1.height, 45 * d.ROW_H);
  assert.strictEqual(p1.gapMax, 2); assert.strictEqual(p5.gapMax, 3, 'с башни 5 пропасть до 3 пустых рядов');
  assert.deepStrictEqual([p1.wMin, p1.wMax], [100, 140]); assert.deepStrictEqual([p50.wMin, p50.wMax], [80, 110], 'платформы уже, не меньше 80');
  assert.strictEqual(p1.mix.cheese, 0, 'сыр со второй башни'); assert.ok(d.towerParams(2).mix.cheese > 0);
  assert.ok(p50.frag.steps < p1.frag.steps, 'с номером башни ступеней меньше, остальных фрагментов больше');
  assert.ok(d.towerParams(2).pKnife >= 0.4 && d.towerParams(20).pKnife > d.towerParams(2).pKnife && d.towerParams(100).pKnife <= 0.85, 'шанс ножа в пропасти растёт, не выше 0.85');
  // структура: старт, чекпоинты, крыша, ряды через ROW_H, путь от старта до крыши
  const P1 = t1.platforms;
  assert.ok(P1[0].start && P1[0].y === 0 && P1[0].x === 240);
  const roof = P1.find(p => p.roof); assert.ok(roof && roof.row === 45 && roof.w === 360);
  assert.deepStrictEqual(P1.filter(p => p.cp).map(p => p.cp), [1, 2], 'чекпоинты на рядах 20 и 40');
  for (const p of P1) assert.ok(p.y === -p.row * d.ROW_H, 'ряд ' + p.row + ' на своей высоте'); // === , а не strictEqual: для ряда 0 сравниваем 0 и −0
  assert.strictEqual(t1.path[0], P1[0].id); assert.strictEqual(t1.path.at(-1), roof.id);
  // правила для башен 1–100
  const share = { plate: 0, pan: 0, tray: 0, cheese: 0 }, r8 = d.radiusFor(8); let air = 0, links = 0;
  for (let N = 1; N <= 100; N++) {
    const t = d.buildTower(N), P = t.platforms, byId = new Map(P.map(p => [p.id, p]));
    for (const p of P) {
      if (!(p.cp || p.roof || p.start)) assert.ok(p.x - p.w / 2 >= 20 && p.x + p.w / 2 <= 460, 'башня ' + N + ': платформа в поле');
      if (p.type === 'tray') assert.ok(p.x0 - p.w / 2 >= 20 - 1e-9 && p.x1 + p.w / 2 <= 460 + 1e-9, 'башня ' + N + ': поднос не выезжает за поле');
      if (p.type === 'pan') assert.ok(p.row >= 3, 'сковородок нет в рядах 1–2');
      if (p.rest) assert.ok(p.type === 'plate' && p.w === 180, 'площадка отдыха — широкая тарелка');
      if (!(p.cp || p.roof || p.start || p.rest)) share[p.type]++;
    }
    if (N === 1) assert.ok(P.filter(p => p.type === 'tray').every(p => p.speed >= 40 && p.speed <= 70), 'поднос в башне 1 медленный: 40–70 px/с');
    if (N === 1) { assert.ok(!P.some(p => p.type === 'cheese'), 'сыра нет в башне 1'); assert.strictEqual(t.hazards.length, 0, 'в башне 1 опасностей в раскладке нет'); }
    if (N === 2) assert.ok(!t.hazards.some(h => h.type === 'blades'), 'лопасти не раньше башни 3');
    // нож висит в пустоте пропасти, на линии полёта (плейтест 2026-09-24: нож лежал на площадке отдыха и бил стоящую на ней
    // Тефу, удар сбрасывал её в пропасть): картинка ножа за весь ход — от рукояти в замахе до кончика в ударе — не задевает
    // платформ, а стоящая Тефа любой массы на любой точке платформы не попадает под удар (условие удара — hazards.js)
    for (const h of t.hazards) if (h.type === 'knife') {
      const top = h.by - 14 - 40, tip = h.y - 80 + 84;
      for (const p of P) {
        if (Math.abs(p.y - h.y) > 6 * d.ROW_H) continue;
        const x0 = (p.type === 'tray' ? p.x0 : p.x) - p.w / 2, x1 = (p.type === 'tray' ? p.x1 : p.x) + p.w / 2;
        assert.ok(h.x + 10 < x0 || h.x - 10 > x1 || p.y + 18 < top || p.y - 8 > tip, 'башня ' + N + ': нож не лежит на платформе');
        for (const m of [1, 4, 8]) {
          const R = d.radiusFor(m), y = p.y - R;
          for (let x = x0; x <= x1; x += 5) for (let ky = h.by; ky <= h.y - 80; ky += 2)
            assert.ok(!(Math.abs(x - h.x) < R + 8 && Math.abs(y - (ky + 40)) < R + 40), 'башня ' + N + ': нож не бьёт стоящую Тефу');
        }
      }
    }
    // со второй башни в каждой башне с пропастью есть нож: первый гарантирован, игрок знакомится с ним сразу
    const hasGap = t.path.some((id, i) => i > 0 && byId.get(id).rest && byId.get(id).row - byId.get(t.path[i - 1]).row >= 3);
    if (N >= 2 && hasGap) assert.ok(t.hazards.some(h => h.type === 'knife'), 'башня ' + N + ': есть нож');
    // путь: растёт вверх, соседние платформы не дальше PATH_MAX_ROWS рядов — два прыжка за полёт
    assert.strictEqual(new Set(t.path).size, t.path.length, 'путь без повторов');
    for (let i = 1; i < t.path.length; i++) {
      const a = byId.get(t.path[i - 1]), b = byId.get(t.path[i]);
      assert.ok(b.row > a.row && b.row - a.row <= d.PATH_MAX_ROWS, 'башня ' + N + ': шаг пути ' + a.row + '→' + b.row);
      links++; if (b.row - a.row >= 3 || Math.abs(b.x - a.x) > 260) air++;
    }
    // лопасти: не чаще раза на 15 рядов (ряд — у ступени пути, к которой они привязаны, h.at); ступень у края; стоящая
    // Тефа массы 8 не достаёт их ни с одной точки платформ в трёх рядах вокруг (прицельные прыжки проверяет бот ниже)
    const bl = t.hazards.filter(h => h.type === 'blades');
    if (N >= 3) assert.ok(bl.length >= 1, 'башня ' + N + ': лопасти есть, даже после поиска свободного места');
    const blRows = bl.map(h => byId.get(h.at).row).sort((a, b) => a - b);
    for (let k = 1; k < blRows.length; k++) assert.ok(blRows[k] - blRows[k - 1] >= 15, 'лопасти не чаще раза на 15 рядов');
    for (const h of bl) {
      const q = byId.get(h.at); assert.ok(t.path.includes(q.id) && (q.x <= 140 || q.x >= 340), 'башня ' + N + ': ступень у лопастей отодвинута к краю');
      for (const p of P) {
        if (Math.abs(p.y - h.y) > 3 * d.ROW_H) continue;
        const x0 = (p.type === 'tray' ? p.x0 : p.x) - p.w / 2, x1 = (p.type === 'tray' ? p.x1 : p.x) + p.w / 2;
        for (let x = x0; x <= x1; x += 5) assert.ok(Math.hypot(x - h.x, (p.y - r8) - h.y) > r8 + d.BLADES_R, 'башня ' + N + ': стоящая Тефа не достаёт лопасти');
      }
    }
    assert.ok(t.items.length > 0 && t.items.every(it => d.FOOD_KINDS[it.kind] && !it.dead));
  }
  const typed = share.plate + share.pan + share.tray + share.cheese;
  assert.ok(Math.abs(share.plate / typed - 0.5) < 0.05, 'простых тарелок около половины: ' + (share.plate / typed).toFixed(2));
  assert.ok(air / links > 0.1, 'прыжок в воздухе нужен регулярно: ' + (air / links).toFixed(2));
  // в первых 10 башнях есть все типы
  const all = []; for (let N = 1; N <= 10; N++) all.push(d.buildTower(N));
  for (const ty of ['knife', 'blades']) assert.ok(all.some(t => t.hazards.some(h => h.type === ty)), 'есть ' + ty);
  const kn26 = all.slice(1, 6).reduce((s, t) => s + t.hazards.filter(h => h.type === 'knife').length, 0);
  assert.ok(kn26 >= 5, 'в башнях 2–6 ножи встречаются регулярно: ' + kn26);
  assert.ok(!all.some(t => t.hazards.some(h => h.type === 'oil')), 'масла в раскладке нет');
  for (const ty of ['pan', 'tray', 'cheese']) assert.ok(all.some(t => t.platforms.some(p => p.type === ty)), 'есть ' + ty);
  // бот проходит башни 1–100 по пути без режима бога: опасности, масло и мухи выключены — проверяем раскладку и прыжки
  const r0 = Math.random; Math.random = () => 1; // мухи по серии не влетают
  for (let N = 1; N <= 100; N++) {
    d.startTower(N); d.state = 'play'; d.resetPours(1e9);
    bot.climb(null, d, { noHazards: true });
    assert.strictEqual(d.state, 'finish', 'башня ' + N + ' проходима без режима бога'); assert.strictEqual(d.run.deaths, 0);
  }
  // лопасти не стоят на дугах прицельных прыжков (финальное ревью v2.1.1): бот идёт по пути, как игрок тапает в цель,
  // в башне оставлены только лопасти — ни одного удара; прицельный тап безопасен, лопасти наказывают неточный прыжок
  let blHits = 0, blCount = 0;
  for (let N = 3; N <= 100; N++) {
    d.startTower(N); d.state = 'play'; d.resetPours(1e9); const stats = { hits: 0 };
    blCount += d.hazards.filter(h => h.type === 'blades').length;
    bot.climb(null, d, { keep: ['blades'], stats });
    assert.strictEqual(d.state, 'finish', 'башня ' + N + ' с лопастями проходима');
    blHits += stats.hits;
  }
  assert.strictEqual(blHits, 0, 'прицельные прыжки не задевают лопасти: ударов ' + blHits + ' на ' + blCount + ' лопастей');
  Math.random = r0;
  // seeded RNG стабилен
  const R = d.mulberry32(7); const a = [R(), R(), R()]; const R2 = d.mulberry32(7); assert.deepStrictEqual(a, [R2(), R2(), R2()]);
  assert.ok(a.every(v => v >= 0 && v < 1));
  console.log('test_tower ok');
})().catch(e => { console.error(e); process.exit(1); });
