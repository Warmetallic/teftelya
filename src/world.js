'use strict';
// ---------- мир забега: каталог предметов, спавн, частицы, всплывающие тексты ----------
const FOOD = {
  ketchup: { r: 15, mass: 1, coins: 1, jumps: 1, w: 5 },
  pasta:   { r: 17, mass: 1, coins: 2, jumps: 2, w: 4 },
  meat:    { r: 21, mass: 2, coins: 5, jumps: 3, w: 2 },
};
const TRASH = {
  hair: { r: 18, mass: -1, w: 5 },
  dirt: { r: 16, mass: -2, w: 3 },
  fly:  { r: 13, mass: -1, w: 3, moving: true },
};
function pick(tbl) {
  const keys = Object.keys(tbl); let sum = 0; keys.forEach(k => sum += tbl[k].w);
  let t = Math.random() * sum;
  for (const k of keys) { t -= tbl[k].w; if (t <= 0) return k; }
  return keys[0];
}
function colorOf(kind) { return { ketchup: '#e3342f', pasta: '#f6c343', meat: '#b5452b', hair: '#222', dirt: '#5a4a3a', fly: '#2b2b2b' }[kind]; }
// состояние мира; сбрасывает game.reset()
let camY = 0, spawnedTo = 0, tGame = 0;
let items = [], plates = [], particles = [], texts = [];
function spawn() {
  while (spawnedTo > camY - 300) {
    const gap = rnd(95, 150);
    spawnedTo -= gap;
    const h = -spawnedTo / 10;
    const trashP = clamp(0.12 + h / 5000, 0.12, 0.5);
    const count = 1 + (Math.random() < 0.55 ? 1 : 0) + (Math.random() < h / 3000 ? 1 : 0);
    const used = [];
    for (let i = 0; i < count; i++) {
      let x, tries = 0;
      do { x = rnd(40, W - 40); tries++; } while (used.some(u => Math.abs(u - x) < 90) && tries < 8);
      used.push(x);
      const isTrash = h > 8 && Math.random() < trashP;
      const key = isTrash ? pick(TRASH) : pick(FOOD);
      const def = isTrash ? TRASH[key] : FOOD[key];
      items.push({ kind: key, trash: isTrash, def, x, y: spawnedTo + rnd(-25, 25), r: def.r,
        vx: def.moving ? (Math.random() < 0.5 ? -1 : 1) * rnd(70, 140) : 0, seed: Math.random() * 10, dead: false });
    }
  }
}
function burst(x, y, color, n, spd = 220, life = 0.6, size = 4) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), s = rnd(spd * 0.3, spd);
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life, t: life, color, size: rnd(size * 0.6, size * 1.4), g: 500 });
  }
}
function crumbs(x, y) {
  for (let i = 0; i < 8; i++) particles.push({ x: x + rnd(-ball.r * 0.6, ball.r * 0.6), y, vx: rnd(-90, 90), vy: rnd(40, 160), life: 0.5, t: 0.5, color: '#a0472a', size: rnd(2, 5), g: 300 });
}
function popText(x, y, str, color, big = false) { texts.push({ x, y, str, color, t: 0, big }); }
function loseMeat(fromX, fromY, n) { // куски фарша отлетают от тефтели
  for (let i = 0; i < n; i++) {
    const a = Math.atan2(ball.y - fromY, ball.x - fromX) + rnd(-1.2, 1.2), sp = rnd(180, 340);
    particles.push({ x: ball.x + Math.cos(a) * ball.r * 0.6, y: ball.y + Math.sin(a) * ball.r * 0.6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120,
      life: 1.1, t: 1.1, color: '#b9542f', size: ball.r * rnd(0.22, 0.34), g: 700, meat: true, rot: rnd(0, 6), rv: rnd(-8, 8) });
  }
}
function updateFx(dt) {
  for (const p of particles) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; }
  particles = particles.filter(p => p.t > 0);
  for (const t of texts) t.t += dt;
  texts = texts.filter(t => t.t < 1);
}
Object.assign(DBG, { FOOD, TRASH, popText });
Object.defineProperty(DBG, 'camY', { get() { return camY; } });
Object.defineProperty(DBG, 'items', { get() { return items; } });
Object.defineProperty(DBG, 'plates', { get() { return plates; } });
