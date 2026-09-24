'use strict';
// ---------- рендер: фон, платформы, опасности, еда, Тефа, HUD ----------
function drawBg() {
  const b = fieldBounds();
  const h = tower ? clamp(-camY / tower.tp.height, 0, 1) : 0; // плитка темнеет к крыше
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
  if (tower) { // отметки этажей у чекпоинтов и крыша
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.font = '600 14px system-ui, sans-serif'; ctx.textAlign = 'left';
    for (const p of tower.platforms) if (p.cp || p.roof) { const y = p.y - camY; if (y > -20 && y < H + 20) { ctx.fillText(p.roof ? T('roof') : T('floorMark', p.cp), 8, y - 22); ctx.fillRect(0, y - 16, W, 1); } }
  }
}
function drawPlatform(p) {
  const y = p.y - camY; if (y < -40 || y > H + 40) return;
  if (p.type === 'plate') {
    ctx.fillStyle = '#e9e4da'; ctx.beginPath(); ctx.ellipse(p.x, y + 8, p.w / 2, 16, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#c9c2b4'; ctx.beginPath(); ctx.ellipse(p.x, y + 8, p.w / 2 - 30, 9, 0, 0, 7); ctx.fill();
    if (p.cp) { ctx.fillStyle = '#8ff0a4'; ctx.beginPath(); ctx.arc(p.x + p.w / 2 - 10, y + 2, 5, 0, 7); ctx.fill(); } // метка чекпоинта
  } else if (p.type === 'pan') {
    const heat = panHeat(p, tower.tp);
    ctx.fillStyle = '#2a2624'; ctx.beginPath(); ctx.ellipse(p.x, y + 8, p.w / 2, 16, 0, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(255,${(90 - heat * 60) | 0},20,${0.15 + heat * 0.6})`; ctx.beginPath(); ctx.ellipse(p.x, y + 8, p.w / 2 - 14, 9, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3d3734'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x + p.w / 2, y + 8); ctx.lineTo(p.x + p.w / 2 + 40, y + 2); ctx.stroke(); // ручка
    if (heat > 0.3) { ctx.fillStyle = `rgba(255,255,255,${(heat - 0.3) * 0.4})`; for (let i = 0; i < 3; i++) { const t = (tGame * 1.5 + i * 0.33) % 1; ctx.beginPath(); ctx.arc(p.x - 20 + i * 20 + Math.sin(t * 6) * 6, y - 10 - t * 40, 6 + t * 6, 0, 7); ctx.fill(); } } // дымок
  } else { // поднос
    ctx.fillStyle = '#b08d5a'; rrect(p.x - p.w / 2, y - 4, p.w, 18, 6); ctx.fill();
    ctx.fillStyle = '#8a6a3e'; rrect(p.x - p.w / 2 + 6, y, p.w - 12, 10, 4); ctx.fill();
    ctx.fillStyle = '#3a2f26'; ctx.beginPath(); ctx.arc(p.x - p.w / 2 + 14, y + 18, 5, 0, 7); ctx.arc(p.x + p.w / 2 - 14, y + 18, 5, 0, 7); ctx.fill();
  }
}
function drawHazard(h) {
  if (h.gone) return; const y = h.y - camY; if (y < -320 || y > H + 320) return;
  if (h.type === 'oil') {
    ctx.fillStyle = '#6d6d6d'; ctx.beginPath(); ctx.ellipse(h.x, y, 22, 10, 0, 0, 7); ctx.fill(); // половник
    ctx.strokeStyle = '#6d6d6d'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(h.x + 18, y - 4); ctx.lineTo(h.x + 60, y - 30); ctx.stroke();
    ctx.fillStyle = '#f2c94c';
    for (const dr of h.drops) {
      const dy = dr.y - camY;
      if (dr.splat > 0) { ctx.globalAlpha = clamp(dr.splat * 2, 0, 1); ctx.beginPath(); ctx.ellipse(h.x, dy + 6, 18, 5, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      else { ctx.beginPath(); ctx.moveTo(h.x, dy - 14); ctx.quadraticCurveTo(h.x + 9, dy, h.x, dy + 8); ctx.quadraticCurveTo(h.x - 9, dy, h.x, dy - 14); ctx.fill(); }
    }
  } else if (h.type === 'knife') {
    const ky = knifeY(h) - camY, wind = h.phase === 'wind';
    ctx.fillStyle = '#5a3b22'; rrect(h.x - 7, ky - 40, 14, 40, 4); ctx.fill(); // рукоять
    ctx.fillStyle = wind ? '#ffffff' : '#d8dde3'; ctx.beginPath(); ctx.moveTo(h.x - 8, ky); ctx.lineTo(h.x + 8, ky); ctx.lineTo(h.x + 6, ky + 70); ctx.lineTo(h.x, ky + 84); ctx.lineTo(h.x - 6, ky + 70); ctx.closePath(); ctx.fill();
    if (wind) { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(h.x, ky + 90); ctx.lineTo(h.x, y - 10); ctx.stroke(); ctx.setLineDash([]); } // замах: линия удара
  } else if (h.type === 'blades') {
    ctx.save(); ctx.translate(h.x, y); ctx.rotate(h.ang);
    ctx.fillStyle = '#c8ccd2';
    for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(BLADES_R + 8, -10); ctx.lineTo(BLADES_R + 8, 10); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#4a4a4a'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.fill();
    ctx.restore();
  }
}
function drawFly(f) {
  const y = f.y - camY;
  if (f.warnT > 0) { // предупреждение: мигающая стрелка у края, остриём внутрь поля
    if (Math.floor(tGame * 10) % 2) return;
    const x = f.side < 0 ? 18 : W - 18; ctx.fillStyle = '#ff7a6b'; ctx.beginPath();
    ctx.moveTo(x - f.side * 10, y); ctx.lineTo(x + f.side * 8, y - 12); ctx.lineTo(x + f.side * 8, y + 12); ctx.closePath(); ctx.fill(); return;
  }
  ctx.save(); ctx.translate(f.x, y);
  const w = Math.sin(tGame * 60) * 6;
  ctx.fillStyle = 'rgba(200,220,255,0.6)'; ctx.beginPath(); ctx.ellipse(-6, -6 + w, 8, 4, -0.5, 0, 7); ctx.ellipse(6, -6 - w, 8, 4, 0.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 6, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#c33'; ctx.beginPath(); ctx.arc(-4, -2, 2, 0, 7); ctx.arc(4, -2, 2, 0, 7); ctx.fill();
  ctx.restore();
}
function drawItem(it) {
  const x = it.x, y = it.y - camY; if (y < -40 || y > H + 40) return;
  const wob = Math.sin(tGame * 4 + it.seed) * 3;
  ctx.save(); ctx.translate(x, y + wob);
  if (it.kind === 'ketchup') {
    ctx.fillStyle = '#e3342f'; ctx.beginPath();
    ctx.moveTo(0, -18); ctx.bezierCurveTo(14, -2, 15, 10, 0, 16); ctx.bezierCurveTo(-15, 10, -14, -2, 0, -18); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(-4, 2, 3, 6, 0.4, 0, 7); ctx.fill();
  } else if (it.kind === 'pasta') {
    ctx.strokeStyle = '#f6c343'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i <= 24; i++) { const t = i / 24; const px = -16 + t * 32, py = Math.sin(t * Math.PI * 4) * 8; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  } else {
    ctx.fillStyle = '#b5452b'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 16, -0.3, 0, 7); ctx.fill();
    ctx.fillStyle = '#f3e0c8'; ctx.beginPath(); ctx.ellipse(6, -4, 7, 4, -0.3, 0, 7); ctx.fill();
    ctx.strokeStyle = '#f3e0c8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, 6); ctx.quadraticCurveTo(-4, 2, 4, 9); ctx.stroke();
  }
  ctx.restore();
}
function chunk(x, y, rx, ry) { // кусок фарша (частицы урона)
  const g = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.4, rx * 0.1, x, y, rx * 1.1);
  g.addColorStop(0, '#e89a6c'); g.addColorStop(0.5, '#c0583a'); g.addColorStop(1, '#833218');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill();
}
function drawTefaBall() {
  const x = ball.x, y = ball.y - camY, bz = isBerserk(), r = ball.r * (bz ? 1.6 : 1);
  const st = tower ? platformById(tower.platforms, ball.onPlatform) : null;
  if (st) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, st.y - camY + 6, r * 0.9, 8, 0, 0, 7); ctx.fill(); } // тень на платформе
  const pose = { sx: 1 + ball.sq, sy: 1 - ball.sq, tilt: ball.tilt, face: ball.face, mouth: ball.mouth, blink: ball.blink > 0, hot: ball.hot, berserk: bz,
    alpha: run && run.invuln > 0 && Math.floor(tGame * 12) % 2 === 0 ? 0.45 : 1 };
  ctx.save(); ctx.strokeStyle = 'rgba(255,230,200,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y - r * 0.08, r * 1.27, r * 1.1, 0, 0, 7); ctx.stroke(); ctx.restore(); // светлый ободок по силуэту (тело шире, чем выше), иначе прячется под телом: Тефа не сливается с тёмной кухней
  drawTefa(ctx, x, y, r, pose);
  const cm = chargesMax(); // заряды над головой
  for (let i = 0; i < cm; i++) { ctx.fillStyle = i < ball.charges ? '#f6c343' : 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.arc(x - (cm - 1) * 7 + i * 14, y - r * 1.16 - 14, 4, 0, 7); ctx.fill(); }
}
function drawHUD() {
  const mm = massMax();
  for (let i = 0; i < mm; i++) { // масса как здоровье
    const x = 24 + i * 22, y = 34; ctx.fillStyle = i < ball.mass ? '#c0583a' : 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill();
    if (i < ball.mass) { ctx.fillStyle = 'rgba(255,230,200,0.5)'; ctx.beginPath(); ctx.arc(x - 3, y - 3, 3, 0, 7); ctx.fill(); }
  }
  const bz = isBerserk(), frac = bz ? streak.berserkT / berserkDur() : clamp(streak.n / berserkThreshold(), 0, 1); // серия / берсерк
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; rrect(16, 50, 150, 10, 5); ctx.fill();
  if (frac > 0) { ctx.fillStyle = bz ? '#ffe08a' : '#8ff0a4'; rrect(16, 50, 150 * frac, 10, 5); ctx.fill(); }
  ctx.fillStyle = '#fff'; ctx.font = '700 15px system-ui, sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(bz ? T('berserk') : T('streak') + ' ' + streak.n, 16, 80);
  ctx.textAlign = 'right'; ctx.font = '700 22px system-ui, sans-serif'; ctx.fillStyle = '#ffe08a'; ctx.fillText('● ' + run.runCoins, W - 16, 40);
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '600 15px system-ui, sans-serif'; ctx.fillText(T('tower') + ' ' + tower.tp.N, W - 16, 64);
  const x = W - 14, y0 = 110, y1 = H - 110; // прогресс башни с отметками чекпоинтов
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; rrect(x - 3, y0, 6, y1 - y0, 3); ctx.fill();
  const ph = (y1 - y0) * run.progress; if (ph > 0) { ctx.fillStyle = '#8ff0a4'; rrect(x - 3, y1 - ph, 6, ph, 3); ctx.fill(); }
  ctx.fillStyle = '#fff'; for (const p of tower.platforms) if (p.cp) ctx.fillRect(x - 6, y1 - (y1 - y0) * (-p.y / tower.tp.height), 12, 2);
  ctx.textAlign = 'center';
}
function drawWorld() { // всё внутри поля; вызывающий ставит clip и shake
  if (!tower) return;
  for (const p of tower.platforms) drawPlatform(p);
  for (const h of tower.hazards) drawHazard(h);
  for (const it of tower.items) if (!it.dead) drawItem(it);
  for (const f of flies) drawFly(f);
  if (ball.alive || state === 'title' || state === 'finish') drawTefaBall();
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.t / p.life, 0, 1);
    if (p.meat) { ctx.save(); ctx.translate(p.x, p.y - camY); ctx.rotate(p.rot); chunk(0, 0, p.size, p.size * 0.78); ctx.restore(); }
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
expose({ drawBg, drawWorld, drawHUD, drawPlatform, drawHazard, drawFly });
