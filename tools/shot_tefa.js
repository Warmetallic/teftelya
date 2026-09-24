// node tools/shot_tefa.js — shots/tefa_port.png: drawTefa из игры в состояниях жизней и эффектах (радиус как в игре ×1.6)
// рядом с игровым размером; сравнивать глазами с shots/design_tefa_round5_hp.png (стиль A) и design_tefa_round4.png (A)
const fs = require('fs'), path = require('path'), { createCanvas } = require('canvas');
const OUT = path.join(__dirname, '..', 'shots'); fs.mkdirSync(OUT, { recursive: true });
const Wd = 1100, Hd = 760, real = createCanvas(Wd, Hd), ctx = real.getContext('2d');
const g = require('./_env')(ctx, { width: Wd, height: Hd }); const d = g.dbg();
ctx.fillStyle = '#2a201b'; ctx.fillRect(0, 0, Wd, Hd);
const plate = (x, y, w) => { ctx.fillStyle = '#e9e4da'; ctx.beginPath(); ctx.ellipse(x, y + 8, w / 2, 16, 0, 0, 7); ctx.fill(); };
const label = (s, x, y) => { ctx.fillStyle = '#fff'; ctx.font = '600 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(s, x, y); };
const rad = m => d.radiusFor(m), K = 1.6;
const cells = [
  ['полная', 4, {}], ['минус кусок', 3, {}], ['два укуса', 2, {}], ['последний кусок', 1, { tint: 1 }],
  ['шкала полна', 4, { charged: true }], ['берсерк', 4, { berserk: true }], ['лечение 0.5', 3, { heal: 0.5 }], ['еда + моргание', 2, { mouth: 0.8, blink: true }],
];
cells.forEach(([name, m, pose], i) => { const x = 140 + (i % 4) * 270, y = 150 + Math.floor(i / 4) * 280, r = rad(m) * K; plate(x, y + r, r * 3);
  d.drawTefa(ctx, x, y, r, Object.assign({ hp: { cur: m, max: 4 } }, pose)); label(name, x, y + r + 44); });
[4, 3, 2, 1].forEach((m, i) => { const x = 140 + i * 110, y = 680, r = rad(m); plate(x, y + r, r * 3); d.drawTefa(ctx, x, y, r, { hp: { cur: m, max: 4 }, tint: m === 1 ? 1 : 0 }); });
label('в игровом размере 1:1', 700, 690);
fs.writeFileSync(path.join(OUT, 'tefa_port.png'), real.toBuffer('image/png')); console.log('shots/tefa_port.png');
