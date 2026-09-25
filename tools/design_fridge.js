// node tools/design_fridge.js — лист фона «Холодильник», раунд после плейтеста v2.2a: владелец — «вообще не как холодильник,
// должны быть полки с едой, лампы». Кадр настоящей башни 2: платформы, полка-уникальность, еда, Тефа, полоса и HUD рисует игра,
// фон — варианты этого инструмента. Слева фон, как сейчас.
// Правила читаемости: еда на фоне — холодные силуэты без красного и жёлтого (не спутать с едой за монеты); полки фона во всю
// ширину и тусклые (игровая полка — короткая светлая планка); свет ламп — круглые пятна без вертикальных столбов (столб света —
// предупреждение налива масла).
// Листы shots/design_*.png не перезаписываются: новый раунд — новое имя файла.
const fs = require('fs'), path = require('path'), { createCanvas } = require('canvas');
const bot = require('./bot');
const OUT = path.join(__dirname, '..', 'shots', 'design_fridge_round1.png');
if (fs.existsSync(OUT)) { console.error(OUT + ' уже есть — лист не перезаписываю, дай новому раунду новое имя'); process.exit(1); }
const W = 480, H = 854;
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
const R = k => { let s = ((k % 1000) + 1000) * 7919 + 13; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }; // свой набор еды у каждой полки
const grad = (c, top, bottom) => { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bottom); c.fillStyle = g; c.fillRect(0, 0, W, H); };
const glow = (c, x, y, r, rgb, a) => { const g = c.createRadialGradient(x, y, 4, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); };

// ---------- силуэты еды: низ на y, растут вверх; цвет задаёт вызывающий ----------
const FOOD = {
  jar: (c, x, y, s) => { rr(c, x - 10 * s, y - 26 * s, 20 * s, 26 * s, 4 * s); c.fill(); c.fillRect(x - 11 * s, y - 31 * s, 22 * s, 6 * s); },
  bottle: (c, x, y, s) => { rr(c, x - 7 * s, y - 34 * s, 14 * s, 34 * s, 4 * s); c.fill(); c.fillRect(x - 3 * s, y - 46 * s, 6 * s, 13 * s); },
  carton: (c, x, y, s) => { c.fillRect(x - 11 * s, y - 30 * s, 22 * s, 30 * s); c.beginPath(); c.moveTo(x - 11 * s, y - 30 * s); c.lineTo(x, y - 40 * s); c.lineTo(x + 11 * s, y - 30 * s); c.fill(); },
  eggs: (c, x, y, s) => { c.fillRect(x - 24 * s, y - 8 * s, 48 * s, 8 * s); for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(x - 18 * s + i * 12 * s, y - 10 * s, 5 * s, 7 * s, 0, 0, 7); c.fill(); } },
  box: (c, x, y, s) => { rr(c, x - 20 * s, y - 16 * s, 40 * s, 16 * s, 3 * s); c.fill(); c.fillRect(x - 21 * s, y - 19 * s, 42 * s, 4 * s); },
  pot: (c, x, y, s) => { rr(c, x - 17 * s, y - 20 * s, 34 * s, 20 * s, 5 * s); c.fill(); c.fillRect(x - 19 * s, y - 23 * s, 38 * s, 4 * s); c.fillRect(x - 3 * s, y - 28 * s, 6 * s, 5 * s); },
  cabbage: (c, x, y, s) => { for (const [dx, dy, r] of [[-7, -9, 9], [7, -9, 9], [0, -15, 10]]) { c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, 7); c.fill(); } },
};
const KINDS = Object.keys(FOOD);
// ряд еды на полке k от x0 до x1: промежутки случайные, но у полки всегда один и тот же набор
function foodRow(c, k, y, x0, x1, color, sMin = 0.9, sMax = 1.2) {
  const r = R(k); c.fillStyle = color;
  for (let x = x0 + 14 + r() * 30; x < x1 - 20; x += 44 + r() * 40) { const kind = KINDS[Math.floor(r() * KINDS.length)], s = sMin + r() * (sMax - sMin); FOOD[kind](c, x, y, s); if (kind === 'eggs' || kind === 'box') x += 16; }
}
// все варианты рисуют полки с шагом STEP от сдвига off: в игре off = par(STEP), как у других фонов (параллакс)
const STEP = 300, OFF = 170;
const sections = (off, fn) => { for (let k = -1; off + k * STEP < H + STEP; k++) { const y = off + k * STEP; if (y > -STEP && y < H + 80) fn(y, k); } };

