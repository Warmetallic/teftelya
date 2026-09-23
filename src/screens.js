'use strict';
// ---------- экраны, панели, кнопки ----------
const buttons = []; // кнопки, нарисованные в текущем кадре: { id, x, y, w, h, label, sub, ad }
function clearButtons() { buttons.length = 0; }
function hitButton(x, y) {
  for (const b of buttons) if (Math.abs(x - b.x) <= b.w / 2 && Math.abs(y - b.y) <= b.h / 2) return b;
  return null;
}
function rrect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
function dim(alpha) { const b = fieldBounds(); ctx.fillStyle = `rgba(20,12,8,${alpha})`; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); }
// style: undefined — жёлтая основная; 'neutral' — светлая второстепенная (Магазин, Назад); 'dim' — недоступная
function button(id, x, y, w, h, label, sub, ad, style) {
  const b = { id, x, y, w, h, label, sub, ad }; buttons.push(b);
  ctx.save();
  ctx.fillStyle = ad ? '#2e7d32' : style === 'neutral' ? '#ece6da' : style === 'dim' ? 'rgba(255,255,255,0.15)' : '#f6c343';
  rrect(x - w / 2, y - h / 2, w, h, 14); ctx.fill();
  ctx.fillStyle = ad ? '#fff' : style === 'dim' ? 'rgba(255,255,255,0.5)' : '#1b1410'; ctx.textAlign = 'center';
  if (sub) {
    ctx.font = '800 22px system-ui, sans-serif'; ctx.fillText((ad ? '▶ ' : '') + label, x, y - 2);
    ctx.font = '500 13px system-ui, sans-serif'; ctx.globalAlpha = 0.85; ctx.fillText(sub, x, y + 17);
  } else { ctx.font = '800 24px system-ui, sans-serif'; ctx.fillText(label, x, y + 9); }
  ctx.restore();
  return b;
}
function badge(b) { // красная точка у правого верхнего угла — «есть что купить»
  b.badge = true;
  ctx.fillStyle = '#e3342f'; ctx.beginPath(); ctx.arc(b.x + b.w / 2 - 6, b.y - b.h / 2 + 6, 6, 0, 7); ctx.fill();
}
function titleScreen() {
  clearButtons(); dim(0.72);
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.font = '900 64px system-ui, sans-serif'; ctx.fillText(T('title'), W / 2, H * 0.34);
  ctx.font = '500 20px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
  [T('hint1'), T('hint2'), T('hint3'), T('hint4'), T('hint5')].forEach((l, i) => ctx.fillText(l, W / 2, H * 0.34 + 50 + i * 30));
  const sb = button('shop', W / 2, H * 0.62, 220, 52, T('shop'), '', false, 'neutral'); if (canBuyAny()) badge(sb);
  const p = 0.5 + Math.sin(tGame * 5) * 0.5;
  ctx.fillStyle = `rgba(255,224,138,${0.6 + p * 0.4})`; ctx.font = '800 26px system-ui, sans-serif';
  ctx.fillText(T('tapToJump'), W / 2, H * 0.74);
}
function resultsScreen(active) {
  clearButtons(); dim(0.72);
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.font = '900 64px system-ui, sans-serif'; ctx.fillText(T('fell'), W / 2, H * 0.30);
  ctx.font = '500 20px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const lines = [maxHeight + ' ' + T('m') + '  ·  ' + T('best') + ' ' + save.best + ' ' + T('m'), T('runCoins') + ': ' + runCoins + (usedDouble ? '  ×2' : ''), T('total') + ': ' + coins()];
  lines.forEach((l, i) => ctx.fillText(l, W / 2, H * 0.30 + 50 + i * 30));
  if (!active) return;
  let y = H * 0.56;
  if (!usedContinue) { button('continue', W / 2, y, 300, 60, T('continueAd'), T('forAd'), true); y += 76; }
  if (!usedDouble && runCoins >= DOUBLE_MIN_COINS) { button('double', W / 2, y, 300, 60, T('doubleAd'), T('forAd'), true); y += 76; }
  button('again', W / 2, y, 300, 60, T('again'), '', false);
  y += 76; const sb = button('shop', W / 2, y, 300, 60, T('shop'), '', false, 'neutral'); if (canBuyAny()) badge(sb);
}
let shopFlash = null; // { id, until } — подсветка рамки только что купленной карточки
function flashCard(id) { shopFlash = { id, until: tGame + 0.3 }; }
function upEffectText(id) { // «Прыжков: 4 → 5», «Радиус: нет → 60», на максимуме «Прыжков: 6»
  const lvl = upLevel(id), max = upMaxLevel(id);
  const fmt = v => (id === 'magnet' && v === 0) ? T('none') : String(v);
  const label = T('up.' + id + '.effect') + ': ' + fmt(upValue(id, lvl));
  return lvl >= max ? label : label + ' → ' + fmt(upValue(id, lvl + 1));
}
function shopScreen() {
  clearButtons(); dim(0.85);
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.font = '900 44px system-ui, sans-serif'; ctx.fillText(T('shop'), W / 2, H * 0.14);
  ctx.textAlign = 'right'; ctx.font = '700 22px system-ui, sans-serif'; ctx.fillStyle = '#ffe08a';
  ctx.fillText('● ' + coins(), W - 24, H * 0.14);
  Object.keys(UPGRADES).forEach((id, i) => {
    const cw = 400, ch = 150, x0 = W / 2 - cw / 2, y0 = H * (0.27 + i * 0.23) - ch / 2;
    const flash = shopFlash && shopFlash.id === id && tGame < shopFlash.until;
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; rrect(x0, y0, cw, ch, 16); ctx.fill();
    ctx.strokeStyle = flash ? '#ffe08a' : 'rgba(255,255,255,0.18)'; ctx.lineWidth = flash ? 4 : 2; rrect(x0, y0, cw, ch, 16); ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '800 24px system-ui, sans-serif'; ctx.fillText(T('up.' + id), x0 + 20, y0 + 38);
    ctx.font = '500 18px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText(upEffectText(id), x0 + 20, y0 + 68);
    const lvl = upLevel(id), max = upMaxLevel(id); // индикатор уровней
    for (let k = 0; k < max; k++) { ctx.fillStyle = k < lvl ? '#f6c343' : 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(x0 + 28 + k * 22, y0 + 112, 7, 0, 7); ctx.fill(); }
    const price = upPrice(id);
    if (price === null) button('buy:' + id, x0 + cw - 110, y0 + ch - 36, 200, 48, T('max'), '', false, 'dim');
    else button('buy:' + id, x0 + cw - 110, y0 + ch - 36, 200, 48, T('buy') + ' ' + price, '', false, canBuy(id) ? undefined : 'dim');
  });
  button('back', W / 2, H * 0.80, 220, 52, T('back'), '', false, 'neutral');
}
function pausedScreen(tapToContinue) {
  dim(0.6); ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.font = '900 48px system-ui, sans-serif'; ctx.fillText(T('paused'), W / 2, H * 0.45);
  if (tapToContinue) { ctx.font = '800 24px system-ui, sans-serif'; ctx.fillStyle = '#ffe08a'; ctx.fillText(T('tapToContinue'), W / 2, H * 0.53); }
}
function adStubScreen() {
  if (!YG.adStub) return;
  dim(0.85); ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.font = '800 30px system-ui, sans-serif'; ctx.fillText(T('adStub'), W / 2, H * 0.48);
  ctx.font = '500 18px system-ui, sans-serif'; ctx.fillText(YG.adStub.kind, W / 2, H * 0.53);
}
function loadingScreen() {
  beginField(); dim(1); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '600 22px system-ui, sans-serif'; ctx.fillText(T('loading'), W / 2, H * 0.5);
}
expose({ titleScreen, resultsScreen, pausedScreen, adStubScreen, loadingScreen, shopScreen, flashCard, upEffectText, get buttons() { return buttons; }, hitButton });
