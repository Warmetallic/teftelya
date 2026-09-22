# Этап 1. Фундамент + Yandex Games SDK — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Разбить прототип на модули, подключить Yandex Games SDK (реклама, сохранения, пауза, обязательные вызовы) через обёртку с заглушкой, добавить «Продолжить» и «Монеты ×2», локализацию ru/en, десктопный вьюпорт и сборку в один `dist/index.html` + zip.

**Architecture:** Обычные скрипты `src/*.js`, подключаемые по порядку из `index.html`; верхнеуровневые `const/let/function` видны между файлами, зависимости только «вниз» по списку. Headless-окружение `tools/_env.js` склеивает те же файлы и выполняет их в Node с моками DOM, что даёт юнит-тесты и smoke без браузера. `tools/build.js` вклеивает все файлы в один IIFE внутри `index.html` и пакует zip.

**Tech Stack:** Vanilla JS (ES2020), Canvas 2D, WebAudio, Node 22 для тулинга (без npm-зависимостей; `canvas` — только для скриншотов), системный `zip`.

**Spec:** `docs/specs/2026-09-10-foundation-sdk-design.md` — план аргументирует от него; исполнитель читает оба.

## Global Constraints

- Логическое поле `W = 480, H = 854`; холст занимает всё окно, поле по центру, бока за пределами поля залиты фоном и затемнены на 35 %.
- SDK подключается тегом `<script src="/sdk.js" async></script>` (относительный путь — требование модерации при загрузке архива в консоль). Ожидание `window.YaGames` не более `CFG.sdkWaitMs = 3000` мс, иначе заглушка.
- Обязательные вызовы: `ysdk.features.LoadingAPI.ready()` один раз, когда отрисован титул; `GameplayAPI.start()` при входе в игру, после паузы и после рекламы; `GameplayAPI.stop()` при смерти, перед любой рекламой и при паузе. Не слать `start` дважды подряд и `stop` без `start`.
- События паузы: `ysdk.on('game_api_pause', cb)` / `ysdk.on('game_api_resume', cb)`; при паузе — mute и полная остановка `update`.
- Межстраничная реклама только по тапу «Ещё раз»; не на первом рестарте сессии; не чаще `AD_INTERVAL = 180` с с прошлого успешного показа любой рекламы. Rewarded без лимита; «Продолжить» один раз за забег; «Монеты ×2» один раз и только при `runCoins >= DOUBLE_MIN_COINS = 10`.
- «Продолжить»: тарелка `{x: W/2, y: camY + H - 90, w: 220}`, масса `max(massAtDeath, 3)`, полные заряды, неуязвимость 1.5 с, предметы в радиусе 120 удаляются.
- Сохранение `{ v: 1, best, coins }`: при загрузке поле-по-полю максимум облака и локали; запись только при смерти и наградах.
- Язык: `ru` → русский, всё остальное → английский. Все видимые строки через `T(key)`.
- Никаких `TBD`/`TODO` в коде; каждый модуль заканчивается `expose({...})` (функция в core.js; сохраняет геттеры/сеттеры, в отличие от `Object.assign`, который вызывает геттер один раз) с хуками для headless-тестов.
- Каждая задача: тест → красный → код → зелёный → `node tools/smoke.js` (когда он есть) → коммит с `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Карта файлов

| Файл | Ответственность |
|---|---|
| `index.html` | dev-страница: стили, тег SDK, список `<script src="src/…">` между маркерами `<!-- src -->` и `<!-- /src -->` |
| `src/core.js` | `CFG`, `W/H`, `cv/ctx`, `view`, `resize`, `rnd/clamp/lerp`, `toGame`, `beginField`, `fieldBounds`, `DBG` |
| `src/i18n.js` | `STR`, `LANG`, `setLang`, `T` |
| `src/audio.js` | `audio`, `tone`, `sfx`, `muteAudio`, `unmuteAudio` |
| `src/sdk.js` | объект `YG`: init, ready, gameplayStart/Stop, showInterstitial, showRewarded, onPause/onResume, getData/setData, `_storage`, `adStub`, `log` |
| `src/save.js` | `save`, `migrate`, `mergeSaves`, `loadSave`, `persist` |
| `src/ball.js` | `ball`, `N`, `radiusFor`, `heavy`, `initBody`, `deform`, `squash`, `pulse`, `jolt`, `updateBody` |
| `src/world.js` | `FOOD`, `TRASH`, `pick`, `colorOf`, состояние `camY, spawnedTo, tGame, items, plates, particles, texts`, `spawn`, `burst`, `crumbs`, `popText`, `loseMeat`, `updateFx` |
| `src/game.js` | константы правил, `state`, `maxHeight, runCoins, usedContinue, usedDouble, invuln, massAtDeath`, `reset`, `jump`, `eat`, `wallHit`, `die`, `continueRun`, `doubleCoins`, `updateRun`, `update` |
| `src/render.js` | `drawBg`, `drawItem`, `chunk`, `drawBall`, `drawHUD`, `drawWorld` |
| `src/screens.js` | `buttons`, `hitButton`, `rrect`, `dim`, `button`, `titleScreen`, `resultsScreen`, `pausedScreen`, `adStubScreen`, `loadingScreen` |
| `src/main.js` | `boot`, `pauseGame/resumeGame`, `onTap`, `restart/tryContinue/tryDouble`, ввод, `draw`, `frame` |
| `tools/_env.js` | headless-окружение: моки DOM, `step/tap/key/fire/flush/boot/dbg` |
| `tools/test_core.js`, `test_sdk.js`, `test_save.js`, `test_game.js`, `test_render.js` | юнит-тесты по задачам |
| `tools/smoke.js` | полный поток экранов на заглушке и на фальшивом `YaGames` |
| `tools/shot.js` | скриншоты в `shots/` (node-canvas) |
| `tools/build.js` | `dist/index.html` + `dist/teftelya.zip`, smoke по собранному файлу |
| `package.json` | скрипты `test`, `shot`, `build`; без зависимостей |
| `README.md`, `docs/DEVLOG.md` | текущее состояние и журнал |

---

### Task 1: Каркас — index.html, headless-окружение, core/i18n/audio

**Files:**
- Create: `index.html`, `src/core.js`, `src/i18n.js`, `src/audio.js`, `tools/_env.js` (перезаписать), `tools/test_core.js`

**Interfaces:**
- Produces: `CFG {sdkWaitMs, adStubMs, rewardedStubMs, manualBoot}`, `W, H, cv, ctx, view {scale, offX, offY, winW, winH, dpr}`, `resize()`, `rnd/clamp/lerp`, `toGame(e) → [x, y]`, `beginField()`, `fieldBounds() → {x0, x1, y0, y1}`, `DBG` (= `window.__dbg`), `setLang(code)`, `T(key) → string`, `audio()`, `tone(f0, f1, dur, type, vol)`, `sfx {jump, eat, big, hit, die}`, `muteAudio()`, `unmuteAudio()`.
- `tools/_env.js` экспортирует `makeEnv(ctx, opts) → { step, tap(x, y), key(code), fire(winEvent), flush(n), boot(), dbg(), store }`; `boot()` вызывает `DBG.startBoot()` (main.js) и ждёт загрузку; `opts = { width, height, lang, YaGames, dist }`. Файлы из `index.html`, которых ещё нет, пропускаются с предупреждением.

- [ ] **Step 1: Написать index.html** (список скриптов сразу полный — тулинг читает его как единственный источник порядка)

```html
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>Тефтеля</title>
<style>
  html, body { margin:0; padding:0; height:100%; background:#1b1410; overflow:hidden; touch-action:none; -webkit-user-select:none; user-select:none; -webkit-touch-callout:none; }
  canvas { display:block; background:#1b1410; }
</style>
<script src="/sdk.js" async></script>
</head>
<body>
<canvas id="c"></canvas>
<!-- src -->
<script src="src/core.js"></script>
<script src="src/i18n.js"></script>
<script src="src/audio.js"></script>
<script src="src/sdk.js"></script>
<script src="src/save.js"></script>
<script src="src/ball.js"></script>
<script src="src/world.js"></script>
<script src="src/game.js"></script>
<script src="src/render.js"></script>
<script src="src/screens.js"></script>
<script src="src/main.js"></script>
<!-- /src -->
</body>
</html>
```

- [ ] **Step 2: Написать tools/_env.js**

```js
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
  global.__TEFT_CFG = { sdkWaitMs: 0, adStubMs: 0, rewardedStubMs: 0, manualBoot: true }; // тесты стартуют загрузку сами через boot()
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
    boot: async () => { await window.__dbg.startBoot(); await flush(); },
    dbg: () => window.__dbg,
    store,
  };
};
```

- [ ] **Step 3: Написать падающий тест tools/test_core.js**

```js
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
  d.setLang('tr'); assert.strictEqual(d.T('again'), 'Again'); assert.strictEqual(d.lang, 'en', 'хук lang живой, не снимок');
  assert.strictEqual(d.T('no.such.key'), 'no.such.key');
  d.setLang('en'); assert.strictEqual(d.T('item.hair'), 'hair');
  // audio: после mute звук не создаётся, после unmute — создаётся
  d.tone(200, 300, 0.1); assert.strictEqual(ac.created, 1);
  d.muteAudio(); assert.strictEqual(ac.state, 'suspended'); assert.strictEqual(d.audioMuted, true); d.tone(200, 300, 0.1); assert.strictEqual(ac.created, 1);
  d.unmuteAudio(); assert.strictEqual(ac.state, 'running'); assert.strictEqual(d.audioMuted, false); d.tone(200, 300, 0.1); assert.strictEqual(ac.created, 2);
}
{ // десктоп 1280x720: поле по центру, тап в центре окна = центр поля по x
  const g = require('./_env')(ctx, { width: 1280, height: 720 }); const d = g.dbg();
  const s = Math.min(1280 / 480, 720 / 854);
  assert.ok(Math.abs(d.view.scale - s) < 1e-9);
  const [x, y] = d.toGame({ clientX: 640, clientY: 360 });
  assert.ok(Math.abs(x - 240) < 1e-6, 'x центра = 240, получили ' + x);
  assert.ok(Math.abs(y - 360 / s) < 1e-6);
  const b = d.fieldBounds(); assert.ok(b.x0 < -400 && b.x1 > 880, 'бока видны в координатах поля');
}
console.log('test_core ok');
```

- [ ] **Step 4: Запустить тест, убедиться, что падает**

Run: `node tools/test_core.js`
Expected: FAIL — `TypeError: Cannot read properties of undefined` (нет `window.__dbg`, файлы src отсутствуют).

- [ ] **Step 5: Написать src/core.js**

```js
'use strict';
// ---------- core: конфиг, константы, утилиты, холст ----------
// __TEFT_CFG выставляют тесты (нулевые задержки SDK и рекламы-заглушки)
const CFG = Object.assign({ sdkWaitMs: 3000, adStubMs: 1000, rewardedStubMs: 1500, manualBoot: false }, window.__TEFT_CFG || {});
const W = 480, H = 854;                        // логическое поле
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const view = { scale: 1, offX: 0, offY: 0, winW: W, winH: H, dpr: 1 };
function resize() {
  const dpr = window.devicePixelRatio || 1;
  const winW = Math.max(1, window.innerWidth | 0), winH = Math.max(1, window.innerHeight | 0);
  const s = Math.min(winW / W, winH / H);
  view.scale = s; view.dpr = dpr; view.winW = winW; view.winH = winH;
  view.offX = (winW - W * s) / 2; view.offY = (winH - H * s) / 2;
  cv.width = Math.round(winW * dpr); cv.height = Math.round(winH * dpr);
  cv.style.width = winW + 'px'; cv.style.height = winH + 'px';
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
// событие указателя → координаты поля (могут выходить за 0..W, если тап по боковой зоне)
function toGame(e) {
  const rect = cv.getBoundingClientRect();
  const t = e.touches ? e.touches[0] : e;
  return [(t.clientX - rect.left - view.offX) / view.scale, (t.clientY - rect.top - view.offY) / view.scale];
}
// трансформация «координаты поля → пиксели холста»; вызывать в начале кадра
function beginField() {
  const k = view.scale * view.dpr;
  ctx.setTransform(k, 0, 0, k, view.offX * view.dpr, view.offY * view.dpr);
}
// границы всего холста в координатах поля
function fieldBounds() {
  return { x0: (0 - view.offX) / view.scale, x1: W + view.offX / view.scale, y0: (0 - view.offY) / view.scale, y1: H + view.offY / view.scale };
}
// хуки для headless-тестов; каждый модуль добавляет свои
const DBG = window.__dbg = {};
// expose: копирует и обычные значения, и геттеры/сеттеры (Object.assign вызвал бы геттер один раз и сохранил снимок)
function expose(o) { Object.defineProperties(DBG, Object.getOwnPropertyDescriptors(o)); }
expose({ view, toGame, fieldBounds, resize });
```

- [ ] **Step 6: Написать src/i18n.js**

```js
'use strict';
// ---------- i18n: ru + en, остальные языки → en ----------
const STR = {
  ru: {
    title: 'Тефтеля',
    hint1: 'Тап — прыжок.', hint2: 'Тап слева или справа — в ту сторону.', hint3: 'Ешь еду, расти. Волосы и грязь — не ешь.',
    hint4: 'Каждый прыжок тратит заряд, еда возвращает.', hint5: 'Об стену на скорости — теряешь мясо.',
    tapToJump: 'Тапни, чтобы прыгнуть',
    fell: 'Упала', best: 'лучший', runCoins: 'Собрано за забег', total: 'Всего',
    again: 'Ещё раз', continueAd: 'Продолжить', doubleAd: 'Монеты ×2', forAd: 'за рекламу',
    paused: 'Пауза', tapToContinue: 'Тапни, чтобы продолжить',
    mass: 'масса', hairProof: 'волосы не страшны', meatLost: '−1 мясо', pf: 'пф', m: 'м',
    adStub: 'Реклама (заглушка)', loading: 'Загрузка…',
    'item.hair': 'волос', 'item.dirt': 'грязь', 'item.fly': 'муха',
  },
  en: {
    title: 'Meatball',
    hint1: 'Tap to jump.', hint2: 'Tap left or right to jump that way.', hint3: 'Eat food to grow. Avoid hair and dirt.',
    hint4: 'Each jump costs a charge, food refills.', hint5: 'Hit a wall fast — lose meat.',
    tapToJump: 'Tap to jump',
    fell: 'Fell', best: 'best', runCoins: 'Coins this run', total: 'Total',
    again: 'Again', continueAd: 'Continue', doubleAd: 'Coins ×2', forAd: 'watch ad',
    paused: 'Paused', tapToContinue: 'Tap to continue',
    mass: 'mass', hairProof: 'hair-proof', meatLost: '−1 meat', pf: 'pff', m: 'm',
    adStub: 'Ad (stub)', loading: 'Loading…',
    'item.hair': 'hair', 'item.dirt': 'dirt', 'item.fly': 'fly',
  },
};
let LANG = 'ru';
function setLang(code) { LANG = code === 'ru' ? 'ru' : 'en'; }
function T(key) {
  const t = STR[LANG][key];
  if (t !== undefined) return t;
  const f = STR.ru[key];
  return f === undefined ? key : f;
}
expose({ setLang, T, get lang() { return LANG; } });
```

- [ ] **Step 7: Написать src/audio.js**

```js
'use strict';
// ---------- audio: синтез WebAudio, без файлов ----------
let AC = null, audioMuted = false;
function audio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
  if (AC && !audioMuted && AC.state === 'suspended') { try { AC.resume(); } catch (e) {} }
  return AC;
}
function muteAudio() { audioMuted = true; if (AC) { try { AC.suspend(); } catch (e) {} } }
function unmuteAudio() { audioMuted = false; if (AC) { try { AC.resume(); } catch (e) {} } }
function tone(f0, f1, dur, type = 'sine', vol = 0.25) {
  if (audioMuted) return;
  const ac = audio(); if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, ac.currentTime);
  o.frequency.exponentialRampToValueAtTime(f1, ac.currentTime + dur);
  g.gain.setValueAtTime(vol, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
  o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + dur);
}
const sfx = {
  jump: m => tone(220 - m * 8, 420 - m * 10, 0.14, 'sine', 0.2),
  eat:  () => tone(rnd(500, 700), rnd(900, 1200), 0.09, 'triangle', 0.18),
  big:  () => { tone(300, 160, 0.18, 'square', 0.12); tone(600, 900, 0.12, 'triangle', 0.15); },
  hit:  () => tone(140, 60, 0.25, 'sawtooth', 0.22),
  die:  () => { tone(300, 40, 0.6, 'sawtooth', 0.25); },
};
expose({ tone, muteAudio, unmuteAudio, get audioMuted() { return audioMuted; } });
```

- [ ] **Step 8: Запустить тест, убедиться, что проходит**

Run: `node tools/test_core.js`
Expected: предупреждения `_env: нет файла sdk.js, пропущен` (и остальных) и `test_core ok`.

- [ ] **Step 9: Коммит**

```bash
git add index.html src/core.js src/i18n.js src/audio.js tools/_env.js tools/test_core.js
git commit -m "feat: каркас модулей — index.html, core/i18n/audio, headless-окружение

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 2: Обёртка SDK `YG` с заглушкой

