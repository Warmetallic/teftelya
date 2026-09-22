// Headless-окружение: склеивает src/*.js в порядке из index.html (или inline-скрипт из dist/index.html при opts.dist)
// и выполняет в Node без браузера. Возвращает управление: step/tap/key/fire/flush/boot/dbg.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
function readSources(dist) {
  if (dist) {
    const html = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
    return html.slice(html.indexOf('<script>\n') + 9, html.lastIndexOf('</script>'));
  }
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const files = [...html.matchAll(/<script src="src\/([^"]+)"><\/script>/g)].map(m => m[1]);
  if (!files.length) throw new Error('index.html: не найдены <script src="src/...">');
  return files.map(f => {
    const p = path.join(ROOT, 'src', f);
    if (!fs.existsSync(p)) { console.warn('_env: нет файла ' + f + ', пропущен'); return ''; }
    return fs.readFileSync(p, 'utf8');
  }).join('\n');
}
module.exports = function makeEnv(ctx, opts = {}) {
  const src = readSources(opts.dist);
  const noop = () => {};
  const listeners = {};
  const store = new Map();
  const cv = { getContext: () => ctx, addEventListener: (n, f) => { listeners[n] = f; },
    getBoundingClientRect: () => ({ left: 0, top: 0 }), style: {} };
  global.window = global;
  global.document = { getElementById: () => cv, addEventListener: noop, hidden: false };
  Object.defineProperty(global, 'navigator', { value: { language: opts.lang || 'ru-RU' }, configurable: true, writable: true });
  global.innerWidth = opts.width || 480; global.innerHeight = opts.height || 854; global.devicePixelRatio = 1;
  global.addEventListener = (n, f) => { listeners['win:' + n] = f; };
  global.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  global.__TEFT_CFG = { sdkWaitMs: 0, adStubMs: 0, rewardedStubMs: 0 };
  delete global.AudioContext; if (opts.AudioContext) global.AudioContext = opts.AudioContext;
  delete global.YaGames; if (opts.YaGames) global.YaGames = opts.YaGames;
  let cb = null, t = 0;
  global.requestAnimationFrame = f => { cb = f; };
  global.performance = { now: () => t };
  eval(src);
  const flush = async (n = 8) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 2)); };
  return {
    step: () => { t += 16; const f = cb; cb = null; if (f) f(t); },
    tap: (x, y = 400) => listeners.pointerdown({ preventDefault: noop, clientX: x, clientY: y }),
    key: code => listeners['win:keydown']({ code, repeat: false, preventDefault: noop }),
    fire: name => { const f = listeners['win:' + name]; if (f) f({}); },
    flush,
    boot: async () => { await window.__dbg.boot; await flush(); },
    dbg: () => window.__dbg,
    store,
  };
};
