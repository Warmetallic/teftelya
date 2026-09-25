// node tools/design_themes.js — лист фонов тем v2.2a на выбор владельца (спека docs/specs/2026-09-25-v2-2a-themes-design.md §5):
// для каждой из пяти тем два варианта фона (A, B) с нижней смертельной полосой темы и её уникальностью в кадре настоящей
// башни этой темы. Платформы, еду, опасности и Тефу рисует сама игра; фон, полосу и уникальность — этот инструмент.
// Листы shots/design_*.png не перезаписываются: новый раунд — новое имя файла.
const fs = require('fs'), path = require('path'), { createCanvas } = require('canvas');
const bot = require('./bot');
const OUT = path.join(__dirname, '..', 'shots', 'design_themes_round1.png');
if (fs.existsSync(OUT)) { console.error(OUT + ' уже есть — лист не перезаписываю, дай новому раунду новое имя'); process.exit(1); }
const W = 480, H = 854, BAND_H = 36;
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
const R = seed => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; // детерминированные узоры
const grad = (c, top, bottom) => { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bottom); c.fillStyle = g; c.fillRect(0, 0, W, H); };

// ---------- фоны ----------
const BG = {
  kitchen: {
    A: (c, d) => { d.drawBg(); }, // как сейчас: тёплая коричневая плитка
    B: (c) => { grad(c, 'rgb(74,56,42)', 'rgb(44,32,24)');
      c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 3; for (let y = 0; y < H; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      for (let y = 0; y < H; y += 64) for (let x = (y / 64) % 2 ? 0 : 32; x < W; x += 64) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 64); c.stroke(); }
      c.fillStyle = 'rgba(0,0,0,0.22)'; for (const [x, y, s] of [[40, 120, 1], [440, 300, 0.8], [36, 560, 0.9]]) { // силуэты половника и лопатки на крючках
        c.fillRect(x - 2, y - 40 * s, 4, 60 * s); c.beginPath(); c.ellipse(x, y + 26 * s, 14 * s, 10 * s, 0, 0, 7); c.fill(); } },
  },
  fridge: {
    A: (c) => { grad(c, 'rgb(40,62,82)', 'rgb(22,36,52)'); const r = R(7);
      c.strokeStyle = 'rgba(200,230,255,0.18)'; c.lineWidth = 3; for (let y = 90; y < H; y += 170) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); c.fillStyle = 'rgba(200,230,255,0.05)'; c.fillRect(0, y, W, 10); }
      c.fillStyle = 'rgba(230,245,255,0.35)'; for (let i = 0; i < 90; i++) { c.beginPath(); c.arc(r() * W, r() * H, 1 + r() * 1.8, 0, 7); c.fill(); } },
    B: (c) => { grad(c, 'rgb(30,44,70)', 'rgb(14,22,40)'); const g = c.createRadialGradient(W / 2, -40, 20, W / 2, -40, 520);
      g.addColorStop(0, 'rgba(170,215,255,0.35)'); g.addColorStop(1, 'rgba(170,215,255,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H); const r = R(11);
      c.strokeStyle = 'rgba(220,240,255,0.3)'; c.lineWidth = 1.5; for (let i = 0; i < 26; i++) { const x = r() * W, y = r() * H, s = 4 + r() * 5;
        for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; c.beginPath(); c.moveTo(x - Math.cos(a) * s, y - Math.sin(a) * s); c.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s); c.stroke(); } } },
  },
  oven: {
    A: (c) => { grad(c, 'rgb(30,24,22)', 'rgb(16,12,12)');
      c.strokeStyle = 'rgba(150,70,40,0.35)'; c.lineWidth = 5; c.lineJoin = 'round'; for (const y0 of [150, 470, 790]) { c.beginPath(); for (let x = 10, k = 0; x <= W - 10; x += 36, k++) { const y = y0 + (k % 2 ? 18 : -18); k ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); } },
    B: (c) => { grad(c, 'rgb(26,24,26)', 'rgb(12,11,12)');
      c.strokeStyle = 'rgba(160,160,170,0.14)'; c.lineWidth = 3; for (let y = 120; y < H; y += 240) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); for (let x = 20; x < W; x += 30) { c.beginPath(); c.moveTo(x, y - 24); c.lineTo(x, y + 24); c.stroke(); } }
      const g = c.createLinearGradient(0, H * 0.55, 0, H); g.addColorStop(0, 'rgba(140,60,30,0)'); g.addColorStop(1, 'rgba(140,60,30,0.28)'); c.fillStyle = g; c.fillRect(0, 0, W, H); },
  },
  sink: {
    A: (c) => { grad(c, 'rgb(52,70,84)', 'rgb(30,42,52)'); c.strokeStyle = 'rgba(230,240,250,0.12)'; c.lineWidth = 2;
      for (let y = 0; y < H; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); } for (let x = 0; x <= W; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } },
    B: (c) => { grad(c, 'rgb(72,78,84)', 'rgb(38,42,46)'); const r = R(5);
      c.strokeStyle = 'rgba(255,255,255,0.05)'; c.lineWidth = 1; for (let x = 0; x < W; x += 3) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 6, H); c.stroke(); }
      for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H, s = 3 + r() * 4; c.fillStyle = 'rgba(190,220,245,0.3)'; c.beginPath(); c.ellipse(x, y, s * 0.7, s, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.arc(x - s * 0.25, y - s * 0.3, s * 0.2, 0, 7); c.fill(); } },
  },
  feast: {
    A: (c) => { grad(c, 'rgb(30,58,42)', 'rgb(18,36,26)'); c.fillStyle = 'rgba(255,255,255,0.05)';
      for (let y = 0; y < H; y += 48) for (let x = (y / 48) % 2 ? 0 : 24; x < W; x += 48) c.fillRect(x, y, 24, 24);
      for (const [x, y] of [[60, 140], [420, 380], [90, 640]]) { const g = c.createRadialGradient(x, y, 2, x, y, 60); g.addColorStop(0, 'rgba(255,210,140,0.35)'); g.addColorStop(1, 'rgba(255,210,140,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, 60, 0, 7); c.fill();
        c.fillStyle = 'rgba(240,230,210,0.5)'; c.fillRect(x - 3, y, 6, 22); c.fillStyle = 'rgba(255,220,150,0.9)'; c.beginPath(); c.ellipse(x, y - 4, 3, 6, 0, 0, 7); c.fill(); } },
    B: (c) => { grad(c, 'rgb(60,38,26)', 'rgb(34,22,16)'); c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 2; for (let x = 0; x < W; x += 60) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
      c.strokeStyle = 'rgba(255,245,230,0.10)'; c.lineWidth = 2; for (let y = 60; y < H; y += 120) for (let x = 0; x < W; x += 40) { c.beginPath(); c.arc(x + 20, y, 16, 0, Math.PI); c.stroke(); }
      const cols = ['#ffd27a', '#ff9e9e', '#9ee6ff', '#b8ff9e']; for (let i = 0; i < 16; i++) { const x = 15 + i * 30, y = 70 + Math.sin(i * 0.9) * 14; c.fillStyle = cols[i % 4]; c.globalAlpha = 0.55; c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); } c.globalAlpha = 1; },
  },
};
// ---------- нижняя смертельная полоса темы (спека §4) ----------
function band(c, theme, t) {
  const y0 = H - BAND_H, wave = x => Math.sin(x * 0.045 + t * 3) * 3;
  const edge = () => { c.beginPath(); c.moveTo(0, H); c.lineTo(0, y0 + wave(0)); for (let x = 0; x <= W; x += 8) c.lineTo(x, y0 + wave(x)); c.lineTo(W, H); c.closePath(); };
  const g = c.createLinearGradient(0, y0 - 14, 0, H);
  if (theme === 'kitchen') { g.addColorStop(0, 'rgba(12,9,8,0.55)'); g.addColorStop(1, 'rgba(8,6,5,0.97)'); edge(); c.fillStyle = g; c.fill();
    c.fillStyle = 'rgba(40,34,32,0.55)'; for (let x = 10; x < W; x += 34) { c.beginPath(); c.arc(x, y0 + 2 + wave(x), 12 + (x % 3) * 3, 0, 7); c.fill(); } }
  else if (theme === 'fridge') { g.addColorStop(0, 'rgba(210,235,255,0.55)'); g.addColorStop(1, 'rgba(160,200,235,0.95)'); edge(); c.fillStyle = g; c.fill();
    c.fillStyle = 'rgba(235,248,255,0.85)'; for (let x = 6; x < W; x += 18) { c.beginPath(); c.moveTo(x - 6, y0 + wave(x) + 2); c.lineTo(x, y0 - 10 + wave(x)); c.lineTo(x + 6, y0 + wave(x) + 2); c.fill(); } }
  else if (theme === 'oven') { g.addColorStop(0, 'rgba(90,36,20,0.6)'); g.addColorStop(1, 'rgba(40,14,8,0.97)'); edge(); c.fillStyle = g; c.fill();
    for (let x = 12; x < W; x += 26) { c.fillStyle = `rgba(200,${90 + (x % 50)},50,0.55)`; c.beginPath(); c.arc(x, y0 + 12 + (x % 11), 2.5, 0, 7); c.fill(); } }
  else if (theme === 'sink') { g.addColorStop(0, 'rgba(60,130,190,0.7)'); g.addColorStop(1, 'rgba(24,64,110,0.97)'); edge(); c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(210,240,255,0.8)'; c.lineWidth = 2; c.beginPath(); for (let x = 0; x <= W; x += 8) { const y = y0 + wave(x); x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
  else { g.addColorStop(0, 'rgba(6,5,5,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0.98)'); edge(); c.fillStyle = g; c.fill(); // щель под скатертью: подол фестонами
    c.fillStyle = 'rgba(30,58,42,0.95)'; c.beginPath(); c.moveTo(0, y0 - 6); for (let x = 0; x <= W; x += 24) c.arc(x + 12, y0 - 6, 12, Math.PI, 0, true); c.lineTo(W, y0 - 14); c.lineTo(0, y0 - 14); c.closePath(); c.fill(); }
}
// ---------- уникальности (спека §6), нарисованы на месте одной из платформ кадра ----------
const UNIQUE = {
  kitchen(c, x, y) { c.fillStyle = '#c8955a'; rr(c, x - 90, y - 4, 180, 16, 5); c.fill(); c.fillStyle = '#a5723f'; rr(c, x - 90, y + 8, 180, 5, 3); c.fill(); // доска
    const kx = x + 65, ky = y - 70; c.fillStyle = '#5a3b22'; c.fillRect(kx - 7, ky - 40, 14, 40); c.fillStyle = '#d8dde3'; c.beginPath(); c.moveTo(kx - 8, ky); c.lineTo(kx + 8, ky); c.lineTo(kx + 6, ky + 50); c.lineTo(kx, ky + 60); c.lineTo(kx - 6, ky + 50); c.closePath(); c.fill(); c.strokeStyle = 'rgba(255,90,54,0.55)'; c.lineWidth = 2; c.stroke(); },
  fridge(c, x, y, w) { c.fillStyle = 'rgba(190,225,255,0.55)'; rr(c, x - w / 2, y - 4, w, 12, 4); c.fill(); c.strokeStyle = 'rgba(120,180,230,0.9)'; c.lineWidth = 2; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - w / 2 + 8, y - 1); c.lineTo(x + w / 2 - 20, y - 1); c.stroke(); },
  oven(c, x, y) { c.fillStyle = '#c9ccd2'; rr(c, x - 50, y - 36, 100, 44, 10); c.fill(); c.fillStyle = '#3a3a40'; rr(c, x - 34, y - 34, 26, 8, 3); c.fill(); rr(c, x + 8, y - 34, 26, 8, 3); c.fill(); // тостер с прорезями
    c.fillStyle = '#ffe08a'; c.shadowColor = 'rgba(255,224,138,0.9)'; c.shadowBlur = 10; rr(c, x + 50, y - 22, 10, 16, 3); c.fill(); c.shadowBlur = 0; },
  sink(c, x, y) { c.fillStyle = '#e8eef3'; c.beginPath(); c.moveTo(x - 58, y - 14); c.quadraticCurveTo(x, y + 34, x + 58, y - 14); c.closePath(); c.fill(); c.strokeStyle = '#9fb4c4'; c.lineWidth = 3; c.stroke(); // миска с пеной
    c.fillStyle = 'rgba(255,255,255,0.9)'; for (const [dx, r] of [[-30, 7], [-14, 9], [4, 8], [22, 7], [38, 5]]) { c.beginPath(); c.arc(x + dx, y - 14, r, 0, 7); c.fill(); } },
  feast(c, x, y) { c.save(); c.translate(x, y); c.rotate(-0.08); c.fillStyle = '#b9bec6'; rr(c, -55, -6, 90, 14, 5); c.fill(); c.fillStyle = '#2b2f36'; for (let k = 0; k < 4; k++) rr(c, -45 + k * 20, -2, 12, 5, 2), c.fill(); // лопатка
    c.fillStyle = '#8a5a34'; rr(c, 35, -3, 55, 9, 4); c.fill(); c.restore(); },
};
const TOWER = { kitchen: 6, fridge: 2, oven: 3, sink: 4, feast: 5 };
const NAME = { kitchen: 'Кухня', fridge: 'Холодильник', oven: 'Духовка', sink: 'Раковина', feast: 'Праздничный стол' };
const NOTE = {
  kitchen: { A: 'плитка, как сейчас', B: 'плитка тёплее, утварь на крючках' },
  fridge: { A: 'полки на стенке, иней', B: 'свет лампы сверху, снежинки' },
  oven: { A: 'бурые спирали нагрева', B: 'решётки и жар снизу' },
  sink: { A: 'мелкая плитка', B: 'сталь и капли' },
  feast: { A: 'скатерть в клетку, свечи', B: 'деревянный стол, кружево, гирлянда' },
};
async function scene(theme) {
  const c = createCanvas(W, H), ctx = c.getContext('2d');
  const g = require('./_env')(ctx, { width: W, height: H });
  g.store.set('teft_save', JSON.stringify({ v: 4, earned: 0, spent: 0, up: {}, skins: [], skin: 'none', tower: TOWER[theme], log: {}, cp: 0 }));
  await g.boot(); const d = g.dbg();
  d.state = 'play'; d.setGod(true); bot.climb(g, d, { untilRow: 4, maxFrames: 6000 }); d.setGod(false); d.resetPours(1e9); d.resetFlies();
  for (let i = 0; i < 12; i++) g.step();
  const on = d.ball.onPlatform, P = d.platforms;
  const slot = P.filter(p => p.id !== on && p.y - d.camY > 150 && p.y - d.camY < H - 120 && Math.abs(p.x - d.ball.x) > 100)
    .sort((a, b) => Math.abs(a.y - d.camY - 330) - Math.abs(b.y - d.camY - 330))[0];
  if (slot) P.splice(P.indexOf(slot), 1); // на месте этой платформы рисуется уникальность темы
  return { c, ctx, d, slot };
}
(async () => {
  const S = 0.6, fw = Math.round(W * S), fh = Math.round(H * S), pad = 16, top = 64, lab = 44, themes = Object.keys(NAME);
  const sheet = createCanvas(pad + themes.length * (fw + pad), top + 2 * (lab + fh) + pad), sc = sheet.getContext('2d');
  sc.fillStyle = '#17120f'; sc.fillRect(0, 0, sheet.width, sheet.height);
  sc.fillStyle = '#fff'; sc.font = '700 24px sans-serif'; sc.fillText('Темы v2.2a — фон, нижняя смертельная полоса и уникальность темы. Выбери A или B для каждой темы', pad, 38);
  for (const [i, theme] of themes.entries()) {
    const s = await scene(theme);
    for (const [j, v] of ['A', 'B'].entries()) {
      const { ctx, d } = s; ctx.setTransform(1, 0, 0, 1, 0, 0);
      BG[theme][v](ctx, d); d.drawWorld();
      if (s.slot) UNIQUE[theme](ctx, s.slot.x, s.slot.y - d.camY, s.slot.w);
      band(ctx, theme, 0.7); d.drawHUD();
      const x = pad + i * (fw + pad), y = top + j * (lab + fh) + lab;
      sc.drawImage(s.c, x, y, fw, fh);
      sc.fillStyle = '#ffe08a'; sc.font = '700 18px sans-serif'; sc.fillText(`${NAME[theme]} ${v}`, x, y - 22);
      sc.fillStyle = 'rgba(255,255,255,0.8)'; sc.font = '14px sans-serif'; sc.fillText(NOTE[theme][v], x, y - 5);
    }
  }
  fs.writeFileSync(OUT, sheet.toBuffer('image/png')); console.log(path.relative(process.cwd(), OUT));
})().catch(e => { console.error(e); process.exit(1); });