const BG = {
  A: c => { // полки во всю ширину с едой, лампа под каждой полкой светит на отсек ниже
    grad(c, 'rgb(70,94,120)', 'rgb(38,54,74)');
    c.fillStyle = 'rgba(255,255,255,0.035)'; for (let x = 30; x < W; x += 60) c.fillRect(x, 0, 2, H); // рифлёная задняя стенка
    sections(OFF, (y, k) => {
      const lx = k % 2 ? 360 : 120; glow(c, lx, y + 30, 260, '215,238,255', 0.26);
      foodRow(c, k, y, 0, W, 'rgba(165,195,225,0.24)');
      c.fillStyle = 'rgba(200,230,255,0.14)'; c.fillRect(0, y - 4, W, 4); c.fillStyle = 'rgba(225,242,255,0.32)'; c.fillRect(0, y, W, 2); // стекло полки и её кромка
      c.fillStyle = 'rgba(0,0,0,0.16)'; c.fillRect(0, y + 2, W, 12);
      c.fillStyle = 'rgba(235,248,255,0.55)'; c.beginPath(); c.arc(lx, y + 14, 11, 0, Math.PI); c.fill(); // купол лампы под полкой: круглый, не планка
    });
  },
  B: c => { // по бокам балкончики дверцы с бутылками и светодиодные планки, в середине глубина с редкими полками
    grad(c, 'rgb(46,64,88)', 'rgb(22,32,48)');
    sections(OFF, (y, k) => { foodRow(c, k, y, 80, W - 80, 'rgba(150,180,210,0.13)', 0.7, 0.9); c.fillStyle = 'rgba(200,230,255,0.1)'; c.fillRect(66, y, W - 132, 2); });
    for (const side of [0, 1]) {
      const x0 = side ? W - 64 : 0, inner = side ? W - 64 : 64;
      c.fillStyle = 'rgba(210,230,250,0.07)'; c.fillRect(x0, 0, 64, H); // панель дверцы
      for (let k = -1; OFF + k * 240 < H + 60; k++) { const y = OFF - 60 + k * 240, r = R(k * 3 + side);
        glow(c, x0 + 32, y - 40, 70, '220,242,255', 0.16); // свет над балкончиком
        c.fillStyle = 'rgba(170,200,230,0.3)'; for (let i = 0; i < 3; i++) FOOD.bottle(c, x0 + 12 + i * 20, y + 8, 0.9 + r() * 0.35); // бутылки и соусы
        c.fillStyle = 'rgba(190,215,240,0.13)'; rr(c, x0 + 3, y - 4, 58, 30, 6); c.fill(); c.fillStyle = 'rgba(230,245,255,0.18)'; c.fillRect(x0 + 5, y - 4, 54, 2); } // лоток балкончика
    }
  },
  C: c => { // коробка в перспективе: стеклянные полки сверху, боковые стенки, лампы на стенках, иней в углах
    grad(c, 'rgb(52,72,96)', 'rgb(26,38,56)');
    const e = 52; c.fillStyle = 'rgba(210,232,255,0.07)'; c.fillRect(0, 0, e, H); c.fillRect(W - e, 0, e, H); // боковые стенки
    c.fillStyle = 'rgba(0,0,0,0.1)'; c.fillRect(e, 0, 2, H); c.fillRect(W - e - 2, 0, 2, H);
    sections(OFF, (y, k) => {
      glow(c, k % 2 ? W - 120 : 120, y + 40, 240, '215,238,255', 0.22); // лампа спрятана под полкой: видно только пятно света
      c.fillStyle = 'rgba(200,230,255,0.08)'; c.beginPath(); c.moveTo(e, y - 38); c.lineTo(W - e, y - 38); c.lineTo(W, y); c.lineTo(0, y); c.closePath(); c.fill(); // стекло полки сверху
      for (const x of [e, W - e]) glow(c, x, y - 40, 46, '235,248,255', 0.22); // иней в углах
      foodRow(c, k, y - 16, e + 10, W - e - 10, 'rgba(165,195,225,0.24)');
      c.strokeStyle = 'rgba(225,242,255,0.3)'; c.lineWidth = 2; c.beginPath(); c.moveTo(e, y - 38); c.lineTo(0, y); c.moveTo(W - e, y - 38); c.lineTo(W, y); c.stroke(); // рёбра полки на стенках
      c.fillStyle = 'rgba(225,242,255,0.3)'; c.fillRect(0, y, W, 2); c.fillStyle = 'rgba(0,0,0,0.14)'; c.fillRect(0, y + 2, W, 10); // передняя кромка
    });
  },
  D: c => { // светлая камера, как у настоящего холодильника: пластик светлый, еда приглушённых холодных цветов
    grad(c, 'rgb(150,172,190)', 'rgb(108,130,150)');
    c.fillStyle = 'rgba(255,255,255,0.06)'; for (let x = 30; x < W; x += 60) c.fillRect(x, 0, 2, H);
    const COL = ['rgba(236,242,246,0.7)', 'rgba(120,160,140,0.6)', 'rgba(110,140,175,0.6)', 'rgba(200,210,220,0.65)'];
    sections(OFF, (y, k) => {
      glow(c, k % 2 ? 360 : 120, y + 30, 260, '255,255,255', 0.3);
      const r = R(k + 500); for (let x = 24 + r() * 30; x < W - 20; x += 44 + r() * 40) { const kind = KINDS[Math.floor(r() * KINDS.length)]; c.fillStyle = COL[Math.floor(r() * COL.length)]; FOOD[kind](c, x, y, 0.9 + r() * 0.3); if (kind === 'eggs' || kind === 'box') x += 16; }
      c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(0, y - 4, W, 4); c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(0, y, W, 2); c.fillStyle = 'rgba(40,60,80,0.18)'; c.fillRect(0, y + 2, W, 12);
    });
  },
};
const NOTE = {
  now: ['Сейчас', 'синева, пятно света, снежинки'],
  A: ['A · полки и лампы', 'полки с едой, купол лампы'],
  B: ['B · дверца', 'бутылки на дверце по бокам'],
  C: ['C · коробка', 'стеклянные полки в перспективе'],
  D: ['D · светлая камера', 'светлый пластик, как в жизни'],
};
async function scene() {
  const c = createCanvas(W, H), ctx = c.getContext('2d');
  const g = require('./_env')(ctx, { width: W, height: H });
  g.store.set('teft_save', JSON.stringify({ v: 4, earned: 0, spent: 0, up: {}, skins: [], skin: 'none', tower: 2, log: {}, cp: 0 }));
  await g.boot(); const d = g.dbg();
  const u = d.platforms.filter(p => p.type === 'shelf' && p.row >= 3).sort((a, b) => a.row - b.row)[0]; // игровая полка в кадре: её не должно быть легко спутать с фоном
  d.state = 'play'; d.setGod(true); bot.climb(g, d, { untilRow: Math.max(1, u.row - 2), maxFrames: 6000 }); d.setGod(false); d.resetPours(1e9); d.resetFlies();
  for (let i = 0; i < 20; i++) g.step();
  return { c, ctx, d };
}
(async () => {
  const S = 0.62, fw = Math.round(W * S), fh = Math.round(H * S), pad = 18, top = 92, lab = 48, keys = Object.keys(NOTE);
  const sheet = createCanvas(pad + keys.length * (fw + pad), top + lab + fh + pad), sc = sheet.getContext('2d');
  sc.fillStyle = '#17120f'; sc.fillRect(0, 0, sheet.width, sheet.height);
  sc.fillStyle = '#fff'; sc.font = '700 24px sans-serif'; sc.fillText('Фон «Холодильник», башня 2: выбери A, B, C или D (можно «A, но …»)', pad, 36);
  sc.fillStyle = 'rgba(255,255,255,0.75)'; sc.font = '15px sans-serif';
  sc.fillText('Еда фона — холодные силуэты (еда за монеты яркая и тёплая); полки фона во всю ширину и тусклые (игровая полка — короткая голубая планка);', pad, 62);
  sc.fillText('свет ламп — пятна, без вертикальных столбов (столб света предупреждает о наливе масла).', pad, 82);
  const s = await scene();
  for (const [i, key] of keys.entries()) {
    const { ctx, d } = s; ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (key === 'now') d.drawBg(); else BG[key](ctx);
    d.drawWorld(); d.drawHUD();
    const x = pad + i * (fw + pad), y = top + lab;
    sc.drawImage(s.c, x, y, fw, fh);
    sc.fillStyle = '#ffe08a'; sc.font = '700 19px sans-serif'; sc.fillText(NOTE[key][0], x, y - 24);
    sc.fillStyle = 'rgba(255,255,255,0.8)'; sc.font = '14px sans-serif'; sc.fillText(NOTE[key][1], x, y - 6);
  }
  fs.writeFileSync(OUT, sheet.toBuffer('image/png')); console.log(path.relative(process.cwd(), OUT));
})().catch(e => { console.error(e); process.exit(1); });
