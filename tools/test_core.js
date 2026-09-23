// node tools/test_core.js — core (вьюпорт, координаты), i18n, audio mute
const assert = require('assert');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
class FakeAC { constructor() { this.state = 'running'; this.destination = {}; this.currentTime = 0; this.created = 0; }
  createOscillator() { this.created++; const g = { connect: () => g }; return { type: '', frequency: { setValueAtTime: noop, exponentialRampToValueAtTime: noop }, connect: () => g, start: noop, stop: noop }; }
  createGain() { const g = { gain: { setValueAtTime: noop, exponentialRampToValueAtTime: noop }, connect: () => g }; return g; }
  resume() { this.state = 'running'; } suspend() { this.state = 'suspended'; } }
let ac;
const AC = class extends FakeAC { constructor() { super(); ac = this; } };

{ // портрет 480x854: масштаб 1, смещений нет
  const g = require('./_env')(ctx, { AudioContext: AC }); const d = g.dbg();
  assert.strictEqual(d.view.scale, 1); assert.strictEqual(d.view.offX, 0);
  const b = d.fieldBounds(); assert.deepStrictEqual(b, { x0: 0, x1: 480, y0: 0, y1: 854 });
  assert.deepStrictEqual(d.toGame({ clientX: 100, clientY: 200 }), [100, 200]);
  // i18n
  d.setLang('ru'); assert.strictEqual(d.T('again'), 'Ещё раз'); assert.strictEqual(d.lang, 'ru');
  d.setLang('de'); assert.strictEqual(d.T('again'), 'Again'); assert.strictEqual(d.lang, 'en', 'хук lang живой, не снимок');
  assert.strictEqual(d.T('no.such.key'), 'no.such.key');
  d.setLang('en'); assert.strictEqual(d.T('item.hair'), 'hair');
  // audio: после mute звук не создаётся, после unmute — создаётся
  d.tone(200, 300, 0.1); assert.strictEqual(ac.created, 1);
  d.muteAudio(); assert.strictEqual(ac.state, 'suspended'); assert.strictEqual(d.audioMuted, true); d.tone(200, 300, 0.1); assert.strictEqual(ac.created, 1);
  d.unmuteAudio(); assert.strictEqual(ac.state, 'running'); assert.strictEqual(d.audioMuted, false); d.tone(200, 300, 0.1); assert.strictEqual(ac.created, 2);
}
{ // десктоп 1280x720: поле по центру, тап в центре окна = центр поля по x
  const g = require('./_env')(ctx, { width: 1280, height: 720, lang: 'en-US' }); const d = g.dbg();
  assert.strictEqual(d.lang, 'en', 'язык до setLang берётся из navigator');
  const s = Math.min(1280 / 480, 720 / 854);
  assert.ok(Math.abs(d.view.scale - s) < 1e-9);
  const [x, y] = d.toGame({ clientX: 640, clientY: 360 });
  assert.ok(Math.abs(x - 240) < 1e-6, 'x центра = 240, получили ' + x);
  assert.ok(Math.abs(y - 360 / s) < 1e-6);
  const b = d.fieldBounds(); assert.ok(b.x0 < -400 && b.x1 > 880, 'бока видны в координатах поля');
}
console.log('test_core ok');
