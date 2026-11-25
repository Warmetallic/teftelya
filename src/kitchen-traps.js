'use strict';
// Select families before placing props so a late tower still has room to breathe.
const TRAP_FAMILY = { pendulum:'timing', burner:'timing', mallet:'timing', mousetrap:'bait', tape:'flight',
  roller:'moving', hood:'flight', fork:'aim', splash:'moving', grater:'aim' };
function chooseTrapPool(n,seed) {
  const opened = TRAP_UNLOCKS.filter(u=>u.tower<=n).map(u=>u.type);
  if (!opened.length) return [];
  const rng=towerRng(n,seed,6723), choices=[];
  const debut=TRAP_UNLOCKS.find(u=>u.tower===n);
  if (debut) choices.push(debut.type);
  if (n===16 || n===17) choices.push('pendulum');
  if (n>=18) choices.push('fork');
  const count=Math.min(3,opened.length);
  while (choices.length<count) {
    const eligible=opened.filter(type=>!choices.some(p=>TRAP_FAMILY[p]===TRAP_FAMILY[type]));
    if (!eligible.length) break;
    choices.push(eligible[Math.floor(rng()*eligible.length)]);
  }
  return choices;
}
const KITCHEN_CYCLE = { roller:{warn:1.1,active:2.5,cool:0}, splash:{warn:1.05,active:1.68,cool:2.15} };
function addKitchenTraps(level,seed) {
  const {tp,platforms,hazards,items}=level;
  for (const {tower,type} of KITCHEN_UNLOCKS) {
    if (!tp.trapPool.includes(type) || hazards.some(h => h.type === type)) continue;
    const rng=towerRng(tp.N,seed,917*tower);
    const hosts=tp.N===tower ? [platforms[0]] : platforms.filter(p=>p.row>=6 && !p.room && !p.roof && !p.cp && p.type==='plate'
      && !hazards.some(h=>Math.abs(h.y-p.y)<240));
    if (!hosts.length) continue;
    const host=hosts[Math.floor(rng()*hosts.length)], dir=rng()<.5 ? 1 : -1;
    let x=dir>0 ? 19 : W-19, y=host.y;
    switch (type) {
      case 'roller': y-=16; break;
      case 'hood': y-=129; break;
      case 'fork': x=clamp(host.x+dir*(host.w/2+27),36,W-36); y-=18; break;
      case 'splash': x=dir>0 ? 38 : W-38; break;
      case 'grater': x=dir>0 ? 0 : W; y-=116; break;
    }
    hazards.push({type,host:host.id,id:30000+tower,dir,x,y,phase:'idle',time:0});
    items.push(mkFood(rng,clamp(type==='fork'? x-dir*40 : x+dir*78,30,W-30),y-54));
  }
}
function rollerPosition(h) {
  const t=h.phase==='active'?h.time:0, travel=248*t;
  const fall=Math.max(0,(travel-(W-88))/248);
  return {x:h.x+h.dir*travel, y:h.y+470*fall*fall};
}
function splashPosition(h,i) {
  const t=h.time-i*.19;
  if (h.phase!=='active' || t<0 || t>1.23) return null;
  return {x:h.x+h.dir*(10+t*(163+28*i)),y:h.y-25-(385+30*i)*t+390*t*t};
}
function graterAtWall(hazards,side,y,r) {
  return hazards.find(h=>h.type==='grater' && !h.gone && h.phase==='active' && h.dir===side && Math.abs(y-h.y)<50+r*.5);
}
function tickKitchenTrap(h,dt,env) {
  const cycle=KITCHEN_CYCLE[h.type];
  if (h.phase==='idle') {
    const y=h.y-env.camY;
    if (ball.onPlatform===null || y<25 || y>H-BAND_H || Math.abs(ball.y-h.y)>340) return;
    h.phase=cycle?'warn':'active'; h.time=0;
    if (cycle) tone(h.type==='roller'?205:340,h.type==='roller'?100:520,.19,'triangle',.07);
    return;
  }
  h.time+=dt;
  if (cycle && h.time>=cycle[h.phase]) {
    h.time=0;
    if (h.phase==='active' && h.type==='roller') { h.gone=true; return; }
    h.phase=h.phase==='warn'?'active':h.phase==='active'?'cool':'idle';
    h.hit=false;
  }
  if (h.phase!=='active') return;
  if (h.type==='hood') {
    const along=(ball.x-h.x)*h.dir;
    if (along>0 && along<208 && Math.abs(ball.y-h.y)<32 && ball.onPlatform===null && !ball.tape && !env.berserk)
      ball.vx=clamp(ball.vx+h.dir*285*dt,-VX_MAX,VX_MAX);
    return;
  }
  if (h.type==='grater' || (env.invuln && !env.berserk) || (h.hit && !env.berserk)) return;
  let contact=false;
  if (h.type==='roller') {
    const p=rollerPosition(h), dx=Math.max(0,Math.abs(ball.x-p.x)-22);
    contact=Math.hypot(dx,ball.y-p.y)<ball.r+12;
  } else if (h.type==='fork') {
    contact=[-13,-4.5,4.5,13].some(x=>Math.hypot(ball.x-h.x-x,ball.y-h.y-clamp(ball.y-h.y,-69,-42))<ball.r+1.5);
  } else if (h.type==='splash') {
    for (let i=0;i<3;i++) {
      const p=splashPosition(h,i);
      if (p && Math.hypot(ball.x-p.x,ball.y-p.y)<ball.r+7) contact=true;
    }
  }
  if (contact) {
    h.hit=!!cycle;
    return trapEvent(h,env.berserk,ball.x,ball.y);
  }
}
expose({rollerPosition,splashPosition});
