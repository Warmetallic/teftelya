// node tools/test_save.js — загрузка/слияние/миграция/запись сохранений
const assert = require('assert');
const { fakeYaGames } = require('./test_sdk');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });

(async () => {
  { // пусто везде → нули, миграция старых ключей прототипа
    const g = require('./_env')(ctx); const d = g.dbg(); await d.YG.init();
    const s = await d.loadSave(); assert.deepStrictEqual(s, { v: 1, best: 0, coins: 0 });
    g.store.set('teft_best', '42'); g.store.set('teft_coins', '7'); g.store.delete('teft_save');
    const s2 = await d.loadSave(); assert.strictEqual(s2.best, 42); assert.strictEqual(s2.coins, 7);
    assert.ok(!g.store.has('teft_best'), 'старые ключи удалены');
    assert.deepStrictEqual(JSON.parse(g.store.get('teft_save')), { v: 1, best: 42, coins: 7 }, 'резерв записан');
    assert.deepStrictEqual(JSON.parse(g.store.get('teft_cloud_mock')), { v: 1, best: 42, coins: 7 }, 'облако-заглушка записано');
  }
  { // облако и локаль расходятся → поле-по-полю максимум, оба хранилища выровнены
    const log = []; const g = require('./_env')(ctx, { YaGames: fakeYaGames(log, { cloud: { v: 1, best: 10, coins: 3 } }) });
    const d = g.dbg(); await d.YG.init();
    g.store.set('teft_save', JSON.stringify({ v: 1, best: 4, coins: 20 }));
    const s = await d.loadSave(); await g.flush();
    assert.deepStrictEqual(s, { v: 1, best: 10, coins: 20 });
    assert.deepStrictEqual(JSON.parse(g.store.get('teft_save')), { v: 1, best: 10, coins: 20 });
    assert.ok(log.includes('setData'), 'облако дописано');
    assert.deepStrictEqual(await d.YG.getData(), { v: 1, best: 10, coins: 20 });
    // persist пишет оба хранилища
    d.save.best = 55; d.save.coins = 1; d.persist(); await g.flush();
    assert.deepStrictEqual(JSON.parse(g.store.get('teft_save')), { v: 1, best: 55, coins: 1 });
    assert.deepStrictEqual(await d.YG.getData(), { v: 1, best: 55, coins: 1 });
  }
  { // мусор в хранилищах не роняет загрузку
    const g = require('./_env')(ctx); const d = g.dbg(); await d.YG.init();
    g.store.set('teft_save', '{oops'); g.store.set('teft_cloud_mock', '"str"');
    const s = await d.loadSave(); assert.deepStrictEqual(s, { v: 1, best: 0, coins: 0 });
    assert.deepStrictEqual(d.migrate({ best: '12', coins: -5, junk: 1 }), { v: 1, best: 12, coins: 0 });
    assert.deepStrictEqual(d.mergeSaves({ best: 1, coins: 9 }, { best: 5, coins: 2 }), { v: 1, best: 5, coins: 9 });
  }
  console.log('test_save ok');
})().catch(e => { console.error(e); process.exit(1); });
