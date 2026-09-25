'use strict';
// ---------- Тефа: утверждённый вариант (лист 4, A «В томате») и состояния жизней (лист 5, стиль «укусы») ----------
// Порт из tools/design_tefa.js: тело с зерном, томатная глазурь и лужица, лицо (round4); укусы по уровню жизней,
// лица состояний, красное мигание последнего куска, свечение полной шкалы, огонь берсерка, заживление укуса (round5).
// Стиль «трещины» листа 5 не переносился: владелец выбрал укусы. Позы — трансформацией контекста, не по точкам.
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
// сырой фарш на срезе укуса: те же роли цветов, что у палитры тела, только розовое (RAW5)
const TEFA_RAW = { crev: '#a4473a', shade: '#b0524a', base: '#c96b5e', warm: '#dc8576', lit: '#f2ae9f', hot: '#ffd5c6', fat: '#fff1e6', char: '#74291f' };
// укусы в порядке потери: [угол от центра, радиус укуса, вынос центра за край] в долях r (BITES5). Стоят по краю мимо
// глаз, рта и плоского низа и не пересекаются: even-odd клип вернул бы пересечение обратно в тело
const TEFA_BITES = [[-0.66, 0.4, 0.06], [2.75, 0.37, 0.06], [-2.3, 0.33, 0.06]];
const TEFA_BAND = 0.15;                     // ширина среза с сырым фаршем в долях r
const TEFA_SAUCE_K = [1, 0.8, 0.62, 0.46];  // шапка глазури сжимается к макушке с каждым куском
// искры полной шкалы: [угол, удаление в долях r, размер]; макушку не занимают — там точки зарядов (SPARKS5)
const TEFA_SPARKS = [[-2.85, 1.22, 0.1], [-2.35, 1.38, 0.14], [-2.0, 1.55, 0.07], [-1.12, 1.55, 0.08], [-0.78, 1.36, 0.14], [-0.28, 1.25, 0.09], [0.25, 1.28, 0.06], [2.95, 1.3, 0.06]];

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

