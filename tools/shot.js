// node tools/shot.js — скриншоты в shots/ через node-canvas (npm i -D canvas).
// Агент обязан ПОСМОТРЕТЬ каждый PNG перед выдачей визуала, а не описывать код.
const fs = require('fs'), path = require('path'), { createCanvas } = require('canvas');
const OUT = path.join(__dirname, '..', 'shots'); fs.mkdirSync(OUT, { recursive: true });
async function shoot(name, w, h, scenario, opts = {}) {
  const real = createCanvas(w, h), ctx = real.getContext('2d');
  const g = require('./_env')(ctx, Object.assign({ width: w, height: h }, opts));
  if (opts.store) for (const k of Object.keys(opts.store)) g.store.set(k, opts.store[k]);
  await g.boot(); await scenario(g, g.dbg());
  fs.writeFileSync(path.join(OUT, name + '.png'), real.toBuffer('image/png')); console.log('shots/' + name + '.png');
}
const play = async (g, n = 120) => { g.tap(240); for (let i = 0; i < n; i++) { if (i % 20 === 0) g.tap(i % 40 ? 300 : 180); g.step(); } };
const dead = async (g, d) => { await play(g); d.setRunCoins(23); d.die(); for (let i = 0; i < 60; i++) g.step(); };
// магазин после забега: один уровень магнита куплен (80), на пятый заряд (60) хватает — жёлтая кнопка, на второй магнит (180) — нет (серая)
const shop = async (g, d) => { await dead(g, d); d.save.earned += 150; d.buy('magnet'); d.openShop('dead'); g.step(); };
// подход к люку первого этажа: буфет под ним, табличка «масса ≥ 4», тефтеля массы 3 чуть ниже
const hatch = async (g, d) => { g.tap(240); d.ball.mass = 3; d.ball.y = -1400; for (let i = 0; i < 8; i++) g.step(); d.ball.y = d.hatches[0].y + 260; d.ball.x = 240; d.ball.vx = 0; d.ball.vy = 0; for (let i = 0; i < 6; i++) { d.ball.vy = 0; g.step(); } };
const withFloors = { store: { teft_save: JSON.stringify({ v: 3, best: 420, earned: 0, spent: 0, up: { jumps: 0, magnet: 0 }, floor: 2, startFloor: 3, skin: 'none' }) } };
(async () => {
  await shoot('title', 480, 854, async g => { g.step(); });
  await shoot('play', 480, 854, async (g, d) => { await play(g); d.ball.mass = 6; d.ball.r = 55; d.ball.x = 240; d.ball.vx = 0; for (let i = 0; i < 12; i++) g.step(); });
  await shoot('results', 480, 854, dead);
  await shoot('paused', 480, 854, async g => { await play(g); g.fire('blur'); g.fire('focus'); g.step(); });
  await shoot('desktop', 1280, 720, async g => { await play(g); });
  await shoot('en_results', 480, 854, dead, { lang: 'en-US' });
  await shoot('shop', 480, 854, shop);
  await shoot('en_shop', 480, 854, shop, { lang: 'en-US' });
  await shoot('tr_shop', 480, 854, shop, { lang: 'tr-TR' });
  await shoot('tr_results', 480, 854, dead, { lang: 'tr-TR' });
  await shoot('hatch', 480, 854, hatch);
  await shoot('title_floors', 480, 854, async g => { g.step(); }, withFloors);
})().catch(e => { console.error(e); process.exit(1); });
