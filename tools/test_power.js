// node tools/test_power.js — суперсила: очки и «Кураж», удар и «Стойкость», лимит и «Запал», активация, берсерк и «Аппетит»
const assert = require('assert');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
(async () => {
  const g = require('./_env')(ctx); const d = g.dbg(); const p = d.power;
  d.resetPower(); assert.strictEqual(d.POWER_FULL, 30); assert.strictEqual(d.berserkLimit(), 1); assert.strictEqual(d.berserkDur(), 6);
  assert.ok(!d.isBerserk() && !d.powerReady() && !d.powerSpent());
  // очки копятся до полной шкалы; 'ready' ровно один раз, выше полной шкала не растёт
  for (let i = 0; i < 29; i++) assert.strictEqual(d.powerAdd(1), null);
  assert.strictEqual(d.powerAdd(1), 'ready'); assert.ok(d.powerReady()); assert.strictEqual(d.powerAdd(3), null); assert.strictEqual(p.v, 30);
  // активация: берсерк, шкала пустая, лимит один — второй раз нельзя, очки больше не идут
  assert.ok(d.activatePower()); assert.ok(d.isBerserk()); assert.strictEqual(p.v, 0); assert.strictEqual(p.used, 1); assert.ok(!d.activatePower(), 'второй раз нельзя');
  assert.strictEqual(d.powerAdd(5), null); assert.strictEqual(p.v, 0, 'в берсерке шкала не копится');
  let end = null; for (let i = 0; i < 400 && !end; i++) end = d.updatePower(0.016); assert.strictEqual(end, 'berserkEnd'); assert.ok(!d.isBerserk());
  assert.ok(d.powerSpent(), 'лимит на башню исчерпан'); d.powerAdd(30); assert.strictEqual(p.v, 0, 'после лимита очки не начисляются'); assert.ok(!d.powerReady());
  // «Запал» добавляет берсерк на башню, потолок 2
  d.save.up.fury = 1; assert.strictEqual(d.berserkLimit(), 2); assert.ok(!d.powerSpent()); assert.strictEqual(d.powerAdd(30), 'ready'); assert.ok(d.activatePower()); assert.strictEqual(p.used, 2);
  d.endBerserk(); assert.ok(d.powerSpent()); d.save.up.fury = 9; assert.strictEqual(d.berserkLimit(), 3, 'потолок «Запала» — 2'); d.save.up.fury = 0;
  // удар отнимает четверть полной шкалы, «Стойкость» — половину и четверть от этого; серия для мух обнуляется
  d.resetPower(); d.powerAdd(20); d.flyStreakAdd(7); d.powerHit(); assert.strictEqual(p.v, 12.5); assert.strictEqual(p.flyStreak, 0);
  d.save.up.grit = 1; d.powerHit(); assert.strictEqual(p.v, 8.75); d.save.up.grit = 2; d.powerHit(); assert.strictEqual(p.v, 6.875); d.save.up.grit = 0;
  d.resetPower(); d.powerHit(); assert.strictEqual(p.v, 0, 'не ниже нуля');
  // «Кураж» ускоряет зарядку: +15 % за уровень, потолок 2
  d.resetPower(); d.save.up.nerve = 2; d.powerAdd(10); assert.ok(Math.abs(p.v - 13) < 1e-9); d.save.up.nerve = 5; d.powerAdd(10); assert.ok(Math.abs(p.v - 26) < 1e-9, 'выше потолка не быстрее'); d.save.up.nerve = 0;
  // «Аппетит» удлиняет берсерк; смерть его заканчивает
  d.save.up.appetite = 4; assert.strictEqual(d.berserkDur(), 8); d.save.up.appetite = 0;
  d.resetPower(); d.powerAdd(30); d.activatePower(); d.flyStreakAdd(3); d.endBerserk(); assert.ok(!d.isBerserk()); assert.strictEqual(p.flyStreak, 0); assert.strictEqual(d.updatePower(0.016), null);
  console.log('test_power ok');
})().catch(e => { console.error(e); process.exit(1); });
