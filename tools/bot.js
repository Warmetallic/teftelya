// tools/bot.js — бот проходит башню по безопасному пути генератора настоящей физикой игры: прицел, полёт, посадка.
// Прыжок с платформы и не больше одного в воздухе. Опасности и мух отключает вызывающий: opts.noHazards — все,
// opts.keep — оставить только перечисленные типы опасностей; opts.stats.hits считает удары (кадры, где масса убыла).
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
    const plan = d.jumpPlan(b.x, b.y, b.r, aimX(next), next.y); // один прыжок или два — как считает игра (ball.js)
    st.double = plan.double;
    return d.jumpTo(plan.tx, plan.ty);
  }
  if (st.double && !st.second && st.next && b.vy >= -30) { st.second = true; return d.jumpTo(aimX(st.next), st.next.y); } // второй — у вершины
  return false;
}
// подъём до крыши (или до ряда opts.untilRow); g — стенд с кадрами (g.step), без него шаги update(1/60)
function climb(g, d, opts = {}) {
  const st = {}, max = opts.maxFrames || 80000;
  let mass = d.ball.mass;
  for (let i = 0; i < max && d.state === 'play'; i++) {
    if (opts.noHazards) { d.hazards.length = 0; d.resetFlies(); }
    if (opts.keep) { const kept = d.hazards.filter(h => opts.keep.includes(h.type)); d.hazards.length = 0; d.hazards.push(...kept); d.resetFlies(); }
    if (opts.stats) { if (d.ball.mass < mass) opts.stats.hits = (opts.stats.hits || 0) + 1; mass = d.ball.mass; }
    if (opts.untilRow !== undefined) { const p = d.platforms.find(q => q.id === d.ball.onPlatform); if (p && p.row >= opts.untilRow) break; }
    botAct(d, st);
    if (g) g.step(); else d.update(1 / 60);
  }
  return d.state;
}
module.exports = { botAct, climb, aimX, nextOnPath };
