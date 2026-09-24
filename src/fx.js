'use strict';
// ---------- эффекты: частицы, крошки, всплывающие тексты, куски мяса ----------
let particles = [], texts = [];
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
function loseMeat(fromX, fromY, n) { // куски фарша отлетают от Тефы
  for (let i = 0; i < n; i++) {
    const a = Math.atan2(ball.y - fromY, ball.x - fromX) + rnd(-1.2, 1.2), sp = rnd(180, 340);
    particles.push({ x: ball.x + Math.cos(a) * ball.r * 0.6, y: ball.y + Math.sin(a) * ball.r * 0.6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120,
      life: 1.1, t: 1.1, color: '#b9542f', size: ball.r * rnd(0.22, 0.34), g: 700, meat: true, rot: rnd(0, 6), rv: rnd(-8, 8) });
  }
}
function resetFx() { particles = []; texts = []; }
function updateFx(dt) {
  for (const p of particles) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; if (p.meat) p.rot += p.rv * dt; }
  particles = particles.filter(p => p.t > 0);
  for (const t of texts) t.t += dt;
  texts = texts.filter(t => t.t < 1);
}
expose({ popText, burst, resetFx, get particles() { return particles; }, get texts() { return texts; } });
