// node tools/test_save.js — сохранения v2: загрузка/слияние/миграция/запись; earned/spent только растут
const assert = require('assert');
const { fakeYaGames } = require('./test_sdk');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
const EMPTY = { v: 3, best: 0, earned: 0, spent: 0, up: { jumps: 0, magnet: 0 }, floor: 0, startFloor: 1, skin: 'none' };

(async () => {
  { // пусто везде → нули; миграция старых ключей прототипа; локаль v1 перезаписывается v2
    const g = require('./_env')(ctx); const d = g.dbg(); await d.YG.init();
    const s = await d.loadSave(); assert.deepStrictEqual(s, EMPTY); assert.strictEqual(d.coins(), 0);
    g.store.set('teft_best', '42'); g.store.set('teft_coins', '7'); g.store.delete('teft_save');
    const s2 = await d.loadSave(); assert.strictEqual(s2.best, 42); assert.strictEqual(s2.earned, 7); assert.strictEqual(d.coins(), 7);
    assert.ok(!g.store.has('teft_best'), 'старые ключи удалены');
    const expected = { v: 3, best: 42, earned: 7, spent: 0, up: { jumps: 0, magnet: 0 }, floor: 0, startFloor: 1, skin: 'none' };
    assert.deepStrictEqual(JSON.parse(g.store.get('teft_save')), expected, 'резерв переписан в v2');
    assert.deepStrictEqual(JSON.parse(g.store.get('teft_cloud_mock')), expected, 'облако-заглушка записано');
  }
  { // облако v1 и локаль v2 расходятся → максимум по каждому полю, включая уровни; оба хранилища переписаны в v3
    const log = []; const g = require('./_env')(ctx, { YaGames: fakeYaGames(log, { cloud: { v: 1, best: 10, coins: 3 } }) });
    const d = g.dbg(); await d.YG.init();
    g.store.set('teft_save', JSON.stringify({ v: 2, best: 4, earned: 20, spent: 5, up: { jumps: 1, magnet: 0 } }));
    const s = await d.loadSave(); await g.flush();
    const merged = { v: 3, best: 10, earned: 20, spent: 5, up: { jumps: 1, magnet: 0 }, floor: 0, startFloor: 1, skin: 'none' };
    assert.deepStrictEqual(s, merged); assert.strictEqual(d.coins(), 15);
    assert.deepStrictEqual(JSON.parse(g.store.get('teft_save')), merged);
    assert.ok(log.includes('setData'), 'облако дописано (было v1)');
    assert.deepStrictEqual(await d.YG.getData(), merged);
    // persist пишет оба хранилища, одинаковый снимок в облако не шлёт
    d.save.best = 55; d.save.earned = 30; d.save.up.magnet = 2; d.persist(); await g.flush();
    const snap = { v: 3, best: 55, earned: 30, spent: 5, up: { jumps: 1, magnet: 2 }, floor: 0, startFloor: 1, skin: 'none' };
    assert.deepStrictEqual(JSON.parse(g.store.get('teft_save')), snap);
    assert.deepStrictEqual(await d.YG.getData(), snap);
    const n = log.filter(x => x === 'setData').length;
    d.persist(); await g.flush();
    assert.strictEqual(log.filter(x => x === 'setData').length, n, 'одинаковый снимок в облако не шлётся');
    d.save.spent = 6; d.persist(); await g.flush();
    assert.strictEqual(log.filter(x => x === 'setData').length, n + 1);
  }
  { // мусор в хранилищах не роняет загрузку; баланс не уходит в минус; уровни зажимаются
    const g = require('./_env')(ctx); const d = g.dbg(); await d.YG.init();
    g.store.set('teft_save', '{oops'); g.store.set('teft_cloud_mock', '"str"');
    const s = await d.loadSave(); assert.deepStrictEqual(s, EMPTY);
    assert.deepStrictEqual(d.migrate({ best: '12', coins: -5, junk: 1 }), { v: 3, best: 12, earned: 0, spent: 0, up: { jumps: 0, magnet: 0 }, floor: 0, startFloor: 1, skin: 'none' });
    assert.deepStrictEqual(d.migrate({ earned: 10, spent: 30, up: { jumps: 9, magnet: -1 } }), { v: 3, best: 0, earned: 10, spent: 30, up: { jumps: 2, magnet: 0 }, floor: 0, startFloor: 1, skin: 'none' });
    g.store.set('teft_save', JSON.stringify({ v: 3, earned: 10, spent: 30 })); g.store.delete('teft_cloud_mock');
    await d.loadSave(); assert.strictEqual(d.coins(), 0, 'spent > earned → баланс 0, не минус');
    assert.deepStrictEqual(d.mergeSaves({ best: 1, earned: 9, spent: 2, up: { jumps: 0, magnet: 1 } }, { best: 5, earned: 2, spent: 4, up: { jumps: 1, magnet: 0 } }),
      { v: 3, best: 5, earned: 9, spent: 4, up: { jumps: 1, magnet: 1 }, floor: 0, startFloor: 1, skin: 'none' });
    assert.deepStrictEqual(d.UP_MAX, { jumps: 2, magnet: 3 });
    // v3: этажи и скин — миграция, зажим стартового этажа, слияние
    assert.deepStrictEqual(d.migrate({ v: 2, best: 1, earned: 2, spent: 0 }).floor, 0);
    const m3 = d.migrate({ floor: 5, startFloor: 9, skin: 'crown' });
    assert.strictEqual(m3.floor, 5); assert.strictEqual(m3.startFloor, 6, 'startFloor ≤ floor + 1'); assert.strictEqual(m3.skin, 'crown');
    assert.strictEqual(d.migrate({ floor: 2, startFloor: 0, skin: 'hat' }).startFloor, 1); assert.strictEqual(d.migrate({ skin: 'hat' }).skin, 'none', 'неизвестный скин → none');
    const mg = d.mergeSaves({ floor: 2, startFloor: 3, skin: 'chef' }, { floor: 4, startFloor: 1, skin: 'none' });
    assert.deepStrictEqual([mg.floor, mg.startFloor, mg.skin], [4, 3, 'chef']);
    assert.strictEqual(d.mergeSaves({ floor: 1, startFloor: 2, skin: 'none' }, { floor: 0, startFloor: 5, skin: 'glasses' }).startFloor, 2, 'зажим после слияния');
    assert.deepStrictEqual(d.SKIN_ORDER, ['none', 'chef', 'glasses', 'crown', 'bow', 'mustache']);
  }
  console.log('test_save ok');
})().catch(e => { console.error(e); process.exit(1); });
