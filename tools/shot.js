// node tools/shot.js — скриншоты в shots/ через node-canvas (npm i -D canvas). Агент обязан ПОСМОТРЕТЬ каждый PNG, а не описывать код.
const fs = require('fs'), path = require('path'), { createCanvas } = require('canvas');
const OUT = path.join(__dirname, '..', 'shots'); fs.mkdirSync(OUT, { recursive: true });
async function shoot(name, w, h, scenario, opts = {}) {
  const real = createCanvas(w, h), ctx = real.getContext('2d');
  const g = require('./_env')(ctx, Object.assign({ width: w, height: h }, opts));
  if (opts.store) for (const k of Object.keys(opts.store)) g.store.set(k, opts.store[k]);
  await g.boot(); await scenario(g, g.dbg());
  fs.writeFileSync(path.join(OUT, name + '.png'), real.toBuffer('image/png')); console.log('shots/' + name + '.png');
}
const steps = (g, n) => { for (let i = 0; i < n; i++) g.step(); };
// подъём по башне на n рядов в god-режиме, потом стоим на платформе
async function up(g, d, rows) { d.state = 'play'; d.setGod(true);
  for (let i = 0; i < 4000; i++) { const p = d.platforms.find(q => q.id === d.ball.onPlatform); if (p && p.row >= rows) break; if (p) { const n = d.platforms.filter(q => q.row === p.row + 1).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0]; d.jumpTo(n.x, n.y); } g.step(); }
  d.setGod(false); }
const tower3 = { store: { teft_save: JSON.stringify({ v: 4, earned: 120, spent: 0, up: {}, skins: [], skin: 'none', tower: 3, log: { 1: { r: 'S', t: 95.2 }, 2: { r: 'B', t: 150 } }, cp: 0 }) } };
const play = async (g, d) => { await up(g, d, 6); steps(g, 10); };
// генератор кладёт нож и лопасти по всей башне 3, а не рядом со строкой 18 — для читаемого кадра сносим один
// экземпляр каждого типа к камере (правка сцены, не рендера): иначе на скриншоте не видно ни ножа, ни лопастей.
const hazards = async (g, d) => { await up(g, d, 18); d.spawnFly(true); d.flies[0].warnT = 0; d.flies[0].x = 60; d.flies[0].y = d.ball.y - 60;
  const kn = d.hazards.find(h => h.type === 'knife'); if (kn) { kn.y = d.ball.y - 220; kn.by = kn.y - 150; kn.t = 1.8; }
  // лопасти генератор вешает в центр ряда и раздвигает дорожки этого ряда — повторяем это на ближайшем ряду-дорожке над Тефой
  const bl = d.hazards.find(h => h.type === 'blades'), cur = d.platforms.find(p => p.id === d.ball.onPlatform);
  if (bl && cur) {
    const row = Math.min(...d.platforms.filter(p => p.lane && p.row > cur.row).map(p => p.row));
    const lane = d.platforms.filter(p => p.lane && p.row === row);
    for (const p of lane) { const dx = (p.lane === 'L' ? Math.min(p.x, 140) : Math.max(p.x, 340)) - p.x; p.x += dx; if (p.type === 'tray') { p.x0 += dx; p.x1 += dx; } }
    bl.x = 240; bl.y = lane[0].y - 60;
  }
  for (const h of d.hazards) if (h.type === 'knife' && h !== kn) h.t = 1.8;
  steps(g, 8); };
const berserk = async (g, d) => { await up(g, d, 4); for (let i = 0; i < 12; i++) d.streakAdd(1); d.spawnFly(false); d.flies[0].warnT = 0; d.flies[0].x = 380; d.flies[0].y = d.ball.y - 40; steps(g, 12); };
const dead = async (g, d) => { await up(g, d, 3); d.setRunCoins(23); d.die('fly'); steps(g, 60); };
const finish = async (g, d) => { d.state = 'play'; d.run.foodEaten = Math.round(d.run.foodTotal * 0.9); d.run.time = 80; d.setRunCoins(31); d.finishTower(); steps(g, 40); };
(async () => {
  await shoot('title', 480, 854, async g => { g.step(); });
  await shoot('title_cp', 480, 854, async g => { g.step(); }, { store: { teft_save: JSON.stringify({ v: 4, earned: 0, spent: 0, up: {}, skins: [], skin: 'none', tower: 2, log: { 1: { r: 'A', t: 120 } }, cp: 1 }) } });
  await shoot('play', 480, 854, play);
  await shoot('hazards', 480, 854, hazards, tower3);
  await shoot('berserk', 480, 854, berserk);
  await shoot('fly_warn', 480, 854, async (g, d) => { await up(g, d, 2); d.spawnFly(true); steps(g, 3); });
  await shoot('dead', 480, 854, dead);
  await shoot('finish', 480, 854, finish);
  await shoot('desktop', 1280, 720, play);
  await shoot('en_finish', 480, 854, finish, { lang: 'en-US' });
  await shoot('tr_dead', 480, 854, dead, { lang: 'tr-TR' });
})().catch(e => { console.error(e); process.exit(1); });
