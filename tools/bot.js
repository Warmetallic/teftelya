// tools/bot.js — бот проходит башню по безопасному пути генератора настоящей физикой игры: прицел, полёт, посадка.
// Прыжок с платформы и не больше одного в воздухе. Опасности и мух отключает вызывающий (opts.noHazards).
const clampN = (v, a, b) => v < a ? a : v > b ? b : v;
const aimX = p => p.type === 'tray' ? (p.x0 + p.x1) / 2 : p.x; // поднос ловим в середине хода: за полёт он сдвинется не дальше 40 px
function nextOnPath(d) {
  const P = d.platforms, path = d.tower.path, cur = P.find(p => p.id === d.ball.onPlatform);
  if (!cur) return null;
  let i = path.indexOf(cur.id);
  if (i < 0) { const byId = new Map(P.map(p => [p.id, p])); i = path.findIndex(id => byId.get(id).row > cur.row) - 1; } // сошли с пути: догоняем его
  return P.find(p => p.id === path[i + 1]) || null;
}
// одно решение за кадр; st — память бота между кадрами
function botAct(d, st) {
  const b = d.ball;
  if (b.onPlatform !== null) {
    const next = nextOnPath(d); if (!next) return false;
    st.next = next; st.second = false;
    const tx = aimX(next), a = d.aimJump(b.x, b.y, b.r, tx, next.y), rise = b.y + b.r - next.y;
    st.double = !(rise <= d.JUMP_MAX_H - d.AIM_MARGIN && Math.abs(a.vx) < d.VX_MAX - 1);
    if (!st.double) return d.jumpTo(tx, next.y);
    return d.jumpTo(b.x + clampN((tx - b.x) * 0.5, -250, 250), b.y + b.r - 400); // первый из двух: вершина как можно выше, полпути вбок
  }
  if (st.double && !st.second && st.next && b.vy >= -30) { st.second = true; return d.jumpTo(aimX(st.next), st.next.y); } // второй — у вершины
  return false;
}
// подъём до крыши (или до ряда opts.untilRow); g — стенд с кадрами (g.step), без него шаги update(1/60)
function climb(g, d, opts = {}) {
  const st = {}, max = opts.maxFrames || 80000;
  for (let i = 0; i < max && d.state === 'play'; i++) {
    if (opts.noHazards) { d.hazards.length = 0; d.resetFlies(); }
    if (opts.untilRow !== undefined) { const p = d.platforms.find(q => q.id === d.ball.onPlatform); if (p && p.row >= opts.untilRow) break; }
    botAct(d, st);
    if (g) g.step(); else d.update(1 / 60);
  }
  return d.state;
}
module.exports = { botAct, climb, aimX, nextOnPath };
