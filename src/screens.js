'use strict';
// ---------- экраны и кнопки: титул, смерть, финиш, пауза, заглушка рекламы, загрузка ----------
const buttons = []; // кнопки текущего кадра: { id, x, y, w, h, label, sub, ad }
const RANK_COLOR = { S: '#ffe08a', A: '#8ff0a4', B: '#9ad0ff', C: '#e6e6e6', D: '#ff9a8a' };
function clearButtons() { buttons.length = 0; }
function hitButton(x, y) { for (const b of buttons) if (Math.abs(x - b.x) <= b.w / 2 && Math.abs(y - b.y) <= b.h / 2) return b; return null; }
function dim(alpha) { const b = fieldBounds(); ctx.fillStyle = `rgba(20,12,8,${alpha})`; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); }
function fmtTime(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
// style: undefined — жёлтая основная; 'neutral' — светлая второстепенная; 'dim' — недоступная
function button(id, x, y, w, h, label, sub, ad, style) {
  const b = { id, x, y, w, h, label, sub, ad }; buttons.push(b);
  ctx.save();
  ctx.fillStyle = ad ? '#2e7d32' : style === 'neutral' ? '#ece6da' : style === 'dim' ? 'rgba(255,255,255,0.15)' : '#f6c343';
  rrect(x - w / 2, y - h / 2, w, h, 14); ctx.fill();
  ctx.fillStyle = ad ? '#fff' : style === 'dim' ? 'rgba(255,255,255,0.5)' : '#1b1410'; ctx.textAlign = 'center';
  if (sub) { ctx.font = '800 22px system-ui, sans-serif'; ctx.fillText((ad ? '▶ ' : '') + label, x, y - 2); ctx.font = '500 13px system-ui, sans-serif'; ctx.globalAlpha = 0.85; ctx.fillText(sub, x, y + 17); }
  else { ctx.font = '800 24px system-ui, sans-serif'; ctx.fillText(label, x, y + 9); }
  ctx.restore();
  return b;
}
function titleScreen() {
  clearButtons(); dim(0.6);
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.font = '900 56px system-ui, sans-serif'; ctx.fillText(T('tower') + ' ' + tower.tp.N, W / 2, H * 0.22);
  ctx.font = '600 22px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText(T('theme.' + tower.tp.theme), W / 2, H * 0.22 + 36);
  if (save.cp) { ctx.fillStyle = '#8ff0a4'; ctx.font = '600 18px system-ui, sans-serif'; ctx.fillText(T('checkpoint', save.cp), W / 2, H * 0.22 + 64); }
  ctx.font = '500 19px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
  [T('hint1'), T('hint2'), T('hint3')].forEach((l, i) => ctx.fillText(l, W / 2, H * 0.36 + i * 28));
  button('play', W / 2, H * 0.5, 260, 60, T('play'), '', false);
}
function deadScreen(active) {
  clearButtons(); dim(0.72);
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.font = '900 64px system-ui, sans-serif'; ctx.fillText(T('fell'), W / 2, H * 0.28);
  ctx.font = '600 22px system-ui, sans-serif'; ctx.fillStyle = '#ff7a6b'; ctx.fillText(T('die.' + run.reason), W / 2, H * 0.28 + 44);
  ctx.font = '500 20px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
  [T('runCoins') + ': ' + run.runCoins + (run.usedDouble ? '  ×2' : ''), T('total') + ': ' + coins()].forEach((l, i) => ctx.fillText(l, W / 2, H * 0.28 + 90 + i * 30));
  if (!active) return;
  let y = H * 0.56;
  if (!run.usedContinue) { button('continue', W / 2, y, 300, 60, T('continueAd'), T('forAd'), true); y += 76; }
  if (run.cp > 0) { button('cp', W / 2, y, 300, 60, T('fromCp'), T('checkpoint', run.cp), false); y += 76; }
  button('restart', W / 2, y, 300, 60, T('restart'), '', false, run.cp > 0 ? 'neutral' : undefined);
}
function finishScreen(active) {
  clearButtons(); dim(0.78);
  const N = tower.tp.N, rt = run.rating, tp = tower.tp;
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.font = '900 40px system-ui, sans-serif'; ctx.fillText(T('towerDone', N), W / 2, H * 0.17);
  const pop = Math.min(1, tGame * 3); ctx.save(); ctx.translate(W / 2, H * 0.33); ctx.scale(0.5 + pop * 0.5, 0.5 + pop * 0.5); // буква появляется с ударом
  ctx.fillStyle = RANK_COLOR[rt.letter]; ctx.font = '900 120px system-ui, sans-serif'; ctx.fillText(rt.letter, 0, 42); ctx.restore();
  ctx.font = '500 19px system-ui, sans-serif';
  const rows = [[rt.checks.noDeath, T('chk.noDeath')], [rt.checks.time, T('chk.time') + ' ' + fmtTime(run.time) + ' / ' + fmtTime(tp.par)],
    [rt.checks.food, T('chk.food') + ' ' + Math.round(100 * run.foodEaten / Math.max(1, run.foodTotal)) + '%']];
  rows.forEach(([ok, l], i) => { ctx.fillStyle = ok ? '#8ff0a4' : 'rgba(255,255,255,0.5)'; ctx.fillText((ok ? '✓ ' : '✗ ') + l, W / 2, H * 0.42 + i * 28); });
  ctx.fillStyle = '#ffe08a'; ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText(T('bonus') + ' +' + run.bonus + '   ● ' + run.runCoins + (run.usedDouble ? '  ×2' : ''), W / 2, H * 0.42 + 100);
  if (!active) return;
  let y = H * 0.62;
  if (!run.usedDouble && run.runCoins >= DOUBLE_MIN_COINS) { button('double', W / 2, y, 300, 60, T('doubleAd'), T('forAd'), true); y += 76; }
  button('next', W / 2, y, 300, 60, T('next'), '', false);
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
expose({ titleScreen, deadScreen, finishScreen, pausedScreen, adStubScreen, loadingScreen, fmtTime, get buttons() { return buttons; }, hitButton });
