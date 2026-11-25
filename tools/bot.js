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
    const on = d.platforms.find(p => p.id === b.onPlatform);
    st.on = on; st.planned = false;
    if (on && on.type === 'spatula') return false; // лопатка подбросит сама: ждём и подруливаем у вершины
    if (b.stuck) return d.jumpTo(b.x, b.y);        // миска: первый тап отлепляет
    const next = nextOnPath(d); if (!next) return false;
    st.next = next; st.second = false; st.planned = true;
    const plan = d.jumpPlan(b.x, b.y, b.r, aimX(next), next.y); // один прыжок или два — как считает игра (ball.js)
    st.double = plan.double;
    return d.jumpTo(plan.tx, plan.ty);
  }
  if (st.double && !st.second && st.next && b.vy >= -30) { st.second = true; return d.jumpTo(aimX(st.next), st.next.y); } // второй — у вершины
  if (!st.planned && st.on && b.vy >= -30) { // подбросило (лопатка, тостер): у вершины прыжок к следующей видимой платформе пути —
    // камера ушла вверх вслед за подбросом, и ближние платформы под нижней полосой уже не спасают (спека v2.2a §4)
    const path = d.tower.path, bandTop = d.camY + 854 - d.BAND_H; let i = path.indexOf(st.on.id) + 1, next;
    while ((next = d.platforms.find(p => p.id === path[i])) && next.y > bandTop - 80) i++;
    st.planned = true; if (!next) return false;
    const plan = d.jumpPlan(b.x, b.y, b.r, aimX(next), next.y); st.next = next; st.double = plan.double; st.second = false;
    return d.jumpTo(plan.tx, plan.ty);
  }
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

// Full-game playtest. Uses only the normal jump, power and free retry controls.
// Pick a landing from visible ledges; keep a charge for correcting a hit or a missed tray.
function liveLanding(d, attempt) {
  const b = d.ball, here = b.y + b.r;
  const reach = b.charges > 1 ? 480 : 252;
  let best = null;
  for (const p of d.platforms) {
    const rise = here - p.y;
    if (p.gone || rise < 25 || rise > reach || p.y < d.camY + 12) continue;
    if (b.charges === 1 && d.jumpPlan(b.x, b.y, b.r, aimX(p), p.y).double) continue;
    const x = aimX(p);
    let score = rise - Math.abs(x - b.x) * .12;
    if (p.cp > d.run.cp || p.roof) score += 600;
    if (p.type === 'spatula' || p.type === 'gum') score -= 85;
    if (p.type === 'cheese' && p.crumbleT) score -= 160;
    if (d.hazards.some(h => !h.gone && h.host === p.id && h.type === 'rat')) score -= 225;
    if (d.hazards.some(h => h.type === 'blades' && Math.hypot(x-h.x,p.y-b.r-h.y) < b.r+55)) score -= 95;
    score += Math.sin(p.row + attempt) * attempt * 6;
    if (!best || score > best.score) best = {p, score};
  }
  return best?.p;
}
function climbLive(d, maxRetries = 12) {
  const b = d.ball;
  let target, apexTap = false, mass = b.mass, retries = 0, segmentRetries = 0, cp = 0;
  for (let frame = 0; frame < 100000 && d.state !== 'finish'; frame++) {
    if (d.state === 'dead') {
      if (++segmentRetries > maxRetries) break;
      retries++;
      if (d.run.cp) d.restartFromCp(); else d.restartTower();
      target = null; mass = b.mass;
    }
    if (d.run.cp > cp) { cp = d.run.cp; segmentRetries = 0; }
    const hit = b.mass < mass; mass = b.mass;
    if (d.powerReady() && (b.mass < d.massMax() || hit)) d.tryActivatePower();
    if (b.onPlatform !== null || hit) {
      target = liveLanding(d, segmentRetries);
      if (target) {
        const plan = d.jumpPlan(b.x,b.y,b.r,aimX(target),target.y);
        apexTap = plan.double;
        if (!hit && segmentRetries && b.onPlatform !== null && !b.stuck) {
          const speed = d.tower.tp.speedMul * (d.tower.tp.effects.sharp ? 1.15 : 1);
          const knives = d.hazards.filter(h => h.type === 'knife' && !h.gone &&
            h.y > target.y - 320 && h.y < b.y + 100);
          const path = knives.length ? d.flightPath(b.x,b.y,b.r,aimX(target),target.y) : [];
          const blocked = path.some(([x,y], i) => knives.some(h => {
            if (Math.abs(x-h.x) >= b.r+9 || Math.abs(y-h.by) > 210) return false;
            const t = h.t + (i+1)*speed/60;
            return d.knifePhase(t).phase === 'strike' && Math.abs(y - d.knifeY({...h,t}) - 40) < b.r+42;
          }));
          if (blocked && d.run.campT < 1.35) {
            d.update(1 / 60); continue;
          }
        }
        d.jumpTo(plan.tx,plan.ty);
      }
    } else if (apexTap && target && b.vy > -30) {
      apexTap = false; d.jumpTo(aimX(target), target.y);
    } else if (b.charges && b.vy > 100 && (!target || b.y + b.r > target.y + 6)) {
      target = liveLanding(d, segmentRetries) || target;
      if (target) {
        const plan = d.jumpPlan(b.x,b.y,b.r,aimX(target),target.y);
        apexTap = plan.double && b.charges > 1; d.jumpTo(plan.tx, plan.ty);
      }
    }
    d.update(1 / 60);
  }
  return { state: d.state, retries };
}
module.exports.climbLive = climbLive;
