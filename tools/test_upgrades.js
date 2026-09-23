// node tools/test_upgrades.js — каталог апгрейдов: цены, уровни, покупка, эффекты; языки магазина
const assert = require('assert');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
(async () => {
  const g = require('./_env')(ctx); const d = g.dbg(); await d.YG.init(); await d.loadSave();
  assert.strictEqual(d.JUMPS_BASE, 4);
  assert.strictEqual(d.maxJumps(), 4); assert.strictEqual(d.magnetRadius(), 0);
  assert.strictEqual(d.upPrice('jumps'), 80); assert.strictEqual(d.upPrice('magnet'), 60);
  assert.strictEqual(d.upMaxLevel('jumps'), 2); assert.strictEqual(d.upMaxLevel('magnet'), 3);
  assert.ok(!d.canBuy('jumps') && !d.canBuyAny(), 'без монет купить нельзя');
  assert.strictEqual(d.buy('jumps'), false); assert.strictEqual(d.upLevel('jumps'), 0); assert.strictEqual(d.save.spent, 0);
  d.save.earned = 100;
  assert.ok(d.canBuy('jumps') && d.canBuy('magnet') && d.canBuyAny());
  assert.strictEqual(d.buy('jumps'), true);
  assert.strictEqual(d.upLevel('jumps'), 1); assert.strictEqual(d.save.spent, 80); assert.strictEqual(d.coins(), 20);
  assert.strictEqual(d.maxJumps(), 5); assert.strictEqual(d.upPrice('jumps'), 300);
  assert.deepStrictEqual(JSON.parse(g.store.get('teft_save')).up, { jumps: 1, magnet: 0 }, 'покупка сохранена сразу');
  assert.ok(!d.canBuy('jumps'), '20 монет на 300 не хватает'); assert.ok(!d.canBuy('magnet'), '20 < 60');
  assert.strictEqual(d.buy('magnet'), false, 'отказ ничего не меняет'); assert.strictEqual(d.save.spent, 80);
  d.save.earned = 2000;
  assert.strictEqual(d.buy('magnet'), true); assert.strictEqual(d.magnetRadius(), 60);
  assert.strictEqual(d.buy('magnet'), true); assert.strictEqual(d.magnetRadius(), 90);
  assert.strictEqual(d.buy('magnet'), true); assert.strictEqual(d.magnetRadius(), 120);
  assert.strictEqual(d.upPrice('magnet'), null); assert.strictEqual(d.buy('magnet'), false, 'на максимуме покупки нет');
  assert.strictEqual(d.buy('jumps'), true); assert.strictEqual(d.maxJumps(), 6); assert.strictEqual(d.buy('jumps'), false);
  assert.strictEqual(d.save.spent, 80 + 60 + 180 + 400 + 300); assert.ok(!d.canBuyAny(), 'всё куплено');
  assert.strictEqual(d.upValue('jumps', 0), 4); assert.strictEqual(d.upValue('magnet', 0), 0); assert.strictEqual(d.upValue('magnet', 2), 90);
  // языки: турецкий, запасная цепочка tr/de → en → ru
  d.setLang('tr'); assert.strictEqual(d.lang, 'tr'); assert.strictEqual(d.T('shop'), 'Mağaza'); assert.strictEqual(d.T('again'), 'Tekrar');
  d.setLang('de'); assert.strictEqual(d.lang, 'en'); assert.strictEqual(d.T('shop'), 'Shop');
  d.setLang('ru'); assert.strictEqual(d.T('up.jumps'), 'Заряды прыжка'); assert.strictEqual(d.T('buy'), 'Купить');
  console.log('test_upgrades ok');
})().catch(e => { console.error(e); process.exit(1); });
