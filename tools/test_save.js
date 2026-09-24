// node tools/test_save.js — v4: миграции v1–v3 (возврат потраченного), потолки веток, слияние по лучшему, снимок без ссылок
const assert = require('assert');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
(async () => {
  const g = require('./_env')(ctx); const d = g.dbg();
  const up0 = { meat: 0, crust: 0, appetite: 0, spice: 0, nerve: 0, grit: 0, repel: 0, charge: 0, fury: 0 };
  // мусор и старые версии
  assert.deepStrictEqual(d.migrate(null), { v: 4, earned: 0, spent: 0, up: up0, skins: [], skin: 'none', tower: 1, log: {}, cp: 0 });
  assert.deepStrictEqual(d.migrate({ v: 1, best: 300, coins: 77 }).earned, 77);
  const m3 = d.migrate({ v: 3, best: 5, earned: 500, spent: 360, up: { jumps: 2, magnet: 1 }, floor: 4, startFloor: 5, skin: 'crown' });
  assert.strictEqual(m3.earned, 500); assert.strictEqual(m3.spent, 0, 'потраченное на старые апгрейды возвращается'); assert.deepStrictEqual(m3.up, up0);
  assert.strictEqual(m3.skin, 'crown'); assert.strictEqual(m3.tower, 1); assert.deepStrictEqual(m3.log, {}); assert.strictEqual(m3.best, undefined);
  // v4: потолки, мусор в log и skins, cp
  const m4 = d.migrate({ v: 4, earned: 900, spent: 1000, up: { meat: 30, nerve: 9, grit: -1, repel: 99, charge: 7, fury: 5, bogus: 3 }, skins: ['chef', 'nope', 'none'], skin: 'bow', tower: 3, log: { 1: { r: 'S', t: 90 }, 2: { r: 'X', t: 1 }, zz: { r: 'A', t: 5 } }, cp: 2 });
  assert.strictEqual(m4.spent, 900, 'spent не больше earned'); assert.deepStrictEqual(m4.up, { meat: 30, crust: 0, appetite: 0, spice: 0, nerve: 2, grit: 0, repel: 15, charge: 3, fury: 2 });
  assert.deepStrictEqual(m4.skins, ['chef']); assert.strictEqual(m4.skin, 'bow'); assert.strictEqual(m4.tower, 3); assert.deepStrictEqual(m4.log, { 1: { r: 'S', t: 90 } }); assert.strictEqual(m4.cp, 2);
  // слияние
  const a = d.migrate({ v: 4, earned: 100, spent: 40, up: { meat: 2 }, skins: ['chef'], skin: 'chef', tower: 4, log: { 1: { r: 'A', t: 100 }, 2: { r: 'S', t: 80 } }, cp: 1 });
  const b = d.migrate({ v: 4, earned: 90, spent: 60, up: { meat: 1, spice: 3 }, skins: ['crown'], skin: 'crown', tower: 3, log: { 1: { r: 'A', t: 90 }, 3: { r: 'C', t: 200 } }, cp: 2 });
  const m = d.mergeSaves(a, b);
  assert.strictEqual(m.earned, 100); assert.strictEqual(m.spent, 60); assert.deepStrictEqual(m.up, Object.assign({}, up0, { meat: 2, spice: 3 }));
  assert.deepStrictEqual(m.skins.sort(), ['chef', 'crown']); assert.strictEqual(m.skin, 'crown', 'скин — больший индекс в SKIN_ORDER');
  assert.strictEqual(m.tower, 4); assert.deepStrictEqual(m.log, { 1: { r: 'A', t: 90 }, 2: { r: 'S', t: 80 }, 3: { r: 'C', t: 200 } }, 'по башне лучший рейтинг, при равном — меньшее время');
  assert.strictEqual(m.cp, 1, 'чекпоинт из сохранения с большей башней');
  assert.strictEqual(d.mergeSaves(a, Object.assign({}, b, { tower: 4 })).cp, 2, 'при равной башне — максимум');
  // снимок не делит ссылки с save; coins()
  await d.YG.init(); await d.loadSave(); d.save.earned = 50; d.save.spent = 20; assert.strictEqual(d.coins(), 30);
  d.save.log[1] = { r: 'B', t: 10 }; d.persist(); const snap = JSON.parse(g.store.get('teft_save'));
  assert.strictEqual(snap.v, 4); assert.deepStrictEqual(snap.log, { 1: { r: 'B', t: 10 } }); assert.strictEqual(snap.earned, 50);
  assert.deepStrictEqual(d.RANK, ['D', 'C', 'B', 'A', 'S']);
  console.log('test_save ok');
})().catch(e => { console.error(e); process.exit(1); });
