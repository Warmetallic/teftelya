'use strict';
// ---------- Тефа: отрисовка утверждённого варианта (лист 4, вариант A «В томате») ----------
// Порт из tools/design_tefa.js (round4): тело с зерном, томатная глазурь и лужица, лицо. Позы — трансформацией, не по точкам.
// Перенесено только то, что нужно варианту A: палитра T4, силуэт, поле зёрен, подпалины, жирный блеск,
// рецепт соуса SAUCE4.base и лицо с круглыми глазами. У A roast = 0 и pressed = false, поэтому ветки
// «тёмный обжар» и «прижатая котлетка», другие раунды, скины, гарнир и листы не переносились.
const TEFA_TAU = Math.PI * 2;
// параметры варианта A (V4('A', 'В томате', …) из tools/design_tefa.js) вместе с его палитрой T4
const TEFA_VARIANT = {
  grain: 0.055,        // размер зерна фарша в долях радиуса
  sx: 1.04, sy: 0.96,  // тефтеля чуть шире, чем выше
  flat: 0.9,           // плоский след сковороды снизу
  seed: 27,            // сид шума: зёрна и подпалины ложатся ровно как на листе
  T: { crev: '#2a120a', shade: '#4a2010', base: '#7a3b22', warm: '#9c4a2c', lit: '#c4875a',
    hot: '#d9a070', fat: '#e8cfa8', char: '#241008', sauce: '#c0361f' },
  // SAUCE4.base: w — ширина шапки глазури, dips — [сдвиг, длина] капель, coat — плотность тонкой глазури
  sauce: { w: 0.4, dips: [[-0.3, 0.46], [0.04, 0.28], [0.32, 0.52]], coat: 0.34 },
};
// низ силуэта у инструмента на r·sy·flat = 0.864·r, поэтому рисуем радиусом r·TEFA_FIT:
// тогда низ Тефы ровно на y + r (стоит на платформе), верх на ≈ y − r·1.11, ширина ≈ 2r·1.25
const TEFA_FIT = 1 / (TEFA_VARIANT.sy * TEFA_VARIANT.flat);

