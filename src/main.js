'use strict';
// ---------- точка входа: загрузка, ввод, пауза, реклама между забегами, цикл ----------
const AD_INTERVAL = 180; // секунд между межстраничными показами — свой лимит поверх лимитов Яндекса
let booted = false, paused = false, awaitTap = false, adBusy = false;
let restarts = 0, lastAdAt = 0, sessionT = 0; // lastAdAt = 0: первые AD_INTERVAL секунд сессии без межстраничной — осознанная отсрочка

async function boot() {
  await YG.init();
  setLang(YG.lang);
  await loadSave();
  reset(); state = 'title';
  YG.onPause(pauseGame); YG.onResume(resumeGame);
  booted = true;
  draw();       // титул на экране — игра готова к взаимодействию
  YG.ready();
}
// --- пауза: событие SDK, скрытие вкладки, потеря фокуса; во время рекламы игнорируется ---
function pauseGame() {
  if (paused || adBusy) return;
  paused = true; muteAudio();
  if (state === 'play') YG.gameplayStop();
}
function resumeGame() {
  if (!paused) return;
  paused = false; unmuteAudio();
  if (state === 'play' && ball.alive) awaitTap = true; // в забег возвращаемся только по тапу
}
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); else resumeGame(); });
window.addEventListener('blur', pauseGame);
window.addEventListener('focus', resumeGame);
// --- переходы между забегами с рекламой ---
// общий каркас показа рекламы: блокируем ввод и цикл, глушим звук; если вкладку скрыли во время рекламы — после неё пауза
async function showAd(fn) {
  adBusy = true; muteAudio();
  let r; try { r = await fn(); } finally { adBusy = false; unmuteAudio(); }
  if (document.hidden) pauseGame();
  return r;
}
async function restart() {
  restarts++;
  if (restarts > 1 && sessionT - lastAdAt >= AD_INTERVAL) {
    const r = await showAd(() => YG.showInterstitial());
    if (r.shown) lastAdAt = sessionT;
  }
  reset(); state = 'play'; YG.gameplayStart();
}
async function tryContinue() {
  if (usedContinue) return;
  const r = await showAd(() => YG.showRewarded());
  if (r.rewarded) { lastAdAt = sessionT; continueRun(); YG.gameplayStart(); }
}
async function tryDouble() {
  if (usedDouble || runCoins < DOUBLE_MIN_COINS) return;
  const r = await showAd(() => YG.showRewarded());
  if (r.rewarded) { lastAdAt = sessionT; doubleCoins(); }
}
// --- ввод ---
function onTap(x, y) {
  if (!booted || adBusy || paused) return;
  audio();
  if (awaitTap) { awaitTap = false; YG.gameplayStart(); return; } // первый тап после паузы — не прыжок
  if (state === 'title') { state = 'play'; YG.gameplayStart(); jump(x < ball.x ? -1 : 1); return; }
  if (state === 'dead') {
    if (tGame < 0.6) return;
    const b = hitButton(x, y); if (!b) return;
    if (b.id === 'again') restart();
    else if (b.id === 'continue') tryContinue();
    else if (b.id === 'double') tryDouble();
    return;
  }
  if (state === 'play' && ball.alive) jump(clamp(x, 0, W) < ball.x ? -1 : 1); // тап по боковой зоне = у края поля
}
cv.addEventListener('pointerdown', e => { e.preventDefault(); const [x, y] = toGame(e); onTap(x, y); });
cv.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  if (e.repeat) return;
  const left = e.code === 'ArrowLeft' || e.code === 'KeyA', right = e.code === 'ArrowRight' || e.code === 'KeyD';
  const up = e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Enter';
  if (!left && !right && !up) return;
  e.preventDefault();
  if (state === 'dead') { if (up) { const b = buttons.find(b => b.id === 'again'); if (b) onTap(b.x, b.y); } return; }
  onTap(left ? ball.x - 10 : right ? ball.x + 10 : ball.x + (ball.vx >= 0 ? 10 : -10), 0);
});
// --- кадр ---
function draw() {
  beginField();
  drawBg();
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip(); ctx.translate(shakeX, shakeY);
  drawWorld();
  ctx.restore();
  if (state === 'play') drawHUD();
  if (state === 'title') titleScreen();
  if (state === 'dead') resultsScreen(tGame > 0.6);
  if (paused || awaitTap) pausedScreen(awaitTap && !paused);
  adStubScreen();
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, Math.max(0, (now - last) / 1000)); last = now;
  if (booted) {
    if (!paused && !awaitTap && !adBusy) { update(dt); sessionT += dt; }
    draw();
  } else loadingScreen();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
expose({
  get paused() { return paused; }, get awaitTap() { return awaitTap; }, get adBusy() { return adBusy; },
  forceAdReady() { lastAdAt = -1e9; }, pauseGame, resumeGame,
});
// старт загрузки: в продакшене сразу при загрузке скрипта; тесты ставят CFG.manualBoot и зовут startBoot() сами
function startBoot() { if (!DBG.boot) DBG.boot = boot(); return DBG.boot; }
expose({ startBoot });
if (!CFG.manualBoot) startBoot();
