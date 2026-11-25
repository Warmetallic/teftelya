'use strict';
// Game-space art. Platform origin is the landing surface, outlet origin is the first damaging pixel.
function drawLatePlatform(p) {
  const w = p.w / 2;
  if (p.type === 'damper') {
    const open = p.id !== undefined && ball.onPlatform === p.id;
    const rim = ctx.createLinearGradient(0,-4,0,19);
    rim.addColorStop(0,'#e5ca99'); rim.addColorStop(.38,'#816648'); rim.addColorStop(1,'#493b32');
    ctx.fillStyle = rim; rrect(-w,-3,p.w,21,6); ctx.fill();
    ctx.fillStyle = '#332e2e'; rrect(-w+5,-1,p.w-10,13,4); ctx.fill();
    for (let x=-w+9; x<w-9; x+=13) {
      biomeShape(open?'#b69067':'#baa58b',[[x,0],[x+9,0],[x+(open?5:9),open?10:6],[x-3,open?10:6]]);
    }
    const stem = open ? 1 : -12;
    toolLine([[w-14,10],[w-6,stem]],'#e2c295',4);
    biomeEllipse(w-6,stem,6,4,open?'#b4d99d':'#bf714e');
    for (const x of [-w+5,w-5]) biomeEllipse(x,12,2,2,'#f5d2a2');
    return;
  }
  const rise = (p.baseY ?? p.y)-p.y;
  ctx.save(); ctx.translate(0,rise+6);
  ctx.strokeStyle='#e5e6d9'; ctx.lineWidth=5;
  ctx.beginPath(); ctx.ellipse(w*.68,15,13,11,-.5,0,2*Math.PI); ctx.stroke();
  const glaze = ctx.createLinearGradient(-w,0,w,0);
  glaze.addColorStop(0,'#829dad'); glaze.addColorStop(.33,'#f4f2df');
  glaze.addColorStop(.75,'#dce5df'); glaze.addColorStop(1,'#7294a8');
  ctx.beginPath(); ctx.moveTo(-w*.78,0); ctx.bezierCurveTo(-w*.74,42,w*.66,48,w*.78,0);
  ctx.closePath(); trapFinish(glaze,'#324a60',2);
  biomeEllipse(0,30,w*.34,4,'#647f93');
  biomeEllipse(0,0,w*.78,6,'#375674'); biomeEllipse(0,0,w*.70,3.5,'#a66c36');
  for (let j=-1;j<=1;j++) {
    const x=j*w*.32, y=15-Math.abs(j)*2;
    for (let i=0;i<5;i++) {
      const a=i*2*Math.PI/5;
      biomeEllipse(x+Math.cos(a)*3.3,y+Math.sin(a)*3.3,2.8,1.7,'#376686',a);
    }
    biomeEllipse(x,y,1.4,1.4,'#ddb96f');
  }
  ctx.restore();
  if (rise>4) {
    const vapor=ctx.createLinearGradient(0,2,0,rise+4);
    vapor.addColorStop(0,'rgba(225,241,227,.1)');
    vapor.addColorStop(.46,'rgba(225,241,227,.62)');
    vapor.addColorStop(1,'rgba(225,241,227,.15)');
    ctx.strokeStyle=vapor; ctx.lineWidth=3; ctx.lineCap='round';
    for (let i=-1;i<=1;i++) {
      const x=i*w*.34, sway=Math.sin(tGame*3+i*2)*9;
      ctx.beginPath();ctx.moveTo(x,rise+3);
      ctx.bezierCurveTo(x-18+sway,rise*.78,x+17+sway,rise*.54,x+2,rise*.40);
      ctx.quadraticCurveTo(x-11-sway,rise*.18,x+5,3);ctx.stroke();
    }
  }
  biomeEllipse(0,2,w,7,'#31566d'); biomeEllipse(0,-1,w-1,5.8,'#ecebd9');
  biomeEllipse(0,-2,w*.80,3.2,'#6993a8'); biomeEllipse(0,-2,w*.72,2.1,'#f3efdf');
}

