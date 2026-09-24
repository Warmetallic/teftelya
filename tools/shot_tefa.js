// node tools/shot_tefa.js — shots/tefa_port.png: порт drawTefa в размерах 26/54/86 и позах рядом; сравнивать глазами с shots/design_tefa_round4.png (вариант A)
// Размер листа против брифа увеличен (900×420 → 1000×560): при 86 px тело шире брифовой ячейки, а подписи нижнего ряда уезжали за край.
const fs = require('fs'), path = require('path'), { createCanvas } = require('canvas');
const OUT = path.join(__dirname, '..', 'shots'); fs.mkdirSync(OUT, { recursive: true });
const real = createCanvas(1000, 560), ctx = real.getContext('2d');
const g = require('./_env')(ctx, { width: 1000, height: 560 }); const d = g.dbg();
ctx.fillStyle = '#2a201b'; ctx.fillRect(0, 0, 1000, 560);
const plate = (x, y, w) => { ctx.fillStyle = '#e9e4da'; ctx.beginPath(); ctx.ellipse(x, y + 8, w / 2, 16, 0, 0, 7); ctx.fill(); };
const poses = [['r=86', 86, {}], ['r=54', 54, {}], ['r=26', 26, {}], ['сквош', 54, { sx: 1.25, sy: 0.75 }], ['наклон+взгляд', 54, { tilt: 0.3, face: 1 }],
  ['рот+моргание', 54, { mouth: 1, blink: true }], ['ожог', 54, { hot: 0.8 }], ['берсерк', 54, { berserk: true }], ['без флажка', 54, { flag: false }]];
poses.forEach(([name, r, pose], i) => { const x = 120 + (i % 5) * 190, y = 160 + Math.floor(i / 5) * 230; plate(x, y + r, 150); d.drawTefa(ctx, x, y, r, pose);
  ctx.fillStyle = '#fff'; ctx.font = '600 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(name, x, y + r + 40); });
fs.writeFileSync(path.join(OUT, 'tefa_port.png'), real.toBuffer('image/png')); console.log('shots/tefa_port.png');
