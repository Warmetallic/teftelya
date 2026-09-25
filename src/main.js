'use strict';
// ---------- точка входа: загрузка, ввод, пауза, реклама между забегами, цикл ----------
const AD_INTERVAL = 180; // секунд между межстраничными показами — свой лимит поверх лимитов Яндекса
const BZ_TAP = 12;        // кнопка берсерка ловит тап чуть шире своего круга
let booted = false, paused = false, awaitTap = false, adBusy = false;
let plays = 0, lastAdAt = 0, sessionT = 0; // lastAdAt = 0: первые AD_INTERVAL секунд сессии без межстраничной — осознанная отсрочка
async function boot() {
  await YG.init();
  setLang(YG.lang);
  await loadSave();
  startTower(save.tower, save.cp); state = 'title';
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
// общий каркас показа рекламы: блокируем ввод и цикл, глушим звук; если вкладку скрыли во время рекламы — после неё пауза
async function showAd(fn) {
  adBusy = true; muteAudio();
  let r; try { r = await fn(); } finally { adBusy = false; unmuteAudio(); }
  if (document.hidden) pauseGame();
  return r;
}
// старт забега: 'start' с титула, 'cp' с чекпоинта, 'restart' заново, 'next' следующая башня. Межстраничная — не на первом старте сессии и не чаще AD_INTERVAL
async function goPlay(kind) {
  plays++;
  if (plays > 1 && sessionT - lastAdAt >= AD_INTERVAL) { const r = await showAd(() => YG.showInterstitial()); if (r.shown) lastAdAt = sessionT; }
  if (kind === 'cp') restartFromCp(); else if (kind === 'restart') restartTower(); else if (kind === 'next') nextTower(); else state = 'play';
  YG.gameplayStart();
}
async function tryContinue() {
  if (run.usedContinue) return;
  const r = await showAd(() => YG.showRewarded());
  if (r.rewarded) { lastAdAt = sessionT; continueRun(); YG.gameplayStart(); }
}
async function tryDouble() {
  if (run.usedDouble || run.runCoins < DOUBLE_MIN_COINS) return;
  const r = await showAd(() => YG.showRewarded());
  if (r.rewarded) { lastAdAt = sessionT; doubleCoins(); }
}
// --- ввод ---
function onTap(x, y) {
  if (!booted || adBusy || paused) return;
  audio();
  if (awaitTap) { awaitTap = false; YG.gameplayStart(); return; } // первый тап после паузы — не прыжок
  if (state === 'play') { // тап по кнопке берсерка (видна при полной шкале) — суперсила, иначе прыжок в точку (тап по боковой зоне = у края поля)
    if (!ball.alive) return;
    if (powerReady() && Math.hypot(x - BZ_BTN.x, y - BZ_BTN.y) <= BZ_BTN.r + BZ_TAP) { tryActivatePower(); return; }
    jumpTo(clamp(x, 0, W), y + camY); return;
  }
  if (state !== 'title' && tGame < 0.6) return;
  const b = hitButton(x, y); if (!b) return;
  if (b.id === 'play') goPlay('start');
  else if (b.id === 'continue') tryContinue();
  else if (b.id === 'cp') goPlay('cp');
  else if (b.id === 'restart') goPlay('restart');
  else if (b.id === 'double') tryDouble();
  else if (b.id === 'next') goPlay('next');
}
cv.addEventListener('pointerdown', e => { e.preventDefault(); const [x, y] = toGame(e); onTap(x, y); });
cv.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  if (e.repeat) return;
  const left = e.code === 'ArrowLeft' || e.code === 'KeyA', right = e.code === 'ArrowRight' || e.code === 'KeyD';
  const up = e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Enter', act = e.code === 'KeyE';
  if (!left && !right && !up && !act) return;
  e.preventDefault();
  if (!booted || adBusy || paused) return;
  if (awaitTap) { onTap(W / 2, H / 2); return; }
  if (state === 'play') { if (!ball.alive) return; if (act) { tryActivatePower(); return; } jumpTo(left ? ball.x - 170 : right ? ball.x + 170 : ball.x, ball.y - (up ? 300 : 150)); return; } // E — суперсила
  if (up) { const id = state === 'title' ? 'play' : state === 'dead' ? (run.cp > 0 ? 'cp' : 'restart') : 'next'; const b = buttons.find(b => b.id === id); if (b) onTap(b.x, b.y); }
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
  if (state === 'dead') deadScreen(tGame > 0.6);
  if (state === 'finish') finishScreen(tGame > 0.6);
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
expose({ get paused() { return paused; }, get awaitTap() { return awaitTap; }, get adBusy() { return adBusy; }, forceAdReady() { lastAdAt = -1e9; }, pauseGame, resumeGame, goPlay });
// старт загрузки: в продакшене сразу при загрузке скрипта; тесты ставят CFG.manualBoot и зовут startBoot() сами
function startBoot() { if (!DBG.boot) DBG.boot = boot().catch(e => { console.error('boot failed', e); booted = true; if (!tower) startTower(1, 0); state = 'title'; YG.ready(); }); return DBG.boot; }
expose({ startBoot });
if (!CFG.manualBoot) startBoot();
// ?camdbg — ползунки камеры для подбора ощущения на плейтесте; найденные числа потом переносятся в CAM (game.js)
function camDebugPanel() {
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9;background:rgba(0,0,0,.75);color:#fff;font:13px system-ui;padding:8px 10px;border-radius:8px';
  for (const [k, min, max, step, label] of [['smooth', 0.05, 1, 0.01, 'плавность, с'], ['anchor', 0.4, 0.8, 0.01, 'где стоит Тефа (доля экрана сверху)'], ['win', 0, 0.4, 0.01, 'окно сверху (доля экрана)']]) {
    const row = document.createElement('label'), inp = document.createElement('input'), val = document.createElement('span');
    row.style.cssText = 'display:block;margin:2px 0'; inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = CAM[k]; inp.style.verticalAlign = 'middle';
    const show = () => { val.textContent = ' ' + label + ': ' + CAM[k]; }; inp.oninput = () => { CAM[k] = +inp.value; show(); }; show();
    row.append(inp, val); box.append(row);
  }
  document.body.append(box);
}
if (typeof location !== 'undefined' && /camdbg/.test(location.search)) camDebugPanel();
