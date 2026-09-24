// node tools/test_streak.js — серия: порог по «Куражу», удержание по «Стойкости», жизненный цикл берсерка
const assert = require('assert');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
(async () => {
  const g = require('./_env')(ctx); const d = g.dbg(); const s = d.streak;
  d.resetStreak(); assert.strictEqual(d.berserkThreshold(), 12); assert.strictEqual(d.berserkDur(), 6); assert.ok(!d.isBerserk());
  for (let i = 0; i < 11; i++) assert.strictEqual(d.streakAdd(1), null);
  assert.strictEqual(s.n, 11); assert.strictEqual(d.streakAdd(1), 'berserkStart'); assert.ok(d.isBerserk()); assert.strictEqual(s.n, 0);
  assert.strictEqual(d.streakAdd(5), null, 'в берсерке серия не копится'); assert.strictEqual(s.n, 0);
  let end = null; for (let i = 0; i < 400 && !end; i++) end = d.updateStreak(0.016); assert.strictEqual(end, 'berserkEnd'); assert.ok(!d.isBerserk());
  // удар: база обнуляет, стойкость оставляет долю
  d.resetStreak(); d.streakAdd(8); d.streakHit(); assert.strictEqual(s.n, 0);
  d.save.up.grit = 1; d.streakAdd(8); d.streakHit(); assert.strictEqual(s.n, 4); d.save.up.grit = 2; d.streakAdd(4); d.streakHit(); assert.strictEqual(s.n, 6); d.save.up.grit = 0;
  // кураж снижает порог, аппетит удлиняет берсерк; выше потолка — не ниже 8
  d.save.up.nerve = 2; assert.strictEqual(d.berserkThreshold(), 8); d.save.up.nerve = 5; assert.strictEqual(d.berserkThreshold(), 8); d.save.up.nerve = 0;
  d.save.up.appetite = 4; assert.strictEqual(d.berserkDur(), 8); d.save.up.appetite = 0;
  d.resetStreak(); d.streakAdd(3); assert.strictEqual(s.best, 3); assert.strictEqual(d.updateStreak(0.016), null);
  console.log('test_streak ok');
})().catch(e => { console.error(e); process.exit(1); });
