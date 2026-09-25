'use strict';
// ---------- рендер: фон, платформы, опасности, еда, Тефа, HUD ----------
// фоны тем (спека v2.2a §5); вид выбран владельцем по листу shots/design_themes_round1.png: кухня A, холодильник B,
// духовка B, раковина A, праздничный стол A. Узоры едут с параллаксом 0.5; к крыше фон темнеет
const par = period => ((-camY * 0.5) % period + period) % period; // сдвиг узора с периодом period
function bgGrad(b, top, bottom) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); }
const BG_SEED = mulberry32(11), FLAKES = Array.from({ length: 26 }, () => [BG_SEED() * W, BG_SEED() * H, 4 + BG_SEED() * 5]); // снежинки холодильника
const BG_DRAW = {
  kitchen(b, h) { // тёплая коричневая плитка
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgb(${lerp(58, 20, h)|0},${lerp(44, 22, h)|0},${lerp(36, 40, h)|0})`);
    g.addColorStop(1, `rgb(${lerp(42, 14, h)|0},${lerp(30, 14, h)|0},${lerp(26, 30, h)|0})`);
    ctx.fillStyle = g; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 2;
    const tile = 96, off = par(tile);
    for (let y = Math.floor(b.y0 / tile) * tile - tile + off; y < b.y1 + tile; y += tile) { ctx.beginPath(); ctx.moveTo(b.x0, y); ctx.lineTo(b.x1, y); ctx.stroke(); }
    for (let x = Math.floor(b.x0 / tile) * tile; x <= b.x1; x += tile) { ctx.beginPath(); ctx.moveTo(x, b.y0); ctx.lineTo(x, b.y1); ctx.stroke(); }
  },
  fridge(b) { // тёмно-синяя глубина холодильника, свет лампы сверху, снежинки
    bgGrad(b, 'rgb(30,44,70)', 'rgb(14,22,40)');
    const g = ctx.createRadialGradient(W / 2, -40, 20, W / 2, -40, 520); g.addColorStop(0, 'rgba(170,215,255,0.35)'); g.addColorStop(1, 'rgba(170,215,255,0)');
    ctx.fillStyle = g; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    ctx.strokeStyle = 'rgba(220,240,255,0.3)'; ctx.lineWidth = 1.5; const off = par(H);
    for (const [fx, fy, s] of FLAKES) { const y = (fy + off) % H; for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; ctx.beginPath(); ctx.moveTo(fx - Math.cos(a) * s, y - Math.sin(a) * s); ctx.lineTo(fx + Math.cos(a) * s, y + Math.sin(a) * s); ctx.stroke(); } }
  },
  oven(b) { // тёмная эмаль, решётки, приглушённый жар снизу (не цвет опасности)
    bgGrad(b, 'rgb(26,24,26)', 'rgb(12,11,12)');
    ctx.strokeStyle = 'rgba(160,160,170,0.14)'; ctx.lineWidth = 3; const off = par(240);
    for (let y = off - 240 + 120; y < H + 240; y += 240) { ctx.beginPath(); ctx.moveTo(b.x0, y); ctx.lineTo(b.x1, y); ctx.stroke(); for (let x = Math.floor(b.x0 / 30) * 30 + 20; x < b.x1; x += 30) { ctx.beginPath(); ctx.moveTo(x, y - 24); ctx.lineTo(x, y + 24); ctx.stroke(); } }
    const g = ctx.createLinearGradient(0, H * 0.55, 0, H); g.addColorStop(0, 'rgba(140,60,30,0)'); g.addColorStop(1, 'rgba(140,60,30,0.28)'); ctx.fillStyle = g; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  },
  sink(b) { // мелкая бело-голубая плитка
    bgGrad(b, 'rgb(52,70,84)', 'rgb(30,42,52)');
    ctx.strokeStyle = 'rgba(230,240,250,0.12)'; ctx.lineWidth = 2; const off = par(32);
    for (let y = off - 32; y < H + 32; y += 32) { ctx.beginPath(); ctx.moveTo(b.x0, y); ctx.lineTo(b.x1, y); ctx.stroke(); }
    for (let x = Math.floor(b.x0 / 32) * 32; x <= b.x1; x += 32) { ctx.beginPath(); ctx.moveTo(x, b.y0); ctx.lineTo(x, b.y1); ctx.stroke(); }
  },
  feast(b) { // скатерть в клетку и свечи
    bgGrad(b, 'rgb(30,58,42)', 'rgb(18,36,26)');
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; const off = par(96);
    for (let y = off - 96; y < H + 96; y += 48) for (let x = Math.floor(b.x0 / 48) * 48 + ((Math.round((y - off) / 48) % 2 + 2) % 2 ? 0 : 24); x < b.x1; x += 48) ctx.fillRect(x, y, 24, 24);
    const off2 = par(H);
    for (const [cx, cy0] of [[60, 140], [420, 380], [90, 640]]) { const cy = (cy0 + off2) % H;
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 60); g.addColorStop(0, 'rgba(255,210,140,0.35)'); g.addColorStop(1, 'rgba(255,210,140,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 60, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(240,230,210,0.5)'; ctx.fillRect(cx - 3, cy, 6, 22); ctx.fillStyle = 'rgba(255,220,150,0.9)'; ctx.beginPath(); ctx.ellipse(cx, cy - 4, 3, 6, 0, 0, 7); ctx.fill(); }
  },
};
function drawBg() {
  const b = fieldBounds();
  const h = tower ? clamp(-camY / tower.tp.height, 0, 1) : 0, theme = tower ? tower.tp.theme : 'kitchen';
  (BG_DRAW[theme] || BG_DRAW.kitchen)(b, h);
  if (theme !== 'kitchen' && h > 0) { ctx.fillStyle = `rgba(0,0,0,${0.35 * h})`; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); } // к крыше темнее
  if (b.x0 < 0) { // боковые зоны на десктопе/landscape: затемнены, поле обведено
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(b.x0, b.y0, -b.x0, b.y1 - b.y0); ctx.fillRect(W, b.y0, b.x1 - W, b.y1 - b.y0);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, b.y0); ctx.lineTo(0, b.y1); ctx.moveTo(W, b.y0); ctx.lineTo(W, b.y1); ctx.stroke();
  }
  if (tower) { // отметки этажей у чекпоинтов и крыша
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.font = '600 14px system-ui, sans-serif'; ctx.textAlign = 'left';
    for (const p of tower.platforms) if (p.cp || p.roof) { const y = p.y - camY; if (y > -20 && y < H + 20) { ctx.fillText(p.roof ? T('roof') : T('floorMark', p.cp), 8, y - 22); ctx.fillRect(0, y - 16, W, 1); } }
    if (b.y1 > H) { ctx.fillStyle = BAND_BOTTOM[tower.tp.theme] || BAND_BOTTOM.kitchen; ctx.fillRect(0, H, W, b.y1 - H); } // высокий экран: полоса продолжается до его низа
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
  } else if (p.type === 'board') { // разделочная доска (нож над её концом рисуется как обычный нож; спека v2.2a §6.5)
    ctx.fillStyle = '#c8955a'; rrect(p.x - p.w / 2, y - 4, p.w, 16, 5); ctx.fill(); ctx.fillStyle = '#a5723f'; rrect(p.x - p.w / 2, y + 8, p.w, 5, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(90,55,25,0.35)'; ctx.lineWidth = 1.5; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(p.x - p.w / 2 + 10, y + k * 3); ctx.lineTo(p.x + p.w / 2 - 10, y + k * 3); ctx.stroke(); }
  } else if (p.type === 'bowl') { // миска с пеной (спека v2.2a §6.3)
    ctx.fillStyle = '#e8eef3'; ctx.beginPath(); ctx.moveTo(p.x - p.w / 2, y - 6); ctx.quadraticCurveTo(p.x, y + 40, p.x + p.w / 2, y - 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#9fb4c4'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; for (let k = 0, n = Math.max(3, Math.round(p.w / 22)); k < n; k++) { ctx.beginPath(); ctx.arc(p.x - p.w / 2 + 12 + k * (p.w - 24) / (n - 1), y - 6, 5 + (k % 3) * 2, 0, 7); ctx.fill(); }
  } else if (p.type === 'toaster') { // тостер с прорезями; рычаг светится сильнее к концу отсчёта (спека v2.2a §6.2)
    const k = clamp((p.toastT || 0) / TOASTER_T, 0, 1), sh = k > 0 ? Math.sin(tGame * 60) * k * 2 : 0;
    ctx.save(); ctx.translate(p.x + sh, y);
    ctx.fillStyle = '#c9ccd2'; rrect(-p.w / 2, -30, p.w, 42, 10); ctx.fill(); ctx.fillStyle = '#9aa0a8'; rrect(-p.w / 2, 4, p.w, 8, 4); ctx.fill();
    ctx.fillStyle = '#3a3a40'; rrect(-p.w / 2 + 14, -28, p.w / 2 - 20, 8, 3); ctx.fill(); rrect(6, -28, p.w / 2 - 20, 8, 3); ctx.fill();
    ctx.fillStyle = `rgba(255,224,138,${0.45 + 0.55 * k})`; ctx.shadowColor = 'rgba(255,224,138,0.9)'; ctx.shadowBlur = 6 + 12 * k; rrect(p.w / 2, -18, 10, 16, 3); ctx.fill(); ctx.shadowBlur = 0;
    ctx.restore();
  } else if (p.type === 'spatula') { // лопатка-батут: стальное полотно с прорезями и деревянная ручка (спека v2.2a §6.4)
    ctx.save(); ctx.translate(p.x, y);
    ctx.fillStyle = '#b9bec6'; rrect(-p.w / 2, -4, p.w - 26, 14, 5); ctx.fill(); ctx.fillStyle = '#2b2f36';
    for (let k = 0, n = Math.max(2, Math.floor((p.w - 40) / 20)); k < n; k++) { rrect(-p.w / 2 + 10 + k * 20, 0, 12, 5, 2); ctx.fill(); }
    ctx.fillStyle = '#8a5a34'; rrect(p.w / 2 - 30, -1, 40, 9, 4); ctx.fill();
    ctx.restore();
  } else if (p.type === 'shelf') { // полка холодильника: бледно-голубое стекло с бликом (спека v2.2a §6.1)
    ctx.fillStyle = 'rgba(190,225,255,0.55)'; rrect(p.x - p.w / 2, y - 4, p.w, 12, 4); ctx.fill(); ctx.strokeStyle = 'rgba(120,180,230,0.9)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.moveTo(p.x - p.w / 2 + 8, y - 1); ctx.lineTo(p.x + p.w / 2 - 20, y - 1); ctx.stroke();
  } else if (p.type === 'cheese') { // ломтик сыра: жёлтый с дырками; крошится — дрожит; пропал — пунктир до возврата
    if (p.gone) { ctx.strokeStyle = 'rgba(246,195,67,0.3)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); rrect(p.x - p.w / 2, y - 4, p.w, 16, 5); ctx.stroke(); ctx.setLineDash([]); return; }
    const sh = p.crumbleT > 0 ? Math.sin(tGame * 60) * 2 : 0;
    ctx.save(); ctx.translate(p.x + sh, y);
    ctx.fillStyle = '#f6c343'; rrect(-p.w / 2, -4, p.w, 16, 5); ctx.fill();
    ctx.fillStyle = '#dca531'; rrect(-p.w / 2, 7, p.w, 5, 3); ctx.fill(); // корочка снизу
    ctx.fillStyle = '#c98f22'; for (const [hx, hy, hr] of [[-0.3, 3, 4], [0.05, 1, 3], [0.32, 4, 3.5]]) { ctx.beginPath(); ctx.arc(hx * p.w, hy, hr, 0, 7); ctx.fill(); } // дырки
    if (p.crumbleT > 0) { // крошится: трещины и крошки сыплются вниз, чтобы и на стоп-кадре было видно
      const k = 1 - p.crumbleT / CHEESE_T;
      ctx.strokeStyle = '#8a5f14'; ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(-p.w * 0.12, -4); ctx.lineTo(-p.w * 0.05, 4); ctx.lineTo(-p.w * 0.1, 12); ctx.moveTo(p.w * 0.2, -4); ctx.lineTo(p.w * 0.14, 5); ctx.stroke();
      ctx.fillStyle = '#f6c343'; ctx.globalAlpha = 1 - 0.6 * k;
      for (let i = 0; i < 6; i++) ctx.fillRect(((i * 0.37 + 0.1) % 1 - 0.5) * p.w * 0.9 - 2, 14 + k * (18 + i * 5), 4, 4);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  } else { // поднос
    ctx.fillStyle = '#b08d5a'; rrect(p.x - p.w / 2, y - 4, p.w, 18, 6); ctx.fill();
    ctx.fillStyle = '#8a6a3e'; rrect(p.x - p.w / 2 + 6, y, p.w - 12, 10, 4); ctx.fill();
    ctx.fillStyle = '#3a2f26'; ctx.beginPath(); ctx.arc(p.x - p.w / 2 + 14, y + 18, 5, 0, 7); ctx.arc(p.x + p.w / 2 - 14, y + 18, 5, 0, 7); ctx.fill();
  }
}
function drawHazard(h) {
  if (h.gone) return; const y = h.y - camY; if (y < -320 || y > H + 320) return;
  if (h.type === 'knife') {
    const ky = knifeY(h) - camY, wind = h.phase === 'wind';
    ctx.save();
    if (wind) { // замах (вариант A листа design_warn_round1): нож дрожит и вспыхивает красным — сейчас ударит
      ctx.translate(h.x, ky + 40); ctx.rotate(Math.sin(tGame * 45) * 0.07); ctx.translate(-h.x, -(ky + 40));
      ctx.shadowColor = 'rgba(255,60,40,0.95)'; ctx.shadowBlur = 16;
    }
    ctx.fillStyle = '#5a3b22'; rrect(h.x - 7, ky - 40, 14, 40, 4); ctx.fill(); // рукоять
    ctx.fillStyle = wind ? '#ffffff' : '#d8dde3'; ctx.beginPath(); ctx.moveTo(h.x - 8, ky); ctx.lineTo(h.x + 8, ky); ctx.lineTo(h.x + 6, ky + 70); ctx.lineTo(h.x, ky + 84); ctx.lineTo(h.x - 6, ky + 70); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = wind ? '#ff5a36' : 'rgba(255,90,54,0.55)'; ctx.lineWidth = 2; ctx.stroke(); // оранжево-красная кромка: опасно (спека v2.1.1 §8)
    ctx.shadowBlur = 0;
    if (wind) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(h.x - 2, ky + 6, 3, 52); } // блик на лезвии
    ctx.restore();
  } else if (h.type === 'blades') {
    ctx.save(); ctx.translate(h.x, y); ctx.rotate(h.ang);
    const halo = ctx.createRadialGradient(0, 0, BLADES_R * 0.4, 0, 0, BLADES_R + 24); // зона задевания — красный ореол (вариант A)
    halo.addColorStop(0, 'rgba(255,90,54,0.35)'); halo.addColorStop(1, 'rgba(255,90,54,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, BLADES_R + 24, 0, 7); ctx.fill();
    ctx.fillStyle = '#c8ccd2'; ctx.strokeStyle = '#ff5a36'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(BLADES_R + 8, -10); ctx.lineTo(BLADES_R + 8, 10); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#ff5a36'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fill(); // оранжево-красная ступица
    ctx.fillStyle = '#4a4a4a'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill();
    ctx.restore();
  }
}
// масло сверху (спека v2.1.1 §7.2): половник повара у верхнего края, столб красного света, горячие капли, шипящие пятна
function drawPours() {
  for (const p of pours) {
    const tilt = p.warnT > 0 ? (1 - clamp(p.warnT / POUR_WARN, 0, 1)) * 0.35 : 0.35; // черпак опрокидывается к столбу за время предупреждения
    if (p.warnT > 0) { // куда польётся — столб мягкого красного света от черпака, гаснет книзу и пульсирует (вариант A)
      const y0 = LADLE_Y + 10, k = 0.75 + 0.25 * Math.sin(tGame * 12) ** 2;
      const beam = ctx.createLinearGradient(0, y0, 0, H);
      beam.addColorStop(0, `rgba(255,90,54,${0.42 * k})`); beam.addColorStop(0.55, `rgba(255,90,54,${0.14 * k})`); beam.addColorStop(1, 'rgba(255,90,54,0)');
      ctx.fillStyle = beam; ctx.fillRect(p.x - 16, y0, 32, H - y0);
      const core = ctx.createLinearGradient(0, y0, 0, H); core.addColorStop(0, `rgba(255,215,170,${0.55 * k})`); core.addColorStop(0.5, 'rgba(255,215,170,0)');
      ctx.fillStyle = core; ctx.fillRect(p.x - 3, y0, 6, H - y0);
    }
    ctx.save(); ctx.translate(p.x, LADLE_Y); ctx.scale(p.x > W / 2 ? -1 : 1, 1); ctx.rotate(-tilt); // черпак над столбом, ручка к середине экрана и вверх: не залезает на счёт и край
    ctx.strokeStyle = '#8d8d95'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(16, -6); ctx.lineTo(56, -16); ctx.stroke();
    ctx.fillStyle = '#b8bcc4'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 14, 0, 0, Math.PI); ctx.fill(); // чаша
    ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.ellipse(0, 0, 20, 6, 0, 0, 7); ctx.fill(); // горячее масло в черпаке
    ctx.restore();
  }
  for (const dr of drops) { // горячая капля: оранжевая со свечением и бликом
    const y = dr.y - camY, g = ctx.createRadialGradient(dr.x, y, 2, dr.x, y, 18);
    g.addColorStop(0, 'rgba(255,170,60,0.55)'); g.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(dr.x, y, 18, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.moveTo(dr.x, y - 16); ctx.quadraticCurveTo(dr.x + 9, y, dr.x, y + 8); ctx.quadraticCurveTo(dr.x - 9, y, dr.x, y - 16); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,200,0.8)'; ctx.beginPath(); ctx.ellipse(dr.x - 2.5, y - 2, 2, 4, 0.3, 0, 7); ctx.fill();
  }
  for (const s of splats) { // шипящее пятно с пузырьками, гаснет за SPLAT_T
    const x = s.p.x + s.dx, y = s.p.y - camY, a = clamp(s.t / SPLAT_T, 0, 1);
    ctx.fillStyle = `rgba(255,140,40,${0.75 * a})`; ctx.beginPath(); ctx.ellipse(x, y + 2, SPLAT_W / 2, 5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(255,230,170,${0.8 * a})`;
    for (let i = 0; i < 3; i++) { const t = (tGame * 3 + i / 3) % 1; ctx.beginPath(); ctx.arc(x - 10 + i * 10, y - t * 12, 2 + t * 2, 0, 7); ctx.fill(); }
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
  if (it.kind === 'ketchup') { // ломтик помидора с семенами и хвостиком: не путается с красной каплей опасности (спека v2.1.1 §8)
    ctx.fillStyle = '#d93a2b'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.fill();
    ctx.fillStyle = '#f07a5e'; ctx.beginPath(); ctx.arc(0, 0, 11.5, 0, 7); ctx.fill(); // мякоть
    ctx.fillStyle = '#ffd28a'; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 6, Math.sin(a) * 6, 3.2, 2, a, 0, 7); ctx.fill(); } // семена в камерах
    ctx.fillStyle = '#d93a2b'; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, 7); ctx.fill(); // серединка
    ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.ellipse(-3, -15, 5, 2.2, -0.5, 0, 7); ctx.ellipse(3, -15, 5, 2.2, 0.5, 0, 7); ctx.fill(); // хвостик
  } else if (it.kind === 'pasta') {
    ctx.strokeStyle = '#f6c343'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i <= 24; i++) { const t = i / 24; const px = -16 + t * 32, py = Math.sin(t * Math.PI * 4) * 8; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  } else { // кусочек мяса на косточке: раньше овал с полосой читался как хмурое лицо
    ctx.strokeStyle = '#f3e6d0'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(18, 13); ctx.stroke(); // косточка
    ctx.fillStyle = '#f3e6d0'; ctx.beginPath(); ctx.arc(20, 10, 4.2, 0, 7); ctx.arc(17, 17, 4.2, 0, 7); ctx.fill(); // головка кости
    ctx.fillStyle = '#b5452b'; ctx.beginPath(); ctx.ellipse(-5, -3, 16, 13, -0.4, 0, 7); ctx.fill(); // мясо
    ctx.fillStyle = '#d9705a'; ctx.beginPath(); ctx.ellipse(-9, -7, 7, 4, -0.4, 0, 7); ctx.fill(); // блик
    ctx.strokeStyle = 'rgba(255,230,210,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-5, -3, 9, 0.5, 2.0); ctx.stroke(); // волокна
  }
  ctx.restore();
}
function chunk(x, y, rx, ry) { // кусок фарша (частицы урона)
  const g = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.4, rx * 0.1, x, y, rx * 1.1);
  g.addColorStop(0, '#e89a6c'); g.addColorStop(0.5, '#c0583a'); g.addColorStop(1, '#833218');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill();
}
// Тефа сама показывает жизни (спека v2.1.1 §3.2): укусы, лицо, мигание последнего куска, заживление; ободка больше нет
function drawTefaBall() {
  const bz = isBerserk(), r = ball.r * (bz ? 1.6 : 1);
  const x = ball.x, y = ball.y - camY + ball.r - r; // берсерк крупнее от нижней точки: низ Тефы остаётся на платформе
  const st = tower ? platformById(tower.platforms, ball.onPlatform) : null;
  if (st) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, st.y - camY + 6, r * 0.9, 8, 0, 0, 7); ctx.fill(); } // тень на платформе
  const pose = { sx: 1 + ball.sq, sy: 1 - ball.sq, tilt: ball.tilt, face: ball.face, mouth: ball.mouth, blink: ball.blink > 0, hot: ball.hot, berserk: bz,
    alpha: run && run.invuln > 0 && Math.floor(tGame * 12) % 2 === 0 ? 0.45 : 1,
    hp: { cur: ball.mass, max: massMax() }, charged: powerReady(),
    tint: ball.mass === 1 ? 0.5 + 0.5 * Math.sin(tGame * Math.PI * 3) : 0, // последний кусок мигает ≈ 1.5 раза в секунду
    heal: ball.healT > 0 ? 1 - ball.healT / HEAL_T : 0,
    bake: radiusFor(ball.mass) * (bz ? 1.6 : 1) }; // кэш тела печётся под целевой радиус массы, пока ball.r его догоняет
  drawTefa(ctx, x, y, r, pose);
  const cm = chargesMax(), top = y - r * 1.16 - 14 - (bz ? r * 0.55 : 0); // заряды над головой; в берсерке выше пламени
  for (let i = 0; i < cm; i++) { ctx.fillStyle = i < ball.charges ? '#f6c343' : 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.arc(x - (cm - 1) * 7 + i * 14, top, 4, 0, 7); ctx.fill(); }
}
// шкала суперсилы сверху слева (спека v2.1.1 §3.3): копится оранжевой, полна — золотая и пульсирует, в берсерке показывает
// остаток его времени, исчерпана — серая; при лимите больше одного справа остаток берсерков
function drawPowerMeter() {
  const x = 40, y = 30, w = 140, h = 10, bz = isBerserk(), spent = powerSpent() && !bz, ready = powerReady();
  // сила золотая, опасность оранжево-красная (спека v2.1.1 §8): значок-молния, а не капля, чтобы шкалу не путали с маслом
  ctx.save(); ctx.translate(22, y + 5);
  ctx.fillStyle = spent ? 'rgba(255,255,255,0.25)' : ready || bz ? '#ffe08a' : '#e8b030';
  ctx.beginPath(); ctx.moveTo(3, -11); ctx.lineTo(-6, 1); ctx.lineTo(-1, 1); ctx.lineTo(-3, 11); ctx.lineTo(6, -2); ctx.lineTo(1, -2); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; rrect(x, y, w, h, 5); ctx.fill();
  const frac = bz ? power.berserkT / berserkDur() : spent ? 0 : clamp(power.v / POWER_FULL, 0, 1);
  if (frac > 0) {
    ctx.save();
    if (ready) { ctx.shadowColor = 'rgba(255,220,120,0.9)'; ctx.shadowBlur = 8 + 8 * (0.5 + 0.5 * Math.sin(tGame * 8)); }
    ctx.fillStyle = bz ? '#fff0b8' : ready ? '#ffe08a' : '#e8b030'; rrect(x, y, w * frac, h, 5); ctx.fill(); // копится, готова, берсерк тает
    ctx.restore();
  }
  if (berserkLimit() > 1) { ctx.fillStyle = '#fff'; ctx.font = '700 14px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('×' + (berserkLimit() - power.used), x + w + 8, y + 10); }
}
function drawHUD() { // жизни показывает сама Тефа; здесь шкала силы, монеты, номер башни и прогресс
  drawPowerMeter();
  ctx.textAlign = 'right'; ctx.font = '700 22px system-ui, sans-serif'; ctx.fillStyle = '#ffe08a'; ctx.fillText('● ' + run.runCoins, W - 16, 40);
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '600 15px system-ui, sans-serif'; ctx.fillText(T('tower') + ' ' + tower.tp.N, W - 16, 64);
  const x = W - 14, y0 = 110, y1 = H - 110; // прогресс башни с отметками чекпоинтов
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; rrect(x - 3, y0, 6, y1 - y0, 3); ctx.fill();
  const ph = (y1 - y0) * run.progress; if (ph > 0) { ctx.fillStyle = '#8ff0a4'; rrect(x - 3, y1 - ph, 6, ph, 3); ctx.fill(); }
  ctx.fillStyle = '#fff'; for (const p of tower.platforms) if (p.cp) ctx.fillRect(x - 6, y1 - (y1 - y0) * (-p.y / tower.tp.height), 12, 2);
  ctx.textAlign = 'center';
  if (run.bannerT > 0) { // плашка «Башня N · Тема» при старте башни, гаснет последние 0.5 с
    ctx.globalAlpha = clamp(run.bannerT / 0.5, 0, 1); ctx.font = '900 30px system-ui, sans-serif';
    ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(20,12,8,0.7)'; ctx.fillStyle = '#fff';
    const s = T('tower') + ' ' + tower.tp.N + ' · ' + T('theme.' + tower.tp.theme);
    ctx.strokeText(s, W / 2, H * 0.3); ctx.fillText(s, W / 2, H * 0.3); ctx.globalAlpha = 1;
  }
}
// нижний цвет полосы темы: им же заливается экран под полем на высоких телефонах (drawBg)
const BAND_BOTTOM = { fridge: 'rgba(160,200,235,0.95)', oven: 'rgba(40,14,8,0.97)', sink: 'rgba(24,64,110,0.97)', feast: 'rgba(0,0,0,0.98)', kitchen: 'rgba(8,6,5,0.97)' };
// нижняя смертельная полоса темы (спека v2.2a §4): едет с камерой, верхний край колышется; поверх мира, под надписями и HUD.
// Низ уходит за край поля: тряска камеры не открывает щель над заливкой из drawBg
function drawBand() {
  const theme = tower ? tower.tp.theme : 'kitchen', y0 = H - BAND_H, wave = x => Math.sin(x * 0.045 + tGame * 3) * 3, low = H + 40;
  const edge = () => { ctx.beginPath(); ctx.moveTo(-40, low); ctx.lineTo(-40, y0 + wave(-40)); for (let x = -40; x <= W + 40; x += 8) ctx.lineTo(x, y0 + wave(x)); ctx.lineTo(W + 40, low); ctx.closePath(); };
  const g = ctx.createLinearGradient(0, y0 - 14, 0, H), bottom = BAND_BOTTOM[theme] || BAND_BOTTOM.kitchen;
  if (theme === 'fridge') { // иней с сосульками
    g.addColorStop(0, 'rgba(210,235,255,0.55)'); g.addColorStop(1, bottom); edge(); ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = 'rgba(235,248,255,0.85)'; for (let x = 6; x < W; x += 18) { ctx.beginPath(); ctx.moveTo(x - 6, y0 + wave(x) + 2); ctx.lineTo(x, y0 - 10 + wave(x)); ctx.lineTo(x + 6, y0 + wave(x) + 2); ctx.fill(); }
  } else if (theme === 'oven') { // тлеющие угли, приглушённые — не цвет опасности
    g.addColorStop(0, 'rgba(90,36,20,0.6)'); g.addColorStop(1, bottom); edge(); ctx.fillStyle = g; ctx.fill();
    for (let x = 12; x < W; x += 26) { ctx.fillStyle = `rgba(200,${90 + (x % 50)},50,${0.4 + 0.2 * Math.sin(tGame * 4 + x)})`; ctx.beginPath(); ctx.arc(x, y0 + 12 + (x % 11), 2.5, 0, 7); ctx.fill(); }
  } else if (theme === 'sink') { // вода с волной
    g.addColorStop(0, 'rgba(60,130,190,0.7)'); g.addColorStop(1, bottom); edge(); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(210,240,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = -40; x <= W + 40; x += 8) { const y = y0 + wave(x); x > -40 ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
  } else if (theme === 'feast') { // тёмная щель под подолом скатерти
    g.addColorStop(0, 'rgba(6,5,5,0.6)'); g.addColorStop(1, bottom); edge(); ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = 'rgba(30,58,42,0.95)'; ctx.beginPath(); ctx.moveTo(-40, y0 - 6); for (let x = -40; x <= W + 40; x += 24) ctx.arc(x + 12, y0 - 6, 12, Math.PI, 0, true); ctx.lineTo(W + 40, y0 - 14); ctx.lineTo(-40, y0 - 14); ctx.closePath(); ctx.fill();
  } else { // кухня: тёмный дым
    g.addColorStop(0, 'rgba(12,9,8,0.55)'); g.addColorStop(1, bottom); edge(); ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = 'rgba(40,34,32,0.55)'; for (let x = 10; x < W; x += 34) { ctx.beginPath(); ctx.arc(x, y0 + 2 + wave(x), 12 + (x % 3) * 3, 0, 7); ctx.fill(); }
  }
}
function drawWorld() { // всё внутри поля; вызывающий ставит clip и shake
  if (!tower) return;
  for (const p of tower.platforms) drawPlatform(p);
  for (const h of tower.hazards) drawHazard(h);
  for (const it of tower.items) if (!it.dead) drawItem(it);
  for (const f of flies) drawFly(f);
  drawPours();
  if (ball.alive || state === 'title' || state === 'finish') drawTefaBall();
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.t / p.life, 0, 1);
    if (p.meat) { ctx.save(); ctx.translate(p.x, p.y - camY); ctx.rotate(p.rot); chunk(0, 0, p.size, p.size * 0.78); ctx.restore(); }
    else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y - camY, p.size, 0, 7); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  drawBand();
  for (const t of texts) {
    const k = t.t; ctx.globalAlpha = 1 - k * k; ctx.fillStyle = t.color; ctx.textAlign = 'center';
    ctx.font = `900 ${t.big ? 30 : 22}px system-ui, sans-serif`;
    ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(30,14,8,0.6)'; // тёмная обводка: читается и поверх Тефы
    ctx.strokeText(t.str, t.x, t.y - camY - k * TEXT_RISE); ctx.fillText(t.str, t.x, t.y - camY - k * TEXT_RISE);
  }
  ctx.globalAlpha = 1;
}
expose({ BAND_BOTTOM, drawBg, drawBand, drawWorld, drawHUD, drawPowerMeter, drawPlatform, drawHazard, drawFly, drawPours, drawItem });
