'use strict';
// node tools/design_tefa.js [round1|round2|round3|round4|round5|all] — листы концептов Тефы в shots/ (не коммитим).
// round5 — жизни на самой Тефе: состояния массы (укусы / трещины) и особые состояния на утверждённом A раунда 4;
//   второй аргумент — имя файла листа без .png (для черновиков, чтобы не перезаписать выбранный лист);
// round4 — выбранный вариант E «В томате» (ранняя редакция раунда 2) и близкая родня;
// round3 — выбранный вариант E раунда 1 и близкая родня; round2 (по умолчанию) — отклонённое направление «фарш»; round1 — первый заход.
// Только примитивы Canvas 2D, чтобы выбранный вариант переносился в src/render.js почти без правок:
// вся отрисовка персонажа — в одной функции drawTefa(c, x, y, r, v, skin), v — объект параметров.
const fs = require('fs'), path = require('path'), { createCanvas } = require('canvas');
const OUT = path.join(__dirname, '..', 'shots'); fs.mkdirSync(OUT, { recursive: true }); const TAU = Math.PI * 2;
const rng = s => () => (s = (s * 1664525 + 1013904223) >>> 0, s / 4294967296); // стабильный «шум»
const hexa = (h, a) => `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;
const mix = (a, b, t) => { // линейная смесь двух hex-цветов, результат тоже hex (годится для hexa())
  const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const A = p(a), B = p(b), f = i => Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0');
  return '#' + f(0) + f(1) + f(2);
};
const ell = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.fill(); };
const lw = (r, k) => Math.max(1.2, r * k); // линия не тоньше 1.2 px даже в мелком размере
const clamp = t => Math.max(0, Math.min(1, t));

// ---------- палитры раунда 1 ----------
const PAL = {
  classic: { top: '#dd8f4e', base: '#c0703a', mid: '#a55a2a', dark: '#8a4420', fat: '#e8b87a', char: '#5a2a12' },
  light: { top: '#ffcd8c', base: '#e79a56', mid: '#cd7b3c', dark: '#ab6128', fat: '#fff0cd', char: '#8a4a1e' },
  roast: { top: '#b56c2c', base: '#9a4e22', mid: '#7d3b18', dark: '#55270d', fat: '#d69b5c', char: '#2e1306' },
};

// ---------- силуэт раунда 1: мягкая волна из двух гармоник ----------
function bodyPath(c, x, y, r, v) {
  if (v.r4) return silhouette4(c, x, y, r, v); // раунд 4 — силуэт ранней редакции раунда 2
  if (v.r2) return silhouette2(c, x, y, r, v); // раунд 2 — свой неровный силуэт
  const N = 96; c.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = i / N * TAU; let rad = r * (1 + v.wob * (Math.sin(a * 3 + v.seed) * 0.6 + Math.sin(a * 5 - v.seed) * 0.4));
    if (v.shape === 'pressed') rad *= 1 - 0.045 * Math.abs(Math.sin(a * 3 + 0.4));
    let px = Math.cos(a) * rad * v.sx, py = Math.sin(a) * rad * v.sy;
    if (v.shape === 'egg') px *= 1 + (v.eggK === undefined ? 0.17 : v.eggK) * (py / (r * v.sy)); // «яйцо»: верх уже низа, eggK — насколько
    if (v.shape === 'pressed' && py < 0) py *= 0.84;
    i ? c.lineTo(x + px, y + py) : c.moveTo(x + px, y + py);
  }
  c.closePath();
}
// макушка — точка опоры для гарнира и головных уборов
const topY = (y, r, v) => v.r4 ? y - r * v.sy * (v.pressed ? 0.78 : 0.92) // r4 — формула ранней редакции
  : v.r2 ? y + silPt(-Math.PI / 2, r, v)[1] : y - r * v.sy * (v.shape === 'pressed' ? 0.8 : 0.96);

// ---------- тело раунда 1: градиент корочки, пятна обжарки, крапинки, блик ----------
function drawBody(c, x, y, r, v) {
  const P = v.pal, R = rng(v.seed * 9973 + 17), sk = v.speckK === undefined ? 1 : v.speckK; // sk — размер крапинки (1 = как в раунде 1)
  bodyPath(c, x, y, r, v);
  const g = c.createRadialGradient(x - r * 0.34, y - r * 0.42, r * 0.06, x, y, r * 1.12);
  g.addColorStop(0, P.top); g.addColorStop(0.42, P.base); g.addColorStop(0.8, P.mid); g.addColorStop(1, P.dark);
  c.fillStyle = g; c.fill(); c.save(); bodyPath(c, x, y, r, v); c.clip();
  for (let i = 0; i < 6; i++) { // пятна обжарки — мягкие, не «шарики»
    const a = R() * TAU, d = r * (0.2 + R() * 0.62), pr = r * (0.18 + R() * 0.22); const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
    const pg = c.createRadialGradient(px, py, 0, px, py, pr);
    pg.addColorStop(0, hexa(i % 2 ? P.dark : P.mid, 0.34)); pg.addColorStop(1, hexa(P.dark, 0));
    c.fillStyle = pg; ell(c, px, py, pr, pr * 0.8, a);
  }
  const n = Math.round(v.speck * (r * r) / 8100); // крапинки: жировые блёстки и подпалины
  for (let i = 0; i < n; i++) {
    const a = R() * TAU, d = r * Math.sqrt(R()) * 0.97; const px = x + Math.cos(a) * d * v.sx, py = y + Math.sin(a) * d * v.sy, fat = R() < 0.55;
    c.fillStyle = hexa(fat ? P.fat : P.char, fat ? 0.55 : 0.4);
    ell(c, px, py, Math.max(0.6, r * (0.012 + R() * 0.016) * sk), Math.max(0.5, r * (0.009 + R() * 0.012) * sk), a);
  }
  for (let i = 0; i < v.grain; i++) { // гранулы фарша: мягкое зерно со светлой фаской
    const a = R() * TAU, d = r * Math.sqrt(R()) * 0.86, gr = r * (0.05 + R() * 0.05); const px = x + Math.cos(a) * d * v.sx, py = y + Math.sin(a) * d * v.sy;
    c.fillStyle = hexa(P.mid, 0.28); ell(c, px, py, gr, gr * 0.72, a);
    c.fillStyle = hexa(P.fat, 0.26); ell(c, px - gr * 0.18, py - gr * 0.24, gr * 0.62, gr * 0.34, a);
  }
  if (v.sideRoast) { // раунд 3 F: тонкая полоса обжарки с одного бока — «сторона, лежавшая на сковороде»
    const rg = c.createLinearGradient(x + r * 0.25, y - r * 0.1, x + r * v.sx * 1.02, y + r * 0.45);
    rg.addColorStop(0, hexa(P.dark, 0)); rg.addColorStop(0.55, hexa(P.dark, 0.34 * v.sideRoast)); rg.addColorStop(1, hexa(P.char, 0.62 * v.sideRoast));
    c.fillStyle = rg; c.fillRect(x - r * 1.4, y - r * 1.4, r * 2.8, r * 2.8);
  }
  for (let i = 0; i < (v.flecks || 0); i++) { // пара крошек орегано — «фото», но фактура остаётся гладкой
    const a = R() * TAU, d = r * (0.45 + R() * 0.42); // ближе к краю, чтобы не сыпаться на лицо
    const px = x + Math.cos(a) * d * v.sx, py = y + Math.sin(a) * d * v.sy - r * 0.1;
    c.fillStyle = ['#6f8a37', '#93ad55', '#4d6a28'][(R() * 3) | 0]; const rot = R() * TAU;
    if (Math.abs(px - x) > r * 0.5 || Math.abs(py - y) > r * 0.45) ell(c, px, py, Math.max(1, r * 0.022), Math.max(0.6, r * 0.011), rot);
  }
  const sg = c.createRadialGradient(x - r * 0.3, y - r * 0.34, r * 0.5, x - r * 0.05, y, r * 1.28);
  sg.addColorStop(0, hexa(P.dark, 0)); sg.addColorStop(1, hexa(P.char, 0.5));
  c.fillStyle = sg; c.fillRect(x - r * 1.4, y - r * 1.4, r * 2.8, r * 2.8);
  const hg = c.createRadialGradient(x - r * 0.38, y - r * 0.44, 0, x - r * 0.38, y - r * 0.44, r * 0.34);
  hg.addColorStop(0, 'rgba(255,248,235,0.6)'); hg.addColorStop(1, 'rgba(255,248,235,0)'); // масляный блик
  c.fillStyle = hg; ell(c, x - r * 0.38, y - r * 0.44, r * 0.34, r * 0.22, -0.5);
  c.fillStyle = 'rgba(255,255,255,0.75)'; ell(c, x - r * 0.52, y - r * 0.52, r * 0.07, r * 0.045, -0.5); c.restore();
  bodyPath(c, x, y, r, v); c.strokeStyle = hexa(P.char, 0.35); c.lineWidth = lw(r, 0.02); c.stroke();
}

// ---------- лицо ----------
const faceGeom = r => ({ ex: r * 0.30, ey: -r * 0.07, er: Math.max(4.6, r * 0.185), my: r * 0.31, mw: r * 0.27 });
function drawFace(c, x, y, r, v) {
  const f = faceGeom(r), P = v.pal, ey = v.eyes || v.face; // eyes — только глаза, рот остаётся от face
  if (v.cheeks) for (const s of [-1, 1]) { // румянец — едва заметный
    const bx = x + s * r * 0.54, by = y + r * 0.17, bg = c.createRadialGradient(bx, by, 0, bx, by, r * 0.17);
    bg.addColorStop(0, hexa('#e0603a', 0.26)); bg.addColorStop(1, hexa('#e0603a', 0));
    c.fillStyle = bg; ell(c, bx, by, r * 0.17, r * 0.11);
  }
  for (const s of [-1, 1]) {
    const cx = x + s * f.ex, cy = y + f.ey, hy = ey === 'grin' ? 0.8 : 1; c.fillStyle = '#fff'; ell(c, cx, cy, f.er, f.er * hy, 0);
    c.fillStyle = '#241812'; c.beginPath(); c.arc(cx + f.er * 0.08, cy + f.er * 0.1 * hy, f.er * 0.52, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(cx - f.er * 0.14, cy - f.er * 0.2, f.er * 0.2, 0, TAU); c.fill();
    c.beginPath(); c.arc(cx + f.er * 0.3, cy + f.er * 0.28, f.er * 0.1, 0, TAU); c.fill();
    if (ey === 'sleepy') { // полуприкрытые веки цветом тела
      c.fillStyle = P.base; ell(c, cx, cy - f.er * 0.72, f.er * 1.12, f.er * 0.66);
      c.strokeStyle = hexa(P.char, 0.8); c.lineWidth = lw(r, 0.028); c.lineCap = 'round';
      c.beginPath(); c.arc(cx, cy - f.er * 0.06, f.er * 1.02, Math.PI * 1.06, Math.PI * 1.94); c.stroke();
    }
  }
  c.lineCap = 'round'; c.strokeStyle = hexa(P.char, 0.95); c.lineWidth = lw(r, 0.055);
  if (v.face === 'grin') { // нахальная улыбка с одним зубом
    c.fillStyle = hexa(P.char, 0.95); c.beginPath(); c.moveTo(x - f.mw, y + f.my - r * 0.04);
    c.quadraticCurveTo(x, y + f.my + r * 0.34, x + f.mw * 1.1, y + f.my - r * 0.09);
    c.quadraticCurveTo(x + f.mw * 0.1, y + f.my + r * 0.02, x - f.mw, y + f.my - r * 0.04); c.fill(); c.fillStyle = '#fff'; c.beginPath();
    c.roundRect(x - f.mw * 0.44, y + f.my - r * 0.012, f.mw * 0.44, r * 0.085, r * 0.022); c.fill();
  } else if (v.face === 'sleepy') {
    c.beginPath(); c.moveTo(x - f.mw * 0.7, y + f.my); c.quadraticCurveTo(x, y + f.my + r * 0.13, x + f.mw * 0.7, y + f.my - r * 0.02); c.stroke();
  } else {
    c.beginPath(); c.moveTo(x - f.mw, y + f.my - r * 0.02); c.quadraticCurveTo(x, y + f.my + r * 0.2, x + f.mw, y + f.my - r * 0.02); c.stroke();
  }
}

// ---------- съедобный гарнир ----------
// «полито сверху»: волнистая шапка соуса/сыра с каплями; путь строится отдельно, чтобы
// раунд 2 мог залить его в режиме multiply (глазурь, сквозь которую видно фарш)
function pourPath(c, x, y, r, v, w, dips) {
  const ty = topY(y, r, v), pts = [[-w, 0.2]].concat(dips).concat([[w, 0.18]]); c.beginPath(); c.moveTo(x + r * pts[0][0], ty + r * pts[0][1]);
  for (let i = 1; i < pts.length; i++) { // фестоны между каплями
    const p = pts[i - 1], q = pts[i], mx = (p[0] + q[0]) / 2;
    c.quadraticCurveTo(x + r * mx, ty + r * (Math.min(p[1], q[1]) - 0.13), x + r * q[0], ty + r * q[1]);
  }
  c.lineTo(x + r * w, ty - r * 0.4); c.lineTo(x - r * w, ty - r * 0.4); c.closePath();
  return ty;
}
function pour(c, x, y, r, v, col, w, dips) {
  c.save(); bodyPath(c, x, y, r, v); c.clip(); c.fillStyle = col; const ty = pourPath(c, x, y, r, v, w, dips); c.fill();
  for (const [dx, len] of dips) ell(c, x + r * dx, ty + r * (len - 0.05), r * 0.05, r * 0.05); // кончики капель
  c.fillStyle = 'rgba(255,255,255,0.3)'; ell(c, x - r * 0.12, ty + r * 0.07, r * w * 0.5, r * 0.05, -0.25); c.restore();
}
const GARNISH = {
  parsley(c, x, y, r, v) { // веточка петрушки
    const ty = topY(y, r, v); c.save(); c.translate(x + r * 0.04, ty + r * 0.1); c.rotate(-0.12);
    c.strokeStyle = '#2f7d32'; c.lineWidth = lw(r, 0.05); c.lineCap = 'round'; c.beginPath(); c.moveTo(0, r * 0.1); c.lineTo(0, -r * 0.2); c.stroke();
    for (const [lx, ly, s] of [[0, -r * 0.3, 1], [-r * 0.18, -r * 0.16, 0.9], [r * 0.18, -r * 0.18, 0.9]]) {
      c.fillStyle = '#4caf50'; ell(c, lx, ly, r * 0.14 * s, r * 0.1 * s, lx * 0.01);
      c.fillStyle = '#8fdd8f'; ell(c, lx - r * 0.04, ly - r * 0.035, r * 0.05 * s, r * 0.035 * s); }
    c.restore(); },
  basil(c, x, y, r, v) { // крупный лист базилика с прожилкой
    const ty = topY(y, r, v); c.save(); c.translate(x + r * 0.1, ty + r * 0.14); c.rotate(-0.35); c.fillStyle = '#3f8f3a'; c.beginPath(); c.moveTo(0, 0);
    c.bezierCurveTo(r * 0.1, -r * 0.4, r * 0.5, -r * 0.5, r * 0.62, -r * 0.3); c.bezierCurveTo(r * 0.44, -r * 0.06, r * 0.18, r * 0.04, 0, 0); c.fill();
    c.strokeStyle = '#7ed07a'; c.lineWidth = lw(r, 0.022); c.beginPath(); c.moveTo(r * 0.05, -r * 0.05); c.quadraticCurveTo(r * 0.34, -r * 0.24, r * 0.6, -r * 0.3); c.stroke();
    c.fillStyle = '#2f7d32'; c.beginPath(); c.moveTo(0, 0);
    c.bezierCurveTo(-r * 0.14, -r * 0.34, -r * 0.44, -r * 0.34, -r * 0.5, -r * 0.14); c.bezierCurveTo(-r * 0.34, r * 0.02, -r * 0.14, r * 0.06, 0, 0); c.fill();
    c.restore(); },
  sesame(c, x, y, r) { // семена кунжута на корочке
    c.fillStyle = '#f6e6bf'; c.strokeStyle = hexa('#8a4420', 0.5); c.lineWidth = lw(r, 0.012);
    for (const [sx, sy, rot] of [[-0.42, -0.42, 0.4], [-0.05, -0.62, -0.3], [0.38, -0.44, 0.8], [0.55, -0.02, 0.2], [-0.56, -0.05, -0.5]]) {
      ell(c, x + r * sx, y + r * sy, r * 0.075, r * 0.042, rot); c.stroke(); } },
  sauce(c, x, y, r, v) { // томатный соус, политый сверху
    pour(c, x, y, r, v, '#d9382c', 0.46, [[-0.28, 0.56], [0.02, 0.34], [0.3, 0.64]]);
    c.fillStyle = '#d9382c'; ell(c, x + r * 0.58, y + r * 0.3, r * 0.05, r * 0.08, -0.2); },
  cheese(c, x, y, r, v) { // расплавленный сыр
    pour(c, x, y, r, v, '#f0bf4e', 0.48, [[-0.3, 0.5], [0.04, 0.33], [0.32, 0.62]]);
    c.save(); bodyPath(c, x, y, r, v); c.clip();
    c.fillStyle = hexa('#bd7f22', 0.45); ell(c, x + r * 0.14, topY(y, r, v) + r * 0.2, r * 0.08, r * 0.04, 0.2); c.restore(); },
  toothpick(c, x, y, r, v) { // зубочистка с флажком
    const ty = topY(y, r, v); c.strokeStyle = '#e4cfa4'; c.lineWidth = lw(r, 0.035); c.lineCap = 'round';
    c.beginPath(); c.moveTo(x + r * 0.28, ty + r * 0.3); c.lineTo(x + r * 0.16, ty - r * 0.52); c.stroke();
    c.fillStyle = '#e8483d'; c.beginPath(); c.moveTo(x + r * 0.17, ty - r * 0.5); c.lineTo(x + r * 0.62, ty - r * 0.38); c.lineTo(x + r * 0.2, ty - r * 0.2); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.8)'; ell(c, x + r * 0.32, ty - r * 0.35, r * 0.05, r * 0.05); },
};

// ---------- косметические скины ----------
const HEAD = new Set(['chef', 'crown', 'bow', 'bandana', 'flag', 'drizzle']); // перекрывают макушку — гарнир прячем
const SKIN = {
  chef(c, x, y, r, v) { // поварской колпак
    const ty = topY(y, r, v); c.fillStyle = '#f5f2ec';
    ell(c, x - r * 0.3, ty - r * 0.18, r * 0.3, r * 0.27); ell(c, x + r * 0.29, ty - r * 0.2, r * 0.28, r * 0.26); ell(c, x, ty - r * 0.36, r * 0.34, r * 0.3);
    c.fillStyle = '#e4dfd4'; c.beginPath(); c.roundRect(x - r * 0.48, ty - r * 0.06, r * 0.96, r * 0.26, r * 0.08); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.15)'; c.lineWidth = lw(r, 0.015); c.stroke(); },
  glasses(c, x, y, r) { // круглые очки
    const f = faceGeom(r), cy = y + f.ey, rr = f.er * 1.3; c.strokeStyle = '#3b2a1c'; c.lineWidth = lw(r, 0.042); c.lineJoin = 'round';
    for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * f.ex, cy, rr, 0, TAU); c.stroke(); }
    c.beginPath(); c.moveTo(x - f.ex + rr, cy - f.er * 0.1); c.quadraticCurveTo(x, cy - f.er * 0.4, x + f.ex - rr, cy - f.er * 0.1);
    c.moveTo(x - f.ex - rr, cy - f.er * 0.1); c.lineTo(x - f.ex - rr * 1.7, cy - f.er * 0.45);
    c.moveTo(x + f.ex + rr, cy - f.er * 0.1); c.lineTo(x + f.ex + rr * 1.7, cy - f.er * 0.45); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = lw(r, 0.03);
    for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * f.ex, cy, rr * 0.7, -2.5, -1.8); c.stroke(); } },
  sunglasses(c, x, y, r) { // тёмные очки: макушку не занимают, флажок Е остаётся на месте
    const f = faceGeom(r), cy = y + f.ey - f.er * 0.08, rx = f.er * 1.42, ry = f.er * 1.02;
    c.fillStyle = '#1c1812';
    for (const s of [-1, 1]) { c.save(); c.translate(x + s * f.ex * 1.04, cy); c.rotate(s * 0.12); ell(c, 0, 0, rx, ry); c.restore(); }
    c.strokeStyle = '#1c1812'; c.lineWidth = lw(r, 0.05); c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - f.ex * 0.34, cy - ry * 0.3); c.lineTo(x + f.ex * 0.34, cy - ry * 0.3); c.stroke(); // перемычка
    for (const s of [-1, 1]) { // дужки уходят к «вискам»
      c.beginPath(); c.moveTo(x + s * (f.ex * 1.04 + rx * 0.9), cy - ry * 0.3); c.lineTo(x + s * (f.ex * 1.04 + rx * 1.65), cy - ry * 0.72); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,0.22)'; // косой блик по линзам
    for (const s of [-1, 1]) ell(c, x + s * f.ex * 1.04 - rx * 0.3, cy - ry * 0.32, rx * 0.42, ry * 0.2, -0.35); },
  crown(c, x, y, r, v) { // корона
    const ty = topY(y, r, v) + r * 0.18; const g = c.createLinearGradient(x, ty - r * 0.5, x, ty); g.addColorStop(0, '#ffe07a'); g.addColorStop(1, '#d99b1c');
    c.fillStyle = g; c.beginPath(); c.moveTo(x - r * 0.46, ty); c.lineTo(x - r * 0.52, ty - r * 0.42); c.lineTo(x - r * 0.24, ty - r * 0.18);
    c.lineTo(x, ty - r * 0.52); c.lineTo(x + r * 0.24, ty - r * 0.18); c.lineTo(x + r * 0.52, ty - r * 0.42); c.lineTo(x + r * 0.46, ty); c.closePath(); c.fill();
    c.strokeStyle = hexa('#8a5a06', 0.6); c.lineWidth = lw(r, 0.02); c.stroke(); c.fillStyle = '#e8483d'; ell(c, x, ty - r * 0.09, r * 0.07, r * 0.07);
    c.fillStyle = '#4fc3f7'; ell(c, x - r * 0.3, ty - r * 0.04, r * 0.05, r * 0.05); ell(c, x + r * 0.3, ty - r * 0.04, r * 0.05, r * 0.05); },
  bow(c, x, y, r, v) { // бантик на макушке
    const ty = topY(y, r, v); c.save(); c.translate(x + r * 0.22, ty + r * 0.1); c.rotate(-0.22); c.fillStyle = '#c33350';
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.lineTo(s * r * 0.2, r * 0.36); c.lineTo(s * r * 0.36, r * 0.24); c.closePath(); c.fill(); }
    c.fillStyle = '#e0455e'; for (const s of [-1, 1]) ell(c, s * r * 0.3, -r * 0.05, r * 0.28, r * 0.19, s * 0.45);
    c.fillStyle = 'rgba(255,255,255,0.3)'; ell(c, -r * 0.34, -r * 0.13, r * 0.12, r * 0.05, -0.4);
    c.fillStyle = '#b32c48'; ell(c, 0, -r * 0.03, r * 0.11, r * 0.11); c.restore(); },
  mustache(c, x, y, r) { // усы: тёмный силуэт со светлым кантом, иначе тонут в фактуре фарша
    const f = faceGeom(r), my = y + f.my - r * 0.11; c.strokeStyle = hexa('#f0c89a', 0.45); c.lineWidth = lw(r, 0.03); c.lineJoin = 'round';
    for (const pass of [0, 1]) for (const s of [-1, 1]) {
      c.fillStyle = '#3d2110'; c.beginPath(); c.moveTo(x, my);
      c.bezierCurveTo(x + s * r * 0.16, my - r * 0.13, x + s * r * 0.42, my - r * 0.16, x + s * r * 0.44, my + r * 0.02);
      c.bezierCurveTo(x + s * r * 0.36, my + r * 0.02, x + s * r * 0.2, my + r * 0.06, x, my + r * 0.05); c.closePath(); pass ? c.fill() : c.stroke(); }
    c.fillStyle = hexa('#a87040', 0.8); ell(c, x - r * 0.22, my - r * 0.045, r * 0.11, r * 0.022, -0.2); },
  drizzle(c, x, y, r, v) { // соусные полоски
    c.save(); bodyPath(c, x, y, r, v); c.clip(); c.strokeStyle = '#d9382c'; c.lineWidth = lw(r, 0.07); c.lineCap = 'round';
    for (const off of [-0.78, -0.5, 0.66]) {
      c.beginPath(); c.moveTo(x - r * 1.1, y + r * (off + 0.2));
      c.bezierCurveTo(x - r * 0.3, y + r * (off - 0.2), x + r * 0.3, y + r * (off + 0.5), x + r * 1.1, y + r * (off - 0.05)); c.stroke(); }
    c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = lw(r, 0.025);
    c.beginPath(); c.moveTo(x - r * 0.8, y - r * 0.56); c.bezierCurveTo(x - r * 0.3, y - r * 0.74, x + r * 0.3, y - r * 0.3, x + r * 0.9, y - r * 0.6); c.stroke();
    c.restore(); c.fillStyle = '#d9382c'; ell(c, x + r * 0.62, y + r * 0.62, r * 0.09, r * 0.12, -0.4); },
  flag(c, x, y, r, v) { GARNISH.toothpick(c, x, y, r, v); }, // зубочистка с флажком
  bandana(c, x, y, r, v) { // бандана в горошек
    const ty = topY(y, r, v); c.save(); bodyPath(c, x, y, r, v); c.clip();
    c.fillStyle = '#c7452f'; c.beginPath(); c.moveTo(x - r * 1.1, ty + r * 0.4); c.quadraticCurveTo(x, ty + r * 0.92, x + r * 1.1, ty + r * 0.36);
    c.lineTo(x + r * 1.1, ty - r * 0.4); c.lineTo(x - r * 1.1, ty - r * 0.4); c.closePath(); c.fill();
    c.fillStyle = hexa('#8f2a1a', 0.55); c.beginPath(); // тень от края повязки
    c.moveTo(x - r * 1.1, ty + r * 0.4); c.quadraticCurveTo(x, ty + r * 0.92, x + r * 1.1, ty + r * 0.36);
    c.lineTo(x + r * 1.1, ty + r * 0.26); c.quadraticCurveTo(x, ty + r * 0.8, x - r * 1.1, ty + r * 0.3); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.8)';
    for (const [dx, dy] of [[-0.52, 0.1], [-0.16, 0.3], [0.2, 0.28], [0.56, 0.06]]) ell(c, x + r * dx, ty + r * (0.22 + dy), r * 0.05, r * 0.05);
    c.restore(); c.fillStyle = '#c7452f'; ell(c, x - r * 0.82, ty + r * 0.52, r * 0.14, r * 0.11, -0.5); // узелок
    c.beginPath(); c.moveTo(x - r * 0.86, ty + r * 0.56); c.lineTo(x - r * 1.16, ty + r * 0.78);
    c.lineTo(x - r * 0.94, ty + r * 0.8); c.lineTo(x - r * 1.1, ty + r * 1.02); c.lineTo(x - r * 0.74, ty + r * 0.66); c.closePath(); c.fill(); },
};
// ---------- единая точка входа: тело + гарнир + лицо + скин ----------
// st — объект состояния раунда 5 (жизни, суперсила, берсерк, лечение); без него всё рисуется как в раундах 1–4
function drawTefa(c, x, y, r, v, skin, st) {
  if (st) { drawTefa5(c, x, y, r, v, st); return; }
  if (v.r4) body4(c, x, y, r, v); else if (v.r2) body2(c, x, y, r, v); else drawBody(c, x, y, r, v);
  if (!(skin && HEAD.has(skin))) for (const g of (v.garnish || [])) if (GARNISH[g]) GARNISH[g](c, x, y, r, v);
  (v.r4 ? drawFace4 : v.r2 ? drawFace2 : drawFace)(c, x, y, r, v);
  if (skin && SKIN[skin]) SKIN[skin](c, x, y, r, v);
}

// ---------- 8 базовых вариантов раунда 1 ----------
const V = (id, name, idea, o) => Object.assign({ id, name, idea, pal: PAL.classic, sx: 1, sy: 1, wob: 0.012, speck: 150, grain: 14, shape: 'circle', garnish: ['parsley'], face: 'wide', cheeks: true, seed: 1 }, o);
const VAR = [
  V('A', 'Классика', 'ровный круг, средний обжар, петрушка', { seed: 3 }),
  V('B', 'Светлая корочка', 'светлая свежеобжаренная, приплюснутый овал, кунжут', { pal: PAL.light, sx: 1.08, sy: 0.92, speck: 200, grain: 18, garnish: ['sesame', 'parsley'], face: 'sleepy', seed: 11 }),
  V('C', 'Глубокий обжар', 'тёмный край гриля, базилик, улыбка с зубом', { pal: PAL.roast, speck: 210, grain: 16, garnish: ['basil'], face: 'grin', seed: 5 }),
  V('D', 'Прессованная', 'приплюснутая гранёная макушка, соус сверху', { sx: 1.06, sy: 0.92, wob: 0.007, shape: 'pressed', speck: 160, grain: 16, garnish: ['sauce'], seed: 7 }),
  V('E', 'Яйцо', 'вытянутая форма с узким верхом, флажок', { sx: 0.92, sy: 1.1, shape: 'egg', garnish: ['toothpick'], face: 'sleepy', seed: 13 }),
  V('F', 'Сырная', 'расплавленный сыр стекает с макушки', { pal: PAL.light, sx: 1.06, sy: 0.94, garnish: ['cheese'], face: 'grin', seed: 23 }),
  V('G', 'Хрустящая', 'максимум крапинок и подпалин, кунжут и базилик', { speck: 340, grain: 26, wob: 0.024, garnish: ['sesame', 'basil'], seed: 29 }),
  V('H', 'Аппетитная', 'соус и петрушка вместе, светлее классики', { pal: PAL.light, wob: 0.008, speck: 170, garnish: ['sauce', 'parsley'], seed: 31 }),
];
const SKINS = [['chef', 'колпак повара'], ['glasses', 'очки'], ['crown', 'корона'], ['bow', 'бантик'],
  ['mustache', 'усы'], ['drizzle', 'соусные полоски'], ['flag', 'зубочистка с флажком'], ['bandana', 'бандана']];

// ---------- лист ----------
function bg(c, w, h) { // тёмная кухня как в игре
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3a2c24'); g.addColorStop(1, '#241a17'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(255,255,255,0.05)'; c.lineWidth = 2;
  for (let y = 0; y < h; y += 96) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  for (let x = 0; x < w; x += 96) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
}
function plate(c, x, y, w) { c.fillStyle = '#e9e4da'; ell(c, x, y, w / 2, w * 0.14); c.fillStyle = '#c9c2b4'; ell(c, x, y, w / 2 - w * 0.15, w * 0.08); }
function label(c, x, y, id, name) {
  c.textAlign = 'center'; c.fillStyle = '#f6c343'; c.font = '800 26px "DejaVu Sans", sans-serif'; c.fillText(id, x, y);
  c.fillStyle = 'rgba(255,255,255,0.9)'; c.font = '600 16px "DejaVu Sans", sans-serif'; c.fillText(name, x, y + 22);
}
const botY = (r, v) => r * v.sy * (v.r2 || v.r4 ? v.flat : 1); // низ силуэта — чтобы стояла на тарелке, а не висела
// o — необязательная геометрия листа; без неё всё как в раундах 1–2 (лист 1060×900)
function sheet(name, title, cells, cols, R0, o) {
  o = o || {};
  const W = o.W || 1060, H = o.H || 900, plateK = o.plateK || 2.7, rowY = o.rowY || 222, rowStep = o.rowStep || 332;
  const labDY = o.labDY === undefined ? R0 * 1.15 + 40 : o.labDY, tinyTextY = o.tinyTextY || 782, tinyY = o.tinyY || 826;
  const c = createCanvas(W, H).getContext('2d'); bg(c, W, H);
  c.textAlign = 'left'; c.fillStyle = '#fff'; c.font = '800 24px "DejaVu Sans", sans-serif'; c.fillText(title, 30, 44); const cw = (W - 60) / cols;
  // zoom: рисуем тем же R0, но через масштаб контекста. Плотность крапинок в drawBody считается
  // от пикселей (speck * r² / 8100), поэтому «тот же вариант, но с большим r» — уже другая картинка;
  // увеличение контекстом даёт честное увеличение выбранного варианта, а не новую фактуру.
  const z = o.zoom || 0;
  cells.forEach((cell, i) => {
    const x = 30 + (i % cols) * cw + cw / 2, y = rowY + Math.floor(i / cols) * rowStep, bot = botY(R0, cell.v);
    if (z) { c.save(); c.translate(x, y); c.scale(z, z); }
    const ox = z ? 0 : x, oy = z ? 0 : y;
    plate(c, ox, oy + bot + 12, R0 * plateK);
    c.fillStyle = 'rgba(0,0,0,0.32)'; ell(c, ox + 4, oy + bot + 6, R0 * 0.92, R0 * 0.2);
    drawTefa(c, ox, oy, R0, cell.v, cell.skin);
    if (z) c.restore();
    label(c, x, y + labDY, cell.id, cell.name); // подписи всех ячеек ряда на одной линии
  });
  c.textAlign = 'left'; c.fillStyle = 'rgba(255,255,255,0.65)'; c.font = '600 15px "DejaVu Sans", sans-serif';
  c.fillText('в игровом размере — 52 px (масса 1):', 30, tinyTextY); const sw = (W - 60) / cells.length;
  cells.forEach((cell, i) => {
    const x = 30 + i * sw + sw / 2, y = tinyY; c.fillStyle = 'rgba(0,0,0,0.28)'; ell(c, x + 2, y + botY(26, cell.v) + 4, 24, 6);
    drawTefa(c, x, y, 26, cell.v, cell.skin);
    c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,0.75)'; c.font = '700 13px "DejaVu Sans", sans-serif'; c.fillText(cell.id, x, y + 48);
  });
  fs.writeFileSync(path.join(OUT, name + '.png'), c.canvas.toBuffer('image/png')); console.log('shots/' + name + '.png');
}

// ================= РАУНД 2: «это фарш» — поверхность собрана из зёрен =================
// Тона сняты с фото жареного кёфте: красно-коричневая масса, карамельные макушки зёрен,
// почти чёрные подпалины сверху и с одного бока, редкие белые прожилки жира, орегано.
const T2 = {
  crev: '#33160c', deep: '#5a2412', base: '#7a3b22', warm: '#a54c2b', lit: '#bd7c4c', hot: '#d49a68',
  fat: '#efdcb4', char: '#2a120a', sauce: '#c23a1e', herb: ['#77913c', '#9cb55e', '#4f6d29'],
};
// неправильная клякса — одно зерно фарша (7 точек со случайным радиусом, сглажены кривыми)
function blob(c, x, y, rad, elong, rot, R) {
  const n = 7, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = rad * (0.66 + R() * 0.6); pts.push([Math.cos(a) * rr * elong, Math.sin(a) * rr]); }
  c.save(); c.translate(x, y); c.rotate(rot); c.beginPath(); c.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
  for (let i = 0; i < n; i++) { const q = pts[i], w = pts[(i + 1) % n]; c.quadraticCurveTo(q[0], q[1], (q[0] + w[0]) / 2, (q[1] + w[1]) / 2); }
  c.closePath(); c.fill(); c.restore();
}
// силуэт: яйцо с узким верхом (E) или прижатая котлетка (D), неровный контур + плоская фаска снизу
function silPt(a, r, v) {
  let rad = r * (1 + 0.052 * Math.sin(a * 2 + v.seed) + 0.03 * Math.sin(a * 3.3 - v.seed * 1.7) + 0.014 * Math.sin(a * 5.1 + 2));
  rad += Math.max(1, r * 0.016) * (Math.sin(a * 11 + v.seed * 3) * 0.6 + Math.sin(a * 17 - v.seed) * 0.4);
  let px = Math.cos(a) * rad * v.sx, py = Math.sin(a) * rad * v.sy;
  if (v.pressed) { if (py < 0) py *= 0.82; px *= 1 - 0.05 * Math.abs(Math.sin(a * 3 + 0.5)); }
  else px *= 1 + 0.26 * (py / (r * v.sy)); // яйцо: верх уже низа
  return [px, Math.min(py, r * v.sy * v.flat)]; // плоский след сковороды снизу
}
function silhouette2(c, x, y, r, v) {
  const N = 170; c.beginPath();
  for (let i = 0; i <= N; i++) { const p = silPt(i / N * TAU, r, v); i ? c.lineTo(x + p[0], y + p[1]) : c.moveTo(x + p[0], y + p[1]); }
  c.closePath();
}
// LOD: чем меньше r, тем крупнее зерно относительно тела — на 52 px это фактура, а не шум
const grainR = (r, v) => r * (v.grain + 0.075 * Math.max(0, 1 - r / 80));
// освещение сверху-слева: 0 — теневая нижне-правая сторона, 1 — карамельная макушка зерна
const lightAt = (nx, ny, v, R) => clamp(0.46 - 0.44 * (nx * 0.42 + ny * 0.96) - 0.12 * Math.hypot(nx, ny) + (R() - 0.5) * 0.26) * (v.roast ? 0.72 : 1);
function grains(c, x, y, r, v, R) { // поле зёрен: джиттерная сетка, каждое зерно — клякса со щелью и макушкой
  const gr = grainR(r, v), step = gr * 1.12, det = r > 46;
  for (let gy = -r * v.sy - step; gy <= r * v.sy + step; gy += step)
    for (let gx = -r * v.sx - step; gx <= r * v.sx + step; gx += step) {
      const jx = gx + (R() - 0.5) * step * 0.8 + (Math.round(gy / step) % 2) * step * 0.5, jy = gy + (R() - 0.5) * step * 0.8;
      const nx = jx / (r * v.sx), ny = jy / (r * v.sy);
      if (Math.hypot(nx, ny) > 1.2) continue;
      const strand = R() < 0.14; // часть зёрен — вытянутые волокна, как в сыром фарше
      const rad = gr * (0.58 + R() * 0.6), rot = R() * TAU, el = strand ? 1.8 + R() * 1.1 : 1 + R() * 0.7, L = lightAt(nx, ny, v, R);
      c.fillStyle = hexa(T2.crev, 0.7); blob(c, x + jx + rad * 0.32, y + jy + rad * 0.36, rad * 1.1, el, rot, R); // щель между зёрнами
      c.fillStyle = mix(mix(T2.deep, T2.warm, 0.2 + R() * 0.7), T2.lit, L * L * 0.95); blob(c, x + jx, y + jy, rad, el, rot, R);
      if (L > 0.58) { c.fillStyle = mix(T2.lit, T2.hot, (L - 0.58) * 2); blob(c, x + jx - rad * 0.24, y + jy - rad * 0.28, rad * 0.46, el, rot, R); }
      if (det && R() < 0.035) { c.fillStyle = hexa(T2.fat, 0.6); blob(c, x + jx, y + jy, rad * 0.26, 2.2, rot, R); } // прожилка жира
    }
}
function crumbs(c, x, y, r, v, R) { // зёрна верхом на контуре — от них край рассыпчатый, а не гладкий
  const gr = grainR(r, v), n = Math.round(TAU * r / (gr * 1.1)), flatY = r * v.sy * v.flat;
  for (let i = 0; i < n; i++) {
    const a = (i + R() * 0.7) / n * TAU, p = silPt(a, r, v), k = 0.93 + R() * 0.1; const px = p[0] * k, py = p[1] * k;
    if (py > flatY - gr * 0.3) continue; // по плоской фаске крошек нет — она притёрта к сковороде
    const L = lightAt(px / (r * v.sx), py / (r * v.sy), v, R); c.fillStyle = mix(mix(T2.crev, T2.base, 0.25 + R() * 0.45), T2.lit, L * L);
    blob(c, x + px, y + py, gr * (0.42 + R() * 0.45), 1 + R() * 0.9, R() * TAU, R);
  }
}
function charPatches(c, x, y, r, v, R) { // подпалины сверху и с одного бока, мягкий край
  for (let i = 0; i < (v.roast ? 9 : 4); i++) {
    const a = -Math.PI * (0.05 + R() * 0.8), d = r * (0.3 + R() * 0.5);
    const px = x + Math.cos(a) * d * v.sx, py = y + Math.sin(a) * d * v.sy, rad = r * (0.16 + R() * 0.2) * (v.roast ? 1.15 : 1);
    const g = c.createRadialGradient(px, py, rad * 0.1, px, py, rad);
    g.addColorStop(0, hexa(T2.char, v.roast ? 0.34 : 0.18)); g.addColorStop(1, hexa(T2.char, 0));
    c.fillStyle = g; ell(c, px, py, rad, rad * 0.7, R() * TAU);
  }
}
function sheen(c, x, y, r, v, R) { // мокрый жирный блеск: мелкие штрихи сверху-слева, а не одно белое пятно
  for (let i = 0; i < (r > 46 ? 30 : 10); i++) {
    const a = R() * TAU, d = r * Math.sqrt(R()) * 0.88; const px = Math.cos(a) * d * v.sx, py = Math.sin(a) * d * v.sy;
    if ((-px / r * 0.5 - py / r * 0.9) < 0.15 + R() * 0.5) continue;
    c.fillStyle = `rgba(255,236,208,${0.3 + R() * 0.45})`;
    ell(c, x + px, y + py, Math.max(0.8, r * (0.014 + R() * 0.022)), Math.max(0.5, r * 0.008), R() * TAU - 0.4);
  }
}
function oregano(c, x, y, r, v, R) { // хлопья орегано как на фото кёфте
  for (let i = 0; i < (r > 46 ? 30 : 10); i++) {
    const a = R() * TAU, d = r * Math.sqrt(R()) * 0.86; const px = Math.cos(a) * d * v.sx, py = Math.sin(a) * d * v.sy;
    if (py > r * 0.3) continue;
    c.fillStyle = T2.herb[(R() * 3) | 0]; ell(c, x + px, y + py, Math.max(1, r * (0.018 + R() * 0.022)), Math.max(0.7, r * 0.009), R() * TAU);
  }
}
function sauceCoat(c, x, y, r, v, R) { // томатная глазурь (klopsy.jpg): всё в multiply, фактура просвечивает
  c.save(); silhouette2(c, x, y, r, v); c.clip(); c.globalCompositeOperation = 'multiply';
  c.fillStyle = hexa(T2.sauce, 0.28); c.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3); // общий томатный тон
  const dips = [[-0.56, 0.74], [-0.2, 0.46], [0.1, 0.86], [0.46, 0.5]];
  c.fillStyle = hexa(T2.sauce, 0.6); // шапка соуса с фестонами: снизу фарш остаётся открытым
  const ty0 = pourPath(c, x, y, r, v, 0.8, dips); c.fill();
  for (const [dx, len] of dips) ell(c, x + r * dx, ty0 + r * (len - 0.04), r * 0.06, r * 0.06); // круглые кончики капель
  c.strokeStyle = hexa(T2.sauce, 0.7); c.lineCap = 'round'; // тонкие потёки ниже шапки
  for (const [dx, y0, y1] of [[-0.3, 0.5, 0.95], [0.18, 0.62, 1.05], [0.52, 0.32, 0.72]]) {
    c.lineWidth = r * (0.07 + R() * 0.05); c.beginPath(); c.moveTo(x + r * dx, y + r * y0 - r * 0.6);
    c.quadraticCurveTo(x + r * (dx + 0.06), y + r * (y0 + y1) / 2 - r * 0.6, x + r * (dx - 0.04), y + r * y1 - r * 0.6); c.stroke();
  }
  c.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 10; i++) { // мокрый глянец по глазури
    const px = (R() - 0.55) * r * 1.1, py = ty0 + r * (0.1 + R() * 0.5); c.fillStyle = `rgba(255,196,156,${0.1 + R() * 0.2})`;
    ell(c, x + px, y + py, r * (0.05 + R() * 0.1), r * 0.02, -0.3 + R() * 0.5);
  }
  c.restore(); c.fillStyle = hexa(T2.sauce, 0.5); // лужица, натёкшая на тарелку
  ell(c, x + r * 0.3, y + r * v.sy * v.flat + r * 0.04, r * 0.5, r * 0.08, 0.04);
  c.fillStyle = hexa(T2.sauce, 0.8); ell(c, x + r * 0.26, y + r * v.sy * v.flat + r * 0.02, r * 0.3, r * 0.05, 0.04);
}
function lumps(c, x, y, r, v, R) { // крупные комки: макроформа поверх зерна, иначе поверхность = ровный шум
  for (let i = 0; i < 7; i++) {
    const a = R() * TAU, d = r * Math.sqrt(R()) * 0.78, rad = r * (0.12 + R() * 0.15); const px = x + Math.cos(a) * d * v.sx, py = y + Math.sin(a) * d * v.sy;
    let g = c.createRadialGradient(px + rad * 0.34, py + rad * 0.42, rad * 0.1, px + rad * 0.34, py + rad * 0.42, rad * 1.1);
    g.addColorStop(0, hexa(T2.crev, 0.32)); g.addColorStop(1, hexa(T2.crev, 0)); // тень под комком
    c.fillStyle = g; ell(c, px + rad * 0.34, py + rad * 0.42, rad * 1.1, rad * 0.92, a);
    g = c.createRadialGradient(px - rad * 0.3, py - rad * 0.4, rad * 0.05, px - rad * 0.3, py - rad * 0.4, rad * 0.9);
    g.addColorStop(0, hexa(T2.hot, v.roast ? 0.14 : 0.2)); g.addColorStop(1, hexa(T2.hot, 0)); // подрумяненная макушка комка
    c.fillStyle = g; ell(c, px - rad * 0.3, py - rad * 0.4, rad * 0.9, rad * 0.68, a);
  }
}
function drawFace2(c, x, y, r, v) { // мультяшное лицо на слегка приглаженном пятачке
  const f = faceGeom(r); const g = c.createRadialGradient(x, y + r * 0.04, r * 0.08, x, y + r * 0.04, r * 0.62);
  g.addColorStop(0, hexa(mix(T2.warm, T2.lit, 0.3), 0.5)); g.addColorStop(1, hexa(T2.warm, 0));
  c.fillStyle = g; ell(c, x, y + r * 0.04, r * 0.62, r * 0.5); // успокаиваем фактуру под лицом
  for (const s of [-1, 1]) {
    const cx = x + s * f.ex, cy = y + f.ey; c.fillStyle = hexa(T2.crev, 0.5); ell(c, cx, cy + f.er * 0.12, f.er * 1.16, f.er * 1.14); // тень-посадка глаза
    c.fillStyle = '#fff'; ell(c, cx, cy, f.er, f.er);
    c.fillStyle = '#231610'; c.beginPath(); c.arc(cx + f.er * 0.08, cy + f.er * 0.1, f.er * 0.52, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(cx - f.er * 0.16, cy - f.er * 0.2, f.er * 0.22, 0, TAU); c.fill();
    c.beginPath(); c.arc(cx + f.er * 0.3, cy + f.er * 0.3, f.er * 0.1, 0, TAU); c.fill();
  }
  c.lineCap = 'round'; c.lineWidth = lw(r, 0.062); c.strokeStyle = 'rgba(255,205,160,0.45)'; // тёплая подсветка снизу — рот читается на тёмном теле
  c.beginPath(); c.moveTo(x - f.mw, y + f.my + r * 0.025); c.quadraticCurveTo(x, y + f.my + r * 0.25, x + f.mw, y + f.my + r * 0.025); c.stroke();
  c.strokeStyle = '#2a1108';
  c.beginPath(); c.moveTo(x - f.mw, y + f.my - r * 0.01); c.quadraticCurveTo(x, y + f.my + r * 0.21, x + f.mw, y + f.my - r * 0.01); c.stroke();
}
function body2(c, x, y, r, v) { // тело раунда 2: крошки по контуру → масса → зёрна → подпалины → блеск
  const R = rng(v.seed * 7919 + 13);
  crumbs(c, x, y, r, v, R);
  silhouette2(c, x, y, r, v);
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.36, r * 0.1, x, y, r * 1.12);
  g.addColorStop(0, v.roast ? T2.base : T2.warm); g.addColorStop(0.6, v.roast ? T2.deep : T2.base); g.addColorStop(1, T2.crev);
  c.fillStyle = g; c.fill(); c.save(); silhouette2(c, x, y, r, v); c.clip();
  grains(c, x, y, r, v, R);
  if (r > 34) lumps(c, x, y, r, v, R);
  charPatches(c, x, y, r, v, R);
  const rim = c.createRadialGradient(x - r * 0.18, y - r * 0.2, r * 0.7, x - r * 0.05, y + r * 0.05, r * 1.08);
  rim.addColorStop(0, hexa(T2.crev, 0)); rim.addColorStop(1, hexa(T2.crev, 0.55)); // затемнение к краю
  c.fillStyle = rim; c.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3);
  const bot = c.createLinearGradient(0, y + r * v.sy * 0.35, 0, y + r * v.sy * v.flat); // контактная тень у фаски
  bot.addColorStop(0, hexa(T2.char, 0)); bot.addColorStop(1, hexa(T2.char, 0.5));
  c.fillStyle = bot; c.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3);
  sheen(c, x, y, r, v, R);
  if (v.garnish === 'oregano') oregano(c, x, y, r, v, R);
  c.restore();
  if (v.garnish === 'sauce') sauceCoat(c, x, y, r, v, R);
}
// 6 вариантов одного направления: зерно (мелкое/крупное) × обжар (средний/тёмный) × форма × гарнир
const V2 = (id, name, idea, o) => Object.assign({ r2: true, id, name, idea, grain: 0.05, roast: 0, sx: 0.94, sy: 1.08,
  pressed: false, flat: 0.9, garnish: 'none', seed: 2, pal: PAL.roast, cheeks: false }, o);
const VAR2 = [
  V2('A', 'Мелкий фарш', 'яйцо E, мелкое плотное зерно, средний обжар — базовый эталон поверхности', { seed: 3 }),
  V2('B', 'Крупный фарш', 'яйцо E, крупные зёрна: видно каждую крупинку, средний обжар', { grain: 0.078, seed: 15 }),
  V2('C', 'Угольный бок', 'яйцо E, крупное зерно и тёмный обжар с чёрными подпалинами, орегано', { grain: 0.078, roast: 1, garnish: 'oregano', seed: 8 }),
  V2('D', 'С орегано', 'яйцо E, мелкое зерно, средний обжар, хлопья орегано как на фото кёфте', { garnish: 'oregano', seed: 21 }),
  V2('E', 'Котлетка', 'форма D: прижата на сковороде, крупное зерно, средний обжар', { grain: 0.078, pressed: true, sx: 1.1, sy: 0.9, flat: 0.86, seed: 27 }),
  V2('F', 'В томате', 'форма D, тёмный обжар и томатная глазурь сверху (klopsy)', { roast: 1, pressed: true, sx: 1.08, sy: 0.92, flat: 0.87, garnish: 'sauce', seed: 33 }),
];

// ================= РАУНД 3: E и близкая родня =================
// Владелец выбрал E («Яйцо») раунда 1 как «больше всего похоже на тефтелю», раунд 2 (гранулы) отклонён.
// Поэтому здесь A — это тот самый объект E без единой правки, а B–F отличаются от него ровно одной вещью.
// Рендер идёт только через drawBody раунда 1: гладкое тело, мелкие двухцветные крапинки, мягкие пятна
// обжарки, масляный блик. Ни зёрен, ни чёрных подпалин раунда 2 — их код рядом, но сюда не подключён.
const E1 = VAR.find(v => v.id === 'E');   // эталон: параметры раунда 1 как есть
const V3 = o => Object.assign({}, E1, o); // «то же E, но одна правка»
const warmer = (P, t) => { const o = {}; for (const k in P) o[k] = mix(P[k], '#fff3df', t); return o; }; // светлее и теплее на t
const VAR3 = [
  { v: E1, id: 'A', name: 'Яйцо (эталон)', idea: 'вариант E раунда 1: те же параметры, тот же код отрисовки' },
  { v: V3({ eyes: 'wide' }), id: 'B', name: 'Круглые глаза', idea: 'E с открытыми круглыми глазами вместо сонных век' },
  { v: V3({ garnish: ['parsley'] }), id: 'C', name: 'С петрушкой', idea: 'E без флажка — на макушке маленькая веточка петрушки' },
  { v: V3({ pal: warmer(PAL.classic, 0.12), speck: 170, speckK: 1.3 }), id: 'D', name: 'Свежая обжарка', idea: 'E светлее и теплее, крапинки чуть крупнее — фарш читается заметнее' },
  { v: V3({ sx: 0.97, sy: 1.04, eggK: 0.1 }), id: 'E', name: 'Округлая', idea: 'E чуть круглее: меньше яйца, но всё ещё не шар' },
  { v: V3({ sideRoast: 1, flecks: 6 }), id: 'F', name: 'Фото-обжар', idea: 'E с тонкой тёмной обжаркой по одному боку и парой крошек орегано' },
];
// флажок — собственный гарнир E, поэтому в наборе скинов вместо него тёмные очки;
// скины из HEAD занимают макушку, и drawTefa в этом случае флажок не рисует
const SKINS3 = [['chef', 'колпак повара'], ['glasses', 'очки'], ['crown', 'корона'], ['bow', 'бантик'],
  ['mustache', 'усы'], ['drizzle', 'соусные полоски'], ['sunglasses', 'тёмные очки'], ['bandana', 'бандана']];
const SH3 = { W: 1440, H: 1580, plateK: 2.4, rowY: 380, rowStep: 660, labDY: 332, tinyTextY: 1452, tinyY: 1500, zoom: 2 };

// ================= РАУНД 4: E «В томате» и близкая родня =================
// Владелец выбрал вариант E с листа design_tefa_round2_v1.png: красноватая жареная тефтеля,
// мелкое зерно фарша, томатная глазурь сверху и лужа соуса по низу, круглые глаза, улыбка.
// Тот лист рисовала ПЕРВАЯ редакция кода раунда 2, позже переписанная (round2 выше — уже другая
// картинка). Поэтому ниже дословный порт той ранней отрисовки: своя палитра, свой силуэт, своё
// зерно, своё лицо. Из общего кода берутся только мелкие утилиты (ell/hexa/lw/rng/pour) и лист.
const T4 = {
  crev: '#2a120a', shade: '#4a2010', base: '#7a3b22', warm: '#9c4a2c', lit: '#c4875a', hot: '#d9a070',
  fat: '#e8cfa8', char: '#241008', sauce: '#c0361f', herb: ['#6f8f3a', '#98b35a', '#4a6b28'],
};
// Смесь ранней редакции возвращает 'rgb(...)', а не hex. Вложенный вызов mix4(mix4(...), ...)
// парсит такую строку как hex, получает NaN — и canvas молча игнорирует такой fillStyle, оставляя
// предыдущий цвет (тёмную щель между зёрнами). Ровно из-за этого тело E тёмно-красное и ровное, а
// светятся только карамельные макушки зёрен. Это часть выбранного облика: воспроизводим дословно.
const mix4 = (a, b, t) => {
  const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const A = p(a), B = p(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
};
const warmer4 = (T, t) => { // светлее и теплее только мясо, соус и зелень не трогаем
  const o = Object.assign({}, T);
  for (const k of ['crev', 'shade', 'base', 'warm', 'lit', 'hot', 'char']) o[k] = mix(T[k], '#ffe8c8', t);
  return o;
};
// неправильная клякса — одно зерно фарша (7 точек со случайным радиусом, сглажены кривыми)
function blob4(c, x, y, rad, elong, rot, R) {
  const n = 7, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = rad * (0.68 + R() * 0.56); pts.push([Math.cos(a) * rr * elong, Math.sin(a) * rr]); }
  c.save(); c.translate(x, y); c.rotate(rot); c.beginPath(); c.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
  for (let i = 0; i < n; i++) { const q = pts[i], w = pts[(i + 1) % n]; c.quadraticCurveTo(q[0], q[1], (q[0] + w[0]) / 2, (q[1] + w[1]) / 2); }
  c.closePath(); c.fill(); c.restore();
}
// силуэт: низкочастотная кривизна + мелкие бугры от самих зёрен + плоская фаска снизу
function silhouette4(c, x, y, r, v) {
  const N = 150; c.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = i / N * TAU;
    let rad = r * (1 + 0.03 * Math.sin(a * 2 + v.seed) + 0.02 * Math.sin(a * 3.3 - v.seed * 1.7) + 0.012 * Math.sin(a * 5.1 + 2));
    rad += Math.max(1.1, r * 0.02) * (Math.sin(a * 13 + v.seed * 3) * 0.6 + Math.sin(a * 19 - v.seed) * 0.4); // бугристый край
    let px = Math.cos(a) * rad * v.sx, py = Math.sin(a) * rad * v.sy;
    if (v.pressed) { if (py < 0) py *= 0.82; px *= 1 - 0.045 * Math.abs(Math.sin(a * 3 + 0.5)); }
    py = Math.min(py, r * v.sy * v.flat); // плоский след сковороды снизу
    i ? c.lineTo(x + px, y + py) : c.moveTo(x + px, y + py);
  }
  c.closePath();
}
function grains4(c, x, y, r, v, R) { // поле зёрен: джиттерная сетка, LOD — при малом r зерно крупнее
  const T = v.T || T4, gr = r * (v.grain + 0.12 * Math.max(0, 1 - r / 70)), step = gr * 1.2;
  const darkBase = v.roast ? mix4(T.shade, T.base, 0.75) : mix4(T.base, T.warm, 0.4);
  for (let gy = -r * v.sy - step; gy <= r * v.sy + step; gy += step)
    for (let gx = -r * v.sx - step; gx <= r * v.sx + step; gx += step) {
      const jx = gx + (R() - 0.5) * step * 0.85 + (Math.round(gy / step) % 2) * step * 0.5, jy = gy + (R() - 0.5) * step * 0.85;
      const nx = jx / (r * v.sx), ny = jy / (r * v.sy);
      if (Math.hypot(nx, ny) > 1.15) continue;
      const rad = gr * (0.6 + R() * 0.6), rot = R() * TAU, elong = 1 + R() * 0.7;
      let L = 0.6 - 0.32 * (nx * 0.5 + ny * 0.85) - Math.hypot(nx, ny) * 0.2 + (R() - 0.5) * 0.3;
      L = Math.max(0, Math.min(1, L)) * (v.roast ? 0.78 : 1);
      c.fillStyle = hexa(T.crev, 0.45); blob4(c, x + jx + rad * 0.26, y + jy + rad * 0.32, rad * 1.02, elong, rot, R); // щель между зёрнами
      c.fillStyle = mix4(mix4(darkBase, T.warm, R() * 0.7), T.lit, L); blob4(c, x + jx, y + jy, rad, elong, rot, R); // тело зерна (см. комментарий к mix4)
      if (L > 0.5) { c.fillStyle = mix4(T.lit, T.hot, (L - 0.5) * 1.8); blob4(c, x + jx - rad * 0.2, y + jy - rad * 0.24, rad * 0.5, elong, rot, R); } // карамельная макушка
      if (R() < 0.045) { c.fillStyle = hexa(T.fat, 0.7); blob4(c, x + jx, y + jy, rad * 0.34, 1.5, rot, R); } // прожилка жира
    }
}
function charPatches4(c, x, y, r, v, R) { // подпалины сверху и с одного бока, мягкий край
  const T = v.T || T4;
  for (let i = 0; i < (v.roast ? 5 : 3); i++) {
    const a = -Math.PI * (0.15 + R() * 0.9), d = r * (0.2 + R() * 0.6);
    const px = x + Math.cos(a) * d * v.sx, py = y + Math.sin(a) * d * v.sy, rad = r * (0.18 + R() * 0.2) * (v.roast ? 1.3 : 1);
    const g = c.createRadialGradient(px, py, rad * 0.2, px, py, rad);
    g.addColorStop(0, hexa(T.char, v.roast ? 0.72 : 0.42)); g.addColorStop(1, hexa(T.char, 0));
    c.fillStyle = g; ell(c, px, py, rad, rad * 0.78, R() * TAU);
  }
}
function sheen4(c, x, y, r, v, R) { // мокрый жирный блеск: много мелких бликов, а не одно белое пятно
  for (let i = 0; i < 34; i++) {
    const a = R() * TAU, d = r * Math.sqrt(R()) * 0.94;
    const px = Math.cos(a) * d * v.sx, py = Math.sin(a) * d * v.sy;
    if ((-px / r * 0.5 - py / r * 0.9) < 0.1 + R() * 0.55) continue; // только сверху-слева
    c.fillStyle = `rgba(255,232,202,${0.25 + R() * 0.4})`;
    ell(c, x + px, y + py, Math.max(0.7, r * (0.012 + R() * 0.02)), Math.max(0.5, r * 0.007), R() * TAU);
  }
}
// томатная глазурь: шапка с фестонами сверху + общий томатный тон по телу + лужа соуса внизу.
// v.sauce — единственная ось, по которой отличаются A/B/C/F:
//   w — ширина шапки, dips — [сдвиг, длина] капель, coat — плотность тонкой глазури,
//   pool — размер лужи (0 — лужи нет, 1 — как у эталона), drip — одинокий потёк [dx, сверху, донизу],
//   herb — крошки зелени [dx, dy, индекс цвета] поверх глазури.
function sauceCoat4(c, x, y, r, v) {
  const T = v.T || T4, S = v.sauce;
  pour(c, x, y, r, v, T.sauce, S.w, S.dips);
  c.save(); bodyPath(c, x, y, r, v); c.clip();
  c.fillStyle = hexa(T.sauce, S.coat); c.fillRect(x - r * 1.4, y - r * 1.4, r * 2.8, r * 2.8); // тонкая глазурь, фактура просвечивает
  if (S.pool) {
    const p = (S.pool - 1) * 0.22; // насколько лужа выше эталонной
    c.fillStyle = hexa(T.sauce, 0.9); c.beginPath(); // плотная лужа у самого низа
    c.moveTo(x - r * 1.3, y + r * (0.66 - p));
    c.bezierCurveTo(x - r * 0.5, y + r * (0.52 - p), x - r * 0.1, y + r * (0.8 - p), x + r * 0.4, y + r * (0.62 - p));
    c.bezierCurveTo(x + r * 0.8, y + r * (0.52 - p), x + r * 1.0, y + r * (0.7 - p), x + r * 1.3, y + r * (0.6 - p));
    c.lineTo(x + r * 1.3, y + r * 1.5); c.lineTo(x - r * 1.3, y + r * 1.5); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,190,150,0.45)'; c.lineWidth = lw(r, 0.018); // глянец по кромке соуса
    c.beginPath(); c.moveTo(x - r * 0.9, y + r * (0.63 - p));
    c.bezierCurveTo(x - r * 0.4, y + r * (0.5 - p), x - r * 0.05, y + r * (0.78 - p), x + r * 0.4, y + r * (0.61 - p)); c.stroke();
  }
  if (S.drip) { // вместо лужи — один потёк от угла шапки вниз по боку, мимо лица
    const [x0, y0, x1, y1, bend] = S.drip;
    c.strokeStyle = hexa(T.sauce, 0.88); c.lineWidth = r * 0.06; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x + r * x0, y + r * y0);
    c.quadraticCurveTo(x + r * ((x0 + x1) / 2 + bend), y + r * (y0 + y1) / 2, x + r * x1, y + r * y1); c.stroke();
    c.fillStyle = hexa(T.sauce, 0.92); ell(c, x + r * x1, y + r * y1, r * 0.06, r * 0.08, 0); // круглый кончик капли
  }
  c.fillStyle = 'rgba(255,205,170,0.4)'; ell(c, x - r * 0.34, y - r * 0.5, r * 0.18, r * 0.06, -0.3); // мокрый блик на глазури
  c.restore();
  if (S.herb) for (const [hx, hy, hi] of S.herb) { // крошки зелени лежат поверх соуса
    c.fillStyle = T.herb[hi]; ell(c, x + r * hx, y + r * hy, Math.max(1, r * 0.055), Math.max(0.7, r * 0.024), hx * 2.2);
    c.fillStyle = hexa('#d8eaa8', 0.5); ell(c, x + r * hx - r * 0.012, y + r * hy - r * 0.01, Math.max(0.6, r * 0.022), Math.max(0.4, r * 0.008), hx * 2.2);
  }
}
function drawFace4(c, x, y, r, v) { // мультяшное лицо на слегка приглаженном пятачке
  const T = v.T || T4, f = faceGeom(r);
  const g = c.createRadialGradient(x, y + r * 0.06, r * 0.1, x, y + r * 0.06, r * 0.66);
  g.addColorStop(0, hexa(T.warm, 0.5)); g.addColorStop(1, hexa(T.warm, 0));
  c.fillStyle = g; ell(c, x, y + r * 0.06, r * 0.66, r * 0.52); // успокаиваем фактуру под лицом
  for (const s of [-1, 1]) {
    const cx = x + s * f.ex, cy = y + f.ey;
    c.fillStyle = hexa(T.crev, 0.55); ell(c, cx, cy + f.er * 0.1, f.er * 1.14, f.er * 1.12); // тень-посадка глаза
    c.fillStyle = '#fff'; ell(c, cx, cy, f.er, f.er);
    c.fillStyle = '#231610'; c.beginPath(); c.arc(cx + f.er * 0.08, cy + f.er * 0.1, f.er * 0.52, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(cx - f.er * 0.16, cy - f.er * 0.2, f.er * 0.22, 0, TAU); c.fill();
    c.beginPath(); c.arc(cx + f.er * 0.3, cy + f.er * 0.3, f.er * 0.1, 0, TAU); c.fill();
    if (v.eyes === 'sleepy') { // полуприкрытые веки цветом мяса + линия ресниц (как у E раунда 1)
      c.fillStyle = mix4(T.warm, T.lit, 0.3); ell(c, cx, cy - f.er * 0.72, f.er * 1.12, f.er * 0.66);
      c.strokeStyle = hexa(T.char, 0.85); c.lineWidth = lw(r, 0.028); c.lineCap = 'round';
      c.beginPath(); c.arc(cx, cy - f.er * 0.06, f.er * 1.02, Math.PI * 1.06, Math.PI * 1.94); c.stroke();
    }
  }
  c.lineCap = 'round'; c.lineWidth = lw(r, 0.06);
  c.strokeStyle = 'rgba(255,190,140,0.35)'; // тёплая подсветка снизу — рот читается на тёмном теле
  c.beginPath(); c.moveTo(x - f.mw, y + f.my + r * 0.02); c.quadraticCurveTo(x, y + f.my + r * 0.24, x + f.mw, y + f.my + r * 0.02); c.stroke();
  c.strokeStyle = '#1b0c05';
  c.beginPath(); c.moveTo(x - f.mw, y + f.my - r * 0.01); c.quadraticCurveTo(x, y + f.my + r * 0.21, x + f.mw, y + f.my - r * 0.01); c.stroke();
}
function body4(c, x, y, r, v) { // тело: масса → зёрна → подпалины → затемнение к краю → блеск → глазурь
  const T = v.T || T4, R = rng(v.seed * 7919 + 13);
  silhouette4(c, x, y, r, v);
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r * 1.1);
  g.addColorStop(0, v.roast ? T.base : T.warm); g.addColorStop(0.7, v.roast ? T.shade : mix4(T.shade, T.base, 0.6)); g.addColorStop(1, T.crev);
  c.fillStyle = g; c.fill();
  c.save(); silhouette4(c, x, y, r, v); c.clip();
  grains4(c, x, y, r, v, R);
  charPatches4(c, x, y, r, v, R);
  const rim = c.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.62, x, y + r * 0.1, r * 1.2);
  rim.addColorStop(0, hexa(T.crev, 0)); rim.addColorStop(1, hexa(T.crev, 0.55)); // затемнение к краю
  c.fillStyle = rim; c.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3);
  sheen4(c, x, y, r, v, R);
  c.restore();
  if (v.sauce) sauceCoat4(c, x, y, r, v);
}
// рецепты соуса: одна ось отличия от эталона
const SAUCE4 = {
  base: { w: 0.4, dips: [[-0.3, 0.46], [0.04, 0.28], [0.32, 0.52]], coat: 0.34, pool: 1 },
  thin: { w: 0.4, dips: [[-0.3, 0.34], [0.02, 0.2], [0.3, 0.36]], coat: 0.16, pool: 0, drip: [-0.4, -0.66, -0.58, 0.34, -0.06] },
  thick: { w: 0.58, dips: [[-0.36, 0.62], [0.02, 0.44], [0.36, 0.66]], coat: 0.46, pool: 1.8 },
};
SAUCE4.herbs = Object.assign({}, SAUCE4.base, { herb: [[-0.28, -0.56, 0], [0.06, -0.7, 1], [0.3, -0.48, 2]] });
// A — выбранный E ранней версии дословно (seed 27); B–F отличаются ровно одной вещью
const V4 = (id, name, idea, o) => Object.assign({ r4: true, id, name, idea, grain: 0.055, roast: 0,
  sx: 1.04, sy: 0.96, pressed: false, flat: 0.9, garnish: [], seed: 27, cheeks: false,
  pal: { base: T4.warm, char: T4.crev }, sauce: SAUCE4.base }, o);
const VAR4 = [
  V4('A', 'В томате', 'выбранный E: мелкое зерно, глазурь сверху, лужа соуса внизу, круглые глаза'),
  V4('B', 'Тонкая глазурь', 'соуса меньше: узкая шапка, лужи нет — вниз бежит один потёк', { sauce: SAUCE4.thin }),
  V4('C', 'В соусе по горло', 'соуса больше: шапка закрывает верхнюю треть, лужа внизу вдвое шире', { sauce: SAUCE4.thick }),
  V4('D', 'Светлее мясо', 'фарш под глазурью светлее и теплее, соус тот же', { T: warmer4(T4, 0.16) }),
  V4('E', 'Сонный взгляд', 'полуприкрытые веки вместо круглых глаз, как у E раунда 1', { eyes: 'sleepy' }),
  V4('F', 'С зеленью', 'пара крошек зелени на глазури', { sauce: SAUCE4.herbs }),
];

// ================= РАУНД 5: жизни на самой Тефе (спека v2.1.1 §3.2) =================
// Масса — это здоровье, и показывает её сама Тефа, без иконок в HUD. Уровень считает hpState() ровно по таблице
// спеки, а весь вид задаёт ОДИН объект состояния st: drawTefa(c, x, y, r, v, skin, st). В src/tefa.js это будут
// поля позы с теми же именами (pose.hp, pose.dmg, pose.tint, pose.charged, pose.berserk, pose.heal), поэтому
// функции ниже переносятся как есть: они читают только st, v и r.
//   hp: { cur, max } — масса и её максимум;
//   dmg: 'bite' | 'crack' — стиль повреждений: A — укусы из силуэта, B — трещины при целом силуэте;
//   tint: 0..1 — красное мигание последнего куска (в игре пульс ≈ 1.5 Гц; на листе — пик, 1);
//   charged: true — шкала суперсилы полна: тёплое свечение, золотой кант, искры, собранный взгляд;
//   berserk: true — огненная аура, сердитые брови и оскал (в 1.6 раза крупнее делает вызывающий, как в игре);
//   heal: 0..1 — очередной укус зарастает (0 — только начал, 1 — зарос), с маленькой золотой искрой;
//   mood — необязательно, лицо вручную: 'happy' | 'determined' | 'worried' | 'scared' | 'ready' | 'fierce'.
// Полная масса без эффектов идёт ровно путём A раунда 4 (body4 + drawFace4, mix4 со своей особенностью) —
// пиксель в пиксель; всё новое либо дорисовывается поверх, либо вырезается клипом.
function hpState(mass, max) { // 0 — полная, 1 — минус кусок, 2 — два укуса, 3 — последний кусок
  if (mass >= max) return 0;
  if (mass <= 1) return 3; // последний кусок — всегда паника, при любой «Мясистости»
  return mass / max >= 0.6 ? 1 : 2;
}
const radius5 = m => 26 + 4 * (Math.min(Math.max(m, 1), 8) - 1); // radiusFor() из src/ball.js
const FIT5 = 1 / (VAR4[0].sy * VAR4[0].flat); // TEFA_FIT из src/tefa.js: радиус рисунка = r игры · FIT5, низ ровно на y + r
// сырой фарш на срезе укуса и в трещинах: те же роли цветов, что у T4, только розовое
const RAW5 = { crev: '#a4473a', shade: '#b0524a', base: '#c96b5e', warm: '#dc8576', lit: '#f2ae9f', hot: '#ffd5c6', fat: '#fff1e6', char: '#74291f' };

// ---------- стиль A: укусы ----------
// укусы в порядке потери: [угол от центра, радиус укуса, вынос центра за край] в долях r. Стоят по краю мимо глаз,
// рта и плоского низа и не пересекаются друг с другом: even-odd клип вернул бы пересечение обратно в тело
const BITES5 = [[-0.66, 0.4, 0.06], [2.75, 0.37, 0.06], [-2.3, 0.33, 0.06]];
const BAND5 = 0.15; // ширина среза с сырым фаршем в долях r
function bite5(x, y, r, v, i, grown) { // grown — сколько укуса уже заросло: 0 — целиком, 1 — укуса нет
  const [a, b, off] = BITES5[i];
  return { cx: x + Math.cos(a) * r * v.sx * (1 + off), cy: y + Math.sin(a) * r * v.sy * (1 + off),
    b: r * (off + (b - off) * (1 - (grown || 0))), ph: i * 1.3 };
}
function bitePath5(c, B, grow) { // круг укуса со следами зубов: скруглённые выемки, между ними острые зубчики
  const br = B.b + (grow || 0), N = 180;
  for (let i = 0; i <= N; i++) {
    const a = i / N * TAU, rr = br * (0.93 + 0.07 * Math.abs(Math.sin(a * 9 + B.ph)));
    const px = B.cx + Math.cos(a) * rr, py = B.cy + Math.sin(a) * rr;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath();
}
function clipOutBites5(c, x, y, r, bites) { // дальше всё рисуется мимо укусов: прямоугольник минус круги (even-odd)
  c.beginPath(); c.rect(x - r * 3, y - r * 3, r * 6, r * 6);
  for (const B of bites) bitePath5(c, B);
  c.clip('evenodd');
}
// срез укуса: полоса сырого розового фарша вдоль выкуса (то же зерно, что на корочке), тёмная кромка корочки по её
// внутреннему краю — у среза появляется толщина — и немного соуса, затёкшего с глазури на верхний край
function rawMince5(c, x, y, r, v, seed) { // заливка сырым фаршем в текущем клипе: розовая основа и то же зерно
  const g = c.createLinearGradient(x - r * 0.6, y - r * 0.8, x + r * 0.6, y + r * 0.8);
  g.addColorStop(0, RAW5.lit); g.addColorStop(1, RAW5.shade); // свет сверху-слева, как у корочки
  c.fillStyle = g; c.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3);
  grains4(c, x, y, r, Object.assign({}, v, { T: RAW5 }), rng(v.seed * 31 + seed));
}
function biteRims5(c, x, y, r, v, bites) {
  const band = r * BAND5;
  c.save(); silhouette4(c, x, y, r, v); c.clip(); // внутри тела; сами укусы уже вырезаны внешним клипом
  c.beginPath(); for (const B of bites) bitePath5(c, B, band); c.clip();
  rawMince5(c, x, y, r, v, 7);
  c.strokeStyle = hexa(T4.crev, 0.75); c.lineWidth = lw(r, 0.03); // кромка корочки
  c.beginPath(); for (const B of bites) bitePath5(c, B, band); c.stroke();
  c.lineCap = 'round';
  for (const B of bites) { // соус затёк с глазури: мазок по верхней части среза и капля на его конце
    const toC = Math.atan2(y - B.cy, x - B.cx), dUp = Math.atan2(y - r - B.cy, x - B.cx) - toC;
    const side = Math.max(-0.75, Math.min(0.75, Math.atan2(Math.sin(dUp), Math.cos(dUp)))), mid = toC + side;
    const a1 = mid - Math.sign(side) * 0.45, rr = B.b + band * 0.45; // мазок тянется от макушки вниз по срезу
    c.strokeStyle = hexa(T4.sauce, 0.92); c.lineWidth = lw(r, 0.06);
    c.beginPath(); c.arc(B.cx, B.cy, rr, Math.min(mid, a1), Math.max(mid, a1)); c.stroke();
    c.fillStyle = hexa(T4.sauce, 0.95); ell(c, B.cx + Math.cos(a1) * rr, B.cy + Math.sin(a1) * rr + r * 0.02, r * 0.045, r * 0.06);
  }
  c.restore();
}
// укус зарастает: между прежним краем B0 и нынешним B — свежий розовый фарш, по фронту роста золотая кромка,
// по контуру прежнего укуса — золотистый отсвет: видно, куда кусок дорастает
function healFill5(c, x, y, r, v, B0, B) {
  c.save(); silhouette4(c, x, y, r, v); c.clip();
  c.beginPath(); bitePath5(c, B0); c.clip();
  rawMince5(c, x, y, r, v, 11);
  const g = c.createRadialGradient(B.cx, B.cy, B.b, B.cx, B.cy, B0.b * 1.02);
  g.addColorStop(0, 'rgba(255,214,120,0.8)'); g.addColorStop(0.5, 'rgba(255,214,120,0.35)'); g.addColorStop(1, 'rgba(255,214,120,0.12)');
  c.fillStyle = g; c.fillRect(B0.cx - B0.b * 1.1, B0.cy - B0.b * 1.1, B0.b * 2.2, B0.b * 2.2);
  c.strokeStyle = 'rgba(255,236,160,0.95)'; c.lineWidth = lw(r, 0.035); // фронт роста
  c.beginPath(); bitePath5(c, B); c.stroke();
  c.restore();
  c.save(); silhouette4(c, x, y, r, v); c.clip(); // золотистая граница прежнего укуса на корочке
  c.strokeStyle = 'rgba(255,214,120,0.55)'; c.lineWidth = lw(r, 0.022);
  c.beginPath(); bitePath5(c, B0); c.stroke();
  c.restore();
}

// ---------- стиль B: трещины, вмятины, крошки, стёртая глазурь ----------
// трещины в порядке появления: [угол точки на краю, длина, изгиб, сид]; идут от края внутрь мимо глаз и рта
const CRACKS5 = [[-0.62, 0.58, 0.2, 3], [2.72, 0.54, -0.2, 5], [-2.3, 0.5, 0.25, 8], [0.45, 0.42, -0.25, 12]];
function zig5(x0, y0, d, len, n, R) { // зигзаг «молнией»: звенья по очереди уходят влево и вправо от общего направления
  const pts = [[x0, y0]];
  for (let i = 0; i < n; i++) {
    const turn = (i % 2 ? 1 : -1) * (0.45 + R() * 0.35), seg = len / n * (0.8 + R() * 0.4), [px, py] = pts[i];
    pts.push([px + Math.cos(d + turn) * seg, py + Math.sin(d + turn) * seg]);
  }
  return pts;
}
function crackLine5(c, pts, w, col, ox, oy) { // звенья сужаются к концу трещины; ox, oy — сдвиг (светлая губа)
  c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round';
  for (let i = 1; i < pts.length; i++) {
    c.lineWidth = Math.max(0.9, w * (1 - (i - 1) / pts.length));
    c.beginPath(); c.moveTo(pts[i - 1][0] + ox, pts[i - 1][1] + oy); c.lineTo(pts[i][0] + ox, pts[i][1] + oy); c.stroke();
  }
}
// трещина: тёмная щель и светлая губа сырого фарша с нижне-правой стороны (она смотрит на свет сверху-слева)
function cracks5(c, x, y, r, v, n) {
  for (let i = 0; i < n; i++) {
    const [a, len, bend, seed] = CRACKS5[i], R = rng(seed * 101 + 7), d = a + Math.PI + bend;
    const main = zig5(x + Math.cos(a) * r * v.sx * 1.02, y + Math.sin(a) * r * v.sy * 1.02, d, r * len, 5, R);
    const branch = zig5(main[2][0], main[2][1], d + (bend > 0 ? -0.85 : 0.85), r * len * 0.45, 3, R);
    for (const p of [main, branch]) {
      const k = p === branch ? 0.7 : 1;
      crackLine5(c, p, lw(r, 0.08 * k), hexa(RAW5.lit, 0.95), r * 0.022, r * 0.024);
      crackLine5(c, p, lw(r, 0.066 * k), '#1a0803', 0, 0);
    }
  }
}
// вмятины: [dx, dy, rx, ry, наклон] в долях r — по краям тела, мимо лица
const DENTS5 = [[0.64, 0.18, 0.16, 0.12, 0.3], [-0.62, -0.34, 0.15, 0.11, -0.4], [0.28, -0.64, 0.13, 0.08, 0.1]];
function dents5(c, x, y, r, n) { // свет сверху-слева: верхне-левая стенка вмятины в тени, нижне-правая освещена
  for (let i = 0; i < n; i++) {
    const [dx, dy, rx, ry, rot] = DENTS5[i], px = x + dx * r, py = y + dy * r;
    c.save(); c.beginPath(); c.ellipse(px, py, rx * r, ry * r, rot, 0, TAU); c.clip();
    const g = c.createLinearGradient(px - rx * r, py - ry * r, px + rx * r, py + ry * r);
    g.addColorStop(0, hexa(T4.crev, 0.85)); g.addColorStop(0.45, hexa(T4.crev, 0.35)); g.addColorStop(0.7, hexa(T4.hot, 0));
    g.addColorStop(1, hexa(T4.hot, 0.6));
    c.fillStyle = g; c.fillRect(px - rx * r, py - rx * r, rx * r * 2, rx * r * 2);
    c.restore();
    c.strokeStyle = hexa(T4.hot, 0.45); c.lineWidth = lw(r, 0.014); // освещённый край у нижне-правой кромки
    c.beginPath(); c.ellipse(px, py, rx * r, ry * r, rot, -0.2, Math.PI * 0.75); c.stroke();
  }
}
// крошки: [dx, dy, размер, лежит] в долях r от центра; лежащие — у подножия, падающие — сбоку, с парой штрихов скорости
const CRUMBS5 = [[1.14, 0.1, 0.075], [-1.18, 0.3, 0.07], [0.9, 0.86, 0.065, 1], [1.3, 0.52, 0.06], [-0.98, 0.86, 0.065, 1], [-1.32, -0.12, 0.055]];
function crumbs5(c, x, y, r, n) {
  const R = rng(4242);
  for (let i = 0; i < n; i++) {
    const [dx, dy, s, rest] = CRUMBS5[i], px = x + dx * r, py = y + dy * r, rad = Math.max(1.6, s * r);
    if (!rest) {
      c.strokeStyle = 'rgba(255,225,200,0.3)'; c.lineWidth = lw(r, 0.012); c.lineCap = 'round';
      for (const sx of [-0.45, 0.45]) { c.beginPath(); c.moveTo(px + sx * rad, py - rad * 1.7); c.lineTo(px + sx * rad, py - rad * 3.4); c.stroke(); }
    }
    const rot = R() * TAU;
    c.fillStyle = T4.shade; blob4(c, px + rad * 0.2, py + rad * 0.25, rad, 1.3, rot, R); // теневая сторона куска
    c.fillStyle = T4.lit; blob4(c, px, py, rad * 0.9, 1.3, rot, R);                     // корочка
    c.fillStyle = T4.hot; blob4(c, px - rad * 0.25, py - rad * 0.3, rad * 0.42, 1.2, rot, R); // блик
  }
}
// проплешины глазури: [dx, dy от макушки, rx, ry] в долях r — на каждом уровне свои
const WORN5 = [[], [[0.1, 0.1, 0.07, 0.05]], [[0.1, 0.1, 0.08, 0.055], [-0.13, 0.17, 0.06, 0.045]],
  [[0.07, 0.08, 0.09, 0.06], [-0.1, 0.17, 0.07, 0.05], [0.13, 0.26, 0.05, 0.04]]];
function clipOutWorn5(c, x, y, r, v, spots) { // глазурь рисуется мимо проплешин (even-odd)
  const ty = topY(y, r, v);
  c.beginPath(); c.rect(x - r * 3, y - r * 3, r * 6, r * 6);
  for (const [dx, dy, rx, ry] of spots) { c.moveTo(x + r * (dx + rx), ty + r * dy); c.ellipse(x + r * dx, ty + r * dy, r * rx, r * ry, 0, 0, TAU); }
  c.clip('evenodd');
}
// шапка глазури сжимается к макушке с каждым куском; у B глазурь ещё и стирается: слой тоньше, есть проплешины
function sauce5(lvl, worn) {
  const S = SAUCE4.base; if (!lvl) return S; // полная — рецепт A без изменений
  const k = [1, 0.8, 0.62, 0.46][lvl];
  return Object.assign({}, S, { w: S.w * k, dips: S.dips.map(([dx, len]) => [dx * k, len * k]),
    coat: worn ? S.coat * [1, 0.8, 0.62, 0.45][lvl] : S.coat });
}

// ---------- общее: мигание, пот, искры, аура ----------
// красный ореол за телом: мигание видно на тёмной кухне и в игровом размере; начинается у края тела,
// чтобы не заливать красным дыры укусов — силуэт с укусами остаётся читаемым
function alarm5(c, x, y, r, t) {
  const g = c.createRadialGradient(x, y, r * 1.0, x, y, r * 1.55);
  g.addColorStop(0, `rgba(255,56,40,${0.5 * t})`); g.addColorStop(1, 'rgba(255,56,40,0)');
  c.fillStyle = g; ell(c, x, y, r * 1.55, r * 1.55);
}
function tint5(c, x, y, r, v, t) { // тело краснеет; лицо рисуется после и остаётся читаемым
  c.save(); silhouette4(c, x, y, r, v); c.clip();
  c.fillStyle = `rgba(255,50,34,${0.42 * t})`; c.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3);
  c.restore();
}
function sweat5(c, x, y, r) { // капля пота у левого виска: голубая с бликом и тёмным контуром — видна на тёмном теле
  const s = r * 0.15; c.save(); c.translate(x - r * 0.8, y - r * 0.46); c.rotate(-0.35);
  c.beginPath(); c.moveTo(0, -s * 1.5); c.bezierCurveTo(s * 0.35, -s * 0.6, s, 0, s, s * 0.3);
  c.arc(0, s * 0.3, s, 0, Math.PI); c.bezierCurveTo(-s, 0, -s * 0.35, -s * 0.6, 0, -s * 1.5); c.closePath();
  c.fillStyle = '#bfe8ff'; c.fill(); c.strokeStyle = '#2d5d86'; c.lineWidth = lw(r, 0.018); c.stroke();
  c.fillStyle = '#fff'; ell(c, -s * 0.35, s * 0.1, s * 0.22, s * 0.35, 0.3);
  c.restore();
}
function sparkle5(c, x, y, s) { // золотая искра: четыре луча, мягкий ореол и светлая серединка
  const g = c.createRadialGradient(x, y, 0, x, y, s * 1.4);
  g.addColorStop(0, 'rgba(255,230,150,0.6)'); g.addColorStop(1, 'rgba(255,200,90,0)');
  c.fillStyle = g; ell(c, x, y, s * 1.4, s * 1.4);
  c.fillStyle = '#ffe07a'; c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? s * 0.22 : s;
    i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath(); c.fill(); c.fillStyle = '#fffbe8'; ell(c, x, y, s * 0.2, s * 0.2);
}
function chargeGlow5(c, x, y, r) { // шкала полна: тёплое свечение за телом
  const g = c.createRadialGradient(x, y, r * 0.8, x, y, r * 1.6);
  g.addColorStop(0, 'rgba(255,200,90,0.6)'); g.addColorStop(1, 'rgba(255,200,90,0)');
  c.fillStyle = g; ell(c, x, y, r * 1.6, r * 1.6);
}
function chargeRim5(c, x, y, r, v) { // золотой кант изнутри по краю — Тефа светится сама, а не просто стоит в ореоле
  c.save(); silhouette4(c, x, y, r, v); c.clip();
  const g = c.createRadialGradient(x, y + r * 0.1, r * 0.72, x, y + r * 0.1, r * 1.1);
  g.addColorStop(0, 'rgba(255,210,110,0)'); g.addColorStop(1, 'rgba(255,210,110,0.65)');
  c.fillStyle = g; c.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3);
  c.restore();
}
// искры полной шкалы: [угол, удаление в долях r, размер]; макушку не занимают — там точки зарядов
const SPARKS5 = [[-2.85, 1.22, 0.1], [-2.35, 1.38, 0.14], [-2.0, 1.55, 0.07], [-1.12, 1.55, 0.08], [-0.78, 1.36, 0.14], [-0.28, 1.25, 0.09], [0.25, 1.28, 0.06], [2.95, 1.3, 0.06]];
// огненная аура берсерка: три слоя языков пламени от края вверх-наружу (за телом)
function berserkAura5(c, x, y, r, v) {
  const g = c.createRadialGradient(x, y, r * 0.8, x, y, r * 1.7);
  g.addColorStop(0, 'rgba(255,110,30,0.55)'); g.addColorStop(1, 'rgba(255,80,20,0)');
  c.fillStyle = g; ell(c, x, y, r * 1.7, r * 1.7);
  for (const [col, k] of [['rgba(214,52,20,0.9)', 1], ['rgba(255,132,30,0.95)', 0.74], ['rgba(255,222,110,0.95)', 0.5]]) {
    const R = rng(777); c.fillStyle = col; // один сид на все слои — языки вложены друг в друга
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
function embers5(c, x, y, r) { // угольки над макушкой
  const R = rng(99);
  for (let i = 0; i < 7; i++) {
    const px = x + (R() - 0.5) * r * 1.6, py = y - r * (1.25 + R() * 0.45), s = Math.max(1.2, r * (0.02 + R() * 0.02));
    c.fillStyle = `rgba(255,${(170 + R() * 70) | 0},60,${(0.6 + R() * 0.4).toFixed(2)})`; ell(c, px, py, s, s);
  }
}

// ---------- лица состояний: геометрия и глаза drawFace4; 'happy' — само утверждённое лицо ----------
function drawFace5(c, x, y, r, v, mood) {
  if (mood === 'happy') { drawFace4(c, x, y, r, v); return; }
  const T = v.T || T4, f = faceGeom(r), scared = mood === 'scared', er = f.er * (scared ? 1.16 : 1);
  const g = c.createRadialGradient(x, y + r * 0.06, r * 0.1, x, y + r * 0.06, r * 0.66);
  g.addColorStop(0, hexa(T.warm, 0.5)); g.addColorStop(1, hexa(T.warm, 0));
  c.fillStyle = g; ell(c, x, y + r * 0.06, r * 0.66, r * 0.52); // пятачок под лицом
  // веко: [доля глаза под веком у внешнего края, насколько край ниже у переносицы] — собранный, готовый, злой взгляд
  const lid = { determined: [0.3, 0.22], ready: [0.26, 0.16], fierce: [0.34, 0.46] }[mood];
  const pr = scared ? 0.3 : mood === 'worried' ? 0.46 : 0.52; // испуг — зрачок-точка
  for (const s of [-1, 1]) {
    const cx = x + s * f.ex, cy = y + f.ey;
    c.fillStyle = hexa(T.crev, 0.55); ell(c, cx, cy + er * 0.1, er * 1.14, er * 1.12); // тень-посадка глаза
    c.fillStyle = '#fff'; ell(c, cx, cy, er, er);
    const px = cx + (scared ? 0 : er * 0.08), py = cy + (scared ? 0 : mood === 'worried' ? -er * 0.04 : er * 0.1);
    c.fillStyle = '#231610'; c.beginPath(); c.arc(px, py, er * pr, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(px - er * pr * 0.46, py - er * pr * 0.58, er * pr * 0.42, 0, TAU); c.fill(); // блики как у drawFace4
    if (!scared) { c.beginPath(); c.arc(px + er * pr * 0.42, py + er * pr * 0.38, er * pr * 0.19, 0, TAU); c.fill(); }
    if (lid) {
      const [h, tilt] = lid, xo = cx + s * er * 1.1, xi = cx - s * er * 1.1, yo = cy - er + er * 2 * h, yi = yo + er * tilt;
      c.save(); c.beginPath(); c.arc(cx, cy, er * 1.01, 0, TAU); c.clip();
      c.fillStyle = mix4(T.warm, T.lit, 0.3); c.beginPath(); // веко цветом мяса, как у сонного E раунда 4
      c.moveTo(xo, yo); c.lineTo(xi, yi); c.lineTo(xi, cy - er * 1.3); c.lineTo(xo, cy - er * 1.3); c.closePath(); c.fill();
      c.restore();
      c.save(); c.beginPath(); c.arc(cx, cy, er * 1.12, 0, TAU); c.clip(); // линия ресниц по краю века
      c.strokeStyle = hexa(T.char, 0.9); c.lineWidth = lw(r, 0.034); c.lineCap = 'round';
      c.beginPath(); c.moveTo(xo, yo); c.lineTo(xi, yi); c.stroke(); c.restore();
    }
  }
  // брови: [внешний край x, высота; внутренний край x, высота] в долях er от центра глаза; светлая подводка снизу
  const brow = { determined: [0.95, 1.5, 0.8, 1.26], ready: [0.95, 1.5, 0.8, 1.3], worried: [0.95, 1.38, 0.72, 1.74],
    scared: [0.95, 1.55, 0.7, 1.98], fierce: [1.05, 1.66, 0.82, 0.98] }[mood];
  if (brow) for (const s of [-1, 1]) {
    const cx = x + s * f.ex, cy = y + f.ey, [xo, ho, xi, hi] = brow;
    for (const [col, dy, w] of [['rgba(255,190,140,0.35)', er * 0.14, 0.06], ['#1b0c05', 0, mood === 'fierce' ? 0.068 : 0.052]]) {
      c.strokeStyle = col; c.lineWidth = lw(r, w); c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx + s * er * xo, cy - er * ho + dy); c.lineTo(cx - s * er * xi, cy - er * hi + dy); c.stroke();
    }
  }
  const my = y + f.my, mw = f.mw, warm = 'rgba(255,190,140,0.35)', dark = '#1b0c05';
  c.lineCap = 'round'; c.lineWidth = lw(r, 0.06);
  if (mood === 'ready') { // уверенная улыбка — та же, что у утверждённого лица
    c.strokeStyle = warm; c.beginPath(); c.moveTo(x - mw, my + r * 0.02); c.quadraticCurveTo(x, my + r * 0.24, x + mw, my + r * 0.02); c.stroke();
    c.strokeStyle = dark; c.beginPath(); c.moveTo(x - mw, my - r * 0.01); c.quadraticCurveTo(x, my + r * 0.21, x + mw, my - r * 0.01); c.stroke();
  } else if (mood === 'determined') { // сжатые губы: короткая прямая, уголки чуть вниз
    const line = dy => { c.beginPath(); c.moveTo(x - mw * 0.72, my + r * 0.09 + dy); c.quadraticCurveTo(x, my + r * 0.04 + dy, x + mw * 0.72, my + r * 0.09 + dy); c.stroke(); };
    c.strokeStyle = warm; line(r * 0.03); c.strokeStyle = dark; line(0);
  } else if (mood === 'worried') { // волнистая тревожная линия
    const wave = dy => {
      c.beginPath(); c.moveTo(x - mw * 0.78, my + r * 0.1 + dy);
      c.bezierCurveTo(x - mw * 0.4, my + r * 0.01 + dy, x - mw * 0.1, my + r * 0.01 + dy, x, my + r * 0.07 + dy);
      c.bezierCurveTo(x + mw * 0.1, my + r * 0.13 + dy, x + mw * 0.4, my + r * 0.13 + dy, x + mw * 0.78, my + r * 0.04 + dy); c.stroke();
    };
    c.strokeStyle = warm; wave(r * 0.03); c.strokeStyle = dark; wave(0);
  } else if (mood === 'scared') { // маленький открытый рот «о»
    c.fillStyle = warm; ell(c, x, my + r * 0.1, r * 0.11, r * 0.13);
    c.fillStyle = dark; ell(c, x, my + r * 0.08, r * 0.095, r * 0.115);
  } else if (mood === 'fierce') { // оскал: широкий открытый рот, сверху ряд зубов
    const mouth = () => { c.beginPath(); c.moveTo(x - mw * 1.08, my - r * 0.03); c.quadraticCurveTo(x, my + r * 0.07, x + mw * 1.08, my - r * 0.03);
      c.quadraticCurveTo(x, my + r * 0.4, x - mw * 1.08, my - r * 0.03); c.closePath(); };
    c.save(); c.translate(0, r * 0.03); c.fillStyle = warm; mouth(); c.fill(); c.restore(); // тёплая подсветка нижней губы
    c.fillStyle = dark; mouth(); c.fill();
    c.save(); mouth(); c.clip(); c.fillStyle = '#f6efe2'; c.fillRect(x - mw * 1.1, my - r * 0.1, mw * 2.2, r * 0.18);
    c.strokeStyle = hexa(T.crev, 0.5); c.lineWidth = lw(r, 0.012);
    for (const k of [-0.5, 0, 0.5]) { c.beginPath(); c.moveTo(x + mw * k, my); c.lineTo(x + mw * k, my + r * 0.08); c.stroke(); }
    c.restore();
  }
}

// ---------- состояние целиком: всё, что зависит от st, — в одном месте ----------
function look5(st) {
  const hp = st.hp || { cur: 1, max: 1 }, lvl = hpState(hp.cur, hp.max), crack = st.dmg === 'crack';
  const mood = st.mood || (st.berserk ? 'fierce' : lvl === 3 ? 'scared' : st.charged ? 'ready' : ['happy', 'determined', 'worried'][lvl]);
  return { lvl, crack, mood, heal: st.heal > 0 && st.heal < 1 ? st.heal : 0,
    bites: crack ? 0 : lvl, cracks: crack ? [0, 1, 2, 4][lvl] : 0, dents: crack ? [0, 1, 2, 3][lvl] : 0, crumbs: crack ? [0, 1, 3, 6][lvl] : 0,
    sauce: sauce5(lvl, crack), worn: crack ? WORN5[lvl] : [], tint: lvl === 3 ? (st.tint || 0) : 0, sweat: mood === 'worried' };
}
function drawTefa5(c, x, y, r, v, st) {
  const L = look5(st);
  if (!L.lvl && !L.heal && L.mood === 'happy' && !st.charged && !st.berserk) { body4(c, x, y, r, v); drawFace4(c, x, y, r, v); return; } // полная = A раунда 4
  const bites = []; for (let i = 0; i < L.bites; i++) bites.push(bite5(x, y, r, v, i));
  const B0 = L.heal && !L.crack ? bite5(x, y, r, v, L.bites) : null, B = B0 && bite5(x, y, r, v, L.bites, L.heal); // был укус B0, сейчас B
  if (st.berserk) berserkAura5(c, x, y, r, v);
  if (st.charged) chargeGlow5(c, x, y, r);
  if (L.tint) alarm5(c, x, y, r, L.tint);
  const vs = Object.assign({}, v, { sauce: L.sauce });
  c.save();
  if (bites.length || B) clipOutBites5(c, x, y, r, B ? bites.concat([B]) : bites);
  body4(c, x, y, r, Object.assign({}, vs, { sauce: null })); // тело A без глазури…
  c.save(); if (L.worn.length) clipOutWorn5(c, x, y, r, v, L.worn); sauceCoat4(c, x, y, r, vs); c.restore(); // …и глазурь по уровню
  if (L.tint) tint5(c, x, y, r, v, L.tint); // краснеет корочка; срезы и лицо рисуются после и остаются светлыми
  if (L.dents) dents5(c, x, y, r, L.dents);
  if (L.cracks) cracks5(c, x, y, r, v, L.cracks);
  if (bites.length) biteRims5(c, x, y, r, v, bites);
  if (B0) healFill5(c, x, y, r, v, B0, B); // у зарастающего укуса вместо обычного среза — свежий фарш и фронт роста
  if (st.charged) chargeRim5(c, x, y, r, v);
  drawFace5(c, x, y, r, v, L.mood);
  c.restore();
  if (L.sweat) sweat5(c, x, y, r);
  if (L.crumbs) crumbs5(c, x, y, r, L.crumbs);
  if (st.charged) for (const [a, d, s] of SPARKS5) sparkle5(c, x + Math.cos(a) * r * v.sx * d, y + Math.sin(a) * r * v.sy * d, r * s);
  if (B0) { // золотая искра у зарастающего укуса
    const a = Math.atan2(B0.cy - y, B0.cx - x);
    sparkle5(c, B0.cx - Math.cos(a) * B0.b * 0.35, B0.cy - Math.sin(a) * B0.b * 0.35, r * 0.17);
    sparkle5(c, B0.cx + Math.cos(a + 1.2) * B0.b * 0.7, B0.cy + Math.sin(a + 1.2) * B0.b * 0.7, r * 0.08);
  }
  if (st.berserk) embers5(c, x, y, r);
}

// ---------- лист 5 ----------
// крупно: два ряда по четыре состояния (радиус рисунка = 2.5 · радиус игры, полная — те же 95, что у листа 4);
// под ними те же восемь в игровом размере 1:1 к логическому полю 480×854; ниже особые состояния
function sheet5(name) {
  const W = 1200, H = 1790, c = createCanvas(W, H).getContext('2d'), A = VAR4[0], K = 2.5, MAXM = 4, PLATE = 95 * 2.7;
  bg(c, W, H);
  const txt = (s, x, y, font, col, align) => { c.textAlign = align || 'left'; c.font = font + ' "DejaVu Sans", sans-serif'; c.fillStyle = col; c.fillText(s, x, y); };
  const head = (s, sub, y) => { txt(s, 30, y, '800 20px', '#f6c343'); const w = c.measureText(s).width; txt(sub, 30 + w + 14, y, '600 14px', 'rgba(255,255,255,0.6)'); };
  txt('ТЕФА — РАУНД 5: жизни на самой Тефе (вариант A «В томате»)', 30, 44, '800 24px', '#fff');
  txt('Масса = здоровье, максимум 4. Радиус 26 + 4·(масса − 1): 38 → 34 → 30 → 26. Крупно — ×2.5 к игре; «Полная» — ровно A листа 4.', 30, 70, '600 14px', 'rgba(255,255,255,0.6)');
  const STATES = [[4, 'Полная'], [3, 'Минус кусок'], [2, 'Два укуса'], [1, 'Последний кусок']];
  const colX = i => 40 + 140 + i * 280;
  const big = (x, yb, R, st, nm, note) => { // крупная ячейка: тарелка, тень, Тефа низом на линии стола yb
    plate(c, x, yb + 12, PLATE);
    c.fillStyle = 'rgba(0,0,0,0.32)'; ell(c, x + 4, yb + 6, R * 0.92, R * 0.2);
    drawTefa(c, x, yb - R * A.sy * A.flat, R, A, null, st);
    txt(nm, x, yb + 76, '700 17px', 'rgba(255,255,255,0.92)', 'center');
    txt(note, x, yb + 96, '600 13px', 'rgba(255,255,255,0.55)', 'center');
  };
  const hpSt = (m, dmg) => ({ hp: { cur: m, max: MAXM }, dmg, tint: 1 }); // tint 1 — пик мигания последнего куска
  const strip = (y0, h, cells, title) => { // игровой размер: фон кухни как drawBg, тарелка 120 px, тень, точки зарядов
    txt(title, 30, y0 - 12, '600 15px', 'rgba(255,255,255,0.65)');
    const x0 = 30, w = W - 60, sw = w / cells.length;
    c.save(); c.beginPath(); c.rect(x0, y0, w, h); c.clip();
    const g = c.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, 'rgb(52,39,32)'); g.addColorStop(1, 'rgb(46,34,29)');
    c.fillStyle = g; c.fillRect(x0, y0, w, h);
    c.strokeStyle = 'rgba(255,255,255,0.05)'; c.lineWidth = 2; // плитка 96 px, как в игре
    for (let yy = y0 + 40; yy < y0 + h; yy += 96) { c.beginPath(); c.moveTo(x0, yy); c.lineTo(x0 + w, yy); c.stroke(); }
    for (let xx = x0 + 48; xx < x0 + w; xx += 96) { c.beginPath(); c.moveTo(xx, y0); c.lineTo(xx, y0 + h); c.stroke(); }
    cells.forEach((cell, i) => {
      const x = x0 + sw * (i + 0.5), py = y0 + h - 44, r = radius5(cell.m) * (cell.st.berserk ? 1.6 : 1);
      c.fillStyle = '#e9e4da'; ell(c, x, py + 8, 60, 16); c.fillStyle = '#c9c2b4'; ell(c, x, py + 8, 30, 9);
      c.fillStyle = 'rgba(0,0,0,0.25)'; ell(c, x, py + 6, r * 0.9, 8); // тень на платформе
      drawTefa(c, x, py - r, r * FIT5, A, null, cell.st); // низ на платформе, как landOn(); берсерк растёт от низа
      c.fillStyle = '#f6c343'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x - 14 + k * 14, py - r - r * 1.16 - 14, 4, 0, TAU); c.fill(); }
      txt(cell.label, x, py + 38, '700 12px', 'rgba(255,255,255,0.72)', 'center');
    });
    c.restore(); c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 1; c.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
  };
  head('Стиль A — укусы', 'кусок выкушен из силуэта, на срезе сырой фарш и соус, шапка глазури меньше', 112);
  STATES.forEach(([m, nm], i) => big(colX(i), 312, K * radius5(m), hpSt(m, 'bite'), nm, `масса ${m} из ${MAXM} · r ${radius5(m)}`));
  head('Стиль B — трещины', 'силуэт целый: трещины, вмятины, падают крошки, глазурь стирается', 460);
  STATES.forEach(([m, nm], i) => big(colX(i), 660, K * radius5(m), hpSt(m, 'crack'), nm, `масса ${m} из ${MAXM} · r ${radius5(m)}`));
  const SHORT = ['полная', '−1 кусок', '−2 куска', 'последний'];
  strip(806, 176, [].concat(...['bite', 'crack'].map((dmg, j) => STATES.map(([m], i) => ({ m, st: hpSt(m, dmg), label: 'AB'[j] + ': ' + SHORT[i] })))),
    'в игровом размере 1:1 (логическое поле 480×854; на телефоне шириной 390 px это ×0.81) — видно ли, сколько жизней?');
  head('Особые состояния', 'стиль A, полная масса', 1030);
  const SPEC = [[190, 1, { hp: { cur: 4, max: 4 }, charged: true }, 'Шкала полна', 'свечение и искры: тап по Тефе — суперсила'],
    [600, 1.6, { hp: { cur: 4, max: 4 }, berserk: true }, 'Берсерк', '×1.6 от нижней точки, огненная аура, сердитые брови'],
    [1010, 1, { hp: { cur: 4, max: 4 }, heal: 0.5 }, 'Лечение', 'укус зарастает: середина 0.3 с, золотая искра']];
  for (const [x, k, st, nm, note] of SPEC) big(x, 1400, K * radius5(4) * k, st, nm, note);
  strip(1546, 214, [{ m: 4, st: hpSt(4, 'bite'), label: 'полная (для сравнения)' }].concat(SPEC.map(([, , st, nm]) => ({ m: 4, st, label: nm.toLowerCase() }))),
    'особые состояния в игровом размере 1:1');
  fs.writeFileSync(path.join(OUT, name + '.png'), c.canvas.toBuffer('image/png')); console.log('shots/' + name + '.png');
}

const MODE = process.argv[2] || 'round2';
if (MODE === 'round1' || MODE === 'all') { // первый заход сохранён целиком
  sheet('design_tefa_base', 'ТЕФА — БАЗА: 8 вариантов (A–H)', VAR.map(v => ({ v, skin: null, id: v.id, name: v.name })), 4, 90);
  const BEST = VAR.find(v => v.id === 'H');
  sheet('design_tefa_skins', 'ТЕФА — СКИНЫ на варианте ' + BEST.id + ' («' + BEST.name + '»)',
    SKINS.map(([s, n], i) => ({ v: BEST, skin: s, id: String(i + 1), name: n })), 4, 90);
  for (const v of VAR) console.log(v.id + ' «' + v.name + '» — ' + v.idea);
}
if (MODE === 'round2' || MODE === 'all') {
  sheet('design_tefa_round2', 'ТЕФА — РАУНД 2: фарш, не картошка (A–F)', VAR2.map(v => ({ v, skin: null, id: v.id, name: v.name })), 3, 95);
  const BEST2 = VAR2.find(v => v.id === (process.env.TEFA_BEST || 'B'));
  sheet('design_tefa_skins2', 'ТЕФА — СКИНЫ на варианте ' + BEST2.id + ' («' + BEST2.name + '»)',
    SKINS.map(([sk, n], i) => ({ v: BEST2, skin: sk, id: String(i + 1), name: n })), 4, 90);
  for (const v of VAR2) console.log(v.id + ' «' + v.name + '» — ' + v.idea);
}
if (MODE === 'round3' || MODE === 'all') {
  sheet('design_tefa_round3', 'ТЕФА — РАУНД 3: E и близкая родня (A–F)', VAR3, 3, 90, SH3); // r=90 × zoom 2 = 180 px на листе
  sheet('design_tefa_skins3', 'ТЕФА — СКИНЫ на варианте E раунда 1 («Яйцо»)',
    SKINS3.map(([sk, n], i) => ({ v: E1, skin: sk, id: String(i + 1), name: n })), 4, 90);
  for (const cell of VAR3) console.log(cell.id + ' «' + cell.name + '» — ' + cell.idea);
}

if (MODE === 'round4' || MODE === 'all') {
  sheet('design_tefa_round4', 'ТЕФА — РАУНД 4: E «В томате» и близкая родня (A–F)',
    VAR4.map(v => ({ v, skin: null, id: v.id, name: v.name })), 3, 95);
  sheet('design_tefa_skins4', 'ТЕФА — СКИНЫ на варианте A («В томате»)',
    SKINS3.map(([sk, n], i) => ({ v: VAR4[0], skin: sk, id: String(i + 1), name: n })), 4, 90);
  for (const v of VAR4) console.log(v.id + ' «' + v.name + '» — ' + v.idea);
}
if (MODE === 'round5' || MODE === 'all') { // жизни на Тефе; второй аргумент — имя черновика вместо выбранного листа
  sheet5(MODE === 'round5' && process.argv[3] ? process.argv[3] : 'design_tefa_round5_hp');
}
