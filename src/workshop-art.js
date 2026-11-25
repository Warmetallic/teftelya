'use strict';
function gasFlame(x, base, height, width, bend, color) {
  ctx.beginPath(); ctx.moveTo(x-width,base);
  ctx.bezierCurveTo(x-width*1.9,base-height*.24,x+width*.6+bend,base-height*.48,x+bend-width*.42,base-height*.69);
  ctx.quadraticCurveTo(x+bend-width*.75,base-height*.85,x+bend+width*.32,base-height);
  ctx.bezierCurveTo(x+bend-width*.45,base-height*.73,x+width*1.5,base-height*.64,x+width*.72,base-height*.40);
  ctx.quadraticCurveTo(x+width*1.6,base-height*.16,x+width,base);
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}
function drawBurner(h) {
  const direction = h.dir, lit = h.phase === 'warn' || h.phase === 'active';
  const pipe = ctx.createLinearGradient(0,2,0,15);
  pipe.addColorStop(0,'#523729'); pipe.addColorStop(.23,'#e5af76'); pipe.addColorStop(.58,'#ae6340'); pipe.addColorStop(1,'#55392d');
  ctx.fillStyle = pipe; rrect(direction > 0 ? -49 : -3,3,52,11,4); ctx.fill();
  ctx.fillStyle = '#342f31'; rrect(-22,-4,44,17,6); ctx.fill();
  biomeEllipse(0,5,26,6,'#a18470'); biomeEllipse(0,1,28,7,'#312c30');
  biomeEllipse(0,-2,27,6.3,'#bdb2a1'); biomeEllipse(0,-3,23,4.7,'#524b4e');
  for (let x=-16; x<=16; x+=8) biomeEllipse(x,-2.3,2.1,1.4,lit ? '#b9e8f3' : '#26252a');
  const flicker = Math.sin(tGame*26), reach = burnerHeight(h);
  if (h.phase === 'warn') {
    const progress = h.time/TOOL_CYCLE.burner.warn;
    for (let i=-1; i<=1; i++) {
      gasFlame(i*11,-3,7+progress*12+flicker*2,3.6,i*2,'#84d8f3');
      const rise = (h.time*73+(i+1)*12)%37;
      biomeEllipse(i*7+Math.sin(rise*.1)*2,-16-rise,1.6,2.8,'#ffd694');
    }
  }
  if (reach > 1) {
    const flame = ctx.createLinearGradient(0,-reach,0,-2);
    flame.addColorStop(0,'#ffdd83'); flame.addColorStop(.18,'#ff9b3e'); flame.addColorStop(.67,'#f56226'); flame.addColorStop(1,'#ffb149');
    gasFlame(-10,-3,reach*.69,7,-6+4*flicker,flame);
    gasFlame(8,-3,reach*.75,9,6-3*flicker,flame);
    gasFlame(0,-3,reach,14,5*flicker,flame);
    gasFlame(1,-3,reach*.71,8.5,-3*flicker,'#ffdc75');
    gasFlame(-1,-3,reach*.35,5.5,flicker*2,'#fff2b3');
    for (let x=-13;x<=13;x+=6.5) gasFlame(x,-2,Math.min(13,reach*.3),3.5,1,'#91dff8');
  }
}
function drawTape(h) {
  const held = ball.tape === h, endX = held ? clamp(ball.x-h.x,-30,30) : 3*Math.sin(tGame*2.1);
  const endY = held ? clamp(ball.y-h.y,-20,26) : 6;
  const amber = ctx.createLinearGradient(-10,0,12,0);
  amber.addColorStop(0,'#855326'); amber.addColorStop(.16,'#ffde7d'); amber.addColorStop(.6,'#e8b04b'); amber.addColorStop(1,'#ac622b');
  ctx.save(); ctx.translate(0,-21);
  ctx.fillStyle = '#514334'; rrect(-24,-81,48,12,4); ctx.fill();
  biomeEllipse(-17,-76,2.5,2.5,'#d1bf9b'); biomeEllipse(17,-76,2.5,2.5,'#d1bf9b');
  ctx.fillStyle = '#685040'; rrect(-15,-76,8,27,3); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-12,-55);
  ctx.quadraticCurveTo(-13,-25,endX-11,endY+18); ctx.lineTo(endX-6,endY+20);
  ctx.lineTo(endX-1,endY+16); ctx.lineTo(endX+5,endY+21); ctx.lineTo(endX+11,endY+17);
  ctx.quadraticCurveTo(8,-26,12,-55); ctx.closePath();
  ctx.fillStyle=amber; ctx.fill(); ctx.strokeStyle='#754722'; ctx.lineWidth=1.4; ctx.stroke();
  for (let i=0;i<3;i++) {
    ctx.beginPath(); ctx.moveTo(-8,-17-i*9); ctx.lineTo(5,-23-i*9);
    ctx.strokeStyle='rgba(255,242,180,.75)'; ctx.lineWidth=2.4; ctx.stroke();
  }
  biomeEllipse(1,-56,18,15,'#80532e'); biomeEllipse(-2,-58,16,13,'#ffe093');
  biomeEllipse(-2,-58,11,9,'#cf9a53'); biomeEllipse(-2,-58,8.5,7,'#fff1c1');
  biomeEllipse(-2,-58,5.4,4.7,'#6b523d'); biomeEllipse(-3,-59,2.3,1.7,'#bfae91');
  ctx.restore();
}
function drawMalletHead() {
  if (trapSprites.mallet) { ctx.drawImage(trapSprites.mallet,-23,-116,46,116); return; }
  ctx.fillStyle='#bd8151'; rrect(-5,-113,11,85,4); ctx.fill();
  ctx.fillStyle='#44464b'; rrect(-20,-35,40,35,4); ctx.fill();
  biomeShape('#c5b9a5',[[-18,-33],[12,-34],[19,-29],[-9,-25]]);
  for (let x=-13;x<18;x+=7) for (let y=-19;y<-2;y+=7) biomeEllipse(x,y,2,2,'#d6cdb9');
}
function drawMallet(h) {
  const warn = h.phase === 'warn', active = h.phase === 'active', bottom = malletBottom(h);
  const strength = warn ? h.time/TOOL_CYCLE.mallet.warn : active ? 1 : 0;
  biomeEllipse(0,-1,12+13*strength,2.7+3*strength,'rgba(31,19,18,'+(.26+.55*strength)+')');
  if (warn || active) {
    ctx.beginPath(); ctx.ellipse(0,-1,26,5,0,0,Math.PI*2);
    ctx.lineWidth=1.8; ctx.strokeStyle='#f7aa62'; ctx.stroke();
  }
  const rail = ctx.createLinearGradient(-3,0,3,0);
  rail.addColorStop(0,'#57483c'); rail.addColorStop(.5,'#d4bca1'); rail.addColorStop(1,'#66574b');
  ctx.fillStyle=rail; ctx.fillRect(-4,-232,6,Math.max(1,bottom+123));
  ctx.fillStyle='#584e47'; rrect(-16,-237,32,8,3); ctx.fill();
  biomeEllipse(-10,-233,2,1.7,'#d3c9b4'); biomeEllipse(10,-233,2,1.7,'#d3c9b4');
  ctx.save(); ctx.translate(0,bottom); drawMalletHead(); ctx.restore();
  if (active && h.time >= .14 && h.time <= .25) {
    for (const side of [-1,1]) {
      ctx.beginPath(); ctx.moveTo(side*23,-3); ctx.lineTo(side*32,-10);
      ctx.moveTo(side*25,0); ctx.lineTo(side*36,-2);
      ctx.strokeStyle='#ffda8b'; ctx.lineWidth=2; ctx.stroke();
    }
  }
}
