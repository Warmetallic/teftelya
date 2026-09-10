// Headless-окружение для запуска teftelya.html в Node без браузера.
const fs = require('fs'), path = require('path');
module.exports = function makeEnv(ctx) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'teftelya.html'), 'utf8');
  const src = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
  const noop = () => {};
  const listeners = {};
  const cv = { getContext: () => ctx, addEventListener: (n, f) => listeners[n] = f, getBoundingClientRect: () => ({ left: 0, top: 0 }), style: {} };
  global.window = global; global.document = { getElementById: () => cv };
  global.innerWidth = 480; global.innerHeight = 854; global.devicePixelRatio = 1;
  global.addEventListener = noop; global.localStorage = { getItem: () => null, setItem: noop };
  let cb = null; global.requestAnimationFrame = f => { cb = f; }; global.performance = { now: () => 0 };
  eval(src);
  let t = 0;
  return { step: () => { t += 16; const f = cb; cb = null; f(t); }, tap: x => listeners.pointerdown({ preventDefault: noop, clientX: x, clientY: 400 }) };
};
