// node tools/design_warn.js — лист вариантов предупреждений об опасностях вместо «дебажного» пунктира (плейтест 2026-09-24):
// масло (столб налива), нож (замах), лопасти (зона вращения). Кадр башни 3 рисует сама игра; нож, лопасти и половник
// поверх него рисует этот инструмент в четырёх вариантах: «Сейчас», A «Свет», B «Метки», C «Движение».
// Листы shots/design_*.png не перезаписываются: новый раунд — новое имя файла.
const fs = require('fs'), path = require('path'), { createCanvas } = require('canvas');
const bot = require('./bot');
const OUT = path.join(__dirname, '..', 'shots', 'design_warn_round1.png');
if (fs.existsSync(OUT)) { console.error(OUT + ' уже есть — лист не перезаписываю, дай новому раунду новое имя'); process.exit(1); }
const W = 480, H = 854, RED = '#ff5a36';

async function scene() {
  const c = createCanvas(W, H), ctx = c.getContext('2d');
  const g = require('./_env')(ctx, { width: W, height: H });
  g.store.set('teft_save', JSON.stringify({ v: 4, earned: 120, spent: 0, up: {}, skins: [], skin: 'none', tower: 3, log: {}, cp: 0 }));
  await g.boot(); const d = g.dbg();
  const bl = d.hazards.find(h => h.type === 'blades'), blRow = d.platforms.find(p => p.id === bl.at).row;
  d.state = 'play'; d.setGod(true); bot.climb(g, d, { untilRow: Math.max(1, blRow - 2), maxFrames: 6000 }); d.setGod(false);
  d.resetPours(1e9); d.resetFlies(); for (let i = 0; i < 20; i++) g.step();
  const b = d.ball, base = b.y + b.r, kn = d.hazards.find(h => h.type === 'knife');
  const knife = { x: b.x < W / 2 ? b.x + 120 : b.x - 120, y: base - 115, by: base - 275 };   // как в пропасти над тарелкой Тефы
  const blades = { x: bl.x, y: bl.y, ang: 0.4 };
  const cand = d.platforms.filter(p => p.y - d.camY > 320 && p.y - d.camY < 800 && Math.abs(p.x - b.x) > 110 && Math.abs(p.x - knife.x) > 70);
  const px = cand.length ? cand[0].x : (b.x < W / 2 ? 400 : 80);
  for (const h of d.hazards) if (h === bl || h === kn) h.gone = true; // их рисует лист
  return { c, ctx, d, knife, blades, px };
}
function ladle(ctx, d, x, tilt) { // половник как в render.js drawPours
  ctx.save(); ctx.translate(x, d.LADLE_Y); ctx.scale(x > W / 2 ? -1 : 1, 1); ctx.rotate(-tilt);
  ctx.strokeStyle = '#8d8d95'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(16, -6); ctx.lineTo(56, -16); ctx.stroke();
  ctx.fillStyle = '#b8bcc4'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 14, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.ellipse(0, 0, 20, 6, 0, 0, 7); ctx.fill();
  ctx.restore();
}
function knifeShape(ctx, x, ky, fill, edge) { // нож как в render.js drawHazard: рукоять и лезвие
  ctx.fillStyle = '#5a3b22'; ctx.fillRect(x - 7, ky - 40, 14, 40);
  ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(x - 8, ky); ctx.lineTo(x + 8, ky); ctx.lineTo(x + 6, ky + 70); ctx.lineTo(x, ky + 84); ctx.lineTo(x - 6, ky + 70); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = edge; ctx.lineWidth = 2; ctx.stroke();
}
function bladesShape(ctx, d, x, y, ang) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.fillStyle = '#c8ccd2'; ctx.strokeStyle = RED; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(d.BLADES_R + 8, -10); ctx.lineTo(d.BLADES_R + 8, 10); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fill();
  ctx.fillStyle = '#4a4a4a'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill();
  ctx.restore();
}
function landing(d, px) { // первая платформа под половником, куда упадут капли
  return d.platforms.filter(p => Math.abs(p.x - px) <= p.w / 2 && p.y - d.camY > d.LADLE_Y + 40 && p.y - d.camY < H).sort((a, b) => a.y - b.y).pop() || null;
}

