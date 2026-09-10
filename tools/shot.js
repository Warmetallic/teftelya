// node tools/shot.js — скриншоты: full.png (весь экран) и ball_big.png (тефтеля массы 9 крупно).
// Нужен node-canvas: npm i canvas
const fs = require('fs'), { createCanvas } = require('canvas');
const real = createCanvas(480, 854), ctx = real.getContext('2d');
Object.defineProperty(real, 'width', { get: () => 480, set: () => {} });
Object.defineProperty(real, 'height', { get: () => 854, set: () => {} });
const g = require('./_env')(ctx);
g.tap(240); for (let i = 0; i < 120; i++) { if (i % 20 === 0) g.tap(i % 40 ? 300 : 180); g.step(); }
fs.writeFileSync('full.png', real.toBuffer('image/png'));
window.__dbg.ball.mass = 9; for (let i = 0; i < 60; i++) { if (i % 20 === 0) g.tap(240); g.step(); }
const b = window.__dbg.ball, cy = b.y - window.__dbg.camY, crop = createCanvas(300, 300);
crop.getContext('2d').drawImage(real, b.x - 150, cy - 150, 300, 300, 0, 0, 300, 300);
fs.writeFileSync('ball_big.png', crop.toBuffer('image/png'));
console.log('full.png, ball_big.png');
