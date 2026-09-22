'use strict';
// ---------- рендер мира: фон, предметы, тефтеля, HUD ----------
function drawBg() {
  const b = fieldBounds();
  const h = clamp(-camY / 12000, 0, 1); // кухонная плитка темнеет с высотой
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `rgb(${lerp(58, 20, h)|0},${lerp(44, 22, h)|0},${lerp(36, 40, h)|0})`);
  g.addColorStop(1, `rgb(${lerp(42, 14, h)|0},${lerp(30, 14, h)|0},${lerp(26, 30, h)|0})`);
  ctx.fillStyle = g; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 2;
  const tile = 96, off = ((-camY * 0.5) % tile + tile) % tile;
  for (let y = Math.floor(b.y0 / tile) * tile - tile + off; y < b.y1 + tile; y += tile) { ctx.beginPath(); ctx.moveTo(b.x0, y); ctx.lineTo(b.x1, y); ctx.stroke(); }
  for (let x = Math.floor(b.x0 / tile) * tile; x <= b.x1; x += tile) { ctx.beginPath(); ctx.moveTo(x, b.y0); ctx.lineTo(x, b.y1); ctx.stroke(); }
  if (b.x0 < 0) { // боковые зоны на десктопе/landscape: затемнены, поле обведено
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(b.x0, b.y0, -b.x0, b.y1 - b.y0); ctx.fillRect(W, b.y0, b.x1 - W, b.y1 - b.y0);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, b.y0); ctx.lineTo(0, b.y1); ctx.moveTo(W, b.y0); ctx.lineTo(W, b.y1); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.font = '600 14px system-ui, sans-serif'; ctx.textAlign = 'left';
  const step = 500; // отметки каждые 50 м
  for (let y = Math.floor(camY / step) * step; y < camY + H; y += step) {
    if (y >= 0) continue;
    ctx.fillText((-y / 10) + ' ' + T('m'), 8, y - camY - 4);
    ctx.fillRect(0, y - camY, 40, 1);
  }
}
function drawItem(it) {
  const x = it.x, y = it.y - camY;
  const wob = Math.sin(tGame * 4 + it.seed) * 3;
  ctx.save(); ctx.translate(x, y + wob);
  switch (it.kind) {
    case 'ketchup':
      ctx.fillStyle = '#e3342f'; ctx.beginPath();
      ctx.moveTo(0, -18); ctx.bezierCurveTo(14, -2, 15, 10, 0, 16); ctx.bezierCurveTo(-15, 10, -14, -2, 0, -18); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(-4, 2, 3, 6, 0.4, 0, 7); ctx.fill();
      break;
    case 'pasta':
      ctx.strokeStyle = '#f6c343'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath();
      for (let i = 0; i <= 24; i++) { const t = i / 24; const px = -16 + t * 32, py = Math.sin(t * Math.PI * 4) * 8; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
      break;
    case 'meat':
      ctx.fillStyle = '#b5452b'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 16, -0.3, 0, 7); ctx.fill();
      ctx.fillStyle = '#f3e0c8'; ctx.beginPath(); ctx.ellipse(6, -4, 7, 4, -0.3, 0, 7); ctx.fill();
      ctx.strokeStyle = '#f3e0c8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, 6); ctx.quadraticCurveTo(-4, 2, 4, 9); ctx.stroke();
      break;
    case 'hair':
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath();
      ctx.moveTo(-16, -10); ctx.bezierCurveTo(10, -20, -14, 8, 14, 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-12, 6); ctx.bezierCurveTo(4, -8, 12, 14, 18, -2); ctx.stroke();
      break;
    case 'dirt':
      ctx.fillStyle = '#5a4a3a';
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; ctx.beginPath(); ctx.arc(Math.cos(a) * 7, Math.sin(a) * 7, 8, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#7a6a56'; ctx.beginPath(); ctx.arc(-3, -3, 4, 0, 7); ctx.fill();
      break;
    case 'fly': {
      const w = Math.sin(tGame * 60) * 6;
      ctx.fillStyle = 'rgba(200,220,255,0.6)'; ctx.beginPath(); ctx.ellipse(-6, -6 + w, 8, 4, -0.5, 0, 7); ctx.ellipse(6, -6 - w, 8, 4, 0.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#c33'; ctx.beginPath(); ctx.arc(-4, -2, 2, 0, 7); ctx.arc(4, -2, 2, 0, 7); ctx.fill();
      break; }
  }
  ctx.restore();
}
function chunk(x, y, rx, ry) { // один шарик фарша с корочкой
  const g = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.4, rx * 0.1, x, y, rx * 1.1);
  g.addColorStop(0, '#e89a6c'); g.addColorStop(0.5, '#c0583a'); g.addColorStop(1, '#833218');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(70,20,8,0.35)'; ctx.beginPath(); ctx.ellipse(x + rx * 0.35, y + ry * 0.4, rx * 0.35, ry * 0.25, 0.6, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,230,200,0.4)'; ctx.beginPath(); ctx.ellipse(x - rx * 0.3, y - ry * 0.35, rx * 0.2, ry * 0.12, -0.5, 0, 7); ctx.fill();
}
function drawBall() {
  const cx = ball.x, cy = ball.y - camY;
  const P = ball.pts;
  const disp = ang => { // смещение мягкого тела под углом ang
    const i = ((Math.round(ang / (Math.PI * 2) * N) % N) + N) % N;
    return { x: P[i].ox - Math.cos(i / N * Math.PI * 2) * ball.r, y: P[i].oy - Math.sin(i / N * Math.PI * 2) * ball.r };
  };
  const chunks = [];
  const outerN = Math.min(12, 6 + Math.floor(ball.mass * 0.5));
  for (let i = 0; i < outerN; i++) {
    const a = i / outerN * Math.PI * 2 + 0.3, d = disp(a);
    const rr = ball.r * 0.58, cr = ball.r * (0.46 + (i % 3) * 0.05);
    chunks.push({ x: Math.cos(a) * rr + d.x * 0.9, y: Math.sin(a) * rr + d.y * 0.9, rx: cr, ry: cr * (0.82 + (i % 2) * 0.16), rot: i * 0.8, z: Math.sin(a) });
  }
  const innerN = Math.min(9, 2 + Math.floor(ball.mass * 0.5));
  for (let i = 0; i < innerN; i++) {
    const a = i * 2.399 + 1.7, rr = Math.sqrt(i / innerN) * ball.r * 0.35, d = disp(a);
    chunks.push({ x: Math.cos(a) * rr + d.x * 0.4, y: Math.sin(a) * rr + d.y * 0.4 - ball.r * 0.05, rx: ball.r * 0.48, ry: ball.r * 0.44, rot: i, z: 2 });
  }
  chunks.sort((a, b) => a.z - b.z);
  ctx.save(); ctx.translate(cx, cy);
  if (invuln > 0 && Math.floor(tGame * 12) % 2 === 0) ctx.globalAlpha = 0.45; // мигание неуязвимости
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(4, ball.r * 0.3 + 6, ball.r * 1.0, ball.r * 0.9, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#5a1f0c'; // тёмная подложка — щели между шариками
  for (const c of chunks) { ctx.beginPath(); ctx.ellipse(c.x, c.y, c.rx * 1.06, c.ry * 1.06, c.rot, 0, 7); ctx.fill(); }
  for (const c of chunks) { ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot); chunk(0, 0, c.rx, c.ry); ctx.restore(); }
  const top = P[Math.round(N * 0.75)]; // соус стекает по верхним шарикам
  ctx.fillStyle = '#d9382c'; ctx.beginPath();
  ctx.moveTo(top.ox - ball.r * 0.6, top.oy + ball.r * 0.12);
  ctx.quadraticCurveTo(top.ox - ball.r * 0.3, top.oy + ball.r * 0.6, top.ox - ball.r * 0.08, top.oy + ball.r * 0.2);
  ctx.quadraticCurveTo(top.ox + ball.r * 0.15, top.oy + ball.r * 0.7, top.ox + ball.r * 0.38, top.oy + ball.r * 0.15);
  ctx.quadraticCurveTo(top.ox + ball.r * 0.6, top.oy + ball.r * 0.35, top.ox + ball.r * 0.68, top.oy);
  ctx.quadraticCurveTo(top.ox, top.oy - ball.r * 0.35, top.ox - ball.r * 0.7, top.oy - ball.r * 0.05); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(top.ox + ball.r * 0.2, top.oy + ball.r * 0.3, ball.r * 0.06, ball.r * 0.14, 0.3, 0, 7); ctx.fill();
  { ctx.save(); ctx.translate(top.ox + ball.r * 0.05, top.oy - 2); ctx.rotate(top.ox / ball.r * 0.4 - 0.2); // петрушка
    ctx.strokeStyle = '#2f7d32'; ctx.lineWidth = Math.max(2, ball.r * 0.07); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, -ball.r * 0.25); ctx.stroke();
    for (const [lx, ly] of [[0, -ball.r * 0.32], [-ball.r * 0.16, -ball.r * 0.22], [ball.r * 0.16, -ball.r * 0.22]]) {
      ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.ellipse(lx, ly, ball.r * 0.13, ball.r * 0.09, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#66bb6a'; ctx.beginPath(); ctx.arc(lx - ball.r * 0.03, ly - ball.r * 0.03, ball.r * 0.04, 0, 7); ctx.fill();
    }
    ctx.restore(); }
  const ex = ball.r * 0.3, ey = -ball.r * 0.12, er = Math.max(5, ball.r * 0.19); // лицо
  const look = ball.face * er * 0.35;
  const blink = ball.blink > 0 ? 0.15 : 1;
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(s * ex, ey, er, er * blink, 0, 0, 7); ctx.fill();
    if (blink > 0.5) {
      ctx.fillStyle = '#1b1410'; ctx.beginPath(); ctx.arc(s * ex + look, ey + (ball.vy < -100 ? -er * 0.2 : er * 0.15), er * 0.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * ex + look - er * 0.15, ey - er * 0.15, er * 0.15, 0, 7); ctx.fill();
    }
  }
  const my = ball.r * 0.3, mw = ball.r * 0.26;
  ctx.strokeStyle = '#3a1c0e'; ctx.lineWidth = Math.max(2, ball.r * 0.08); ctx.lineCap = 'round';
  if (ball.mouth > 0.1) { ctx.fillStyle = '#3a1c0e'; ctx.beginPath(); ctx.ellipse(0, my, mw * 0.8, ball.r * 0.2 * ball.mouth, 0, 0, 7); ctx.fill(); }
  else { ctx.beginPath(); ctx.moveTo(-mw, my); ctx.quadraticCurveTo(0, my + ball.r * 0.16, mw, my); ctx.stroke(); }
  ctx.restore();
}
function drawHUD() {
  ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
  ctx.font = '800 34px system-ui, sans-serif';
  ctx.fillText(maxHeight + ' ' + T('m'), 16, 44);
  ctx.textAlign = 'right'; ctx.font = '700 22px system-ui, sans-serif'; ctx.fillStyle = '#ffe08a';
  ctx.fillText('● ' + runCoins, W - 16, 40);
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillText(T('mass') + ' ' + ball.mass + (coinMult() > 1 ? '   ×' + coinMult() : ''), W - 16, 64);
  if (ball.mass >= HAIR_PROOF) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '600 13px system-ui, sans-serif'; ctx.fillText(T('hairProof'), W - 16, 84); }
  for (let i = 0; i < MAXJ; i++) { // заряды прыжка
    const x = W / 2 - (MAXJ - 1) * 14 + i * 28, y = 40;
    ctx.fillStyle = i < ball.jumps ? '#f6c343' : i === ball.jumps ? `rgba(246,195,67,${0.15 + ball.regen / REGEN * 0.6})` : 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 8, y + 3); ctx.lineTo(x + 2, y + 3); ctx.lineTo(x + 3, y + 10); ctx.lineTo(x - 8, y - 2); ctx.lineTo(x - 2, y - 2); ctx.closePath(); ctx.fill();
  }
  ctx.textAlign = 'center';
}
function drawWorld() { // всё внутри поля; вызывающий ставит clip и shake
  for (const pl of plates) { const y = pl.y - camY; if (y > -20 && y < H + 20) {
    ctx.fillStyle = '#e9e4da'; ctx.beginPath(); ctx.ellipse(pl.x, y + 8, pl.w / 2, 16, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#c9c2b4'; ctx.beginPath(); ctx.ellipse(pl.x, y + 8, pl.w / 2 - 30, 9, 0, 0, 7); ctx.fill(); } }
  for (const it of items) drawItem(it);
  if (ball.alive || state === 'title') drawBall();
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.t / p.life, 0, 1);
    if (p.meat) { p.rot += p.rv * 0.016; ctx.save(); ctx.translate(p.x, p.y - camY); ctx.rotate(p.rot); chunk(0, 0, p.size, p.size * 0.78); ctx.restore(); }
    else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y - camY, p.size, 0, 7); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  for (const t of texts) {
    const k = t.t; ctx.globalAlpha = 1 - k * k; ctx.fillStyle = t.color; ctx.textAlign = 'center';
    ctx.font = `900 ${t.big ? 30 : 22}px system-ui, sans-serif`;
    ctx.fillText(t.str, t.x, t.y - camY - k * 70);
  }
  ctx.globalAlpha = 1;
}
expose({ drawBg, drawWorld, drawHUD });