// ---------- варианты ----------
const OIL = {
  now(ctx, d, px) {
    ctx.strokeStyle = 'rgba(255,70,50,0.6)'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.moveTo(px, d.LADLE_Y + 14); ctx.lineTo(px, H); ctx.stroke(); ctx.setLineDash([]);
  },
  A(ctx, d, px) { // «Свет»: мягкий столб света от черпака, гаснет книзу; светлая сердцевина
    const y0 = d.LADLE_Y + 10, g = ctx.createLinearGradient(0, y0, 0, H);
    g.addColorStop(0, 'rgba(255,90,54,0.42)'); g.addColorStop(0.55, 'rgba(255,90,54,0.14)'); g.addColorStop(1, 'rgba(255,90,54,0)');
    ctx.fillStyle = g; ctx.fillRect(px - 16, y0, 32, H - y0);
    const g2 = ctx.createLinearGradient(0, y0, 0, H); g2.addColorStop(0, 'rgba(255,215,170,0.55)'); g2.addColorStop(0.5, 'rgba(255,215,170,0)');
    ctx.fillStyle = g2; ctx.fillRect(px - 3, y0, 6, H - y0);
  },
  B(ctx, d, px) { // «Метки»: пульсирующая мишень там, куда упадут капли, и пара капель-предвестниц из черпака
    const p = landing(d, px);
    if (p) { const y = p.y - d.camY;
      ctx.fillStyle = 'rgba(255,90,54,0.28)'; ctx.beginPath(); ctx.ellipse(px, y, 24, 7, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(px, y, 24, 7, 0, 0, 7); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,90,54,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(px, y, 36, 11, 0, 0, 7); ctx.stroke(); }
    ctx.fillStyle = '#ff9a2a'; for (const [dy, r] of [[26, 3.5], [46, 2.5]]) { ctx.beginPath(); ctx.arc(px, d.LADLE_Y + dy, r, 0, 7); ctx.fill(); }
  },
  C(ctx, d, px) { // «Движение»: капель из черпака и тёплое пятно на месте падения, без столба
    ctx.fillStyle = '#ff9a2a'; for (const [dy, r] of [[24, 3.5], [44, 3], [70, 2.5], [100, 2]]) { ctx.beginPath(); ctx.arc(px, d.LADLE_Y + dy, r, 0, 7); ctx.fill(); }
    const p = landing(d, px);
    if (p) { const y = p.y - d.camY, g = ctx.createRadialGradient(px, y, 2, px, y, 40);
      g.addColorStop(0, 'rgba(255,120,40,0.55)'); g.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(px, y, 40, 14, 0, 0, 7); ctx.fill(); }
  },
};
const KNIFE = {
  now(ctx, d, k) { const ky = k.by - 14 - d.camY; knifeShape(ctx, k.x, ky, '#ffffff', RED);
    ctx.strokeStyle = 'rgba(255,90,54,0.7)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(k.x, ky + 90); ctx.lineTo(k.x, k.y - d.camY - 10); ctx.stroke(); ctx.setLineDash([]); },
  A(ctx, d, k) { // «Свет»: на замахе лезвие вспыхивает красным и дрожит
    const ky = k.by - 14 - d.camY; ctx.save(); ctx.translate(k.x, ky + 40); ctx.rotate(0.07); ctx.translate(-k.x, -(ky + 40));
    ctx.shadowColor = 'rgba(255,60,40,0.95)'; ctx.shadowBlur = 16; knifeShape(ctx, k.x, ky, '#ffffff', RED); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(k.x - 2, ky + 6, 3, 52); ctx.restore(); },
  B(ctx, d, k) { // «Метки»: полупрозрачный «призрак» ножа там, куда он ударит
    const ky = k.by - 14 - d.camY, kEnd = k.y - 80 - d.camY;
    ctx.save(); ctx.globalAlpha = 0.3; knifeShape(ctx, k.x, kEnd, 'rgba(255,120,100,1)', RED); ctx.restore();
    knifeShape(ctx, k.x, ky, '#ffffff', RED); },
  C(ctx, d, k) { // «Движение»: мягкий красный след под лезвием до точки удара
    const ky = k.by - 14 - d.camY, y0 = ky + 70, y1 = k.y - 80 + 84 - d.camY, g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, 'rgba(255,90,54,0.5)'); g.addColorStop(1, 'rgba(255,90,54,0)'); ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(k.x - 7, y0); ctx.lineTo(k.x + 7, y0); ctx.lineTo(k.x + 3, y1); ctx.lineTo(k.x - 3, y1); ctx.closePath(); ctx.fill();
    knifeShape(ctx, k.x, ky, '#ffffff', RED); },
};
const BLADES = {
  now(ctx, d, b) { const y = b.y - d.camY; ctx.strokeStyle = 'rgba(255,90,54,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(b.x, y, d.BLADES_R + 12, 0, 7); ctx.stroke(); ctx.setLineDash([]); bladesShape(ctx, d, b.x, y, b.ang); },
  A(ctx, d, b) { // «Свет»: красный ореол вокруг лопастей
    const y = b.y - d.camY, g = ctx.createRadialGradient(b.x, y, d.BLADES_R * 0.4, b.x, y, d.BLADES_R + 24);
    g.addColorStop(0, 'rgba(255,90,54,0.35)'); g.addColorStop(1, 'rgba(255,90,54,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, y, d.BLADES_R + 24, 0, 7); ctx.fill();
    bladesShape(ctx, d, b.x, y, b.ang); },
  B(ctx, d, b) { // «Метки»: полупрозрачный диск вращения с тонким сплошным ободом
    const y = b.y - d.camY; ctx.fillStyle = 'rgba(205,210,218,0.16)'; ctx.beginPath(); ctx.arc(b.x, y, d.BLADES_R + 9, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,90,54,0.6)'; ctx.lineWidth = 2; ctx.stroke(); bladesShape(ctx, d, b.x, y, b.ang); },
  C(ctx, d, b) { // «Движение»: светлые дуги за кончиками лопастей — видно, что крутятся
    const y = b.y - d.camY; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const a = b.ang + i * Math.PI * 2 / 3 + Math.PI * 2 / 3; ctx.beginPath(); ctx.arc(b.x, y, d.BLADES_R + 4, a - 0.9, a - 0.15); ctx.stroke(); }
    bladesShape(ctx, d, b.x, y, b.ang); },
};
const VARIANTS = [['now', 'Сейчас: пунктир'], ['A', 'A «Свет»'], ['B', 'B «Метки»'], ['C', 'C «Движение»']];
const NOTES = {
  now: ['масло: пунктир столба', 'нож: пунктир удара', 'лопасти: пунктир зоны'],
  A: ['масло: столб мягкого света', 'нож: лезвие вспыхивает и дрожит', 'лопасти: красный ореол'],
  B: ['масло: мишень, куда упадёт, и капли', 'нож: призрак ножа в точке удара', 'лопасти: диск вращения'],
  C: ['масло: капель и тёплое пятно', 'нож: красный след до точки удара', 'лопасти: дуги движения'],
};

(async () => {
  const s = await scene(), { c, ctx, d } = s;
  const pad = 20, top = 70, foot = 90, sheet = createCanvas(VARIANTS.length * (W + pad) + pad, top + H + foot), sc = sheet.getContext('2d');
  sc.fillStyle = '#1b1411'; sc.fillRect(0, 0, sheet.width, sheet.height);
  sc.fillStyle = '#fff'; sc.font = '700 26px sans-serif'; sc.fillText('Предупреждения об опасности вместо пунктира — раунд 1 (башня 3, момент замаха и налива)', pad, 40);
  VARIANTS.forEach(([key, title], i) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); d.drawBg(); d.drawWorld(); d.drawHUD();
    ladle(ctx, d, s.px, 0.5 * 0.35); OIL[key](ctx, d, s.px); KNIFE[key](ctx, d, s.knife); BLADES[key](ctx, d, s.blades);
    const x = pad + i * (W + pad);
    sc.drawImage(c, x, top);
    sc.fillStyle = '#ffe08a'; sc.font = '700 22px sans-serif'; sc.fillText(title, x, top - 10);
    sc.fillStyle = 'rgba(255,255,255,0.85)'; sc.font = '16px sans-serif'; NOTES[key].forEach((t, j) => sc.fillText(t, x, top + H + 26 + j * 22));
  });
  fs.writeFileSync(OUT, sheet.toBuffer('image/png')); console.log(path.relative(process.cwd(), OUT));
})().catch(e => { console.error(e); process.exit(1); });