// поле зёрен: джиттерная сетка, LOD — при малом r зерно крупнее, чтобы фактура читалась и на 52 px.
// T — палитра: корочка по умолчанию, сырой фарш TEFA_RAW на срезах укусов
function tefaGrains(c, x, y, r, R, T = TEFA_VARIANT.T) {
  const v = TEFA_VARIANT, gr = r * (v.grain + 0.12 * Math.max(0, 1 - r / 70)), step = gr * 1.2;
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
// томатная глазурь: шапка с фестонами сверху, общий томатный тон по телу и лужица соуса у низа; S — рецепт глазури
function tefaSauce(c, x, y, r, pool, S = TEFA_VARIANT.sauce) {
  const T = TEFA_VARIANT.T;
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
// рецепт глазури для уровня жизней: шапка и капли сжимаются к макушке (sauce5 стиля A: плотность прежняя)
function tefaSauceFor(lvl) {
  const S = TEFA_VARIANT.sauce, k = TEFA_SAUCE_K[lvl];
  return lvl ? { w: S.w * k, dips: S.dips.map(([dx, len]) => [dx * k, len * k]), coat: S.coat } : S;
}
// мясо без глазури: масса → зёрна → подпалины → затемнение к краю → блеск
function tefaMeat(c, x, y, r) {
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
}

// ---------- жизни: уровень, укусы, срезы, заживление (спека v2.1.1 §3.2) ----------
// 0 — полная, 1 — минус кусок, 2 — два укуса, 3 — последний кусок (паника при любой «Мясистости»)
function tefaHpLevel(cur, max) {
  if (cur >= max) return 0;
  if (cur <= 1) return 3;
  return cur / max >= 0.6 ? 1 : 2;
}
function tefaBite(x, y, r, i, grown) { // grown — сколько укуса уже заросло: 0 — целиком, 1 — укуса нет
  const v = TEFA_VARIANT, [a, b, off] = TEFA_BITES[i];
  return { cx: x + Math.cos(a) * r * v.sx * (1 + off), cy: y + Math.sin(a) * r * v.sy * (1 + off),
    b: r * (off + (b - off) * (1 - (grown || 0))), ph: i * 1.3 };
}
function tefaBitesOf(x, y, r, lvl) { const out = []; for (let i = 0; i < lvl; i++) out.push(tefaBite(x, y, r, i)); return out; }
function tefaBitePath(c, B, grow) { // круг укуса со следами зубов: скруглённые выемки, между ними острые зубчики
  const br = B.b + (grow || 0), N = 180;
  for (let i = 0; i <= N; i++) {
    const a = i / N * TEFA_TAU, rr = br * (0.93 + 0.07 * Math.abs(Math.sin(a * 9 + B.ph)));
    const px = B.cx + Math.cos(a) * rr, py = B.cy + Math.sin(a) * rr;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath();
}
function tefaClipOutBites(c, x, y, r, bites) { // дальше всё рисуется мимо укусов: прямоугольник минус круги (even-odd)
  c.beginPath(); c.rect(x - r * 3, y - r * 3, r * 6, r * 6);
  for (const B of bites) tefaBitePath(c, B);
  c.clip('evenodd');
}
function tefaRawMince(c, x, y, r, seed) { // заливка сырым фаршем в текущем клипе: розовая основа и то же зерно
  const g = c.createLinearGradient(x - r * 0.6, y - r * 0.8, x + r * 0.6, y + r * 0.8);
  g.addColorStop(0, TEFA_RAW.lit); g.addColorStop(1, TEFA_RAW.shade); // свет сверху-слева, как у корочки
  c.fillStyle = g; c.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3);
  tefaGrains(c, x, y, r, tefaRng(TEFA_VARIANT.seed * 31 + seed), TEFA_RAW);
}
// срез укуса: полоса сырого фарша вдоль выкуса, тёмная кромка корочки по её внутреннему краю и соус, затёкший сверху
function tefaBiteRims(c, x, y, r, bites) {
  const T = TEFA_VARIANT.T, band = r * TEFA_BAND;
  c.save(); tefaSil(c, x, y, r); c.clip(); // внутри тела; сами укусы уже вырезаны внешним клипом
  c.beginPath(); for (const B of bites) tefaBitePath(c, B, band); c.clip();
  tefaRawMince(c, x, y, r, 7);
  c.strokeStyle = tefaHexa(T.crev, 0.75); c.lineWidth = tefaLw(r, 0.03); // кромка корочки
  c.beginPath(); for (const B of bites) tefaBitePath(c, B, band); c.stroke();
  c.lineCap = 'round';
  for (const B of bites) { // мазок соуса по верхней части среза и капля на его конце
    const toC = Math.atan2(y - B.cy, x - B.cx), dUp = Math.atan2(y - r - B.cy, x - B.cx) - toC;
    const side = Math.max(-0.75, Math.min(0.75, Math.atan2(Math.sin(dUp), Math.cos(dUp)))), mid = toC + side;
    const a1 = mid - Math.sign(side) * 0.45, rr = B.b + band * 0.45;
    c.strokeStyle = tefaHexa(T.sauce, 0.92); c.lineWidth = tefaLw(r, 0.06);
    c.beginPath(); c.arc(B.cx, B.cy, rr, Math.min(mid, a1), Math.max(mid, a1)); c.stroke();
    c.fillStyle = tefaHexa(T.sauce, 0.95); tefaEll(c, B.cx + Math.cos(a1) * rr, B.cy + Math.sin(a1) * rr + r * 0.02, r * 0.045, r * 0.06);
  }
  c.restore();
}
// укус зарастает: между прежним краем B0 и нынешним B — свежий фарш, по фронту роста золотая кромка.
// Внешний клип уже вырезал ещё открытую часть B; raw() заливает сырым фаршем текущий клип
function tefaHealFill(c, x, y, r, B0, B, raw) {
  c.save(); tefaSil(c, x, y, r); c.clip();
  c.beginPath(); tefaBitePath(c, B0); c.clip();
  raw();
  const g = c.createRadialGradient(B.cx, B.cy, B.b, B.cx, B.cy, B0.b * 1.02);
  g.addColorStop(0, 'rgba(255,214,120,0.8)'); g.addColorStop(0.5, 'rgba(255,214,120,0.35)'); g.addColorStop(1, 'rgba(255,214,120,0.12)');
  c.fillStyle = g; c.fillRect(B0.cx - B0.b * 1.1, B0.cy - B0.b * 1.1, B0.b * 2.2, B0.b * 2.2);
  c.strokeStyle = 'rgba(255,236,160,0.95)'; c.lineWidth = tefaLw(r, 0.035); // фронт роста
  c.beginPath(); tefaBitePath(c, B); c.stroke();
  c.restore();
  c.save(); tefaSil(c, x, y, r); c.clip(); // золотистая граница прежнего укуса на корочке
  c.strokeStyle = 'rgba(255,214,120,0.55)'; c.lineWidth = tefaLw(r, 0.022);
  c.beginPath(); tefaBitePath(c, B0); c.stroke();
  c.restore();
}
// тело целиком для уровня lvl: мясо и глазурь мимо укусов, красный тон последнего куска, срезы
function tefaBodyHp(c, x, y, r, pool, lvl, tint) {
  const bites = tefaBitesOf(x, y, r, lvl);
  c.save();
  if (bites.length) tefaClipOutBites(c, x, y, r, bites);
  tefaMeat(c, x, y, r);
  tefaSauce(c, x, y, r, pool, tefaSauceFor(lvl));
  if (tint) tefaTint(c, x, y, r, tint); // краснеет корочка; срезы рисуются после и остаются розовыми
  if (bites.length) tefaBiteRims(c, x, y, r, bites);
  c.restore();
}

// ---------- эффекты: мигание, пот, искры, свечение шкалы, огонь берсерка ----------
function tefaAlarm(c, x, y, r, t) { // красный ореол за телом: мигание видно на тёмной кухне
  const g = c.createRadialGradient(x, y, r * 1.0, x, y, r * 1.55);
  g.addColorStop(0, `rgba(255,56,40,${0.5 * t})`); g.addColorStop(1, 'rgba(255,56,40,0)');
  c.fillStyle = g; tefaEll(c, x, y, r * 1.55, r * 1.55);
}
function tefaTint(c, x, y, r, t) { // тело краснеет; лицо рисуется после и остаётся читаемым
  c.save(); tefaSil(c, x, y, r); c.clip();
  c.fillStyle = `rgba(255,50,34,${0.42 * t})`; c.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3);
  c.restore();
}
function tefaSweat(c, x, y, r) { // капля пота у левого виска: голубая с бликом и тёмным контуром
  const s = r * 0.15; c.save(); c.translate(x - r * 0.8, y - r * 0.46); c.rotate(-0.35);
  c.beginPath(); c.moveTo(0, -s * 1.5); c.bezierCurveTo(s * 0.35, -s * 0.6, s, 0, s, s * 0.3);
  c.arc(0, s * 0.3, s, 0, Math.PI); c.bezierCurveTo(-s, 0, -s * 0.35, -s * 0.6, 0, -s * 1.5); c.closePath();
  c.fillStyle = '#bfe8ff'; c.fill(); c.strokeStyle = '#2d5d86'; c.lineWidth = tefaLw(r, 0.018); c.stroke();
  c.fillStyle = '#fff'; tefaEll(c, -s * 0.35, s * 0.1, s * 0.22, s * 0.35, 0.3);
  c.restore();
}
function tefaSparkle(c, x, y, s) { // золотая искра: четыре луча, мягкий ореол и светлая серединка
  const g = c.createRadialGradient(x, y, 0, x, y, s * 1.4);
  g.addColorStop(0, 'rgba(255,230,150,0.6)'); g.addColorStop(1, 'rgba(255,200,90,0)');
  c.fillStyle = g; tefaEll(c, x, y, s * 1.4, s * 1.4);
  c.fillStyle = '#ffe07a'; c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? s * 0.22 : s;
    i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath(); c.fill(); c.fillStyle = '#fffbe8'; tefaEll(c, x, y, s * 0.2, s * 0.2);
}
function tefaChargeGlow(c, x, y, r) { // шкала полна: тёплое свечение за телом
  const g = c.createRadialGradient(x, y, r * 0.8, x, y, r * 1.6);
  g.addColorStop(0, 'rgba(255,200,90,0.6)'); g.addColorStop(1, 'rgba(255,200,90,0)');
  c.fillStyle = g; tefaEll(c, x, y, r * 1.6, r * 1.6);
}
function tefaChargeRim(c, x, y, r) { // золотой кант изнутри по краю — Тефа светится сама, а не просто стоит в ореоле
  c.save(); tefaSil(c, x, y, r); c.clip();
  const g = c.createRadialGradient(x, y + r * 0.1, r * 0.72, x, y + r * 0.1, r * 1.1);
  g.addColorStop(0, 'rgba(255,210,110,0)'); g.addColorStop(1, 'rgba(255,210,110,0.65)');
  c.fillStyle = g; c.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3);
  c.restore();
}
function tefaBerserkAura(c, x, y, r) { // огненная аура: три слоя языков пламени от края вверх-наружу (за телом)
  const v = TEFA_VARIANT, g = c.createRadialGradient(x, y, r * 0.8, x, y, r * 1.7);
  g.addColorStop(0, 'rgba(255,110,30,0.55)'); g.addColorStop(1, 'rgba(255,80,20,0)');
  c.fillStyle = g; tefaEll(c, x, y, r * 1.7, r * 1.7);
  for (const [col, k] of [['rgba(214,52,20,0.9)', 1], ['rgba(255,132,30,0.95)', 0.74], ['rgba(255,222,110,0.95)', 0.5]]) {
    const R = tefaRng(777); c.fillStyle = col; // один сид на все слои — языки вложены друг в друга
    for (let i = 0; i < 14; i++) {
      const t = i / 13, a = 2.75 + t * 3.93; // от нижне-левого бока через макушку к нижне-правому
      const ex = x + Math.cos(a) * r * v.sx * 0.9, ey = y + Math.sin(a) * r * v.sy * 0.9;
      let dx = Math.cos(a), dy = Math.sin(a) - 1.4; const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl; // наружу и вверх
      const len = r * (0.32 + 0.26 * Math.sin(t * Math.PI) + R() * 0.2) * k, w = r * (0.2 + R() * 0.06) * k;
      const nx = -dy, ny = dx, curl = (R() - 0.5) * 0.5; // поперёк языка; кончик чуть загнут
      c.beginPath(); c.moveTo(ex - nx * w, ey - ny * w);
      c.quadraticCurveTo(ex - nx * w * 0.6 + dx * len * 0.55, ey - ny * w * 0.6 + dy * len * 0.55, ex + dx * len + nx * len * curl * 0.3, ey + dy * len + ny * len * curl * 0.3);
      c.quadraticCurveTo(ex + nx * w * 0.6 + dx * len * 0.55, ey + ny * w * 0.6 + dy * len * 0.55, ex + nx * w, ey + ny * w);
      c.closePath(); c.fill();
    }
  }
}
function tefaEmbers(c, x, y, r) { // угольки над макушкой
  const R = tefaRng(99);
  for (let i = 0; i < 7; i++) {
    const px = x + (R() - 0.5) * r * 1.6, py = y - r * (1.25 + R() * 0.45), s = Math.max(1.2, r * (0.02 + R() * 0.02));
    c.fillStyle = `rgba(255,${(170 + R() * 70) | 0},60,${(0.6 + R() * 0.4).toFixed(2)})`; tefaEll(c, px, py, s, s);
  }
}

