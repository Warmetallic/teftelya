// node tools/design_mousetrap.js [frame-directory] — лист и, при необходимости, кадры прыжка в 30 fps.
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const { loadArt } = require('./_art');
const variants = [
  ['classic', 'А', 'Классика'],
  ['enamel', 'Б', 'Красная прищепка'],
  ['cloche', 'В', 'Стеклянный колпак'],
];
const width = 1000, column = 320, margin = 26, inset = 9;

async function main() {
  const screen = createCanvas(480, 854), ctx = screen.getContext('2d');
  const g = require('./_env')(ctx, { worldSeed: 42 });
  document.createElement = () => createCanvas(1, 1);
  global.setInterval = () => 0;
  const d = g.dbg();
  await loadArt(d); await g.boot(); await d.jumpTower(7);
  d.run.bannerT = 0;
  const trap = d.hazards.find(h => h.type === 'mousetrap');
  const sheet = createCanvas(width, 556), board = sheet.getContext('2d');
  const frames = process.argv[2];
  function label(str, x, y, font, color) {
    board.font = font; board.fillStyle = color; board.fillText(str, x, y);
  }
  function pose(x, y, scale, state) {
    ctx.clearRect(0, 0, screen.width, screen.height);
    ctx.save(); ctx.translate(220, 205); ctx.scale(scale, scale); d.drawMousetrap(state); ctx.restore();
    board.drawImage(screen, 72, 4, 296, 215, x - 148, y - 201, 296, 215);
  }
  function drawSheet(live) {
    board.fillStyle = '#f5efe3'; board.fillRect(0, 0, width, sheet.height);
    label('Мышеловка', margin, 54, 'bold 44px Georgia, serif', '#332c28');
    label('Тефтеля   /   Башня 7', 762, 47, '17px sans-serif', '#625a4f');
    board.fillStyle = '#b4aa99'; board.fillRect(margin, 73, width-2*margin, 1);
    for (const [i, [key, letter, name]] of variants.entries()) {
      const x = margin + i*column, mid = x + 148;
      label(letter, x, 115, 'bold 25px sans-serif', '#98603b');
      label(name, x + 34, 115, 'bold 23px sans-serif', '#39302a');
      d.setMousetrapDesign(key);
      pose(mid, 281, 2.5, live ? trap : { phase: 'idle' });
      board.fillStyle = '#d1c6b5'; board.fillRect(x, 308, 296, 1);
      label('После щелчка', x, 333, '15px sans-serif', '#695c50');
      pose(mid, 390, 1.25, { phase: 'spent' });
      d.drawBg(); d.drawWorld();
      const clipX = Math.max(0, Math.min(screen.width-296, Math.round(trap.x-148)));
      const clipY = Math.round(trap.y - d.camY) - 82;
      board.drawImage(screen, clipX, clipY, 296, 112, x, 409, 296, 112);
      label('На ледяной полке', x + inset, 544, '15px sans-serif', '#695c50');
    }
  }
  drawSheet(false);
  const output = path.join(__dirname, '..', 'shots', 'design_mousetrap_round2.png');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, sheet.toBuffer('image/png'));
  if (!frames) return;
  fs.mkdirSync(frames, { recursive: true });
  let escaped = false;
  for (let i = 0; i < 84; i++) {
    if (i === 23) d.jumpTo(trap.x, trap.y);
    for (let step = 0; step < 2; step++) {
      if (!escaped && trap.phase === 'warn' && trap.time < 0.29) escaped = d.jumpTo(235, trap.y-145);
      d.update(1/60);
    }
    drawSheet(true);
    fs.writeFileSync(path.join(frames, String(i).padStart(3, '0')+'.png'), sheet.toBuffer('image/png', { compressionLevel: 1 }));
  }
  if (!escaped || trap.phase !== 'spent' || d.ball.mass !== 4) throw Error('Прыжок с мышеловки сорвался');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
