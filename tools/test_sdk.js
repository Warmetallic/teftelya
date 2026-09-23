// node tools/test_sdk.js — YG: заглушка и фальшивый YaGames
const assert = require('assert');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });

// Фальшивый YaGames c журналом вызовов реального API
function fakeYaGames(log, opts = {}) {
  return { init: async () => ({
    environment: { i18n: { lang: opts.lang || 'en' }, app: { id: '1' } },
    features: { LoadingAPI: { ready: () => log.push('ready') }, GameplayAPI: { start: () => log.push('start'), stop: () => log.push('stop') } },
    adv: {
      showFullscreenAdv: ({ callbacks }) => { log.push('inter'); setTimeout(() => callbacks.onClose(!opts.adFails), 0); },
      showRewardedVideo: ({ callbacks }) => { log.push('reward'); setTimeout(() => { if (!opts.noReward) callbacks.onRewarded(); callbacks.onClose(); }, 0); },
    },
    on: (ev, cb) => log.push('on:' + ev), off: noop,
    getPlayer: async () => ({ _d: opts.cloud || {}, getData: async function () { return this._d; }, setData: async function (d) { this._d = d; log.push('setData'); } }),
    getStorage: async () => global.localStorage,
  }) };
}
module.exports = { fakeYaGames };
if (require.main !== module) return;

(async () => {
  { // заглушка: YaGames нет
    const g = require('./_env')(ctx); const YG = g.dbg().YG;
    await YG.init();
    assert.strictEqual(YG.isMock, true); assert.strictEqual(YG.lang, 'ru');
    YG.ready(); YG.ready(); assert.deepStrictEqual(YG.log, ['ready'], 'ready один раз');
    YG.gameplayStop(); YG.gameplayStart(); YG.gameplayStart(); YG.gameplayStop(); YG.gameplayStop();
    assert.deepStrictEqual(YG.log, ['ready', 'start', 'stop'], 'start/stop идемпотентны');
    YG.gameplayStart();
    const p = YG.showInterstitial();
    assert.strictEqual(YG.gameplayActive, false, 'реклама останавливает геймплей');
    assert.ok(YG.adStub && YG.adStub.kind === 'interstitial', 'заглушка показывает оверлей');
    assert.deepStrictEqual(await p, { shown: true }); assert.strictEqual(YG.adStub, null);
    assert.deepStrictEqual(await YG.showRewarded(), { rewarded: true });
    assert.strictEqual(await YG.getData(), null);
    await YG.setData({ v: 1, best: 5, coins: 7 });
    assert.deepStrictEqual(await YG.getData(), { v: 1, best: 5, coins: 7 }, 'облако-заглушка живёт в localStorage');
    YG.onPause(noop); YG.onResume(noop); // не падают без ysdk
  }
  { // реальный путь: фальшивый YaGames
    const log = []; const g = require('./_env')(ctx, { YaGames: fakeYaGames(log, { cloud: { best: 3 } }) }); const YG = g.dbg().YG;
    await YG.init();
    assert.strictEqual(YG.isMock, false); assert.strictEqual(YG.lang, 'en');
    YG.ready(); YG.gameplayStart(); YG.gameplayStop();
    assert.deepStrictEqual(log, ['ready', 'start', 'stop']);
    assert.deepStrictEqual(await YG.showInterstitial(), { shown: true });
    assert.deepStrictEqual(await YG.showRewarded(), { rewarded: true });
    assert.deepStrictEqual(await YG.getData(), { best: 3 });
    await YG.setData({ best: 9 }); assert.deepStrictEqual(await YG.getData(), { best: 9 });
    assert.ok(log.includes('setData'));
    YG.onPause(noop); assert.ok(log.includes('on:game_api_pause'));
  }
  { // реклама не показана / награды нет / init упал — промисы всё равно резолвятся
    const log = []; const g = require('./_env')(ctx, { YaGames: fakeYaGames(log, { adFails: true, noReward: true }) }); const YG = g.dbg().YG;
    await YG.init();
    assert.deepStrictEqual(await YG.showInterstitial(), { shown: false });
    assert.deepStrictEqual(await YG.showRewarded(), { rewarded: false });
    const g2 = require('./_env')(ctx, { YaGames: { init: async () => { throw new Error('boom'); } } }); const YG2 = g2.dbg().YG;
    await YG2.init(); assert.strictEqual(YG2.isMock, true, 'сбой init → заглушка');
    const g3 = require('./_env')(ctx, { YaGames: { init: () => new Promise(() => {}) } }); const YG3 = g3.dbg().YG;
    await YG3.init(); assert.strictEqual(YG3.isMock, true, 'зависший init → заглушка по таймауту');
  }
  { // тег /sdk.js уже отработал ошибкой до подписки: fetch того же URL даёт 404 → заглушка сразу, а не через sdkWaitMs
    const tag = { src: 'http://localhost/sdk.js', addEventListener: noop };
    const g = require('./_env')(ctx, { cfg: { sdkWaitMs: 5000 }, scriptTags: [tag], fetch: async () => ({ ok: false, status: 404 }) });
    const t0 = Date.now(); await g.dbg().YG.init();
    assert.strictEqual(g.dbg().YG.isMock, true); assert.ok(Date.now() - t0 < 1000, 'не ждали таймаут опроса: ' + (Date.now() - t0) + ' мс');
    const g2 = require('./_env')(ctx, { cfg: { sdkWaitMs: 5000 }, scriptTags: [tag], fetch: async () => { throw new Error('offline'); } });
    const t1 = Date.now(); await g2.dbg().YG.init(); assert.strictEqual(g2.dbg().YG.isMock, true); assert.ok(Date.now() - t1 < 1000, 'офлайн → заглушка сразу');
  }
  console.log('test_sdk ok');
})().catch(e => { console.error(e); process.exit(1); });
