// node tools/shot.js — скриншоты в shots/ через node-canvas (npm i -D canvas). Агент обязан ПОСМОТРЕТЬ каждый PNG, а не описывать код.
const fs = require('fs'), path = require('path'), { createCanvas } = require('canvas');
const OUT = path.join(__dirname, '..', 'shots'); fs.mkdirSync(OUT, { recursive: true });
const bot = require('./bot');
async function shoot(name, w, h, scenario, opts = {}) {
  const real = createCanvas(w, h), ctx = real.getContext('2d');
  const g = require('./_env')(ctx, Object.assign({ width: w, height: h }, opts));
  if (opts.store) for (const k of Object.keys(opts.store)) g.store.set(k, opts.store[k]);
  await g.boot(); await scenario(g, g.dbg());
  fs.writeFileSync(path.join(OUT, name + '.png'), real.toBuffer('image/png')); console.log('shots/' + name + '.png');
}
const steps = (g, n) => { for (let i = 0; i < n; i++) g.step(); };
// подъём ботом по пути генератора до ряда rows в god-режиме, потом стоим на платформе
async function up(g, d, rows) { d.state = 'play'; d.setGod(true); bot.climb(g, d, { untilRow: rows, maxFrames: 6000 }); d.setGod(false); }
const tower2 = { store: { teft_save: JSON.stringify({ v: 4, earned: 40, spent: 0, up: {}, skins: [], skin: 'none', tower: 2, log: { 1: { r: 'A', t: 110 } }, cp: 0 }) } };
const towerN = n => ({ store: { teft_save: JSON.stringify({ v: 4, earned: 0, spent: 0, up: {}, skins: [], skin: 'none', tower: n, log: {}, cp: 0 }) } });
// тема башни (спека v2.2a §5–§6): Тефа двумя рядами ниже первой уникальности темы; фон, нижняя полоса и уникальность в кадре
const themeScene = type => async (g, d) => {
  const u = d.platforms.filter(p => p.type === type && p.row >= 3).sort((a, b) => a.row - b.row)[0];
  await up(g, d, Math.max(1, u.row - 2)); d.resetPours(1e9); d.resetFlies(); steps(g, 20); };
// плашка «Башня 2 · Холодильник» сразу после старта башни
const banner = async (g, d) => { d.state = 'play'; steps(g, 20); };
const tower3 = { store: { teft_save: JSON.stringify({ v: 4, earned: 120, spent: 0, up: {}, skins: [], skin: 'none', tower: 3, log: { 1: { r: 'S', t: 95.2 }, 2: { r: 'B', t: 150 } }, cp: 0 }) } };
const play = async (g, d) => { await up(g, d, 6); steps(g, 10); };
// башня 3: поднимаемся под первые лопасти генератора; нож, муху и налив масла для кадра ставим к камере (правка сцены, не рендера)
const hazards = async (g, d) => {
  const bl = d.hazards.find(h => h.type === 'blades'); await up(g, d, bl ? Math.max(1, Math.round((-bl.y - 60) / d.ROW_H) - 2) : 18);
  d.spawnFly(true); d.flies[0].warnT = 0; d.flies[0].x = 60; d.flies[0].y = d.ball.y - 60;
  // нож показывает отдельная сцена knife: он висит в пропасти, а не у лопастей
  d.resetPours(1e9); d.startPour(d.ball.x + 80); steps(g, 8); }; // один налив сцены, плановые выключены
const berserk = async (g, d) => { await up(g, d, 4); d.powerAdd(d.POWER_FULL); d.tryActivatePower(); d.spawnFly(false); d.flies[0].warnT = 0; d.flies[0].x = 380; d.flies[0].y = d.ball.y - 40; steps(g, 12); };
// нож башни 2 как его ставит генератор: Тефа на тарелке перед пропастью, нож над пропастью на линии полёта, в замахе вспыхивает
const knife = async (g, d) => {
  const k = d.hazards.find(h => h.type === 'knife'), start = d.platforms.find(p => Math.abs(p.y - (k.y + 115)) < 1);
  await up(g, d, start.row); d.resetPours(1e9); d.resetFlies(); k.t = 1.35; steps(g, 12); };
