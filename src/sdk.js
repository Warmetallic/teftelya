'use strict';
// ---------- Yandex Games SDK: единая обёртка YG над реальным ysdk или заглушкой ----------
const YG = {
  ysdk: null, isMock: true, lang: 'ru',
  gameplayActive: false, readySent: false,
  adStub: null,          // { kind: 'interstitial'|'rewarded', until } — оверлей заглушки рисует screens.js
  _player: null, _playerTried: false, _storage: null,
  log: [],               // журнал для тестов: 'ready' | 'start' | 'stop' | 'inter' | 'reward'
};
function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function _waitFor(pred, maxMs, stepMs = 50) {
  const t0 = Date.now();
  while (!pred()) { if (Date.now() - t0 >= maxMs) return false; await _sleep(Math.min(stepMs, maxMs)); }
  return true;
}
function _feature(name) { const f = YG.ysdk && YG.ysdk.features; return f && f[name]; }
YG.init = async function () {
  const has = await _waitFor(() => typeof window.YaGames !== 'undefined', CFG.sdkWaitMs);
  if (has) {
    try {
      YG.ysdk = await window.YaGames.init();
      YG.isMock = false;
      const env = YG.ysdk.environment;
      YG.lang = (env && env.i18n && env.i18n.lang) || 'ru';
      try { YG._storage = await YG.ysdk.getStorage(); } catch (e) { YG._storage = null; }
    } catch (e) { console.warn('YaGames.init failed, using stub', e); YG.ysdk = null; YG.isMock = true; }
  }
  if (YG.isMock) {
    const nav = (window.navigator && window.navigator.language) || 'ru';
    YG.lang = String(nav).slice(0, 2).toLowerCase();
  }
  if (!YG._storage) { try { YG._storage = window.localStorage || null; } catch (e) { YG._storage = null; } }
};
YG.ready = function () {
  if (YG.readySent) return;
  YG.readySent = true; YG.log.push('ready');
  try { const f = _feature('LoadingAPI'); if (f) f.ready(); } catch (e) {}
};
YG.gameplayStart = function () {
  if (YG.gameplayActive) return;
  YG.gameplayActive = true; YG.log.push('start');
  try { const f = _feature('GameplayAPI'); if (f) f.start(); } catch (e) {}
};
YG.gameplayStop = function () {
  if (!YG.gameplayActive) return;
  YG.gameplayActive = false; YG.log.push('stop');
  try { const f = _feature('GameplayAPI'); if (f) f.stop(); } catch (e) {}
};
YG._stubAd = async function (kind, ms) {
  YG.adStub = { kind, until: Date.now() + ms };
  await _sleep(ms);
  YG.adStub = null;
};
// Межстраничная. Сама останавливает геймплей; возобновление — задача вызывающего.
YG.showInterstitial = function () {
  YG.gameplayStop(); YG.log.push('inter');
  if (YG.isMock) return YG._stubAd('interstitial', CFG.adStubMs).then(() => ({ shown: true }));
  return new Promise(resolve => {
    let done = false; const fin = v => { if (!done) { done = true; resolve(v); } };
    try {
      YG.ysdk.adv.showFullscreenAdv({ callbacks: {
        onClose: wasShown => fin({ shown: !!wasShown }),
        onError: () => fin({ shown: false }),
      } });
    } catch (e) { fin({ shown: false }); }
  });
};
// Rewarded. Награда засчитывается только по onRewarded.
YG.showRewarded = function () {
  YG.gameplayStop(); YG.log.push('reward');
  if (YG.isMock) return YG._stubAd('rewarded', CFG.rewardedStubMs).then(() => ({ rewarded: true }));
  return new Promise(resolve => {
    let rewarded = false, done = false; const fin = () => { if (!done) { done = true; resolve({ rewarded }); } };
    try {
      YG.ysdk.adv.showRewardedVideo({ callbacks: {
        onRewarded: () => { rewarded = true; },
        onClose: () => fin(),
        onError: () => fin(),
      } });
    } catch (e) { fin(); }
  });
};
YG.onPause = function (cb) { try { if (YG.ysdk) YG.ysdk.on('game_api_pause', cb); } catch (e) {} };
YG.onResume = function (cb) { try { if (YG.ysdk) YG.ysdk.on('game_api_resume', cb); } catch (e) {} };
YG._getPlayer = async function () {
  if (YG._player || YG._playerTried || !YG.ysdk) return YG._player;
  YG._playerTried = true;
  try { YG._player = await YG.ysdk.getPlayer({ scopes: false }); } catch (e) { YG._player = null; }
  return YG._player;
};
const CLOUD_MOCK_KEY = 'teft_cloud_mock';
YG.getData = async function () {
  if (YG.isMock) {
    try { const s = YG._storage && YG._storage.getItem(CLOUD_MOCK_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }
  const p = await YG._getPlayer(); if (!p) return null;
  try { const d = await p.getData(); return d && Object.keys(d).length ? d : null; } catch (e) { return null; }
};
YG.setData = async function (obj) {
  if (YG.isMock) { try { if (YG._storage) YG._storage.setItem(CLOUD_MOCK_KEY, JSON.stringify(obj)); } catch (e) {} return; }
  const p = await YG._getPlayer(); if (!p) return;
  try { await p.setData(obj, true); } catch (e) { console.warn('setData failed', e); }
};
expose({ YG });
