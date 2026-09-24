// node tools/test_tower.js — генерация башни: детерминизм, проходимость, пороги типов, чекпоинты и крыша
const assert = require('assert');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
(async () => {
  const g = require('./_env')(ctx); const d = g.dbg();
  const t1 = d.buildTower(1), t1b = d.buildTower(1), t2 = d.buildTower(2);
  assert.strictEqual(JSON.stringify(t1), JSON.stringify(t1b), 'одинаковая раскладка при том же N');
  assert.notStrictEqual(JSON.stringify(t1.platforms), JSON.stringify(t2.platforms), 'другая башня — другая раскладка');
  // параметры роста
  const p1 = d.towerParams(1), p9 = d.towerParams(9), p50 = d.towerParams(50);
  assert.strictEqual(p1.rows, 45); assert.strictEqual(p50.rows, 160); assert.strictEqual(p9.dmg, undefined, 'урон не растёт с номером башни');
  assert.ok(p9.pHaz > p1.pHaz && p9.heat > p1.heat && p9.flySpeed > p1.flySpeed); assert.strictEqual(p1.par, 45 * 2.4);
  assert.strictEqual(p1.height, 45 * d.ROW_H);
  // структура: старт, крыша, чекпоинты, ряды через ROW_H
  const rows = t1.platforms;
  assert.ok(rows[0].start && rows[0].y === 0 && rows[0].x === 240);
  const roof = rows.find(p => p.roof); assert.ok(roof && roof.row === 45 && roof.y === -45 * d.ROW_H && roof.w === 360);
  assert.deepStrictEqual(rows.filter(p => p.cp).map(p => p.cp), [1, 2], 'чекпоинты на рядах 20 и 40');
  for (const p of rows) assert.ok(p.y === -p.row * d.ROW_H, 'ряд ' + p.row + ' на своей высоте'); // === , а не strictEqual: для ряда 0 сравниваем 0 и −0
  // проходимость: у каждой платформы ряда i есть платформа ряда i−1 не дальше REACH_X; и наоборот
  for (let N = 1; N <= 100; N++) {
    const t = d.buildTower(N); const byRow = new Map();
    for (const p of t.platforms) { if (!byRow.has(p.row)) byRow.set(p.row, []); byRow.get(p.row).push(p); }
    for (let i = 1; i <= t.tp.rows; i++) {
      const cur = byRow.get(i), prev = byRow.get(i - 1);
      assert.ok(cur && cur.length >= 1 && prev && prev.length >= 1, 'ряд ' + i + ' башни ' + N + ' не пуст');
      for (const p of cur) assert.ok(prev.some(q => Math.abs(q.x - p.x) <= d.REACH_X), 'вверх: башня ' + N + ' ряд ' + i);
      for (const q of prev) assert.ok(cur.some(p => Math.abs(q.x - p.x) <= d.REACH_X), 'вниз: башня ' + N + ' ряд ' + i);
      for (const p of cur) assert.ok(p.x - p.w / 2 >= 20 && p.x + p.w / 2 <= 460, 'платформа в поле');
    }
    if (N === 1) { assert.ok(!t.platforms.some(p => p.type === 'tray'), 'подносов нет в башне 1'); assert.ok(!t.hazards.some(h => h.type !== 'oil'), 'в башне 1 только масло'); }
    if (N === 2) assert.ok(!t.hazards.some(h => h.type === 'blades'), 'лопасти не раньше башни 3');
    assert.ok(!t.platforms.some(p => p.type === 'pan' && p.row < 3), 'сковородок нет в рядах 1–2');
    const bl = t.hazards.filter(h => h.type === 'blades').map(h => -h.y / d.ROW_H).sort((a, b) => a - b);
    for (let k = 1; k < bl.length; k++) assert.ok(bl[k] - bl[k - 1] >= 15, 'лопасти не чаще раза на 15 рядов');
    assert.ok(t.items.length > 0 && t.items.every(it => d.FOOD_KINDS[it.kind] && !it.dead));
  }
  // ряд с лопастями: дорожки раздвинуты (у подноса — весь ход), стоящая Тефа массы 8 не достаёт лопасти ни на своём ряду, ни на соседних
  const r8 = d.radiusFor(8);
  for (let N = 3; N <= 12; N++) {
    const t = d.buildTower(N);
    for (const h of t.hazards) {
      if (h.type !== 'blades') continue;
      const row = Math.floor(-h.y / d.ROW_H);
      for (const p of t.platforms) {
        if (Math.abs(p.row - row) > 1) continue;
        const xs = p.type === 'tray' ? [p.x0, p.x, p.x1] : [p.x]; // поднос стоит везде на своём ходу
        for (const x of xs) {
          if (p.row === row) assert.ok(x <= 140 || x >= 340, 'башня ' + N + ' ряд ' + row + ': дорожка раздвинута, x = ' + x.toFixed(1));
          assert.ok(Math.hypot(x - h.x, (p.y - r8) - h.y) > r8 + d.BLADES_R, 'башня ' + N + ' ряд ' + p.row + ': стоящая Тефа не достаёт лопасти');
        }
      }
    }
  }
  // хотя бы в одной из первых 10 башен есть каждый тип
  const all = []; for (let N = 1; N <= 10; N++) all.push(d.buildTower(N));
  for (const ty of ['oil', 'knife', 'blades']) assert.ok(all.some(t => t.hazards.some(h => h.type === ty)), 'есть ' + ty);
  for (const ty of ['pan', 'tray']) assert.ok(all.some(t => t.platforms.some(p => p.type === ty)), 'есть ' + ty);
  // seeded RNG стабилен
  const R = d.mulberry32(7); const a = [R(), R(), R()]; const R2 = d.mulberry32(7); assert.deepStrictEqual(a, [R2(), R2(), R2()]);
  assert.ok(a.every(v => v >= 0 && v < 1));
  console.log('test_tower ok');
})().catch(e => { console.error(e); process.exit(1); });