// шкала полна: шкалу добиваем настоящей едой, чтобы сработало событие — Тефа светится, над ней «Жми на молнию!», внизу справа кнопка берсерка
const charged = async (g, d) => { await up(g, d, 4); d.resetPours(1e9); d.power.v = d.POWER_FULL - 1; const it = d.items.find(i => !i.dead); it.x = d.ball.x; it.y = d.ball.y; steps(g, 20); };
// последний кусок: три укуса, испуганное лицо, красная пульсация
const lastPiece = async (g, d) => { await up(g, d, 4); d.resetPours(1e9); d.ball.mass = 1; steps(g, 70); };
// башня 3: Тефа на крошащемся сыре, соседний сыр уже пропал и видна пунктирная рамка
// бот встаёт на платформу пути прямо под сыром (не на сам сыр: тот раскрошился бы, пока сцена готовится), мух нет;
// Тефу роняем на сыр сверху — правка сцены, как нож в сцене опасностей; через 0.3 с сыр трескается, но ещё держит
const cheese = async (g, d) => {
  const c = d.platforms.find(p => p.type === 'cheese' && p.row >= 3 && d.tower.path.includes(p.id));
  const prev = d.platforms.find(p => p.id === d.tower.path[d.tower.path.indexOf(c.id) - 1]);
  await up(g, d, prev.row); d.resetPours(1e9); d.resetFlies();
  const b = d.ball; b.onPlatform = null; b.x = c.x; b.y = c.y - b.r - 40; b.vx = 0; b.vy = 150;
  for (let i = 0; i < 120 && b.onPlatform !== c.id; i++) g.step(); steps(g, 18);
  const other = d.platforms.find(p => p.type === 'cheese' && p !== c && Math.abs(p.y - c.y) < 450); if (other) { other.gone = true; other.backT = 2; } };
// налив: первый половник уже льёт — капли в воздухе, пятно шипит на платформе; второй только наклоняется, пунктир мигает
const pour = async (g, d) => {
  await up(g, d, 4); d.resetPours(1e9);
  const p = d.platforms.filter(q => q.id !== d.ball.onPlatform && q.type !== 'tray' && q.y - d.camY > 200 && q.y - d.camY < 800)
    .sort((a, b) => Math.abs(b.x - d.ball.x) - Math.abs(a.x - d.ball.x))[0]; // видимая платформа дальше всех от Тефы
  const fall = Math.round((p.y - d.camY - d.LADLE_Y - 6) / d.POUR_V * 60); // кадров от черпака до платформы
  d.startPour(p.x); steps(g, Math.round(d.POUR_WARN * 60) + fall + 6); d.startPour(d.ball.x > 240 ? d.ball.x - 150 : d.ball.x + 150); steps(g, 12); };
const dead = async (g, d) => { await up(g, d, 3); d.setRunCoins(23); d.die('fly'); steps(g, 60); };
const finish = async (g, d) => { d.state = 'play'; d.run.foodEaten = Math.round(d.run.foodTotal * 0.9); d.run.time = 80; d.setRunCoins(31); d.finishTower(); steps(g, 40); };
(async () => {
  await shoot('title', 480, 854, async g => { g.step(); });
  await shoot('title_cp', 480, 854, async g => { g.step(); }, { store: { teft_save: JSON.stringify({ v: 4, earned: 0, spent: 0, up: {}, skins: [], skin: 'none', tower: 2, log: { 1: { r: 'A', t: 120 } }, cp: 1 }) } });
  await shoot('play', 480, 854, play);
  await shoot('hazards', 480, 854, hazards, tower3);
  await shoot('berserk', 480, 854, berserk);
  await shoot('charged', 480, 854, charged);
  await shoot('last_piece', 480, 854, lastPiece);
  await shoot('cheese', 480, 854, cheese, tower3);
  await shoot('pour', 480, 854, pour);
  await shoot('knife', 480, 854, knife, tower2);
  await shoot('banner', 480, 854, banner, towerN(2));
  await shoot('theme_fridge', 480, 854, themeScene('shelf'), towerN(2));
  await shoot('theme_oven', 480, 854, themeScene('toaster'), towerN(3));
  await shoot('theme_sink', 480, 854, themeScene('bowl'), towerN(4));
  await shoot('theme_feast', 480, 854, themeScene('spatula'), towerN(5));
  await shoot('theme_kitchen2', 480, 854, themeScene('board'), towerN(6));
  await shoot('theme_sink_tall', 390, 844, themeScene('bowl'), towerN(4)); // высокий телефон: полоса до низа экрана
  await shoot('fly_warn', 480, 854, async (g, d) => { await up(g, d, 2); d.spawnFly(true); steps(g, 3); });
  await shoot('dead', 480, 854, dead);
  await shoot('finish', 480, 854, finish);
  await shoot('desktop', 1280, 720, play);
  await shoot('en_finish', 480, 854, finish, { lang: 'en-US' });
  await shoot('tr_dead', 480, 854, dead, { lang: 'tr-TR' });
})().catch(e => { console.error(e); process.exit(1); });