**Files:**
- Create: `src/sdk.js`, `tools/test_sdk.js`

**Interfaces:**
- Consumes: `CFG` (core.js).
- Produces: объект `YG` — `init() → Promise<void>` (никогда не отклоняется), `isMock: boolean`, `lang: string`, `ready()`, `gameplayStart()`, `gameplayStop()`, `gameplayActive: boolean`, `showInterstitial() → Promise<{shown}>`, `showRewarded() → Promise<{rewarded}>`, `onPause(cb)`, `onResume(cb)`, `getData() → Promise<object|null>`, `setData(obj) → Promise<void>`, `_storage` (safe storage | localStorage | null), `adStub: null | {kind, until}`, `log: string[]` (`'ready'|'start'|'stop'|'inter'|'reward'`).

- [ ] **Step 1: Написать падающий тест tools/test_sdk.js**

```js
// node tools/test_sdk.js — YG: заглушка и фальшивый YaGames
const assert = require('assert');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });

// Фальшивый YaGames c журналом вызовов реального API
function fakeYaGames(log, opts = {}) {
  return { init: async () => ({
    environment: { i18n: { lang: opts.lang || 'en' }, app: { id: '1' } },
    features: { LoadingAPI: { ready: () => log.push('ready') }, GameplayAPI: { start: () => log.push('start'), stop: () => log.push('stop') } },
    adv: {
      showFullscreenAdv: ({ callbacks }) => { log.push('inter'); setTimeout(() => callbacks.onClose(!opts.adFails), 0); },
      showRewardedVideo: ({ callbacks }) => { log.push('reward'); setTimeout(() => { if (!opts.noReward) callbacks.onRewarded(); callbacks.onClose(); }, 0); },
    },
    on: (ev, cb) => log.push('on:' + ev), off: noop,
    getPlayer: async () => ({ _d: opts.cloud || {}, getData: async function () { return this._d; }, setData: async function (d) { this._d = d; log.push('setData'); } }),
    getStorage: async () => global.localStorage,
  }) };
}
module.exports = { fakeYaGames };
if (require.main !== module) return;

(async () => {
  { // заглушка: YaGames нет
    const g = require('./_env')(ctx); const YG = g.dbg().YG;
    await YG.init();
    assert.strictEqual(YG.isMock, true); assert.strictEqual(YG.lang, 'ru');
    YG.ready(); YG.ready(); assert.deepStrictEqual(YG.log, ['ready'], 'ready один раз');
    YG.gameplayStop(); YG.gameplayStart(); YG.gameplayStart(); YG.gameplayStop(); YG.gameplayStop();
    assert.deepStrictEqual(YG.log, ['ready', 'start', 'stop'], 'start/stop идемпотентны');
    YG.gameplayStart();
    const p = YG.showInterstitial();
    assert.strictEqual(YG.gameplayActive, false, 'реклама останавливает геймплей');
    assert.ok(YG.adStub && YG.adStub.kind === 'interstitial', 'заглушка показывает оверлей');
    assert.deepStrictEqual(await p, { shown: true }); assert.strictEqual(YG.adStub, null);
    assert.deepStrictEqual(await YG.showRewarded(), { rewarded: true });
    assert.strictEqual(await YG.getData(), null);
    await YG.setData({ v: 1, best: 5, coins: 7 });
    assert.deepStrictEqual(await YG.getData(), { v: 1, best: 5, coins: 7 }, 'облако-заглушка живёт в localStorage');
    YG.onPause(noop); YG.onResume(noop); // не падают без ysdk
  }
  { // реальный путь: фальшивый YaGames
    const log = []; const g = require('./_env')(ctx, { YaGames: fakeYaGames(log, { cloud: { best: 3 } }) }); const YG = g.dbg().YG;
    await YG.init();
    assert.strictEqual(YG.isMock, false); assert.strictEqual(YG.lang, 'en');
    YG.ready(); YG.gameplayStart(); YG.gameplayStop();
    assert.deepStrictEqual(log, ['ready', 'start', 'stop']);
    assert.deepStrictEqual(await YG.showInterstitial(), { shown: true });
    assert.deepStrictEqual(await YG.showRewarded(), { rewarded: true });
    assert.deepStrictEqual(await YG.getData(), { best: 3 });
    await YG.setData({ best: 9 }); assert.deepStrictEqual(await YG.getData(), { best: 9 });
    assert.ok(log.includes('setData'));
    YG.onPause(noop); assert.ok(log.includes('on:game_api_pause'));
  }
  { // реклама не показана / награды нет / init упал — промисы всё равно резолвятся
    const log = []; const g = require('./_env')(ctx, { YaGames: fakeYaGames(log, { adFails: true, noReward: true }) }); const YG = g.dbg().YG;
    await YG.init();
    assert.deepStrictEqual(await YG.showInterstitial(), { shown: false });
    assert.deepStrictEqual(await YG.showRewarded(), { rewarded: false });
    const g2 = require('./_env')(ctx, { YaGames: { init: async () => { throw new Error('boom'); } } }); const YG2 = g2.dbg().YG;
    await YG2.init(); assert.strictEqual(YG2.isMock, true, 'сбой init → заглушка');
  }
  console.log('test_sdk ok');
})().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Запустить тест, убедиться, что падает**

Run: `node tools/test_sdk.js`
Expected: FAIL — `TypeError: Cannot read properties of undefined (reading 'init')` (нет `YG`).

- [ ] **Step 3: Написать src/sdk.js**

```js
'use strict';
// ---------- Yandex Games SDK: единая обёртка YG над реальным ysdk или заглушкой ----------
const YG = {
  ysdk: null, isMock: true, lang: 'ru',
  gameplayActive: false, readySent: false,
  adStub: null,          // { kind: 'interstitial'|'rewarded', until } — оверлей заглушки рисует screens.js
  _player: null, _playerTried: false, _storage: null,
  log: [],               // журнал для тестов: 'ready' | 'start' | 'stop' | 'inter' | 'reward'
};
function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function _waitFor(pred, maxMs, stepMs = 50) {
  const t0 = Date.now();
  while (!pred()) { if (Date.now() - t0 >= maxMs) return false; await _sleep(Math.min(stepMs, maxMs)); }
  return true;
}
function _feature(name) { const f = YG.ysdk && YG.ysdk.features; return f && f[name]; }
YG.init = async function () {
  const has = await _waitFor(() => typeof window.YaGames !== 'undefined', CFG.sdkWaitMs);
  if (has) {
    try {
      YG.ysdk = await window.YaGames.init();
      YG.isMock = false;
      const env = YG.ysdk.environment;
      YG.lang = (env && env.i18n && env.i18n.lang) || 'ru';
      try { YG._storage = await YG.ysdk.getStorage(); } catch (e) { YG._storage = null; }
    } catch (e) { console.warn('YaGames.init failed, using stub', e); YG.ysdk = null; YG.isMock = true; }
  }
  if (YG.isMock) {
    const nav = (window.navigator && window.navigator.language) || 'ru';
    YG.lang = String(nav).slice(0, 2).toLowerCase();
  }
  if (!YG._storage) { try { YG._storage = window.localStorage || null; } catch (e) { YG._storage = null; } }
};
YG.ready = function () {
  if (YG.readySent) return;
  YG.readySent = true; YG.log.push('ready');
  try { const f = _feature('LoadingAPI'); if (f) f.ready(); } catch (e) {}
};
YG.gameplayStart = function () {
  if (YG.gameplayActive) return;
  YG.gameplayActive = true; YG.log.push('start');
  try { const f = _feature('GameplayAPI'); if (f) f.start(); } catch (e) {}
};
YG.gameplayStop = function () {
  if (!YG.gameplayActive) return;
  YG.gameplayActive = false; YG.log.push('stop');
  try { const f = _feature('GameplayAPI'); if (f) f.stop(); } catch (e) {}
};
YG._stubAd = async function (kind, ms) {
  YG.adStub = { kind, until: Date.now() + ms };
  await _sleep(ms);
  YG.adStub = null;
};
// Межстраничная. Сама останавливает геймплей; возобновление — задача вызывающего.
YG.showInterstitial = function () {
  YG.gameplayStop(); YG.log.push('inter');
  if (YG.isMock) return YG._stubAd('interstitial', CFG.adStubMs).then(() => ({ shown: true }));
  return new Promise(resolve => {
    let done = false; const fin = v => { if (!done) { done = true; resolve(v); } };
    try {
      YG.ysdk.adv.showFullscreenAdv({ callbacks: {
        onClose: wasShown => fin({ shown: !!wasShown }),
        onError: () => fin({ shown: false }),
      } });
    } catch (e) { fin({ shown: false }); }
  });
};
// Rewarded. Награда засчитывается только по onRewarded.
YG.showRewarded = function () {
  YG.gameplayStop(); YG.log.push('reward');
  if (YG.isMock) return YG._stubAd('rewarded', CFG.rewardedStubMs).then(() => ({ rewarded: true }));
  return new Promise(resolve => {
    let rewarded = false, done = false; const fin = () => { if (!done) { done = true; resolve({ rewarded }); } };
    try {
      YG.ysdk.adv.showRewardedVideo({ callbacks: {
        onRewarded: () => { rewarded = true; },
        onClose: () => fin(),
        onError: () => fin(),
      } });
    } catch (e) { fin(); }
  });
};
YG.onPause = function (cb) { try { if (YG.ysdk) YG.ysdk.on('game_api_pause', cb); } catch (e) {} };
YG.onResume = function (cb) { try { if (YG.ysdk) YG.ysdk.on('game_api_resume', cb); } catch (e) {} };
YG._getPlayer = async function () {
  if (YG._player || YG._playerTried || !YG.ysdk) return YG._player;
  YG._playerTried = true;
  try { YG._player = await YG.ysdk.getPlayer({ scopes: false }); } catch (e) { YG._player = null; }
  return YG._player;
};
const CLOUD_MOCK_KEY = 'teft_cloud_mock';
YG.getData = async function () {
  if (YG.isMock) {
    try { const s = YG._storage && YG._storage.getItem(CLOUD_MOCK_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }
  const p = await YG._getPlayer(); if (!p) return null;
  try { const d = await p.getData(); return d && Object.keys(d).length ? d : null; } catch (e) { return null; }
};
YG.setData = async function (obj) {
  if (YG.isMock) { try { if (YG._storage) YG._storage.setItem(CLOUD_MOCK_KEY, JSON.stringify(obj)); } catch (e) {} return; }
  const p = await YG._getPlayer(); if (!p) return;
  try { await p.setData(obj, true); } catch (e) { console.warn('setData failed', e); }
};
expose({ YG });
```

- [ ] **Step 4: Запустить тест, убедиться, что проходит**

Run: `node tools/test_sdk.js && node tools/test_core.js`
Expected: `test_sdk ok`, `test_core ok`.

- [ ] **Step 5: Коммит**

```bash
git add src/sdk.js tools/test_sdk.js
git commit -m "feat: обёртка Yandex Games SDK с заглушкой (реклама, данные, пауза, ready/start/stop)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 3: Сохранения `save.js`

**Files:**
- Create: `src/save.js`, `tools/test_save.js`

**Interfaces:**
- Consumes: `YG.getData/setData/_storage` (sdk.js).
- Produces: `SAVE_VERSION = 1`, `SAVE_KEY = 'teft_save'`, объект `save {v, best, coins}` (единственный источник прогресса в рантайме), `migrate(obj) → save-подобный`, `mergeSaves(a, b)`, `loadSave() → Promise<save>`, `persist()`.

- [ ] **Step 1: Написать падающий тест tools/test_save.js**

```js
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
```

- [ ] **Step 2: Запустить тест, убедиться, что падает**

Run: `node tools/test_save.js`
Expected: FAIL — `TypeError: d.loadSave is not a function`.

- [ ] **Step 3: Написать src/save.js**

```js
'use strict';
// ---------- сохранения: облако Яндекса + локальный резерв, при загрузке максимум по полям ----------
const SAVE_VERSION = 1;
const SAVE_KEY = 'teft_save';
const save = { v: SAVE_VERSION, best: 0, coins: 0 };
// приводит объект любой версии (или мусор) к текущей схеме
function migrate(obj) {
  const o = { v: SAVE_VERSION, best: 0, coins: 0 };
  if (obj && typeof obj === 'object') {
    o.best = Math.max(0, Math.floor(+obj.best || 0));
    o.coins = Math.max(0, Math.floor(+obj.coins || 0));
  }
  return o;
}
function mergeSaves(a, b) {
  return { v: SAVE_VERSION, best: Math.max(a.best || 0, b.best || 0), coins: Math.max(a.coins || 0, b.coins || 0) };
}
function sameSave(a, b) { return a.best === b.best && a.coins === b.coins; }
function _readLocal() {
  const st = YG._storage; if (!st) return null;
  try {
    const raw = st.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
    // миграция с ключей прототипа
    const b = +st.getItem('teft_best') || 0, c = +st.getItem('teft_coins') || 0;
    if (b || c) { st.removeItem('teft_best'); st.removeItem('teft_coins'); const o = { v: 1, best: b, coins: c }; st.setItem(SAVE_KEY, JSON.stringify(o)); return o; }
  } catch (e) {}
  return null;
}
function _writeLocal(obj) { try { if (YG._storage) YG._storage.setItem(SAVE_KEY, JSON.stringify(obj)); } catch (e) {} }
async function loadSave() {
  const cloudRaw = await YG.getData(), localRaw = _readLocal();
  const cloud = migrate(cloudRaw), local = migrate(localRaw);
  const merged = mergeSaves(cloud, local);
  Object.assign(save, merged);
  if (!localRaw || !sameSave(local, merged)) _writeLocal(merged);
  if (!cloudRaw || !sameSave(cloud, merged)) YG.setData(merged);
  return save;
}
// вызывать только при смерти и наградах: лимит облака 100 запросов за 5 минут
function persist() {
  const snap = { v: SAVE_VERSION, best: save.best, coins: save.coins };
  _writeLocal(snap);
  YG.setData(snap);
}
expose({ save, loadSave, persist, migrate, mergeSaves });
```

- [ ] **Step 4: Запустить тесты, убедиться, что проходят**

Run: `node tools/test_save.js && node tools/test_sdk.js && node tools/test_core.js`
Expected: `test_save ok`, `test_sdk ok`, `test_core ok`.

- [ ] **Step 5: Коммит**

```bash
git add src/save.js tools/test_save.js
git commit -m "feat: сохранения — облако + localStorage, слияние по максимуму, миграция ключей прототипа

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 4: Мягкое тело, мир и правила забега (`ball.js`, `world.js`, `game.js`)

**Files:**
- Create: `src/ball.js`, `src/world.js`, `src/game.js`, `tools/test_game.js`

**Interfaces:**
- Consumes: `W, H, rnd, clamp, lerp, DBG` (core), `T` (i18n), `tone, sfx` (audio), `YG` (sdk), `save, persist` (save).
- Produces (ball.js): `N`, `ball {x,y,vx,vy,mass,r,pts,jumps,regen,face,mouth,blink,alive}`, `radiusFor(m)`, `heavy()`, `initBody()`, `deform(fn)`, `squash(a)`, `pulse(a)`, `jolt(px,py,a)`, `updateBody(dt)`.
- Produces (world.js): `FOOD`, `TRASH`, `pick(tbl)`, `colorOf(kind)`, состояние `camY, spawnedTo, tGame, items, plates, particles, texts`, `spawn()`, `burst(x,y,color,n,spd,life,size)`, `crumbs(x,y)`, `popText(x,y,str,color,big)`, `loseMeat(fromX,fromY,n)`, `updateFx(dt)`.
- Produces (game.js): `G, MAXJ, REGEN, WALL_HIT, HAIR_PROOF, CONTINUE_MIN_MASS, INVULN_TIME, DOUBLE_MIN_COINS`, `state` ('title'|'play'|'dead'), `camShake, shakeX, shakeY, maxHeight, runCoins, usedContinue, usedDouble, invuln, massAtDeath`, `coinMult()`, `reset()`, `jump(dir)`, `eat(it)`, `wallHit(wx, speed)`, `die()`, `continueRun()`, `doubleCoins()`, `updateRun(dt)`, `update(dt)`.
- DBG: `ball`, `get camY`, `get items`, `get plates`, `FOOD`, `TRASH`, `get/set state`, `get run → {maxHeight, runCoins, usedContinue, usedDouble, invuln, massAtDeath}`, `setRunCoins(n)`, `reset, jump, die, continueRun, doubleCoins, update`.

- [ ] **Step 1: Написать падающий тест tools/test_game.js**

```js
// node tools/test_game.js — правила забега без рендера: прыжок, еда, мусор, смерть, продолжить, ×2, неуязвимость
const assert = require('assert');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
const item = (d, kind, trash, x, y) => ({ kind, trash, def: trash ? d.TRASH[kind] : d.FOOD[kind], x, y, r: (trash ? d.TRASH : d.FOOD)[kind].r, vx: 0, seed: 0, dead: false });
(async () => {
  const g = require('./_env')(ctx); const d = g.dbg(); await d.YG.init(); await d.loadSave();
  const ball = d.ball;
  // прыжок тратит заряд и даёт скорость вверх; сила не зависит от массы
  d.reset(); d.state = 'play';
  assert.strictEqual(ball.mass, 1); assert.strictEqual(ball.jumps, 4);
  d.jump(1); assert.strictEqual(ball.jumps, 3); assert.strictEqual(ball.vy, -690); assert.ok(ball.vx > 0);
  ball.mass = 9; ball.vy = 0; d.jump(-1); assert.strictEqual(ball.vy, -690); assert.strictEqual(ball.jumps, 2);
  // без зарядов прыжка нет; регенерация +1 за 1.6 с
  d.reset(); d.state = 'play'; ball.jumps = 0; ball.vy = 0;
  d.jump(1); assert.strictEqual(ball.vy, 0);
  for (let i = 0; i < 110; i++) d.update(0.016);
  assert.ok(ball.jumps >= 1, 'заряд восстановился'); assert.strictEqual(d.state, 'play', 'на тарелке не умирает');
  // еда: масса, монеты, заряды; множитель монет от массы
  d.reset(); d.state = 'play';
  d.items.push(item(d, 'meat', false, ball.x, ball.y)); d.update(0.016);
  assert.strictEqual(ball.mass, 3); assert.strictEqual(d.run.runCoins, 5); assert.strictEqual(ball.jumps, 4);
  ball.mass = 5; d.items.push(item(d, 'ketchup', false, ball.x, ball.y)); d.update(0.016);
  assert.strictEqual(d.run.runCoins, 7, 'кетчуп при ×1.5 = 2 монеты');
  // мусор: волос при массе ≥ 6 безвреден, грязь −2
  ball.mass = 6; d.items.push(item(d, 'hair', true, ball.x, ball.y)); d.update(0.016); assert.strictEqual(ball.mass, 6, 'пф');
  d.items.push(item(d, 'dirt', true, ball.x, ball.y)); d.update(0.016); assert.strictEqual(ball.mass, 4);
  // смерть от массы < 1: монеты в сохранение, стоп геймплея
  d.YG.gameplayStart(); const coins0 = d.save.coins; d.setRunCoins(12); ball.mass = 1;
  d.items.push(item(d, 'dirt', true, ball.x, ball.y)); d.update(0.016);
  assert.strictEqual(d.state, 'dead'); assert.strictEqual(ball.alive, false);
  assert.strictEqual(d.save.coins, coins0 + 12); assert.strictEqual(d.YG.log.at(-1), 'stop');
  // продолжить: тарелка внизу, масса ≥ 3, заряды полные, неуязвимость, мусор рядом убран
  const py = d.camY + 854 - 90;
  d.items.push(item(d, 'hair', true, 240, py - 40)); d.continueRun();
  assert.strictEqual(d.state, 'play'); assert.ok(ball.alive); assert.strictEqual(ball.mass, 3); assert.strictEqual(ball.jumps, 4);
  assert.ok(d.run.invuln > 1.4); assert.ok(d.run.usedContinue);
  assert.ok(!d.items.some(it => it.kind === 'hair' && Math.abs(it.y - ball.y) < 200), 'мусор у точки появления удалён');
  assert.ok(d.plates.some(p => p.y === py), 'добавлена тарелка у нижнего края');
  d.items.push(item(d, 'dirt', true, ball.x, ball.y)); d.update(0.016); assert.strictEqual(ball.mass, 3, 'в неуязвимости мусор не бьёт');
  for (let i = 0; i < 120; i++) d.update(0.016);
  assert.strictEqual(d.run.invuln, 0); assert.ok(ball.mass < 3 || d.state === 'dead', 'после неуязвимости мусор бьёт');
  // «Продолжить» с большой массой сохраняет её
  d.reset(); d.state = 'play'; ball.mass = 8; d.die(); d.continueRun(); assert.strictEqual(ball.mass, 8);
  // ×2
  d.reset(); d.state = 'play'; d.setRunCoins(15); d.die();
  const c1 = d.save.coins; d.doubleCoins();
  assert.strictEqual(d.run.runCoins, 30); assert.strictEqual(d.save.coins, c1 + 15); assert.ok(d.run.usedDouble);
  // рекорд высоты и падение за нижний край
  d.reset(); d.state = 'play'; ball.y = -5000; d.update(0.016); assert.ok(d.run.maxHeight >= 499);
  ball.y = d.camY + 854 + 200; d.update(0.016); assert.strictEqual(d.state, 'dead'); assert.ok(d.save.best >= 499);
  // reset сбрасывает флаги забега
  d.reset(); assert.deepStrictEqual([d.run.usedContinue, d.run.usedDouble, d.run.runCoins, d.run.invuln], [false, false, 0, 0]);
  console.log('test_game ok');
})().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Запустить тест, убедиться, что падает**

Run: `node tools/test_game.js`
Expected: FAIL — `TypeError: d.reset is not a function`.

- [ ] **Step 3: Написать src/ball.js** (перенос из прототипа; поля `full`/`hiccup` удалены)

```js
'use strict';
// ---------- мягкое тело тефтели: N точек на пружинах вокруг центра ----------
const N = 26;
const ball = {
  x: W / 2, y: 0, vx: 0, vy: 0,
  mass: 1, r: 26,
  pts: [],          // {ox, oy, vx, vy} — смещения точек от центра
  jumps: 4,         // заряды прыжка
  regen: 0,         // таймер восстановления заряда
  face: 0,          // куда смотрят глаза, -1..1
  mouth: 0,         // 0 закрыт .. 1 открыт
  blink: 0,
  alive: true,
};
function radiusFor(m) { return 26 + 13 * Math.sqrt(Math.max(0, m - 1)); }
function heavy() { return clamp((ball.mass - 1) / 15, 0, 1); } // 0 маленькая .. 1 огромная
function initBody() {
  ball.pts = [];
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2;
    ball.pts.push({ ox: Math.cos(a) * ball.r, oy: Math.sin(a) * ball.r, vx: 0, vy: 0 });
  }
}
// deform: fn(angle, dirx, diry) → {x, y} импульс для каждой точки
function deform(fn) {
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
    const im = fn(a, dx, dy); ball.pts[i].vx += im.x; ball.pts[i].vy += im.y;
  }
}
function squash(amount) { deform((a, dx, dy) => ({ x: dx * amount * 0.8, y: -dy * amount * 1.3 })); } // сплющить
function pulse(amount) { deform((a, dx, dy) => ({ x: dx * amount, y: dy * amount })); }
function jolt(px, py, amount) { // тычок со стороны точки px,py
  const ang = Math.atan2(py - ball.y, px - ball.x);
  deform((a, dx, dy) => { const d = Math.cos(a - ang); return d > 0 ? { x: -dx * amount * d, y: -dy * amount * d } : { x: 0, y: 0 }; });
}
function updateBody(dt) {
  // жёсткость и демпфирование падают с массой: большая тефтеля колышется лениво и дольше
  const k = lerp(260, 120, heavy());
  const damp = lerp(9, 5.5, heavy());
  const nk = 40;
  const lagx = clamp(-ball.vx * 0.04, -16, 16), lagy = clamp(-ball.vy * 0.012, -7, 7);
  for (let i = 0; i < N; i++) {
    const p = ball.pts[i], a = i / N * Math.PI * 2;
    const dx = Math.cos(a), dy = Math.sin(a);
    const tx = dx * ball.r + lagx * (dy * dy), ty = dy * ball.r + lagy * Math.abs(dy);
    let ax = (tx - p.ox) * k - p.vx * damp, ay = (ty - p.oy) * k - p.vy * damp;
    const prev = ball.pts[(i + N - 1) % N], next = ball.pts[(i + 1) % N];
    ax += ((prev.ox + next.ox) / 2 - p.ox) * nk; ay += ((prev.oy + next.oy) / 2 - p.oy) * nk;
    p.vx += ax * dt; p.vy += ay * dt; p.ox += p.vx * dt; p.oy += p.vy * dt;
  }
}
expose({ ball });
```

- [ ] **Step 4: Написать src/world.js**

```js
'use strict';
// ---------- мир забега: каталог предметов, спавн, частицы, всплывающие тексты ----------
const FOOD = {
  ketchup: { r: 15, mass: 1, coins: 1, jumps: 1, w: 5 },
  pasta:   { r: 17, mass: 1, coins: 2, jumps: 2, w: 4 },
  meat:    { r: 21, mass: 2, coins: 5, jumps: 3, w: 2 },
};
const TRASH = {
  hair: { r: 18, mass: -1, w: 5 },
  dirt: { r: 16, mass: -2, w: 3 },
  fly:  { r: 13, mass: -1, w: 3, moving: true },
};
function pick(tbl) {
  const keys = Object.keys(tbl); let sum = 0; keys.forEach(k => sum += tbl[k].w);
  let t = Math.random() * sum;
  for (const k of keys) { t -= tbl[k].w; if (t <= 0) return k; }
  return keys[0];
}
function colorOf(kind) { return { ketchup: '#e3342f', pasta: '#f6c343', meat: '#b5452b', hair: '#222', dirt: '#5a4a3a', fly: '#2b2b2b' }[kind]; }
// состояние мира; сбрасывает game.reset()
let camY = 0, spawnedTo = 0, tGame = 0;
let items = [], plates = [], particles = [], texts = [];
function spawn() {
  while (spawnedTo > camY - 300) {
    const gap = rnd(95, 150);
    spawnedTo -= gap;
    const h = -spawnedTo / 10;
    const trashP = clamp(0.12 + h / 5000, 0.12, 0.5);
    const count = 1 + (Math.random() < 0.55 ? 1 : 0) + (Math.random() < h / 3000 ? 1 : 0);
    const used = [];
    for (let i = 0; i < count; i++) {
      let x, tries = 0;
      do { x = rnd(40, W - 40); tries++; } while (used.some(u => Math.abs(u - x) < 90) && tries < 8);
      used.push(x);
      const isTrash = h > 8 && Math.random() < trashP;
      const key = isTrash ? pick(TRASH) : pick(FOOD);
      const def = isTrash ? TRASH[key] : FOOD[key];
      items.push({ kind: key, trash: isTrash, def, x, y: spawnedTo + rnd(-25, 25), r: def.r,
        vx: def.moving ? (Math.random() < 0.5 ? -1 : 1) * rnd(70, 140) : 0, seed: Math.random() * 10, dead: false });
    }
  }
}
function burst(x, y, color, n, spd = 220, life = 0.6, size = 4) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), s = rnd(spd * 0.3, spd);
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life, t: life, color, size: rnd(size * 0.6, size * 1.4), g: 500 });
  }
}
function crumbs(x, y) {
  for (let i = 0; i < 8; i++) particles.push({ x: x + rnd(-ball.r * 0.6, ball.r * 0.6), y, vx: rnd(-90, 90), vy: rnd(40, 160), life: 0.5, t: 0.5, color: '#a0472a', size: rnd(2, 5), g: 300 });
}
function popText(x, y, str, color, big = false) { texts.push({ x, y, str, color, t: 0, big }); }
function loseMeat(fromX, fromY, n) { // куски фарша отлетают от тефтели
  for (let i = 0; i < n; i++) {
    const a = Math.atan2(ball.y - fromY, ball.x - fromX) + rnd(-1.2, 1.2), sp = rnd(180, 340);
    particles.push({ x: ball.x + Math.cos(a) * ball.r * 0.6, y: ball.y + Math.sin(a) * ball.r * 0.6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120,
      life: 1.1, t: 1.1, color: '#b9542f', size: ball.r * rnd(0.22, 0.34), g: 700, meat: true, rot: rnd(0, 6), rv: rnd(-8, 8) });
  }
}
function updateFx(dt) {
  for (const p of particles) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; }
  particles = particles.filter(p => p.t > 0);
  for (const t of texts) t.t += dt;
  texts = texts.filter(t => t.t < 1);
}
expose({ FOOD, TRASH, get camY() { return camY; }, get items() { return items; }, get plates() { return plates; }, popText });
```

- [ ] **Step 5: Написать src/game.js**

```js
'use strict';
// ---------- забег: правила, столкновения, смерть, «Продолжить», «×2» ----------
const G = 1500;
const MAXJ = 4;                 // максимум зарядов прыжка
const REGEN = 1.6;              // секунд на восстановление заряда без еды
const WALL_HIT = 260;           // скорость удара о стену, отрывающая мясо
const HAIR_PROOF = 6;           // с этой массы волосы не страшны
const CONTINUE_MIN_MASS = 3;    // масса после «Продолжить» не меньше
const INVULN_TIME = 1.5;        // секунд неуязвимости после «Продолжить»
const DOUBLE_MIN_COINS = 10;    // «Монеты ×2» предлагаем от этой суммы
let state = 'title';            // title | play | dead
let camShake = 0, shakeX = 0, shakeY = 0;
let maxHeight = 0, runCoins = 0;
let usedContinue = false, usedDouble = false, invuln = 0, massAtDeath = 0;
function jumpPower() { return 690; } // от массы не зависит — ритм тапов одинаковый всю игру
function coinMult() { return 1 + Math.floor((ball.mass - 1) / 4) * 0.5; } // масса 5 ×1.5, 9 ×2, 13 ×2.5
function reset() {
  ball.x = W / 2; ball.y = 0; ball.vx = 0; ball.vy = 0; ball.mass = 1; ball.r = radiusFor(1);
  ball.jumps = MAXJ; ball.regen = 0; ball.mouth = 0; ball.face = 0; ball.alive = true; initBody();
  camY = -H + 120; items = []; particles = []; texts = []; plates = [{ x: W / 2, y: 30, w: 220 }];
  spawnedTo = -160; maxHeight = 0; runCoins = 0; tGame = 0; camShake = 0;
  usedContinue = false; usedDouble = false; invuln = 0; massAtDeath = 0;
}
// прыжок в сторону dir (-1 влево, +1 вправо)
function jump(dir) {
  if (!ball.alive) return;
  if (ball.jumps <= 0) { deform((a, dx, dy) => ({ x: 0, y: -dy * 90 })); tone(160, 90, 0.12, 'sine', 0.12); return; }
  ball.jumps--;
  const p = jumpPower();
  ball.vy = -p;
  const side = lerp(250, 150, heavy()); // тяжёлая хуже слушается
  ball.vx = clamp(ball.vx * lerp(0.35, 0.75, heavy()) + dir * side, -420, 420);
  squash(p * 0.55);
  crumbs(ball.x, ball.y + ball.r * 0.8);
  sfx.jump(ball.mass);
  ball.blink = 0.08;
}
function eat(it) {
  const d = it.def;
  if (!it.trash) {
    it.dead = true;
    const gain = Math.round(d.coins * coinMult());
    ball.mass += d.mass; runCoins += gain;
    ball.jumps = Math.min(MAXJ, ball.jumps + d.jumps);
    ball.mouth = 1;
    pulse(140 * d.mass);
    burst(it.x, it.y, colorOf(it.kind), 10 + d.mass * 6, 260, 0.5, 5);
    popText(it.x, it.y - 20, '+' + gain, '#ffe08a', d.mass > 1 || coinMult() > 1);
    if (d.mass > 1) { camShake = 6; sfx.big(); } else sfx.eat();
    return;
  }
  if (invuln > 0) return; // после «Продолжить» мусор пролетает сквозь
  it.dead = true;
  if (it.kind === 'hair' && ball.mass >= HAIR_PROOF) {
    burst(it.x, it.y, '#222', 6, 160, 0.4, 2);
    popText(it.x, it.y - 20, T('pf'), 'rgba(255,255,255,0.7)');
    tone(700, 300, 0.06, 'square', 0.08);
    return;
  }
  ball.mass += d.mass;
  jolt(it.x, it.y, 260);
  loseMeat(it.x, it.y, -d.mass * 2);
  burst(it.x, it.y, '#6b6b6b', 12, 200, 0.5, 3);
  popText(it.x, it.y - 20, T('item.' + it.kind), '#ff7a6b', true);
  camShake = 10; sfx.hit();
  ball.vy = Math.min(ball.vy + 200, 400); ball.vx *= 0.5;
  if (ball.mass < 1) die();
}
function wallHit(wx, speed) {
  jolt(wx, ball.y, 200);
  if (speed > WALL_HIT && ball.mass > 1 && invuln <= 0) {
    ball.mass -= 1; loseMeat(wx, ball.y, 2); camShake = 9; sfx.hit();
    popText(ball.x, ball.y - ball.r - 10, T('meatLost'), '#ff7a6b', true);
  } else if (speed > 120) crumbs(ball.x, ball.y);
}
function die() {
  if (!ball.alive) return;
  massAtDeath = ball.mass;
  ball.alive = false; state = 'dead'; tGame = 0;
  sfx.die(); camShake = 16;
  burst(ball.x, ball.y, '#b9542f', 40, 380, 0.9, 6);
  save.coins += runCoins; if (maxHeight > save.best) save.best = maxHeight;
  persist();
  YG.gameplayStop();
}
// «Продолжить» после rewarded: тарелка у нижнего края экрана, масса не меньше CONTINUE_MIN_MASS
function continueRun() {
  const plate = { x: W / 2, y: camY + H - 90, w: 220 };
  plates.push(plate);
  ball.mass = Math.max(massAtDeath, CONTINUE_MIN_MASS); ball.r = radiusFor(ball.mass);
  ball.x = plate.x; ball.y = plate.y - ball.r; ball.vx = 0; ball.vy = 0;
  ball.jumps = MAXJ; ball.regen = 0; ball.mouth = 0; ball.alive = true; initBody();
  for (const it of items) { const dx = it.x - ball.x, dy = it.y - ball.y; if (dx * dx + dy * dy < 120 * 120) it.dead = true; }
  items = items.filter(it => !it.dead);
  invuln = INVULN_TIME; usedContinue = true; camShake = 0; tGame = 0;
  state = 'play';
}
// «Монеты ×2» после rewarded
function doubleCoins() { save.coins += runCoins; runCoins *= 2; usedDouble = true; persist(); }
function updateRun(dt) {
  ball.vy += G * dt;
  ball.x += ball.vx * dt; ball.y += ball.vy * dt;
  ball.vx *= Math.pow(lerp(0.35, 0.6, heavy()), dt);
  if (ball.x < ball.r) { ball.x = ball.r; if (ball.vx < 0) { wallHit(0, -ball.vx); ball.vx = -ball.vx * 0.5; } }
  if (ball.x > W - ball.r) { ball.x = W - ball.r; if (ball.vx > 0) { wallHit(W, ball.vx); ball.vx = -ball.vx * 0.5; } }
  for (const pl of plates) {
    if (Math.abs(ball.x - pl.x) < pl.w / 2 && ball.vy > 0 && ball.y + ball.r > pl.y && ball.y + ball.r < pl.y + 40) {
      ball.y = pl.y - ball.r; if (ball.vy > 80) { squash(ball.vy * 0.5); crumbs(ball.x, ball.y + ball.r); }
      ball.vy = 0; ball.vx *= 0.8;
    }
  }
  const target = ball.y - H * 0.55; // камера едет только вверх
  if (target < camY) camY = lerp(camY, target, 1 - Math.pow(0.001, dt));
  maxHeight = Math.max(maxHeight, Math.floor(-ball.y / 10));
  if (ball.y - ball.r > camY + H + 40) { die(); return; }
  ball.r = lerp(ball.r, radiusFor(ball.mass), 1 - Math.pow(0.01, dt));
  if (ball.jumps < MAXJ) { ball.regen += dt; if (ball.regen >= REGEN) { ball.regen = 0; ball.jumps++; } } else ball.regen = 0;
  invuln = Math.max(0, invuln - dt);
  ball.mouth = Math.max(0, ball.mouth - dt * 3);
  ball.face = lerp(ball.face, clamp(ball.vx / 300, -1, 1), 1 - Math.pow(0.02, dt));
  spawn();
  for (const it of items) {
    if (it.dead) continue;
    if (it.vx) { it.x += it.vx * dt; if (it.x < 30 || it.x > W - 30) it.vx = -it.vx; it.y += Math.sin(tGame * 6 + it.seed) * 18 * dt; }
    const dx = it.x - ball.x, dy = it.y - ball.y;
    if (dx * dx + dy * dy < (it.r + ball.r * 0.92) ** 2) { eat(it); if (!ball.alive) return; }
  }
  items = items.filter(it => !it.dead && it.y < camY + H + 80);
  plates = plates.filter(pl => pl.y < camY + H + 80);
}
function update(dt) {
  tGame += dt;
  if (state === 'play' && ball.alive) updateRun(dt);
  ball.blink -= dt; if (ball.blink < -rnd(2, 5)) ball.blink = 0.1;
  updateBody(dt);
  updateFx(dt);
  camShake = Math.max(0, camShake - dt * 40);
  shakeX = rnd(-camShake, camShake); shakeY = rnd(-camShake, camShake);
}
expose({
  get state() { return state; }, set state(v) { state = v; },
  get run() { return { maxHeight, runCoins, usedContinue, usedDouble, invuln, massAtDeath }; },
  setRunCoins(n) { runCoins = n; },
  reset, jump, die, continueRun, doubleCoins, update,
});
```

- [ ] **Step 6: Запустить тесты, убедиться, что проходят**

Run: `node tools/test_game.js && node tools/test_save.js && node tools/test_sdk.js && node tools/test_core.js`
Expected: `test_game ok` и остальные `ok`.

- [ ] **Step 7: Коммит**

```bash
git add src/ball.js src/world.js src/game.js tools/test_game.js
git commit -m "feat: перенос тела, мира и правил забега в модули; «Продолжить» с неуязвимостью и «Монеты ×2»

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 5: Рендер мира и экраны (`render.js`, `screens.js`)

**Files:**
- Create: `src/render.js`, `src/screens.js`, `tools/test_render.js`

**Interfaces:**
- Consumes: всё из core/i18n/sdk/save/ball/world/game.
- Produces (render.js): `drawBg()`, `drawItem(it)`, `chunk(x,y,rx,ry)`, `drawBall()`, `drawHUD()`, `drawWorld()` — только рисуют, состояние не меняют.
- Produces (screens.js): `buttons: Array<{id,x,y,w,h,label,sub,ad}>`, `clearButtons()`, `hitButton(x,y) → button|null`, `rrect(x,y,w,h,r)`, `dim(alpha)`, `button(id,x,y,w,h,label,sub,ad)`, `titleScreen()`, `resultsScreen(active)`, `pausedScreen(tapToContinue)`, `adStubScreen()`, `loadingScreen()`. Кнопки экрана результатов: `continue` (если `!usedContinue`), `double` (если `!usedDouble && runCoins >= DOUBLE_MIN_COINS`), `again` — всегда; при `active === false` кнопок нет.
- DBG: `drawBg, drawWorld, drawHUD, titleScreen, resultsScreen, pausedScreen, adStubScreen, loadingScreen, get buttons, hitButton`.

- [ ] **Step 1: Написать падающий тест tools/test_render.js**

```js
// node tools/test_render.js — рендер и экраны не падают на proxy-контексте; кнопки и тексты результатов
const assert = require('assert');
const noop = () => {};
const texts = [];
const ctx = new Proxy({}, { get: (t, k) => k === 'fillText' ? s => texts.push(String(s)) : /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
(async () => {
  for (const size of [[480, 854], [1280, 720]]) {
    const g = require('./_env')(ctx, { width: size[0], height: size[1] }); const d = g.dbg();
    await d.YG.init(); await d.loadSave(); d.reset();
    d.state = 'title'; d.drawBg(); d.drawWorld(); d.titleScreen(); d.loadingScreen();
    d.state = 'play'; d.ball.mass = 9; d.popText(240, 0, '+5', '#fff', true);
    for (let i = 0; i < 30; i++) d.update(0.016);
    d.drawBg(); d.drawWorld(); d.drawHUD(); d.pausedScreen(true); d.pausedScreen(false);
    d.YG.adStub = { kind: 'rewarded', until: 0 }; d.adStubScreen(); d.YG.adStub = null; d.adStubScreen();
  }
  const g = require('./_env')(ctx); const d = g.dbg(); await d.YG.init(); await d.loadSave();
  // экран результатов: набор кнопок зависит от флагов
  d.reset(); d.state = 'play'; d.setRunCoins(20); d.die();
  d.resultsScreen(false); assert.strictEqual(d.buttons.length, 0, 'до 0.6 с кнопок нет');
  d.resultsScreen(true);
  assert.deepStrictEqual(d.buttons.map(b => b.id), ['continue', 'double', 'again']);
  const dbl = d.buttons[1]; assert.strictEqual(d.hitButton(dbl.x, dbl.y).id, 'double');
  assert.strictEqual(d.hitButton(dbl.x + dbl.w, dbl.y), null);
  d.doubleCoins(); d.resultsScreen(true); assert.deepStrictEqual(d.buttons.map(b => b.id), ['continue', 'again']);
  d.continueRun(); d.die(); d.resultsScreen(true); assert.deepStrictEqual(d.buttons.map(b => b.id), ['again']);
  d.reset(); d.state = 'play'; d.setRunCoins(9); d.die(); d.resultsScreen(true);
  assert.deepStrictEqual(d.buttons.map(b => b.id), ['continue', 'again'], '×2 только от 10 монет');
  // локализованные тексты
  texts.length = 0; d.setLang('ru'); d.resultsScreen(true); assert.ok(texts.includes('Упала') && texts.includes('Ещё раз'));
  texts.length = 0; d.setLang('en'); d.resultsScreen(true); assert.ok(texts.includes('Fell') && texts.includes('Again'));
  texts.length = 0; d.titleScreen(); assert.ok(texts.includes('Meatball'));
  console.log('test_render ok');
})().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Запустить тест, убедиться, что падает**

Run: `node tools/test_render.js`
Expected: FAIL — `TypeError: d.drawBg is not a function`.

- [ ] **Step 3: Написать src/render.js** (перенос из прототипа + заливка боков + мигание неуязвимости + строки через `T`)

```js
'use strict';
// ---------- рендер мира: фон, предметы, тефтеля, HUD ----------
function drawBg() {
  const b = fieldBounds();
  const h = clamp(-camY / 12000, 0, 1); // кухонная плитка темнеет с высотой
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `rgb(${lerp(58, 20, h)|0},${lerp(44, 22, h)|0},${lerp(36, 40, h)|0})`);
  g.addColorStop(1, `rgb(${lerp(42, 14, h)|0},${lerp(30, 14, h)|0},${lerp(26, 30, h)|0})`);
  ctx.fillStyle = g; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 2;
  const tile = 96, off = ((-camY * 0.5) % tile + tile) % tile;
  for (let y = Math.floor(b.y0 / tile) * tile - tile + off; y < b.y1 + tile; y += tile) { ctx.beginPath(); ctx.moveTo(b.x0, y); ctx.lineTo(b.x1, y); ctx.stroke(); }
  for (let x = Math.floor(b.x0 / tile) * tile; x <= b.x1; x += tile) { ctx.beginPath(); ctx.moveTo(x, b.y0); ctx.lineTo(x, b.y1); ctx.stroke(); }
  if (b.x0 < 0) { // боковые зоны на десктопе/landscape: затемнены, поле обведено
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(b.x0, b.y0, -b.x0, b.y1 - b.y0); ctx.fillRect(W, b.y0, b.x1 - W, b.y1 - b.y0);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, b.y0); ctx.lineTo(0, b.y1); ctx.moveTo(W, b.y0); ctx.lineTo(W, b.y1); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.font = '600 14px system-ui, sans-serif'; ctx.textAlign = 'left';
  const step = 500; // отметки каждые 50 м
  for (let y = Math.floor(camY / step) * step; y < camY + H; y += step) {
    if (y >= 0) continue;
    ctx.fillText((-y / 10) + ' ' + T('m'), 8, y - camY - 4);
    ctx.fillRect(0, y - camY, 40, 1);
  }
}
function drawItem(it) {
  const x = it.x, y = it.y - camY;
  const wob = Math.sin(tGame * 4 + it.seed) * 3;
  ctx.save(); ctx.translate(x, y + wob);
  switch (it.kind) {
    case 'ketchup':
      ctx.fillStyle = '#e3342f'; ctx.beginPath();
      ctx.moveTo(0, -18); ctx.bezierCurveTo(14, -2, 15, 10, 0, 16); ctx.bezierCurveTo(-15, 10, -14, -2, 0, -18); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(-4, 2, 3, 6, 0.4, 0, 7); ctx.fill();
      break;
    case 'pasta':
      ctx.strokeStyle = '#f6c343'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath();
      for (let i = 0; i <= 24; i++) { const t = i / 24; const px = -16 + t * 32, py = Math.sin(t * Math.PI * 4) * 8; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
      break;
    case 'meat':
      ctx.fillStyle = '#b5452b'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 16, -0.3, 0, 7); ctx.fill();
      ctx.fillStyle = '#f3e0c8'; ctx.beginPath(); ctx.ellipse(6, -4, 7, 4, -0.3, 0, 7); ctx.fill();
      ctx.strokeStyle = '#f3e0c8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, 6); ctx.quadraticCurveTo(-4, 2, 4, 9); ctx.stroke();
      break;
    case 'hair':
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath();
      ctx.moveTo(-16, -10); ctx.bezierCurveTo(10, -20, -14, 8, 14, 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-12, 6); ctx.bezierCurveTo(4, -8, 12, 14, 18, -2); ctx.stroke();
      break;
    case 'dirt':
      ctx.fillStyle = '#5a4a3a';
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; ctx.beginPath(); ctx.arc(Math.cos(a) * 7, Math.sin(a) * 7, 8, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#7a6a56'; ctx.beginPath(); ctx.arc(-3, -3, 4, 0, 7); ctx.fill();
      break;
    case 'fly': {
      const w = Math.sin(tGame * 60) * 6;
      ctx.fillStyle = 'rgba(200,220,255,0.6)'; ctx.beginPath(); ctx.ellipse(-6, -6 + w, 8, 4, -0.5, 0, 7); ctx.ellipse(6, -6 - w, 8, 4, 0.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#c33'; ctx.beginPath(); ctx.arc(-4, -2, 2, 0, 7); ctx.arc(4, -2, 2, 0, 7); ctx.fill();
      break; }
  }
  ctx.restore();
}
function chunk(x, y, rx, ry) { // один шарик фарша с корочкой
  const g = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.4, rx * 0.1, x, y, rx * 1.1);
  g.addColorStop(0, '#e89a6c'); g.addColorStop(0.5, '#c0583a'); g.addColorStop(1, '#833218');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(70,20,8,0.35)'; ctx.beginPath(); ctx.ellipse(x + rx * 0.35, y + ry * 0.4, rx * 0.35, ry * 0.25, 0.6, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,230,200,0.4)'; ctx.beginPath(); ctx.ellipse(x - rx * 0.3, y - ry * 0.35, rx * 0.2, ry * 0.12, -0.5, 0, 7); ctx.fill();
}
function drawBall() {
  const cx = ball.x, cy = ball.y - camY;
  const P = ball.pts;
  const disp = ang => { // смещение мягкого тела под углом ang
    const i = ((Math.round(ang / (Math.PI * 2) * N) % N) + N) % N;
    return { x: P[i].ox - Math.cos(i / N * Math.PI * 2) * ball.r, y: P[i].oy - Math.sin(i / N * Math.PI * 2) * ball.r };
  };
  const chunks = [];
  const outerN = Math.min(12, 6 + Math.floor(ball.mass * 0.5));
  for (let i = 0; i < outerN; i++) {
    const a = i / outerN * Math.PI * 2 + 0.3, d = disp(a);
    const rr = ball.r * 0.58, cr = ball.r * (0.46 + (i % 3) * 0.05);
    chunks.push({ x: Math.cos(a) * rr + d.x * 0.9, y: Math.sin(a) * rr + d.y * 0.9, rx: cr, ry: cr * (0.82 + (i % 2) * 0.16), rot: i * 0.8, z: Math.sin(a) });
  }
  const innerN = Math.min(9, 2 + Math.floor(ball.mass * 0.5));
  for (let i = 0; i < innerN; i++) {
    const a = i * 2.399 + 1.7, rr = Math.sqrt(i / innerN) * ball.r * 0.35, d = disp(a);
    chunks.push({ x: Math.cos(a) * rr + d.x * 0.4, y: Math.sin(a) * rr + d.y * 0.4 - ball.r * 0.05, rx: ball.r * 0.48, ry: ball.r * 0.44, rot: i, z: 2 });
  }
  chunks.sort((a, b) => a.z - b.z);
  ctx.save(); ctx.translate(cx, cy);
  if (invuln > 0 && Math.floor(tGame * 12) % 2 === 0) ctx.globalAlpha = 0.45; // мигание неуязвимости
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(4, ball.r * 0.3 + 6, ball.r * 1.0, ball.r * 0.9, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#5a1f0c'; // тёмная подложка — щели между шариками
  for (const c of chunks) { ctx.beginPath(); ctx.ellipse(c.x, c.y, c.rx * 1.06, c.ry * 1.06, c.rot, 0, 7); ctx.fill(); }
  for (const c of chunks) { ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot); chunk(0, 0, c.rx, c.ry); ctx.restore(); }
  const top = P[Math.round(N * 0.75)]; // соус стекает по верхним шарикам
  ctx.fillStyle = '#d9382c'; ctx.beginPath();
  ctx.moveTo(top.ox - ball.r * 0.6, top.oy + ball.r * 0.12);
  ctx.quadraticCurveTo(top.ox - ball.r * 0.3, top.oy + ball.r * 0.6, top.ox - ball.r * 0.08, top.oy + ball.r * 0.2);
  ctx.quadraticCurveTo(top.ox + ball.r * 0.15, top.oy + ball.r * 0.7, top.ox + ball.r * 0.38, top.oy + ball.r * 0.15);
  ctx.quadraticCurveTo(top.ox + ball.r * 0.6, top.oy + ball.r * 0.35, top.ox + ball.r * 0.68, top.oy);
  ctx.quadraticCurveTo(top.ox, top.oy - ball.r * 0.35, top.ox - ball.r * 0.7, top.oy - ball.r * 0.05); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(top.ox + ball.r * 0.2, top.oy + ball.r * 0.3, ball.r * 0.06, ball.r * 0.14, 0.3, 0, 7); ctx.fill();
  { ctx.save(); ctx.translate(top.ox + ball.r * 0.05, top.oy - 2); ctx.rotate(top.ox / ball.r * 0.4 - 0.2); // петрушка
    ctx.strokeStyle = '#2f7d32'; ctx.lineWidth = Math.max(2, ball.r * 0.07); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, -ball.r * 0.25); ctx.stroke();
    for (const [lx, ly] of [[0, -ball.r * 0.32], [-ball.r * 0.16, -ball.r * 0.22], [ball.r * 0.16, -ball.r * 0.22]]) {
      ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.ellipse(lx, ly, ball.r * 0.13, ball.r * 0.09, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#66bb6a'; ctx.beginPath(); ctx.arc(lx - ball.r * 0.03, ly - ball.r * 0.03, ball.r * 0.04, 0, 7); ctx.fill();
    }
    ctx.restore(); }
  const ex = ball.r * 0.3, ey = -ball.r * 0.12, er = Math.max(5, ball.r * 0.19); // лицо
  const look = ball.face * er * 0.35;
  const blink = ball.blink > 0 ? 0.15 : 1;
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(s * ex, ey, er, er * blink, 0, 0, 7); ctx.fill();
    if (blink > 0.5) {
      ctx.fillStyle = '#1b1410'; ctx.beginPath(); ctx.arc(s * ex + look, ey + (ball.vy < -100 ? -er * 0.2 : er * 0.15), er * 0.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * ex + look - er * 0.15, ey - er * 0.15, er * 0.15, 0, 7); ctx.fill();
    }
  }
  const my = ball.r * 0.3, mw = ball.r * 0.26;
  ctx.strokeStyle = '#3a1c0e'; ctx.lineWidth = Math.max(2, ball.r * 0.08); ctx.lineCap = 'round';
  if (ball.mouth > 0.1) { ctx.fillStyle = '#3a1c0e'; ctx.beginPath(); ctx.ellipse(0, my, mw * 0.8, ball.r * 0.2 * ball.mouth, 0, 0, 7); ctx.fill(); }
  else { ctx.beginPath(); ctx.moveTo(-mw, my); ctx.quadraticCurveTo(0, my + ball.r * 0.16, mw, my); ctx.stroke(); }
  ctx.restore();
}
function drawHUD() {
  ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
  ctx.font = '800 34px system-ui, sans-serif';
  ctx.fillText(maxHeight + ' ' + T('m'), 16, 44);
  ctx.textAlign = 'right'; ctx.font = '700 22px system-ui, sans-serif'; ctx.fillStyle = '#ffe08a';
  ctx.fillText('● ' + runCoins, W - 16, 40);
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillText(T('mass') + ' ' + ball.mass + (coinMult() > 1 ? '   ×' + coinMult() : ''), W - 16, 64);
  if (ball.mass >= HAIR_PROOF) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '600 13px system-ui, sans-serif'; ctx.fillText(T('hairProof'), W - 16, 84); }
  for (let i = 0; i < MAXJ; i++) { // заряды прыжка
    const x = W / 2 - (MAXJ - 1) * 14 + i * 28, y = 40;
    ctx.fillStyle = i < ball.jumps ? '#f6c343' : i === ball.jumps ? `rgba(246,195,67,${0.15 + ball.regen / REGEN * 0.6})` : 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 8, y + 3); ctx.lineTo(x + 2, y + 3); ctx.lineTo(x + 3, y + 10); ctx.lineTo(x - 8, y - 2); ctx.lineTo(x - 2, y - 2); ctx.closePath(); ctx.fill();
  }
  ctx.textAlign = 'center';
}
function drawWorld() { // всё внутри поля; вызывающий ставит clip и shake
  for (const pl of plates) { const y = pl.y - camY; if (y > -20 && y < H + 20) {
    ctx.fillStyle = '#e9e4da'; ctx.beginPath(); ctx.ellipse(pl.x, y + 8, pl.w / 2, 16, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#c9c2b4'; ctx.beginPath(); ctx.ellipse(pl.x, y + 8, pl.w / 2 - 30, 9, 0, 0, 7); ctx.fill(); } }
  for (const it of items) drawItem(it);
  if (ball.alive || state === 'title') drawBall();
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.t / p.life, 0, 1);
    if (p.meat) { p.rot += p.rv * 0.016; ctx.save(); ctx.translate(p.x, p.y - camY); ctx.rotate(p.rot); chunk(0, 0, p.size, p.size * 0.78); ctx.restore(); }
    else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y - camY, p.size, 0, 7); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  for (const t of texts) {
    const k = t.t; ctx.globalAlpha = 1 - k * k; ctx.fillStyle = t.color; ctx.textAlign = 'center';
    ctx.font = `900 ${t.big ? 30 : 22}px system-ui, sans-serif`;
    ctx.fillText(t.str, t.x, t.y - camY - k * 70);
  }
  ctx.globalAlpha = 1;
}
expose({ drawBg, drawWorld, drawHUD });
```

- [ ] **Step 4: Написать src/screens.js**

```js
'use strict';
// ---------- экраны, панели, кнопки ----------
const buttons = []; // кнопки, нарисованные в текущем кадре: { id, x, y, w, h, label, sub, ad }
function clearButtons() { buttons.length = 0; }
function hitButton(x, y) {
  for (const b of buttons) if (Math.abs(x - b.x) <= b.w / 2 && Math.abs(y - b.y) <= b.h / 2) return b;
  return null;
}
function rrect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
function dim(alpha) { const b = fieldBounds(); ctx.fillStyle = `rgba(20,12,8,${alpha})`; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); }
function button(id, x, y, w, h, label, sub, ad) {
  const b = { id, x, y, w, h, label, sub, ad }; buttons.push(b);
  ctx.save();
  ctx.fillStyle = ad ? '#2e7d32' : '#f6c343'; rrect(x - w / 2, y - h / 2, w, h, 14); ctx.fill();
  ctx.fillStyle = ad ? '#fff' : '#1b1410'; ctx.textAlign = 'center';
  if (sub) {
    ctx.font = '800 22px system-ui, sans-serif'; ctx.fillText((ad ? '▶ ' : '') + label, x, y - 2);
    ctx.font = '500 13px system-ui, sans-serif'; ctx.globalAlpha = 0.85; ctx.fillText(sub, x, y + 17);
  } else { ctx.font = '800 24px system-ui, sans-serif'; ctx.fillText(label, x, y + 9); }
  ctx.restore();
  return b;
}
function titleScreen() {
  clearButtons(); dim(0.72);
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.font = '900 64px system-ui, sans-serif'; ctx.fillText(T('title'), W / 2, H * 0.34);
  ctx.font = '500 20px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
  [T('hint1'), T('hint2'), T('hint3'), T('hint4'), T('hint5')].forEach((l, i) => ctx.fillText(l, W / 2, H * 0.34 + 50 + i * 30));
  const p = 0.5 + Math.sin(tGame * 5) * 0.5;
  ctx.fillStyle = `rgba(255,224,138,${0.6 + p * 0.4})`; ctx.font = '800 26px system-ui, sans-serif';
  ctx.fillText(T('tapToJump'), W / 2, H * 0.72);
}
function resultsScreen(active) {
  clearButtons(); dim(0.72);
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.font = '900 64px system-ui, sans-serif'; ctx.fillText(T('fell'), W / 2, H * 0.30);
  ctx.font = '500 20px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const lines = [maxHeight + ' ' + T('m') + '  ·  ' + T('best') + ' ' + save.best + ' ' + T('m'), T('runCoins') + ': ' + runCoins, T('total') + ': ' + save.coins];
  lines.forEach((l, i) => ctx.fillText(l, W / 2, H * 0.30 + 50 + i * 30));
  if (!active) return;
  let y = H * 0.56;
  if (!usedContinue) { button('continue', W / 2, y, 300, 60, T('continueAd'), T('forAd'), true); y += 76; }
  if (!usedDouble && runCoins >= DOUBLE_MIN_COINS) { button('double', W / 2, y, 300, 60, T('doubleAd'), T('forAd'), true); y += 76; }
  button('again', W / 2, y, 300, 60, T('again'), '', false);
}
function pausedScreen(tapToContinue) {
  dim(0.6); ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.font = '900 48px system-ui, sans-serif'; ctx.fillText(T('paused'), W / 2, H * 0.45);
  if (tapToContinue) { ctx.font = '800 24px system-ui, sans-serif'; ctx.fillStyle = '#ffe08a'; ctx.fillText(T('tapToContinue'), W / 2, H * 0.53); }
}
function adStubScreen() {
  if (!YG.adStub) return;
  dim(0.85); ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.font = '800 30px system-ui, sans-serif'; ctx.fillText(T('adStub'), W / 2, H * 0.48);
  ctx.font = '500 18px system-ui, sans-serif'; ctx.fillText(YG.adStub.kind, W / 2, H * 0.53);
}
function loadingScreen() {
  beginField(); dim(1); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '600 22px system-ui, sans-serif'; ctx.fillText(T('loading'), W / 2, H * 0.5);
}
expose({ titleScreen, resultsScreen, pausedScreen, adStubScreen, loadingScreen, get buttons() { return buttons; }, hitButton });
```

- [ ] **Step 5: Запустить тесты, убедиться, что проходят**

Run: `for t in core sdk save game render; do node tools/test_$t.js || exit 1; done`
Expected: пять строк `… ok`.

- [ ] **Step 6: Коммит**

```bash
git add src/render.js src/screens.js tools/test_render.js
git commit -m "feat: рендер с заливкой боков и экраны с кнопками (результаты, пауза, заглушка рекламы)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 6: Точка входа `main.js` и smoke-тест всего потока

**Files:**
- Create: `src/main.js`, `tools/smoke.js` (перезаписать)

**Interfaces:**
- Consumes: всё из предыдущих задач; `fakeYaGames` из `tools/test_sdk.js`.
- Produces: `AD_INTERVAL = 180`, `boot()`, `pauseGame()`, `resumeGame()`, `restart()`, `tryContinue()`, `tryDouble()`, `onTap(x, y)`, `draw()`, `frame(now)`; DBG: `get paused, get awaitTap, get adBusy, forceAdReady(), pauseGame, resumeGame, startBoot()` (запускает boot() один раз, возвращает промис; в продакшене вызывается сразу при загрузке, в тестах — из `_env.boot()`, потому что фоновый boot ломал юнит-тесты).

- [ ] **Step 1: Написать падающий тест tools/smoke.js**

```js
// node tools/smoke.js [--dist] — полный поток экранов на заглушке SDK и на фальшивом YaGames; падает при любой ошибке.
// --dist прогоняет собранный dist/index.html вместо src/*.js.
const assert = require('assert');
const { fakeYaGames } = require('./test_sdk');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
const dist = process.argv.includes('--dist');
const btn = (d, id) => d.buttons.find(b => b.id === id);
const steps = (g, n, tapEvery = 0) => { for (let i = 0; i < n; i++) { if (tapEvery && i % tapEvery === 0) g.tap(Math.random() * 480); g.step(); } };

async function runFlow(opts) {
  const g = require('./_env')(ctx, Object.assign({ dist }, opts)); const d = g.dbg();
  g.step(); // кадр до загрузки — экран «Загрузка…» не падает
  await g.boot();
  assert.strictEqual(d.state, 'title');
  assert.deepStrictEqual(d.YG.log, ['ready'], 'ready ровно один раз, когда виден титул');
  g.tap(240); assert.strictEqual(d.state, 'play'); assert.strictEqual(d.YG.log.at(-1), 'start');
  steps(g, 3000, 25);
  if (d.state === 'play') d.die();
  assert.strictEqual(d.state, 'dead'); assert.strictEqual(d.YG.log.at(-1), 'stop');
  steps(g, 60);
  // «Продолжить» за рекламу: ввод во время рекламы заблокирован
  const cont = btn(d, 'continue'); assert.ok(cont, 'кнопка Продолжить');
  g.tap(cont.x, cont.y); assert.ok(d.adBusy, 'во время рекламы ввод заблокирован'); g.tap(240);
  await g.flush(); g.step();
  assert.strictEqual(d.state, 'play'); assert.ok(d.ball.mass >= 3); assert.ok(d.run.usedContinue); assert.ok(d.run.invuln > 0);
  assert.strictEqual(d.YG.log.at(-1), 'start');
  steps(g, 200, 30);
  if (d.state === 'play') d.die();
  steps(g, 60);
  assert.ok(!btn(d, 'continue'), 'второго Продолжить нет');
  // «Монеты ×2»
  d.setRunCoins(20); g.step();
  const dbl = btn(d, 'double'); assert.ok(dbl, 'кнопка ×2');
  const total = d.save.coins;
  g.tap(dbl.x, dbl.y); await g.flush(); g.step();
  assert.strictEqual(d.run.runCoins, 40); assert.strictEqual(d.save.coins, total + 20); assert.ok(!btn(d, 'double'));
  assert.strictEqual(d.state, 'dead', 'после ×2 остаёмся на результатах');
  // «Ещё раз»: первый рестарт сессии без рекламы
  const inters = () => d.YG.log.filter(x => x === 'inter').length;
  const n0 = inters();
  let again = btn(d, 'again'); g.tap(again.x, again.y); await g.flush(); g.step();
  assert.strictEqual(d.state, 'play'); assert.strictEqual(inters(), n0, 'первый рестарт без рекламы');
  assert.deepStrictEqual([d.run.usedContinue, d.run.usedDouble, d.run.runCoins], [false, false, 0], 'флаги забега сброшены');
  // второй рестарт при истёкшем интервале — реклама показана
  d.die(); steps(g, 60); d.forceAdReady();
  again = btn(d, 'again'); g.tap(again.x, again.y);
  assert.ok(d.adBusy); g.tap(240);
  await g.flush(); g.step();
  assert.strictEqual(inters(), n0 + 1); assert.strictEqual(d.state, 'play'); assert.strictEqual(d.YG.log.at(-1), 'start');
  // третий рестарт сразу после — интервал не истёк, рекламы нет
  d.die(); steps(g, 60); again = btn(d, 'again'); g.tap(again.x, again.y); await g.flush(); g.step();
  assert.strictEqual(inters(), n0 + 1, 'интервал 180 с соблюдён');
  // пауза / резюм во время забега
  steps(g, 30);
  g.fire('blur'); assert.ok(d.paused); assert.strictEqual(d.YG.log.at(-1), 'stop'); assert.ok(d.audioMuted);
  const y0 = d.ball.y; steps(g, 3); assert.strictEqual(d.ball.y, y0, 'в паузе мир стоит');
  g.tap(240); assert.ok(d.paused, 'тап паузу не снимает');
  g.fire('focus'); assert.ok(!d.paused); assert.ok(d.awaitTap); assert.ok(!d.audioMuted);
  steps(g, 3); assert.strictEqual(d.ball.y, y0, 'до тапа мир стоит');
  const jumps = d.ball.jumps; g.tap(240);
  assert.ok(!d.awaitTap); assert.strictEqual(d.YG.log.at(-1), 'start'); assert.strictEqual(d.ball.jumps, jumps, 'тап после паузы — не прыжок');
  steps(g, 30, 10); assert.notStrictEqual(d.ball.y, y0);
  // пауза на экране результатов не трогает геймплей-API
  d.die(); const len = d.YG.log.length; g.fire('blur'); g.fire('focus'); assert.strictEqual(d.YG.log.length, len);
  // клавиатура: пробел на результатах = «Ещё раз», стрелка — прыжок в сторону
  steps(g, 60); g.key('Space'); await g.flush(); assert.strictEqual(d.state, 'play');
  g.key('ArrowLeft'); assert.ok(d.ball.vx < 0);
  // start/stop строго чередуются, начиная со start
  const ss = d.YG.log.filter(x => x === 'start' || x === 'stop');
  assert.strictEqual(ss[0], 'start');
  for (let i = 1; i < ss.length; i++) assert.notStrictEqual(ss[i], ss[i - 1], 'start/stop чередуются: ' + ss.join(','));
  return d;
}
(async () => {
  { const g0 = require('./_env')(ctx); await g0.boot(); assert.strictEqual(g0.dbg().state, 'title', 'boot() без предварительного step доводит до титула'); assert.deepStrictEqual(g0.dbg().YG.log, ['ready']); }
  const d1 = await runFlow({});
  assert.strictEqual(d1.lang, 'ru');
  const log = []; const d2 = await runFlow({ YaGames: fakeYaGames(log) });
  assert.strictEqual(d2.lang, 'en');
  for (const k of ['ready', 'start', 'stop', 'inter', 'reward', 'setData', 'on:game_api_pause', 'on:game_api_resume']) assert.ok(log.includes(k), 'реальный API вызван: ' + k);
  console.log('smoke ok' + (dist ? ' (dist)' : ''));
})().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Запустить тест, убедиться, что падает**

Run: `node tools/smoke.js`
Expected: FAIL — `TypeError: Cannot read properties of undefined (reading 'boot')` или `d.state !== 'title'` (нет `main.js`).

- [ ] **Step 3: Написать src/main.js**

```js
'use strict';
// ---------- точка входа: загрузка, ввод, пауза, реклама между забегами, цикл ----------
const AD_INTERVAL = 180; // секунд между межстраничными показами — свой лимит поверх лимитов Яндекса
let booted = false, paused = false, awaitTap = false, adBusy = false;
let restarts = 0, lastAdAt = 0, sessionT = 0;

async function boot() {
  await YG.init();
  setLang(YG.lang);
  await loadSave();
  reset(); state = 'title';
  YG.onPause(pauseGame); YG.onResume(resumeGame);
  booted = true;
  draw();       // титул на экране — игра готова к взаимодействию
  YG.ready();
}
// --- пауза: событие SDK, скрытие вкладки, потеря фокуса; во время рекламы игнорируется ---
function pauseGame() {
  if (paused || adBusy) return;
  paused = true; muteAudio();
  if (state === 'play') YG.gameplayStop();
}
function resumeGame() {
  if (!paused) return;
  paused = false; unmuteAudio();
  if (state === 'play' && ball.alive) awaitTap = true; // в забег возвращаемся только по тапу
}
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); else resumeGame(); });
window.addEventListener('blur', pauseGame);
window.addEventListener('focus', resumeGame);
// --- переходы между забегами с рекламой ---
async function restart() {
  restarts++;
  if (restarts > 1 && sessionT - lastAdAt >= AD_INTERVAL) {
    adBusy = true;
    const r = await YG.showInterstitial();
    adBusy = false;
    if (r.shown) lastAdAt = sessionT;
  }
  reset(); state = 'play'; YG.gameplayStart();
}
async function tryContinue() {
  if (usedContinue) return;
  adBusy = true;
  const r = await YG.showRewarded();
  adBusy = false;
  if (r.rewarded) { lastAdAt = sessionT; continueRun(); YG.gameplayStart(); }
}
async function tryDouble() {
  if (usedDouble || runCoins < DOUBLE_MIN_COINS) return;
  adBusy = true;
  const r = await YG.showRewarded();
  adBusy = false;
  if (r.rewarded) { lastAdAt = sessionT; doubleCoins(); popText(W / 2, camY + H * 0.5, '×2', '#ffe08a', true); }
}
// --- ввод ---
function onTap(x, y) {
  if (!booted || adBusy || paused) return;
  audio();
  if (awaitTap) { awaitTap = false; YG.gameplayStart(); return; } // первый тап после паузы — не прыжок
  if (state === 'title') { state = 'play'; YG.gameplayStart(); jump(x < ball.x ? -1 : 1); return; }
  if (state === 'dead') {
    if (tGame < 0.6) return;
    const b = hitButton(x, y); if (!b) return;
    if (b.id === 'again') restart();
    else if (b.id === 'continue') tryContinue();
    else if (b.id === 'double') tryDouble();
    return;
  }
  if (state === 'play' && ball.alive) jump(clamp(x, 0, W) < ball.x ? -1 : 1); // тап по боковой зоне = у края поля
}
cv.addEventListener('pointerdown', e => { e.preventDefault(); const [x, y] = toGame(e); onTap(x, y); });
cv.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  if (e.repeat) return;
  const left = e.code === 'ArrowLeft' || e.code === 'KeyA', right = e.code === 'ArrowRight' || e.code === 'KeyD';
  const up = e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Enter';
  if (!left && !right && !up) return;
  e.preventDefault();
  if (state === 'dead') { if (up) { const b = buttons.find(b => b.id === 'again'); if (b) onTap(b.x, b.y); } return; }
  onTap(left ? ball.x - 10 : right ? ball.x + 10 : ball.x + (ball.vx >= 0 ? 10 : -10), 0);
});
// --- кадр ---
function draw() {
  beginField();
  drawBg();
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip(); ctx.translate(shakeX, shakeY);
  drawWorld();
  ctx.restore();
  if (state === 'play') drawHUD();
  if (state === 'title') titleScreen();
  if (state === 'dead') resultsScreen(tGame > 0.6);
  if (paused || awaitTap) pausedScreen(awaitTap && !paused);
  adStubScreen();
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, Math.max(0, (now - last) / 1000)); last = now;
  if (booted) {
    if (!paused && !awaitTap && !adBusy) { update(dt); sessionT += dt; }
    draw();
  } else loadingScreen();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// старт загрузки: в продакшене сразу при загрузке скрипта; тесты ставят CFG.manualBoot и зовут startBoot() сами
function startBoot() { if (!DBG.boot) DBG.boot = boot(); return DBG.boot; }
expose({
  get paused() { return paused; }, get awaitTap() { return awaitTap; }, get adBusy() { return adBusy; },
  forceAdReady() { lastAdAt = -1e9; }, pauseGame, resumeGame, startBoot,
});
if (!CFG.manualBoot) startBoot();
```

- [ ] **Step 4: Запустить smoke и все юнит-тесты**

Run: `for t in core sdk save game render; do node tools/test_$t.js || exit 1; done && node tools/smoke.js`
Expected: пять `… ok` и `smoke ok`, без предупреждений `_env: нет файла`.

- [ ] **Step 5: Проверить в браузере вручную** (dev-страница открывается двойным кликом; ошибка загрузки `/sdk.js` в консоли ожидаема)

Открыть `index.html` в браузере: титул → тап → забег → смерть → три кнопки → «Продолжить» показывает оверлей «Реклама (заглушка)» на 1 с → тефтеля на тарелке внизу мигает 1.5 с. Свернуть вкладку в забеге → развернуть → «Пауза · Тапни, чтобы продолжить».

- [ ] **Step 6: Коммит**

```bash
git add src/main.js tools/smoke.js
git commit -m "feat: точка входа — загрузка через SDK, реклама между забегами, пауза по трём источникам; smoke всего потока

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 7: Скриншоты `shot.js` и визуальная проверка

**Files:**
- Create: `package.json`, `tools/shot.js` (перезаписать)
- Modify: `.gitignore` (добавить `shots/`, `package-lock.json` оставить в git)

**Interfaces:**
- Consumes: `makeEnv(ctx, {width, height, lang})`, DBG-хуки.
- Produces: PNG в `shots/`: `title`, `play`, `results`, `paused`, `desktop`, `en_results`.

- [ ] **Step 1: Создать package.json и поставить node-canvas**

```json
{
  "name": "teftelya",
  "version": "0.2.0",
  "private": true,
  "description": "Тефтеля — вертикальная аркада для Яндекс Игр",
  "scripts": {
    "test": "node tools/test_core.js && node tools/test_sdk.js && node tools/test_save.js && node tools/test_game.js && node tools/test_render.js && node tools/smoke.js",
    "shot": "node tools/shot.js",
    "build": "node tools/build.js"
  }
}
```

Run: `npm i -D canvas && npm test`
Expected: `canvas` в `devDependencies`, все тесты `ok`.

- [ ] **Step 2: Написать tools/shot.js**

```js
// node tools/shot.js — скриншоты в shots/ через node-canvas (npm i -D canvas).
// Агент обязан ПОСМОТРЕТЬ каждый PNG перед выдачей визуала, а не описывать код.
const fs = require('fs'), path = require('path'), { createCanvas } = require('canvas');
const OUT = path.join(__dirname, '..', 'shots'); fs.mkdirSync(OUT, { recursive: true });
async function shoot(name, w, h, scenario, opts = {}) {
  const real = createCanvas(w, h), ctx = real.getContext('2d');
  const g = require('./_env')(ctx, Object.assign({ width: w, height: h }, opts));
  await g.boot(); await scenario(g, g.dbg());
  fs.writeFileSync(path.join(OUT, name + '.png'), real.toBuffer('image/png')); console.log('shots/' + name + '.png');
}
const play = async (g, n = 120) => { g.tap(240); for (let i = 0; i < n; i++) { if (i % 20 === 0) g.tap(i % 40 ? 300 : 180); g.step(); } };
const dead = async (g, d) => { await play(g); d.setRunCoins(23); d.die(); for (let i = 0; i < 60; i++) g.step(); };
(async () => {
  await shoot('title', 480, 854, async g => { g.step(); });
  await shoot('play', 480, 854, async (g, d) => { await play(g); d.ball.mass = 6; for (let i = 0; i < 30; i++) g.step(); });
  await shoot('results', 480, 854, dead);
  await shoot('paused', 480, 854, async g => { await play(g); g.fire('blur'); g.fire('focus'); g.step(); });
  await shoot('desktop', 1280, 720, async g => { await play(g); });
  await shoot('en_results', 480, 854, dead, { lang: 'en-US' });
})().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Добавить `shots/` в .gitignore, снять скриншоты**

```bash
printf 'shots/\n' >> .gitignore
node tools/shot.js
```
Expected: шесть строк `shots/*.png`.

- [ ] **Step 4: Посмотреть каждый PNG глазами** (инструмент Read на файл) и сверить с чеклистом; при расхождении — править код и переснимать

- `title.png`: заголовок «Тефтеля», пять подсказок, пульсирующая строка «Тапни, чтобы прыгнуть», тефтеля на тарелке.
- `play.png`: HUD (метры слева, монеты справа, «масса 6 ×1.5», «волосы не страшны», 4 заряда по центру), тефтеля крупнее с бугристым силуэтом, предметы.
- `results.png`: «Упала», три строки цифр, зелёные кнопки «▶ Продолжить / за рекламу» и «▶ Монеты ×2 / за рекламу», жёлтая «Ещё раз»; кнопки не перекрываются.
- `paused.png`: затемнение, «Пауза», «Тапни, чтобы продолжить».
- `desktop.png`: поле 480 по центру, бока залиты плиткой темнее поля, тонкие линии границ, ничего не обрезано.
- `en_results.png`: «Fell», «Continue / watch ad», «Coins ×2 / watch ad», «Again».

- [ ] **Step 5: Коммит**

```bash
git add package.json package-lock.json tools/shot.js .gitignore
git commit -m "chore: скриншоты через node-canvas, npm-скрипты test/shot/build

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 8: Сборка `build.js`, README, журнал, удаление прототипа

**Files:**
- Create: `tools/build.js`
- Modify: `README.md` (переписать), `docs/DEVLOG.md` (статус + запись), `.gitignore`
- Delete: `teftelya.html`

**Interfaces:**
- Consumes: маркеры `<!-- src -->` / `<!-- /src -->` в `index.html`, `tools/smoke.js --dist`.
- Produces: `dist/index.html` (один файл, все скрипты в одном IIFE), `dist/teftelya.zip` (внутри только `index.html` в корне).

- [ ] **Step 1: Написать tools/build.js**

```js
// node tools/build.js — dist/index.html (всё в одном файле) + dist/teftelya.zip; прогоняет smoke по собранному файлу.
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), DIST = path.join(ROOT, 'dist');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const m = html.match(/<!-- src -->([\s\S]*?)<!-- \/src -->/);
if (!m) throw new Error('index.html: нет маркеров <!-- src --> … <!-- /src -->');
const files = [...m[1].matchAll(/<script src="src\/([^"]+)"><\/script>/g)].map(x => x[1]);
const code = files.map(f => {
  const p = path.join(ROOT, 'src', f);
  if (!fs.existsSync(p)) throw new Error('нет файла ' + p);
  return '// ---- ' + f + ' ----\n' + fs.readFileSync(p, 'utf8').replace(/^'use strict';\r?\n/, '');
}).join('\n');
const inline = '<script>\n(() => {\n\'use strict\';\n' + code + '\n})();\n</script>';
const out = html.replace(m[0], () => inline);
fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), out);
execSync('node tools/smoke.js --dist', { cwd: ROOT, stdio: 'inherit' });
fs.rmSync(path.join(DIST, 'teftelya.zip'), { force: true });
execSync('zip -q -j dist/teftelya.zip dist/index.html', { cwd: ROOT, stdio: 'inherit' });
const kb = f => (fs.statSync(path.join(DIST, f)).size / 1024).toFixed(1) + ' КБ';
console.log('dist/index.html ' + kb('index.html') + ', dist/teftelya.zip ' + kb('teftelya.zip'));
```

- [ ] **Step 2: Собрать и проверить архив**

Run: `node tools/build.js && unzip -l dist/teftelya.zip`
Expected: `smoke ok (dist)`, размеры, в архиве ровно один файл `index.html` без папок.

- [ ] **Step 3: Удалить прототип, переписать README**

```bash
git rm -q teftelya.html
```

Новый `README.md` целиком:

```markdown
# Тефтеля — вертикальная аркада для Яндекс Игр

Canvas-игра без ассетов и зависимостей: исходники в `src/*.js`, сборка склеивает их в один `dist/index.html`.
Цель проекта: опубликовать на Яндекс Играх и получать доход с рекламы. Ожидания скромные.

## Роли
- Владелец репо — геймдизайнер, принимает решения по механике и виду.
- ИИ-агент — программист и соавтор геймдизайна: идеи владельца разбирает критически, свои предлагает с обоснованием,
  всё пишет, собирает и **проверяет рендером** (см. «Как проверять»).

## С чего начать новому агенту
1. Этот README — текущее состояние правды.
2. `docs/DEVLOG.md` — блок «Текущий статус» и последняя запись: что решено и почему.
3. `docs/specs/` — дизайн этапов, `docs/plans/` — планы реализации.

## Концепция
Маленькая тефтеля прыгает вверх по бесконечной башне (стиль Doodle Jump / Flappy).
Ест еду — растёт, мусор и стены отрывают от неё фарш.
Оригинальный персонаж: никаких персонажей из существующих мультсериалов.

## Правила (актуальные, согласованы с дизайнером)
Одно чёткое деление: **еда — всегда хорошо, мусор — всегда плохо.**

- **Управление**: тап = прыжок вверх. Тап слева/справа от тефтели — прыжок в ту сторону.
  Клавиатура: стрелки / WASD / пробел / Enter. Тап по боковой зоне на десктопе = тап у края поля.
- **Прыжки — ресурс**: 4 заряда (`MAXJ`). Каждый прыжок тратит заряд. Еда возвращает:
  кетчуп +1, макароны +2, мясо +3. Без еды заряды копятся сами по одному за 1.6 с (`REGEN`).
- **Еда** (кетчуп +1 масса / 1 монета, макароны +1 / 2, мясо +2 / 5).
- **Мусор**: волос −1, грязь −2, муха −1 (двигается). Масса ниже 1 — проигрыш.
  При потере массы от тефтели физически отлетают куски фарша.
- **Стены**: удар на скорости > 260 (`WALL_HIT`) отрывает 1 массу.
- **Масса даёт**: множитель монет (5 → ×1.5, 9 → ×2, 13 → ×2.5); с массы 6 (`HAIR_PROOF`)
  волосы не наносят урона («пф»); инерцию — большая тефтеля хуже слушается и сильнее колышется.
- **Сила прыжка от массы НЕ зависит** — ритм тапов одинаковый всю игру.
- Сложность растёт с высотой: доля мусора и плотность предметов.
- Проигрыш: масса < 1 или улетела за нижний край (камера едет только вверх).
- **Продолжить за рекламу** (один раз за забег): тарелка у нижнего края, масса не меньше 3, полные заряды,
  1.5 с неуязвимости (тефтеля мигает). **Монеты ×2 за рекламу** — один раз, если собрано ≥ 10.

## Отвергнутые идеи (не возвращать без обсуждения)
- **Кликер/idle** — заменён аркадой: больше точек для rewarded-рекламы.
- **Unity WebGL** — тяжёлые сборки, Яндекс штрафует за загрузку; агент не может собрать.
- **«Тяжелее = кликай чаще»** — treadmill, наказание за рост.
- **Переедание / икота** — превращало еду в «хватай, но не слишком». Вычищено из кода.
- **Гладкий коричневый шар** как персонаж — читается как какашка. Тефтеля — скопление шариков фарша.
- **Межстраничная реклама сразу после смерти** — две рекламы подряд с «Продолжить». Показываем по «Ещё раз».
- **ES-модули + бандлер**, **один файл без сборки** — см. `docs/DEVLOG.md`, сессия 1.

## Устройство кода
Обычные скрипты, порядок задаёт `index.html` (маркеры `<!-- src -->`); верхнеуровневые `const/let/function`
видны между файлами, зависимости только «вниз» по списку. Каждый модуль заканчивается `expose({…})` (core.js) —
хуки для headless-тестов (`window.__dbg`); `Object.assign` не годится, он вызывает геттеры один раз.

| Файл | Что делает |
|---|---|
| `src/core.js` | `W×H = 480×854`, холст на всё окно, поле по центру (`view`, `toGame`, `beginField`, `fieldBounds`), `CFG` |
| `src/i18n.js` | строки ru/en, `T(key)`; `ru` → русский, всё остальное → английский |
| `src/audio.js` | синтез звуков WebAudio, `muteAudio/unmuteAudio` |
| `src/sdk.js` | `YG` — обёртка Yandex Games SDK с заглушкой: ready/start/stop, реклама промисами, данные игрока, пауза |
| `src/save.js` | `save {v, best, coins}`: облако + localStorage, при загрузке максимум по полям |
| `src/ball.js` | мягкое тело: 26 точек на пружинах, жёсткость падает с массой |
| `src/world.js` | каталог еды/мусора, спавн, частицы, всплывающие тексты; состояние `camY, items, plates, tGame` |
| `src/game.js` | правила забега, `state`, `die/continueRun/doubleCoins`, `update` |
| `src/render.js` | фон с заливкой боков, предметы, тефтеля, HUD |
| `src/screens.js` | титул, результаты с кнопками, пауза, оверлей рекламы-заглушки, `hitButton` |
| `src/main.js` | загрузка (`boot`), ввод, пауза от SDK/вкладки/фокуса, реклама между забегами, цикл |

## Yandex Games SDK
- Подключение `<script src="/sdk.js" async>` (относительный путь — требование при загрузке архива в консоль).
  Если `YaGames` не появился за 3 с — заглушка: реклама рисуется оверлеем на 1 с, «облако» живёт в localStorage.
- `LoadingAPI.ready()` — когда виден титул. `GameplayAPI.start()` — тап на титуле, тап после паузы, после рекламы.
  `GameplayAPI.stop()` — смерть, любая реклама, пауза.
- Пауза: `game_api_pause`, скрытие вкладки, потеря фокуса. Звук глохнет, мир стоит, возврат в забег по тапу.
- Межстраничная реклама по «Ещё раз»: не на первом рестарте сессии, не чаще раза в 180 с (`AD_INTERVAL`).
- Локальный тест в проде: `npx @yandex-games/sdk-dev-proxy -p dist` + draft-URL игры с `?game_url=https://localhost`
  (нужен черновик игры в консоли владельца).

## Как проверять (обязательно перед выдачей визуала)
- `npm test` — юнит-тесты модулей и `tools/smoke.js` (полный поток экранов на заглушке и на фальшивом `YaGames`).
- `npm run shot` — скриншоты в `shots/` (нужен `npm i -D canvas`). Агент должен **смотреть на PNG**,
  а не описывать код: дважды визуал уходил непроверенным и был не тем.
- `npm run build` — `dist/index.html` + `dist/teftelya.zip`, smoke по собранному файлу. Zip загружается в консоль как есть.
- `index.html` открывается двойным кликом (ошибка загрузки `/sdk.js` в консоли ожидаема).

## План этапов
1. ✅ Фундамент + Yandex SDK — `docs/specs/2026-09-10-foundation-sdk-design.md`.
2. Мета-слой: монеты между забегами → апгрейды (5-й заряд, стартовая масса, магнит, броня).
3. Этажи башни: фиксированная дистанция, испытание в конце, новая косметика.
4. Имя и реплики тефтели (вплетается в 2 или 3).
5. Релиз: иконка, обложка, скриншоты, чеклист модерации, загрузка в консоль (делает владелец).

## Открытые вопросы к дизайнеру
- Стартовая масса 1 делает первый волос смертельным: стартовая масса 2 или первые метры без мусора?
- 4 заряда — нормально или сделать 5-й первым апгрейдом?
- Достаточно ли жадность вознаграждается множителем, или делать его злее?
```

- [ ] **Step 4: Обновить docs/DEVLOG.md** — заменить блок «Текущий статус» и добавить запись сверху (под заголовком и вводным абзацем):

```markdown
## Текущий статус

- Этап 1 «Фундамент + Yandex SDK» реализован: модули `src/*.js`, обёртка SDK с заглушкой, «Продолжить» и «×2»,
  пауза, сохранения, ru/en, десктопный вьюпорт, `npm test` / `npm run shot` / `npm run build` зелёные.
- SDK живьём не проверялся: у агента нет доступа в консоль Яндекс Игр. Нужен черновик игры от владельца и
  прогон через `sdk-dev-proxy` (чеклист в README, раздел «Yandex Games SDK»).
- Следующий этап — 2, мета-слой. Перед ним закрыть открытые вопросы из README.

## 2026-09-22 — Сессия 2: реализация этапа 1

**Решено**
- Тестовые хуки живут в `window.__dbg` (`DBG`), каждый модуль добавляет свои. Причина: headless-тесты без
  бандлера могут достучаться до внутренностей только так; хуки крошечные и не мешают продакшену.
- Заглушка SDK показывает оверлей рекламы и хранит «облако» в localStorage под отдельным ключом,
  чтобы слияние облако/локаль тестировалось без Яндекса.
- Пауза во время показа рекламы игнорируется — этим окном управляет SDK; иначе `game_api_pause` от рекламы
  вешал бы наш собственный флаг паузы поверх её закрытия.
- Первый тап после паузы не считается прыжком, чтобы игрок не тратил заряд вслепую.

**Отвергнуто**
- Показ межстраничной рекламы сразу после смерти — две рекламы подряд с «Продолжить».

**Сделано**
- Задачи 1–8 плана `docs/plans/2026-09-10-foundation-sdk.md`: 11 модулей, 5 юнит-тестов, smoke, скриншоты, сборка.
- `teftelya.html` удалён, его заменяют `index.html` (dev) и `dist/index.html` (сборка).

**Дальше**
- Владелец: черновик игры в консоли, проверка реальной рекламы, сохранений и паузы на телефоне.
- Агент: этап 2 — brainstorming меты по открытым вопросам README.

**Открытые вопросы**
- Те же, что в README: стартовая масса, 5-й заряд, злость множителя.
```

- [ ] **Step 5: Финальная проверка и коммит**

Run: `npm test && npm run build && git status --short`
Expected: все тесты `ok`, `smoke ok (dist)`, в статусе только ожидаемые изменения (README, DEVLOG, build.js, удаление прототипа, .gitignore).

```bash
git add tools/build.js README.md docs/DEVLOG.md .gitignore
git commit -m "feat: сборка в один файл + zip для Яндекс Игр; README и журнал под новую структуру; прототип удалён

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```