// ---------- лицо: mood из состояния, поверх — моргание, взгляд и открытый рот при еде ----------
// happy — утверждённое лицо; determined, worried, scared — жизни; ready — полная шкала; fierce — берсерк
function tefaFace(c, x, y, r, pose, mood) {
  const T = TEFA_VARIANT.T, ex = r * 0.30, ey = -r * 0.07, my = r * 0.31, mw = r * 0.27;
  const scared = mood === 'scared', er = Math.max(4.6, r * 0.185) * (scared ? 1.16 : 1);
  const g = c.createRadialGradient(x, y + r * 0.06, r * 0.1, x, y + r * 0.06, r * 0.66);
  g.addColorStop(0, tefaHexa(T.warm, 0.5)); g.addColorStop(1, tefaHexa(T.warm, 0));
  c.fillStyle = g; tefaEll(c, x, y + r * 0.06, r * 0.66, r * 0.52); // успокаиваем фактуру под лицом
  const look = clamp(pose.face || 0, -1, 1) * er * 0.42; // взгляд сдвигает зрачок с бликами
  // веко: [доля глаза под веком у внешнего края, насколько край ниже у переносицы] — собранный, готовый, злой взгляд
  const lid = { determined: [0.3, 0.22], ready: [0.26, 0.16], fierce: [0.34, 0.46] }[mood];
  const pr = scared ? 0.3 : mood === 'worried' ? 0.46 : 0.52; // испуг — зрачок-точка
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
    if (mood === 'happy') { // утверждённое лицо дословно (drawFace4 листа 4): зрачок и два блика
      c.fillStyle = '#231610'; c.beginPath(); c.arc(cx + er * 0.08 + look, cy + er * 0.1, er * 0.52, 0, TEFA_TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(cx - er * 0.16 + look, cy - er * 0.2, er * 0.22, 0, TEFA_TAU); c.fill();
      c.beginPath(); c.arc(cx + er * 0.3 + look, cy + er * 0.3, er * 0.1, 0, TEFA_TAU); c.fill();
      continue;
    }
    const px = cx + (scared ? 0 : er * 0.08) + look, py = cy + (scared ? 0 : mood === 'worried' ? -er * 0.04 : er * 0.1);
    c.fillStyle = '#231610'; c.beginPath(); c.arc(px, py, er * pr, 0, TEFA_TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(px - er * pr * 0.46, py - er * pr * 0.58, er * pr * 0.42, 0, TEFA_TAU); c.fill(); // блики
    if (!scared) { c.beginPath(); c.arc(px + er * pr * 0.42, py + er * pr * 0.38, er * pr * 0.19, 0, TEFA_TAU); c.fill(); }
    if (lid) {
      const [h, tilt] = lid, xo = cx + s * er * 1.1, xi = cx - s * er * 1.1, yo = cy - er + er * 2 * h, yi = yo + er * tilt;
      c.save(); c.beginPath(); c.arc(cx, cy, er * 1.01, 0, TEFA_TAU); c.clip();
      c.fillStyle = tefaMix(T.warm, T.lit, 0.3); c.beginPath(); // веко цветом мяса
      c.moveTo(xo, yo); c.lineTo(xi, yi); c.lineTo(xi, cy - er * 1.3); c.lineTo(xo, cy - er * 1.3); c.closePath(); c.fill();
      c.restore();
      c.save(); c.beginPath(); c.arc(cx, cy, er * 1.12, 0, TEFA_TAU); c.clip(); // линия ресниц по краю века
      c.strokeStyle = tefaHexa(T.char, 0.9); c.lineWidth = tefaLw(r, 0.034); c.lineCap = 'round';
      c.beginPath(); c.moveTo(xo, yo); c.lineTo(xi, yi); c.stroke(); c.restore();
    }
  }
  // брови: [внешний край x, высота; внутренний край x, высота] в долях er от центра глаза; светлая подводка снизу
  const brow = { determined: [0.95, 1.5, 0.8, 1.26], ready: [0.95, 1.5, 0.8, 1.3], worried: [0.95, 1.38, 0.72, 1.74],
    scared: [0.95, 1.55, 0.7, 1.98], fierce: [1.05, 1.66, 0.82, 0.98] }[mood];
  if (brow) for (const s of [-1, 1]) {
    const cx = x + s * ex, cy = y + ey, [xo, ho, xi, hi] = brow;
    for (const [col, dy, w] of [['rgba(255,190,140,0.35)', er * 0.14, 0.06], ['#1b0c05', 0, mood === 'fierce' ? 0.068 : 0.052]]) {
      c.strokeStyle = col; c.lineWidth = tefaLw(r, w); c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx + s * er * xo, cy - er * ho + dy); c.lineTo(cx - s * er * xi, cy - er * hi + dy); c.stroke();
    }
  }
  const my0 = y + my, warm = 'rgba(255,190,140,0.35)', dark = '#1b0c05';
  c.lineCap = 'round'; c.lineWidth = tefaLw(r, 0.06);
  const m = clamp(pose.mouth || 0, 0, 1);
  if (m > 0.1) { // открытый рот при еде — тёмный овал с тёплой подсветкой по нижней губе
    const mh = r * (0.045 + 0.145 * m);
    c.strokeStyle = warm;
    c.beginPath(); c.moveTo(x - mw * 0.95, my0); c.quadraticCurveTo(x, my0 + mh * 2.1 + r * 0.06, x + mw * 0.95, my0); c.stroke();
    c.fillStyle = dark; tefaEll(c, x, my0 + mh * 0.3, mw * 0.96, mh);
  } else if (mood === 'happy' || mood === 'ready') { // улыбка утверждённого лица
    c.strokeStyle = warm; c.beginPath(); c.moveTo(x - mw, my0 + r * 0.02); c.quadraticCurveTo(x, my0 + r * 0.24, x + mw, my0 + r * 0.02); c.stroke();
    c.strokeStyle = dark; c.beginPath(); c.moveTo(x - mw, my0 - r * 0.01); c.quadraticCurveTo(x, my0 + r * 0.21, x + mw, my0 - r * 0.01); c.stroke();
  } else if (mood === 'determined') { // сжатые губы: короткая прямая, уголки чуть вниз
    const line = dy => { c.beginPath(); c.moveTo(x - mw * 0.72, my0 + r * 0.09 + dy); c.quadraticCurveTo(x, my0 + r * 0.04 + dy, x + mw * 0.72, my0 + r * 0.09 + dy); c.stroke(); };
    c.strokeStyle = warm; line(r * 0.03); c.strokeStyle = dark; line(0);
  } else if (mood === 'worried') { // волнистая тревожная линия
    const wave = dy => {
      c.beginPath(); c.moveTo(x - mw * 0.78, my0 + r * 0.1 + dy);
      c.bezierCurveTo(x - mw * 0.4, my0 + r * 0.01 + dy, x - mw * 0.1, my0 + r * 0.01 + dy, x, my0 + r * 0.07 + dy);
      c.bezierCurveTo(x + mw * 0.1, my0 + r * 0.13 + dy, x + mw * 0.4, my0 + r * 0.13 + dy, x + mw * 0.78, my0 + r * 0.04 + dy); c.stroke();
    };
    c.strokeStyle = warm; wave(r * 0.03); c.strokeStyle = dark; wave(0);
  } else if (mood === 'scared') { // маленький открытый рот «о»
    c.fillStyle = warm; tefaEll(c, x, my0 + r * 0.1, r * 0.11, r * 0.13);
    c.fillStyle = dark; tefaEll(c, x, my0 + r * 0.08, r * 0.095, r * 0.115);
  } else if (mood === 'fierce') { // оскал: широкий открытый рот, сверху ряд зубов
    const mouth = () => { c.beginPath(); c.moveTo(x - mw * 1.08, my0 - r * 0.03); c.quadraticCurveTo(x, my0 + r * 0.07, x + mw * 1.08, my0 - r * 0.03);
      c.quadraticCurveTo(x, my0 + r * 0.4, x - mw * 1.08, my0 - r * 0.03); c.closePath(); };
    c.save(); c.translate(0, r * 0.03); c.fillStyle = warm; mouth(); c.fill(); c.restore(); // тёплая подсветка нижней губы
    c.fillStyle = dark; mouth(); c.fill();
    c.save(); mouth(); c.clip(); c.fillStyle = '#f6efe2'; c.fillRect(x - mw * 1.1, my0 - r * 0.1, mw * 2.2, r * 0.18);
    c.strokeStyle = tefaHexa(T.crev, 0.5); c.lineWidth = tefaLw(r, 0.012);
    for (const k of [-0.5, 0, 0.5]) { c.beginPath(); c.moveTo(x + mw * k, my0); c.lineTo(x + mw * k, my0 + r * 0.08); c.stroke(); }
    c.restore();
  }
}