function drawBrewingSpout(h) {
  ctx.save();
  // The pot swings about its lip; the stream always leaves the same point.
  ctx.scale(-h.dir,1);
  // A swinging brass cradle pins the pouring pot to the tea-room wall.
  ctx.fillStyle='#6d5b42'; rrect(48,-50,13,15,3);ctx.fill();
  toolLine([[54,-43],[41,-40],[39,-15]],'#715c40',4);
  toolLine([[54,-44],[41,-41],[39,-15]],'#ceb487',1.5);
  biomeEllipse(54,-43,2.5,2.5,'#ebd4a6');
  const tilt = h.phase==='active' ? -.26 : h.phase==='warn' ? -.22*(1-h.time/TRAP_WARN.brew) : 0;
  ctx.rotate(tilt);
  ctx.strokeStyle='#9dbbc2'; ctx.lineWidth=4;
  ctx.beginPath(); ctx.ellipse(57,-12,9,10,0,0,2*Math.PI); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(31,-13); ctx.quadraticCurveTo(15,-9,8,-3);
  ctx.quadraticCurveTo(4,0,-1,0); ctx.lineTo(1,-6); ctx.quadraticCurveTo(11,-6,23,-21);
  ctx.closePath(); trapFinish('#c6dae0','#3e5864',2);
  biomeEllipse(39,-12,19,16,'#3a5668'); biomeEllipse(39,-14,17.7,14.2,'#e4e7d7');
  biomeEllipse(39,-24,14,4,'#46728c'); biomeEllipse(39,-28,4,3,'#e7e3bd');
  biomeEllipse(39,-11,5,4,'#537d94'); biomeEllipse(34,-14,2,2,'#7198a8');
  ctx.restore();
  if (h.phase==='warn') {
    const t=1-h.time/TRAP_WARN.brew;
    biomeEllipse(0,3+t*4,3+t,3+4*t,'#f9ba58');
  } else if (h.phase==='active') {
    const reach=Math.min(175,h.time*490);
    toolLine([[0,0],[0,reach]],'#995127',9);
    toolLine([[-1,0],[-1,reach]],'#ffd078',4);
    biomeEllipse(0,reach,6,3,'#f7d483');
  }
}

function drawDamperLink(h) {
  const y = h.y-camY;
  if (h.gone || y < -125 || y > H+20) return;
  const p = platformById(tower.platforms,h.host);
  if (!p) return;
  const leverX = p.x+p.w/2-14;
  const outletX = h.x-h.dir*25;
  const track = [[leverX,p.y-camY+12],[leverX,p.y-camY+22],
    [outletX,p.y-camY+22],[outletX,y]];
  toolLine(track,'#3a3531',5); toolLine(track,'#a08465',2);
}
function drawSmokeOutlet(h) {
  ctx.save(); ctx.scale(h.dir,1);
  const vented=h.phase==='vent';
  ctx.fillStyle='#5b483d'; rrect(-32,-14,32,29,5);ctx.fill();
  biomeEllipse(-3,0,9,18,'#ccb38f'); biomeEllipse(-2,0,6,14,'#393332');
  for (let y=-9;y<=9;y+=6) toolLine([[-7,y],[2,y+1]],vented?'#9ab39b':'#997e64',2);
  const active=h.phase==='active', warning=h.phase==='warn';
  if (active || warning || vented) {
    const span=active?Math.min(98,h.time*265):vented?17:23;
    for (let j=0;j<9;j++) {
      const f=(tGame*(vented?-.65:1.15)+j/9)%1, u=(f+1)%1;
      const y=Math.sin(u*8+j*.6)*3-(vented?u*8:0);
      biomeEllipse(2+span*u,y,4+(active?12:4)*u,3+(active?10:3)*u,
        active?'rgba(219,208,194,.85)':vented?'rgba(170,208,183,.65)':'rgba(197,181,159,.6)');
    }
  }
  ctx.restore();
}