const tefaRng = s => () => (s = (s * 1664525 + 1013904223) >>> 0, s / 4294967296); // стабильный «шум»
const tefaHexa = (h, a) => `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;
// Смесь возвращает 'rgb(...)', а не hex. Вложенный вызов tefaMix(tefaMix(...), …) парсит такую строку
// как hex, получает NaN — и canvas молча игнорирует такой fillStyle, оставляя предыдущий цвет (тёмную
// щель между зёрнами). Ровно из-за этого тело тёмно-красное и ровное, а светятся только карамельные
// макушки зёрен. Это часть выбранного облика: не чинить.
const tefaMix = (a, b, t) => {
  const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const A = p(a), B = p(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
};
const tefaEll = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TEFA_TAU); c.fill(); };
const tefaLw = (r, k) => Math.max(1.2, r * k); // линия не тоньше 1.2 px даже в мелком размере

// неправильная клякса — одно зерно фарша (7 точек со случайным радиусом, сглажены кривыми)
function tefaBlob(c, x, y, rad, elong, rot, R) {
  const n = 7, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TEFA_TAU, rr = rad * (0.68 + R() * 0.56); pts.push([Math.cos(a) * rr * elong, Math.sin(a) * rr]); }
  c.save(); c.translate(x, y); c.rotate(rot); c.beginPath(); c.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
  for (let i = 0; i < n; i++) { const q = pts[i], w = pts[(i + 1) % n]; c.quadraticCurveTo(q[0], q[1], (q[0] + w[0]) / 2, (q[1] + w[1]) / 2); }
  c.closePath(); c.fill(); c.restore();
}
// силуэт: низкочастотная кривизна + мелкие бугры от самих зёрен + плоская фаска снизу
function tefaSil(c, x, y, r) {
  const v = TEFA_VARIANT, N = 150; c.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = i / N * TEFA_TAU;
    let rad = r * (1 + 0.03 * Math.sin(a * 2 + v.seed) + 0.02 * Math.sin(a * 3.3 - v.seed * 1.7) + 0.012 * Math.sin(a * 5.1 + 2));
    rad += Math.max(1.1, r * 0.02) * (Math.sin(a * 13 + v.seed * 3) * 0.6 + Math.sin(a * 19 - v.seed) * 0.4); // бугристый край
    const px = Math.cos(a) * rad * v.sx;
    const py = Math.min(Math.sin(a) * rad * v.sy, r * v.sy * v.flat); // плоский след сковороды снизу
    i ? c.lineTo(x + px, y + py) : c.moveTo(x + px, y + py);
  }
  c.closePath();
}
const tefaTopY = (y, r) => y - r * TEFA_VARIANT.sy * 0.92; // макушка — на неё садится шапка глазури

// поле зёрен: джиттерная сетка, LOD — при малом r зерно крупнее, чтобы фактура читалась и на 52 px
function tefaGrains(c, x, y, r, R) {
  const v = TEFA_VARIANT, T = v.T, gr = r * (v.grain + 0.12 * Math.max(0, 1 - r / 70)), step = gr * 1.2;
  const darkBase = tefaMix(T.base, T.warm, 0.4);
  for (let gy = -r * v.sy - step; gy <= r * v.sy + step; gy += step)
    for (let gx = -r * v.sx - step; gx <= r * v.sx + step; gx += step) {
      const jx = gx + (R() - 0.5) * step * 0.85 + (Math.round(gy / step) % 2) * step * 0.5, jy = gy + (R() - 0.5) * step * 0.85;
      const nx = jx / (r * v.sx), ny = jy / (r * v.sy);
      if (Math.hypot(nx, ny) > 1.15) continue;
      const rad = gr * (0.6 + R() * 0.6), rot = R() * TEFA_TAU, elong = 1 + R() * 0.7;
      let L = 0.6 - 0.32 * (nx * 0.5 + ny * 0.85) - Math.hypot(nx, ny) * 0.2 + (R() - 0.5) * 0.3; // свет сверху-слева
      L = clamp(L, 0, 1);
      c.fillStyle = tefaHexa(T.crev, 0.45); tefaBlob(c, x + jx + rad * 0.26, y + jy + rad * 0.32, rad * 1.02, elong, rot, R); // щель между зёрнами
      c.fillStyle = tefaMix(tefaMix(darkBase, T.warm, R() * 0.7), T.lit, L); tefaBlob(c, x + jx, y + jy, rad, elong, rot, R); // тело зерна (см. tefaMix)
      if (L > 0.5) { c.fillStyle = tefaMix(T.lit, T.hot, (L - 0.5) * 1.8); tefaBlob(c, x + jx - rad * 0.2, y + jy - rad * 0.24, rad * 0.5, elong, rot, R); } // карамельная макушка
      if (R() < 0.045) { c.fillStyle = tefaHexa(T.fat, 0.7); tefaBlob(c, x + jx, y + jy, rad * 0.34, 1.5, rot, R); } // прожилка жира
    }
}
function tefaChar(c, x, y, r, R) { // подпалины сверху и с одного бока, мягкий край
  const v = TEFA_VARIANT, T = v.T;
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI * (0.15 + R() * 0.9), d = r * (0.2 + R() * 0.6);
    const px = x + Math.cos(a) * d * v.sx, py = y + Math.sin(a) * d * v.sy, rad = r * (0.18 + R() * 0.2);
    const g = c.createRadialGradient(px, py, rad * 0.2, px, py, rad);
    g.addColorStop(0, tefaHexa(T.char, 0.42)); g.addColorStop(1, tefaHexa(T.char, 0));
    c.fillStyle = g; tefaEll(c, px, py, rad, rad * 0.78, R() * TEFA_TAU);
  }
}
function tefaSheen(c, x, y, r, R) { // мокрый жирный блеск: много мелких бликов, а не одно белое пятно
  const v = TEFA_VARIANT;
  for (let i = 0; i < 34; i++) {
    const a = R() * TEFA_TAU, d = r * Math.sqrt(R()) * 0.94;
    const px = Math.cos(a) * d * v.sx, py = Math.sin(a) * d * v.sy;
    if ((-px / r * 0.5 - py / r * 0.9) < 0.1 + R() * 0.55) continue; // только сверху-слева
    c.fillStyle = `rgba(255,232,202,${0.25 + R() * 0.4})`;
    tefaEll(c, x + px, y + py, Math.max(0.7, r * (0.012 + R() * 0.02)), Math.max(0.5, r * 0.007), R() * TEFA_TAU);
  }
}
// шапка соуса: волнистый верх с каплями, путь строится отдельно — по нему же ставятся кончики капель
function tefaPourPath(c, x, y, r, w, dips) {
  const ty = tefaTopY(y, r), pts = [[-w, 0.2]].concat(dips).concat([[w, 0.18]]);
  c.beginPath(); c.moveTo(x + r * pts[0][0], ty + r * pts[0][1]);
  for (let i = 1; i < pts.length; i++) { // фестоны между каплями
    const p = pts[i - 1], q = pts[i], mx = (p[0] + q[0]) / 2;
    c.quadraticCurveTo(x + r * mx, ty + r * (Math.min(p[1], q[1]) - 0.13), x + r * q[0], ty + r * q[1]);
  }
  c.lineTo(x + r * w, ty - r * 0.4); c.lineTo(x - r * w, ty - r * 0.4); c.closePath();
  return ty;
}
function tefaPour(c, x, y, r, col, w, dips) {
  c.save(); tefaSil(c, x, y, r); c.clip(); c.fillStyle = col; const ty = tefaPourPath(c, x, y, r, w, dips); c.fill();
  for (const [dx, len] of dips) tefaEll(c, x + r * dx, ty + r * (len - 0.05), r * 0.05, r * 0.05); // кончики капель
  c.fillStyle = 'rgba(255,255,255,0.3)'; tefaEll(c, x - r * 0.12, ty + r * 0.07, r * w * 0.5, r * 0.05, -0.25); c.restore();
}
// томатная глазурь: шапка с фестонами сверху, общий томатный тон по телу и лужица соуса у низа
function tefaSauce(c, x, y, r, pool) {
  const v = TEFA_VARIANT, T = v.T, S = v.sauce;
  tefaPour(c, x, y, r, T.sauce, S.w, S.dips);
  c.save(); tefaSil(c, x, y, r); c.clip();
  c.fillStyle = tefaHexa(T.sauce, S.coat); c.fillRect(x - r * 1.4, y - r * 1.4, r * 2.8, r * 2.8); // тонкая глазурь, фактура просвечивает
  if (pool) {
    c.fillStyle = tefaHexa(T.sauce, 0.9); c.beginPath(); // плотная лужица у самого низа
    c.moveTo(x - r * 1.3, y + r * 0.66);
    c.bezierCurveTo(x - r * 0.5, y + r * 0.52, x - r * 0.1, y + r * 0.8, x + r * 0.4, y + r * 0.62);
    c.bezierCurveTo(x + r * 0.8, y + r * 0.52, x + r * 1.0, y + r * 0.7, x + r * 1.3, y + r * 0.6);
    c.lineTo(x + r * 1.3, y + r * 1.5); c.lineTo(x - r * 1.3, y + r * 1.5); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,190,150,0.45)'; c.lineWidth = tefaLw(r, 0.018); // глянец по кромке соуса
    c.beginPath(); c.moveTo(x - r * 0.9, y + r * 0.63);
    c.bezierCurveTo(x - r * 0.4, y + r * 0.5, x - r * 0.05, y + r * 0.78, x + r * 0.4, y + r * 0.61); c.stroke();
  }
  c.fillStyle = 'rgba(255,205,170,0.4)'; tefaEll(c, x - r * 0.34, y - r * 0.5, r * 0.18, r * 0.06, -0.3); // мокрый блик на глазури
  c.restore();
}
// тело: масса → зёрна → подпалины → затемнение к краю → блеск → глазурь
function tefaBody(c, x, y, r, pool) {
  const v = TEFA_VARIANT, T = v.T, R = tefaRng(v.seed * 7919 + 13);
  tefaSil(c, x, y, r);
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r * 1.1);
  g.addColorStop(0, T.warm); g.addColorStop(0.7, tefaMix(T.shade, T.base, 0.6)); g.addColorStop(1, T.crev);
  c.fillStyle = g; c.fill();
  c.save(); tefaSil(c, x, y, r); c.clip();
  tefaGrains(c, x, y, r, R);
  tefaChar(c, x, y, r, R);
  const rim = c.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.62, x, y + r * 0.1, r * 1.2);
  rim.addColorStop(0, tefaHexa(T.crev, 0)); rim.addColorStop(1, tefaHexa(T.crev, 0.55)); // затемнение к краю
  c.fillStyle = rim; c.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3);
  tefaSheen(c, x, y, r, R);
  c.restore();
  tefaSauce(c, x, y, r, pool);
}
// лицо: круглые глаза с двумя бликами и улыбка на слегка приглаженном пятачке
function tefaFace(c, x, y, r, pose) {
  const T = TEFA_VARIANT.T, ex = r * 0.30, ey = -r * 0.07, er = Math.max(4.6, r * 0.185), my = r * 0.31, mw = r * 0.27;
  const g = c.createRadialGradient(x, y + r * 0.06, r * 0.1, x, y + r * 0.06, r * 0.66);
  g.addColorStop(0, tefaHexa(T.warm, 0.5)); g.addColorStop(1, tefaHexa(T.warm, 0));
  c.fillStyle = g; tefaEll(c, x, y + r * 0.06, r * 0.66, r * 0.52); // успокаиваем фактуру под лицом
  const look = clamp(pose.face || 0, -1, 1) * er * 0.42; // взгляд сдвигает зрачок с бликами
  for (const s of [-1, 1]) {
    const cx = x + s * ex, cy = y + ey;
    c.fillStyle = tefaHexa(T.crev, 0.55); tefaEll(c, cx, cy + er * 0.1, er * 1.14, er * 1.12); // тень-посадка глаза
    if (pose.blink) { // закрытый глаз: веко цветом мяса и тёмная линия ресниц
      c.fillStyle = tefaMix(T.warm, T.lit, 0.3); tefaEll(c, cx, cy, er * 1.08, er * 1.04);
      c.strokeStyle = tefaHexa(T.char, 0.85); c.lineWidth = tefaLw(r, 0.03); c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx - er * 0.92, cy - er * 0.14);
      c.quadraticCurveTo(cx, cy + er * 0.38, cx + er * 0.92, cy - er * 0.14); c.stroke();
      continue;
    }
    c.fillStyle = '#fff'; tefaEll(c, cx, cy, er, er);
    c.fillStyle = '#231610'; c.beginPath(); c.arc(cx + er * 0.08 + look, cy + er * 0.1, er * 0.52, 0, TEFA_TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(cx - er * 0.16 + look, cy - er * 0.2, er * 0.22, 0, TEFA_TAU); c.fill();
    c.beginPath(); c.arc(cx + er * 0.3 + look, cy + er * 0.3, er * 0.1, 0, TEFA_TAU); c.fill();
  }
  if (pose.berserk) { // сердитые брови: внешний конец выше внутреннего
    c.strokeStyle = '#1b0c05'; c.lineCap = 'round'; c.lineWidth = tefaLw(r, 0.055);
    for (const s of [-1, 1]) {
      const cx = x + s * ex, cy = y + ey;
      c.beginPath(); c.moveTo(cx + s * er * 1.0, cy - er * 1.62); c.lineTo(cx - s * er * 0.8, cy - er * 0.95); c.stroke();
    }
  }
  c.lineCap = 'round'; c.lineWidth = tefaLw(r, 0.06);
  const m = clamp(pose.mouth || 0, 0, 1);
  if (m > 0.1) { // открытый рот — тёмный овал с тёплой подсветкой по нижней губе
    const mh = r * (0.045 + 0.145 * m);
    c.strokeStyle = 'rgba(255,190,140,0.35)';
    c.beginPath(); c.moveTo(x - mw * 0.95, y + my); c.quadraticCurveTo(x, y + my + mh * 2.1 + r * 0.06, x + mw * 0.95, y + my); c.stroke();
    c.fillStyle = '#1b0c05'; tefaEll(c, x, y + my + mh * 0.3, mw * 0.96, mh);
  } else { // улыбка: тёплая подсветка снизу — рот читается на тёмном теле
    c.strokeStyle = 'rgba(255,190,140,0.35)';
    c.beginPath(); c.moveTo(x - mw, y + my + r * 0.02); c.quadraticCurveTo(x, y + my + r * 0.24, x + mw, y + my + r * 0.02); c.stroke();
    c.strokeStyle = '#1b0c05';
    c.beginPath(); c.moveTo(x - mw, y + my - r * 0.01); c.quadraticCurveTo(x, y + my + r * 0.21, x + mw, y + my - r * 0.01); c.stroke();
  }
}
// кэш тела: зерно из сотен кляксов слишком дорого рисовать каждый кадр — тело печётся один раз на радиус и масштаб экрана
const tefaCache = new Map(); // `${rd}:${pool}:${k}` → canvas
const TEFA_CACHE_MAX = 48;
function tefaBodyCached(c, rd, pool) {
  const canCache = typeof document !== 'undefined' && typeof document.createElement === 'function';
  if (!canCache) { tefaBody(c, 0, 0, rd, pool); return; } // headless-стенд и node-canvas рисуют напрямую
  const k = Math.min(3, Math.max(1, Math.ceil((view.scale || 1) * (view.dpr || 1))));
  const rr = Math.max(1, Math.round(rd)), key = rr + ':' + (pool ? 1 : 0) + ':' + k;
  let cv = tefaCache.get(key);
  if (!cv) {
    const size = Math.ceil(rr * 3.2 * k);
    cv = document.createElement('canvas'); cv.width = size; cv.height = size;
    const cc = cv.getContext('2d'); if (!cc) { tefaBody(c, 0, 0, rd, pool); return; }
    cc.setTransform(k, 0, 0, k, size / 2, size / 2);
    tefaBody(cc, 0, 0, rr, pool);
    if (tefaCache.size >= TEFA_CACHE_MAX) tefaCache.delete(tefaCache.keys().next().value);
    tefaCache.set(key, cv);
  }
  const half = rr * 1.6 * (rd / rr);
  c.drawImage(cv, -half, -half, half * 2, half * 2);
}
// (x, y) — центр столкновений, r — радиус столкновений; поза задаётся трансформацией контекста
function drawTefa(c, x, y, r, pose = {}) {
  const sx = pose.sx === undefined ? 1 : pose.sx, sy = pose.sy === undefined ? 1 : pose.sy;
  const rd = r * TEFA_FIT; // радиус в мерках инструмента
  c.save();
  c.globalAlpha = pose.alpha === undefined ? 1 : pose.alpha;
  c.translate(x, y + r); c.rotate(pose.tilt || 0); c.scale(sx, sy); c.translate(0, -r); // сквош от нижней точки
  if (pose.berserk) { // тёплое свечение вокруг
    const gl = c.createRadialGradient(0, 0, r * 0.7, 0, 0, r * 1.7);
    gl.addColorStop(0, 'rgba(255,200,80,0.45)'); gl.addColorStop(1, 'rgba(255,200,80,0)');
    c.fillStyle = gl; c.beginPath(); c.arc(0, 0, r * 1.7, 0, TEFA_TAU); c.fill();
  }
  tefaBodyCached(c, rd, pose.flag !== false); // flag !== false — лужица соуса у низа
  const hot = clamp(pose.hot || 0, 0, 1);
  if (hot > 0) { tefaSil(c, 0, 0, rd); c.fillStyle = `rgba(70,20,10,${hot * 0.55})`; c.fill(); } // ожог о сковородку
  tefaFace(c, 0, 0, rd, pose);
  c.restore();
}
expose({ drawTefa, TEFA_VARIANT, get tefaCacheSize() { return tefaCache.size; } });