// ---------- кэш: зерно из сотен клякс слишком дорого рисовать каждый кадр ----------
// картинка печётся один раз на радиус (шаг 4 px) и масштаб экрана; тело — ещё на лужицу, уровень жизней и красный тон
const tefaCache = new Map(); // `${tag}:${rr}:${k}` → canvas; tag: `body:${pool}:${lvl}:${tint}` или `raw`
const TEFA_CACHE_MAX = 20;   // на телефоне с dpr 3 кэш с k = 3 и шагом радиуса 2 px доходил до 60 МБ; сейчас k ≤ 2, ключей на сессию
                             // около 15 (уровни жизней × радиусы масс, сырой фарш, берсерк); вытесняется давно неиспользованная картинка
// rb — радиус, под который картинка печётся (целевой радиус массы, pose.bake); rd — радиус, в котором она рисуется сейчас:
// пока радиус плавно догоняет массу после удара или лечения, картинка масштабируется, а не перепекается
function tefaCached(c, rd, rb, tag, paint) { // paint(cc, r) рисует картинку с центром в (0, 0) для радиуса r
  const canCache = typeof document !== 'undefined' && typeof document.createElement === 'function';
  if (!canCache) { paint(c, rd); return; } // headless-стенд и node-canvas рисуют напрямую
  const k = Math.min(2, Math.max(1, Math.ceil((view.scale || 1) * (view.dpr || 1))));
  const rr = Math.max(4, Math.round(rb / 4) * 4), key = tag + ':' + rr + ':' + k;
  let cv = tefaCache.get(key);
  if (cv) { tefaCache.delete(key); tefaCache.set(key, cv); } // свежая картинка — в конец очереди на вытеснение
  else {
    const size = Math.ceil(rr * 3.2 * k);
    cv = document.createElement('canvas'); cv.width = size; cv.height = size;
    const cc = cv.getContext('2d'); if (!cc) { paint(c, rd); return; }
    cc.setTransform(k, 0, 0, k, size / 2, size / 2);
    paint(cc, rr);
    if (tefaCache.size >= TEFA_CACHE_MAX) tefaCache.delete(tefaCache.keys().next().value);
    tefaCache.set(key, cv);
  }
  const half = rd * 1.6; // картинка шириной 3.2·rr под радиус rr, растянута под rd
  c.drawImage(cv, -half, -half, half * 2, half * 2);
}
function tefaBodyCached(c, rd, rb, pool, lvl, tint) { tefaCached(c, rd, rb, 'body:' + (pool ? 1 : 0) + ':' + lvl + ':' + tint, (cc, r) => tefaBodyHp(cc, 0, 0, r, pool, lvl, tint)); }
// заживление 0.3 с тоже из кэша: тело нового уровня мимо ещё открытой части укуса B, в кольце между B0 и B — сырой фарш
function tefaHealCached(c, rd, rb, pool, lvl, heal) {
  const B0 = tefaBite(0, 0, rd, lvl), B = tefaBite(0, 0, rd, lvl, heal); // был укус B0, сейчас B
  c.save(); tefaClipOutBites(c, 0, 0, rd, [B]);
  tefaBodyCached(c, rd, rb, pool, lvl, 0);
  tefaHealFill(c, 0, 0, rd, B0, B, () => tefaCached(c, rd, rb, 'raw', (cc, r) => tefaRawMince(cc, 0, 0, r, 11)));
  c.restore();
}
// (x, y) — центр столкновений, r — радиус столкновений; поза задаётся трансформацией контекста.
// pose: sx, sy, tilt, face, mouth, blink, hot 0..1, berserk, alpha, flag (лужица соуса; по умолчанию есть),
//   hp { cur, max } — жизни (по умолчанию полная), tint 0..1 — красное мигание последнего куска,
//   charged — шкала суперсилы полна, heal 0..1 — укус зарастает (0 и 1 — заживления нет),
//   bake — целевой радиус (как r), под который печётся кэш тела, пока r его догоняет; по умолчанию r
function drawTefa(c, x, y, r, pose = {}) {
  const sx = pose.sx === undefined ? 1 : pose.sx, sy = pose.sy === undefined ? 1 : pose.sy;
  const rd = r * TEFA_FIT, rb = (pose.bake || r) * TEFA_FIT; // радиус в мерках инструмента; rb — под него печётся кэш
  const hp = pose.hp || { cur: 1, max: 1 }, lvl = tefaHpLevel(hp.cur, hp.max), pool = pose.flag !== false;
  const heal = pose.heal > 0 && pose.heal < 1 && lvl < 3 ? pose.heal : 0; // заживает укус № lvl: следующий после нынешних
  const tint = lvl === 3 ? clamp(pose.tint || 0, 0, 1) : 0;
  const mood = pose.berserk ? 'fierce' : lvl === 3 ? 'scared' : pose.charged ? 'ready' : ['happy', 'determined', 'worried'][lvl];
  const a0 = pose.alpha === undefined ? 1 : pose.alpha;
  c.save();
  c.globalAlpha = a0;
  c.translate(x, y + r); c.rotate(pose.tilt || 0); c.scale(sx, sy); c.translate(0, -r); // сквош от нижней точки
  if (pose.berserk) tefaBerserkAura(c, 0, 0, rd);
  if (pose.charged) tefaChargeGlow(c, 0, 0, rd);
  if (tint) tefaAlarm(c, 0, 0, rd, tint);
  if (heal) tefaHealCached(c, rd, rb, pool, lvl, heal);
  else {
    tefaBodyCached(c, rd, rb, pool, lvl, 0);
    if (tint) { c.globalAlpha = a0 * tint; tefaBodyCached(c, rd, rb, pool, lvl, 1); c.globalAlpha = a0; } // смесь с красной версией = мигание
  }
  const hot = clamp(pose.hot || 0, 0, 1);
  if (hot > 0 || pose.charged) { // ожог и золотой кант ложатся на тело мимо укусов
    c.save(); const bites = tefaBitesOf(0, 0, rd, lvl); if (bites.length) tefaClipOutBites(c, 0, 0, rd, bites);
    if (hot > 0) { tefaSil(c, 0, 0, rd); c.fillStyle = `rgba(70,20,10,${hot * 0.55})`; c.fill(); } // ожог о сковородку
    if (pose.charged) tefaChargeRim(c, 0, 0, rd);
    c.restore();
  }
  tefaFace(c, 0, 0, rd, pose, mood);
  if (mood === 'worried') tefaSweat(c, 0, 0, rd);
  if (pose.charged) for (const [a, d, s] of TEFA_SPARKS) tefaSparkle(c, Math.cos(a) * rd * TEFA_VARIANT.sx * d, Math.sin(a) * rd * TEFA_VARIANT.sy * d, rd * s);
  if (heal) { // золотая искра у зарастающего укуса
    const B0 = tefaBite(0, 0, rd, lvl), a = Math.atan2(B0.cy, B0.cx);
    tefaSparkle(c, B0.cx - Math.cos(a) * B0.b * 0.35, B0.cy - Math.sin(a) * B0.b * 0.35, rd * 0.17);
    tefaSparkle(c, B0.cx + Math.cos(a + 1.2) * B0.b * 0.7, B0.cy + Math.sin(a + 1.2) * B0.b * 0.7, rd * 0.08);
  }
  if (pose.berserk) tefaEmbers(c, 0, 0, rd);
  c.restore();
}
expose({ drawTefa, tefaHpLevel, TEFA_VARIANT, TEFA_FIT, get tefaCacheSize() { return tefaCache.size; } });
