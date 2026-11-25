// node tools/shot.js — скриншоты в shots/ через node-canvas (npm i -D canvas). Агент обязан ПОСМОТРЕТЬ каждый PNG, а не описывать код.
const fs = require('fs'), path = require('path'), { createCanvas } = require('canvas');
const OUT = path.join(__dirname, '..', 'shots'); fs.mkdirSync(OUT, { recursive: true });
const bot = require('./bot');
const { loadArt } = require('./_art'); // картинки арта тем: без них снимки показывают старый фон
async function shoot(name, w, h, scenario, opts = {}) {
  if (process.argv.length > 2 && !process.argv.slice(2).includes(name)) return;
  const real = createCanvas(w, h), ctx = real.getContext('2d');
  const g = require('./_env')(ctx, Object.assign({ width: w, height: h }, opts));
  global.document.createElement = () => createCanvas(1, 1); // невидимые холсты: слои арта и кэш Тефы, как в браузере
  global.setInterval = () => 0; global.clearInterval = () => {}; // без таймера прогрева следующей темы: в Node каждое запекание — секунды, сцене оно не нужно
  if (opts.store) for (const k of Object.keys(opts.store)) g.store.set(k, opts.store[k]);
  await loadArt(g.dbg()); await g.boot(); await scenario(g, g.dbg());
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
  await shoot('theme_cellar', 480, 854, themeScene('gum'), towerN(4));
  await shoot('theme_feast', 480, 854, themeScene('spatula'), towerN(5));
  await shoot('theme_kitchen2', 480, 854, themeScene('board'), towerN(6));
  await shoot('theme_cellar_tall', 390, 844, themeScene('gum'), towerN(4)); // высокий телефон: полоса до низа экрана
  await shoot('fly_warn', 480, 854, async (g, d) => { await up(g, d, 2); d.spawnFly(true); steps(g, 3); });
  await shoot('dead', 480, 854, dead);
  await shoot('finish', 480, 854, finish);
  await shoot('pendulum_unlock', 480, 854, finish, towerN(5));
  await shoot('mousetrap_unlock', 480, 854, finish, towerN(6));
  await shoot('exam_finish',480,854,finish,towerN(10));
  for (const [n,type] of [[8,'burner'],[9,'tape'],[10,'mallet']]) {
    await shoot(type,480,854,(g,d) => {
      d.state='play'; d.run.bannerT=0; g.step();
      const h=d.hazards.find(h=>h.type===type);
      if (type==='tape') d.jumpTo(h.x,h.y);
      const ready = () => type==='tape' ? d.ball.tape===h : h.phase==='active' && h.time>=.15;
      for (let i=0;i<130 && !ready();i++) g.step();
      if (!ready()) throw Error('Кадр ловушки не достигнут: '+type);
      if (type==='tape') steps(g,68);
    },towerN(n));
  }
  await shoot('mousetrap', 480, 854, async (g, d) => {
    d.state = 'play'; d.run.bannerT = 0;
    const trap = d.hazards.find(h => h.type === 'mousetrap');
    d.jumpTo(trap.x, trap.y);
    for (let i = 0; i < 90 && trap.phase !== 'warn'; i++) g.step();
    if (trap.phase !== 'warn') throw Error('Мышеловка не взвелась после прыжка');
    steps(g, 16); d.jumpTo(240, trap.y - 120); steps(g, 8);
  }, towerN(7));
  await shoot('pendulum', 480, 854, async (g, d) => {
    d.state = 'play';
    steps(g, 122); // первое предупреждение прошло, тесак пересекает проём над стартовой площадкой
  }, towerN(6));
  const preview = n => ({store:{teft_save:JSON.stringify({v:5,worldSeed:n===21?40:42,tower:n})}});
  for (const [n,type] of [[11,'roller'],[12,'hood'],[13,'fork'],[14,'splash'],[15,'grater'],[16,'pair']]) {
    await shoot(type,480,854,(g,d)=>{
      d.state='play'; d.run.bannerT=0; d.resetPours(1e9);
      const h=d.hazards.find(h=>h.type===(type==='pair'?'pendulum':type));
      const phaseTime={roller:.40,splash:.47,pair:.58};
      for(let i=0;i<150 && !(h.phase==='active' && h.time>=(phaseTime[type] || 0));i++) g.step();
      if(h.phase!=='active') throw Error('Ловушка вне кадра: '+type);
    },preview(n));
  }
  for (const [n,name] of [[24,'tea_lift'],[29,'smoke_damper']]) {
    await shoot(name,480,854,async (g,d)=>{
      const button=d.buttons.find(b=>b.id==='play'); g.tap(button.x,button.y); steps(g,102);
      const p=d.platforms.find(p=>p.lesson);
      g.tap(p.x,p.y-d.camY);
      for (let i=0;i<130;i++) {
        g.step();
        if (d.ball.onPlatform===p.id && (n===29 || p.baseY-p.y>=54)) return;
      }
      throw Error('Не получилось приземлиться на '+p.type);
    },{store:{teft_save:JSON.stringify({v:6,worldSeed:42,tower:n})}});
  }
  for (const [n,cp,name] of [[18,1,'risk_choice'],[21,2,'pantry'],[21,0,'bakery']]) {
    await shoot(name,480,854,(g,d)=>{
      d.startTower(n,cp); d.state='play'; d.run.bannerT=0; d.resetPours(1e9); steps(g,4);
    },preview(n));
  }
  await shoot('exam_prize_tag',480,854,(g,d)=>{d.state='play';d.run.bannerT=0;g.step();},towerN(5));
  await shoot('exam_invitation',480,854,(g)=>g.step(),towerN(5));
  await shoot('exam_skin_reward',480,854,finish,towerN(5));
  const journalStore={store:{teft_save:JSON.stringify({v:5,tower:11,worldSeed:42,
    log:{1:{r:'B',t:86},4:{r:'A',t:97},5:{r:'S',t:111},9:{r:'B',t:127},10:{r:'S',t:138}}})}};
  await shoot('tower_journal',480,854,(g)=>g.step(),journalStore);
  await shoot('exam_wardrobe',480,854,(g,d)=>{
    g.step();const tap=id=>{const b=d.buttons.find(row=>row.id===id);g.tap(b.x,b.y);g.step();};
    tap('wardrobe');tap('skinNext');
  },journalStore);
  await shoot('sauce_pickup',480,854,(g,d)=>{
    d.state='play'; const p=d.tower.pickups.find(it=>it.kind==='sauce');
    const host=d.platforms.find(q=>q.id===p.host);
    const prev=d.platforms.find(q=>q.id===d.tower.path[d.tower.path.indexOf(host.id)-1]);
    d.ball.x=prev.x;d.landOn(prev);d.setCamY(prev.y-540);d.run.bannerT=0;g.step();
  },towerN(1));
  await shoot('exam_missed',480,854,async(g,d)=>{
    d.state='play';d.run.time=90;d.run.foodEaten=Math.floor(d.run.foodTotal*.55);d.finishTower();steps(g,45);
  },towerN(5));
  await shoot('upgrade_shop',480,854,(g,d)=>{
    g.step();const b=d.buttons.find(row=>row.id==='shop');g.tap(b.x,b.y);g.step();
  },tower2);
  await shoot('desktop', 1280, 720, play);
  await shoot('en_finish', 480, 854, finish, { lang: 'en-US' });
  await shoot('tr_dead', 480, 854, dead, { lang: 'tr-TR' });
})().catch(e => { console.error(e); process.exit(1); });
