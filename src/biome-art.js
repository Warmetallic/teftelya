'use strict';
// World-space props. Coordinates below are local to the anchor, with +x into the room for vents.
function biomeEllipse(x, y, rx, ry, color, angle = 0) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, angle, 0, 2 * Math.PI); ctx.fill();
}
function biomeShape(color, points) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(...points[0]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i]);
  ctx.closePath(); ctx.fill();
}
function drawIcicle(h) {
  ctx.fillStyle = '#516e80'; rrect(-23, -43, 46, 8, 3); ctx.fill();
  biomeEllipse(0, -39, 21, 6, '#c2edff');
  if (h.phase === 'cool') {
    biomeShape('#c9f7ff', [[-6, -36], [4, -37], [-2, -30]]);
    if (h.time > 2.85) {
      const t = 3.2 - h.time;
      for (let i = -3; i <= 3; i++) {
        const x = i * (3 + 45 * t), y = h.limit - h.y - Math.sin(t * 8) * (28 - Math.abs(i) * 4);
        biomeShape('#c9f7ff', [[x, y], [x + 4, y + 2], [x - 2, y + 7]]);
      }
    }
    return;
  }
  if (h.phase === 'warn') {
    ctx.fillStyle = 'rgba(172,234,255,0.22)'; ctx.fillRect(-12, 1, 24, h.limit - h.y);
    for (let i = 0; i < 4; i++) biomeEllipse(i * 5 - 9, (i * 36 + tGame * 95) % (h.limit - h.y), 2, 4, '#c9f8ff');
    ctx.translate(Math.sin(tGame * 55) * 3.5, 0);
  }
  ctx.translate(0, h.drop || 0);
  biomeShape('#295c7f', [[-12,-36],[6,-38],[14,-28],[3,7],[-3,14],[-11,-20]]);
  biomeShape('#80d5ef', [[-10,-34],[-1,-31],[-3,9],[-8,-15]]);
  biomeShape('#d5f9ff', [[-1,-33],[7,-36],[7,-18],[-3,10]]);
  biomeShape('#4ba7d3', [[8,-32],[12,-27],[0,4],[6,-17]]);
}
function drawSteam(h) {
  ctx.scale(h.dir, 1);
  const hot = h.phase === 'warn' || h.phase === 'active';
  if (h.phase === 'warn') {
    ctx.strokeStyle = 'rgba(255,226,159,.6)'; ctx.lineWidth = 2; ctx.setLineDash([6, 10]);
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(W, 0); ctx.stroke(); ctx.setLineDash([]);
  }
  const reach = h.phase === 'active' ? Math.min(W, h.time * 1300) :
    h.phase === 'warn' ? 15 + 27 * (1 - h.time / TRAP_WARN.steam) : 0;
  if (reach > 0) {
    const vapor = ctx.createLinearGradient(7, 0, reach + 15, 0);
    vapor.addColorStop(0, 'rgba(255,250,221,.95)'); vapor.addColorStop(.6, 'rgba(245,239,216,.77)'); vapor.addColorStop(1, 'rgba(216,224,224,.14)');
    for (let x = 12; x < reach; x += 13) {
      const flutter = Math.sin(x * .05 - tGame * 22);
      biomeEllipse(x, flutter * 5, 16, 6 + x / W * 8 + 1.8 * flutter, vapor);
    }
  }
  ctx.fillStyle = '#3a3432'; rrect(-16, -24, 19, 48, 4); ctx.fill();
  ctx.fillStyle = '#936449'; rrect(-11, -20, 12, 40, 4); ctx.fill();
  for (const y of [-14, 14]) biomeEllipse(-5, y, 2.5, 2.5, '#ddbc8c');
  ctx.fillStyle = '#c49365'; rrect(-4, -10, 18, 20, 3); ctx.fill();
  biomeEllipse(13, 0, 6, 14, '#5c443c'); biomeEllipse(14, 0, 3.5, 10, hot ? '#fff0ac' : '#2e292c');
}
function drawRat(h) {
  ctx.scale(h.dir, 1);
  const run = h.phase === 'active' ? Math.sin(tGame * 20) : 0;
  ctx.shadowBlur = 0; // светятся только глаза, силуэт и усы остаются резкими
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-13, 5); ctx.bezierCurveTo(-30, -3, -32, 17, -43, 6 + run * 2);
  ctx.strokeStyle = '#302a32'; ctx.lineWidth = 4.2; ctx.stroke();
  ctx.strokeStyle = '#d6a599'; ctx.lineWidth = 1.9; ctx.stroke();
  biomeEllipse(-8 + run * 4, 12, 6, 2.6, '#bd9587');
  biomeEllipse(13 - run * 4, 11, 5, 2.4, '#bd9587');
  const fur = ctx.createLinearGradient(0, -13, 3, 11);
  fur.addColorStop(0, '#b1b6ad'); fur.addColorStop(.3, '#737b7a');
  fur.addColorStop(.65, '#484b51'); fur.addColorStop(1, '#302f36');
  ctx.beginPath(); ctx.moveTo(-22, 4);
  ctx.bezierCurveTo(-24, -8, -12, -15, -2, -12);
  ctx.quadraticCurveTo(9, -13, 16, -7); ctx.lineTo(30, 1);
  ctx.quadraticCurveTo(30, 5, 19, 7); ctx.quadraticCurveTo(0, 13, -13, 11);
  ctx.quadraticCurveTo(-20, 10, -22, 4); ctx.closePath();
  ctx.fillStyle = fur; ctx.fill(); ctx.strokeStyle = '#29292e'; ctx.lineWidth = 1.9; ctx.stroke();
  ctx.strokeStyle = '#d3d8c9'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-20, -2); ctx.quadraticCurveTo(-17, -12, -6, -12); ctx.stroke();
  biomeEllipse(12, -9, 5.6, 6.7, '#303139', -.3);
  biomeEllipse(12, -9.5, 3.8, 4.6, '#d1a69c', -.3);
  ctx.strokeStyle = '#ded8be'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(24, 3); ctx.lineTo(34, 1); ctx.moveTo(24, 4); ctx.lineTo(33, 7); ctx.stroke();
  biomeEllipse(29, 2, 2.6, 2, '#e4baac');
  ctx.shadowColor = '#ffb43f'; ctx.shadowBlur = h.phase === 'warn' ? 13 : 6;
  biomeEllipse(20, -3, 2.9, 2.6, '#ffcd61'); ctx.shadowBlur = 0;
  biomeEllipse(20.8, -3, 1, 1.5, '#432a1f');
}
function drawPepper(h) {
  const active = h.phase === 'active', warn = h.phase === 'warn';
  if (warn || active) {
    const k = active ? clamp(h.time / .28, 0, 1) : 1 - h.time / TRAP_WARN.pepper;
    ctx.fillStyle = active ? 'rgba(255,149,44,.42)' : 'rgba(251,84,46,.1)';
    ctx.strokeStyle = active ? '#ffe589' : '#ff9971'; ctx.lineWidth = active ? 4 : 2;
    ctx.setLineDash(active ? [] : [4, 8]); ctx.beginPath(); ctx.arc(0, 0, PEPPER_RADIUS, 0, 7); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
    if (active) {
      for (let i = 0; i < 12; i++) {
        ctx.save(); ctx.rotate(i * Math.PI / 6);
        biomeShape(i % 2 ? '#ffb047' : '#ec5732', [[-5, -22], [0,-(43 + 35 * k)], [6,-22]]);
        ctx.restore();
      }
      biomeEllipse(0, 0, 15 * (1-k) + 1, 15 * (1-k) + 1, '#fff4b3'); return;
    }
    ctx.scale(1 + .1 * Math.sin(k * 28), 1 + .1 * Math.sin(k * 28));
  }
  ctx.rotate(-.14);
  const skin = ctx.createLinearGradient(-3, -12, 9, 15);
  skin.addColorStop(0, '#ff6b4d'); skin.addColorStop(.42, '#e93635'); skin.addColorStop(1, '#971731');
  ctx.fillStyle = skin; ctx.strokeStyle = '#361b30'; ctx.lineWidth = 3.3;
  ctx.beginPath(); ctx.moveTo(6,-11); ctx.bezierCurveTo(25,-14,23,9,0,14);
  ctx.quadraticCurveTo(-14,18,-22,10); ctx.quadraticCurveTo(-5,10,1,0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineCap = 'round'; ctx.strokeStyle = '#ffc2a2'; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(10,-5); ctx.quadraticCurveTo(11,1,2,6); ctx.stroke();
  biomeShape('#567947', [[3,-10],[7,-16],[13,-15],[17,-10],[11,-11],[9,-6]]);
  ctx.beginPath(); ctx.moveTo(10,-14); ctx.quadraticCurveTo(9,-20,17,-22);
  ctx.strokeStyle = '#304329'; ctx.lineWidth = 5; ctx.stroke();
  ctx.strokeStyle = '#c0d583'; ctx.lineWidth = 2.5; ctx.stroke();
}
const TRAP_DRAW = { icicle: drawIcicle, steam: drawSteam, rat: drawRat, pepper: drawPepper };
function drawBiomeSurface(p) {
  if (p.gone) return;
  const y = p.y - camY;
  if (y < -32 || y > H + 32) return;
  if (p.type === 'pan' && tower.tp.effects.dark) {
    ctx.strokeStyle = 'rgba(255,157,95,.65)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(p.x, y + 6, p.w / 2 - 2, 13, 0, 0, 2 * Math.PI); ctx.stroke();
  }
  if (p.ice) {
    ctx.fillStyle = 'rgba(188,241,255,.86)'; rrect(p.x-p.w/2+3,y-3,p.w-6,4,2); ctx.fill();
    for (const k of [-.32, .18, .36]) {
      const x = p.x + k * p.w;
      biomeShape('#a3dcec', [[x-3,y+1],[x+3,y+1],[x-1,y+7]]);
    }
  }
  const heat = panHeat(p, tower.tp);
  if (heat > .02) {
    ctx.fillStyle = 'rgba(255,112,39,' + (.2 + .7 * heat) + ')'; rrect(p.x - p.w / 2,y - 4,p.w,6,3); ctx.fill();
    ctx.strokeStyle = 'rgba(255,208,137,' + (.15 + .8 * heat) + ')'; ctx.lineWidth = 2;
    for (const dx of [-14, 0, 14]) {
      const x = p.x + dx, swing = 4 * Math.sin(tGame * 7 + dx);
      ctx.beginPath(); ctx.moveTo(x,y-7); ctx.bezierCurveTo(x+swing,y-14,x-swing,y-17,x+2,y-9-24*heat); ctx.stroke();
    }
  }
}
function drawCellarLight() {
  const x = ball.x, y = ball.y - camY;
  const shade = ctx.createRadialGradient(x,y,46,x,y,330);
  shade.addColorStop(0,'rgba(10,14,17,0)'); shade.addColorStop(.44,'rgba(10,14,17,.09)');
  shade.addColorStop(.8,'rgba(8,12,15,.54)'); shade.addColorStop(1,'rgba(8,12,15,.77)');
  ctx.fillStyle = shade; ctx.fillRect(-32,-32,W+64,H+64);
}
