// node tools/smoke.js — прогон 6000 кадров со случайными тапами, падает при любой ошибке.
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
const g = require('./_env')(ctx);
for (let i = 0; i < 6000; i++) { if (i % 25 === 0) g.tap(Math.random() * 480); g.step(); }
console.log('smoke ok');
