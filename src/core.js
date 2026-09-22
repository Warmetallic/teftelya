'use strict';
// ---------- core: конфиг, константы, утилиты, холст ----------
// __TEFT_CFG выставляют тесты (нулевые задержки SDK и рекламы-заглушки)
const CFG = Object.assign({ sdkWaitMs: 3000, adStubMs: 1000, rewardedStubMs: 1500 }, window.__TEFT_CFG || {});
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
