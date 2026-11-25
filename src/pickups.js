'use strict';
const PARSLEY_TIME = 10;
const PICKUP_COLORS = { sauce: '#9ad9f5', parsley: '#a6e397' };

// Each twenty-row section gets one pickup in each half. Use a separate random
// stream so adding these never changes an existing route or food score.
function placePickups(level, seed) {
  const rng = towerRng(level.tp.N, seed, 45083);
  const byId = new Map(level.platforms.map(p => [p.id, p]));
  const route = level.path.map(id => byId.get(id));
  const pickups = [];
  for (let row = 0; row < level.tp.rows; row += 10) {
    const ledges = route.filter(p => p.row >= row + 3 && p.row <= row + 9 && !p.cp && !p.roof && !p.room && p.type !== 'tray');
    const clear = ledges.filter(p => !level.hazards.some(h => h.host === p.id || Math.hypot(h.x-p.x, h.y-p.y+52) < 100));
    if (!clear.length) continue;
    const host = clear[Math.floor(rng() * clear.length)];
    const positions = [host.x,host.x-host.w*.25,host.x+host.w*.25];
    const y = host.y - 66;
    const clearance = x => level.items.reduce((min,it) => Math.min(min,Math.hypot(it.x-x,it.y-y)),Infinity);
    const x = positions.reduce((best,next) => clearance(next)>clearance(best)?next:best);
    pickups.push({kind:row%20===0?'sauce':'parsley', x,y, dead:false, host:host.id});
  }
  const pantry = route.find(p => p.room === 'pantry');
  if (pantry) pickups.push({kind:'sauce',x:pantry.x, y:pantry.y-122, host:pantry.id,dead:false});
  return pickups;
}

function collectPickup(p) {
  p.dead = true;
  if (p.kind === 'sauce') run.shield = true;
  else {
    // A second sprig refreshes the duration; it cannot refill spent air jumps.
    if (run.parsleyTime <= 0) ball.charges++;
    run.parsleyTime = PARSLEY_TIME;
  }
  const color = PICKUP_COLORS[p.kind];
  burst(p.x,p.y,color,10,160,.4,3);
  popText(p.x,p.y-25,T('pickup.'+p.kind),color,true);
  tone(440,720,.13,'triangle',.12);
}

function drawPickupIcon(kind) {
  if (kind === 'sauce') {
    ctx.rotate(-.17);
    ctx.beginPath(); ctx.moveTo(-13,-18); ctx.lineTo(12,-18); ctx.lineTo(10,-10);
    ctx.quadraticCurveTo(15,1,11,13); ctx.lineTo(13,18); ctx.lineTo(-12,18);
    ctx.lineTo(-10,11); ctx.quadraticCurveTo(-14,0,-10,-10); ctx.closePath();
    trapFinish('#83bcca','#283f48',2);
    trapLine([[-10,-14],[9,-14]],'#e4f0df',2);
    trapLine([[-9,14],[9,14]],'#4b7480',2);
    ctx.beginPath(); ctx.moveTo(-7,-6); ctx.quadraticCurveTo(0,-5,0,-8);
    ctx.lineTo(7,-5); ctx.lineTo(6,2); ctx.quadraticCurveTo(4,7,0,9);
    ctx.quadraticCurveTo(-7,6,-7,0); ctx.closePath(); trapFinish('#f2e3bd','#466673',1.4);
  } else {
    const stems = [[-9,-5],[2,-13],[11,-4]];
    for (const [x,y] of stems) {
      trapLine([[-5,16],[0,3],[x,y]],'#35563a',4);
      trapLine([[-5,16],[0,3],[x,y]],'#b3cd83',1.6);
      ctx.save(); ctx.translate(x,y); ctx.rotate(x*.055);
      ctx.beginPath(); ctx.moveTo(0,5); ctx.quadraticCurveTo(-9,2,-8,-5);
      ctx.lineTo(-4,-4); ctx.lineTo(-3,-10); ctx.lineTo(0,-7);
      ctx.lineTo(4,-11); ctx.lineTo(5,-5); ctx.lineTo(9,-5);
      ctx.quadraticCurveTo(9,1,0,5); trapFinish('#67b560','#284b37',1.4); ctx.restore();
    }
  }
}

function drawPickup(p) {
  const y=p.y-camY;
  if (p.dead || y < -40 || y > H+35) return;
  ctx.save(); ctx.translate(p.x,y+Math.sin(tGame*3+p.host)*2);
  ctx.shadowColor='#332e25'; ctx.shadowBlur=4; drawPickupIcon(p.kind); ctx.restore();
}

function drawPickupStatus() {
  let x=17;
  for (const kind of ['sauce','parsley']) {
    if (kind==='sauce' ? !run.shield : run.parsleyTime<=0) continue;
    const width = kind==='sauce'?35:70;
    ctx.save(); ctx.fillStyle='rgba(31,35,30,.86)'; rrect(x,52,width,31,9); ctx.fill();
    ctx.translate(x+17,68); ctx.scale(.62,.62); drawPickupIcon(kind); ctx.restore();
    if(kind==='parsley') {
      ctx.textAlign='center';ctx.fillStyle='#d4efb7';ctx.font='bold 16px system-ui';
      ctx.fillText(T('seconds', Math.ceil(run.parsleyTime)),x+48,73);
    }
    x+=width+5;
  }
}
