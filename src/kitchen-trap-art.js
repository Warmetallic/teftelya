'use strict';
function toolLine(points,paint,width) {
  ctx.beginPath(); ctx.moveTo(...points[0]);
  for (let i=1;i<points.length;i++) ctx.lineTo(...points[i]);
  ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle=paint; ctx.lineWidth=width; ctx.stroke();
}
function drawRoller(h) {
  const pos=rollerPosition(h);
  ctx.save(); ctx.translate(pos.x-h.x,pos.y-h.y);
  if (h.phase==='warn') {
    const pulse=Math.sin(h.time*28);
    ctx.translate(pulse*2,0);
    for (let i=0;i<2;i++) {
      const x=h.dir*(36+i*12);
      toolLine([[x,-8],[x+h.dir*5,-3],[x,2]],'#ffd58e',2.2);
    }
  }
  ctx.scale(h.dir,1);
  if (h.phase==='active') ctx.rotate(.06*Math.sin(h.time*23));
  if (trapSprites.roller) ctx.drawImage(trapSprites.roller,-42,-16,84,31);
  else {
    ctx.fillStyle='#714331'; rrect(-42,-3,84,7,3); ctx.fill();
    ctx.fillStyle='#d69d62'; rrect(-25,-12,50,24,8); ctx.fill();
  }
  ctx.restore();
}
function drawHood(h) {
  ctx.save(); ctx.scale(h.dir,1);
  if (h.phase==='active' && !h.icon) {
    for (let i=0;i<9;i++) {
      const dist=23+(i*29+h.time*103)%181, y=-24+(i%3)*21;
      ctx.beginPath(); ctx.moveTo(dist,y);
      ctx.bezierCurveTo(dist+6,y-5,dist+14,y+4,dist+21,y-2);
      ctx.strokeStyle='rgba(195,244,235,'+(.8-dist/325)+')'; ctx.lineWidth=2.2; ctx.stroke();
    }
  }
  ctx.fillStyle='#344c52'; rrect(-18,-34,34,66,6); ctx.fill();
  ctx.fillStyle='#a3b8b5'; rrect(-14,-29,32,56,7); ctx.fill();
  biomeEllipse(11,-1,15,23,'#233941');
  ctx.save(); ctx.translate(11,-1); ctx.scale(.63,1); ctx.rotate(h.time*10);
  for (let i=0;i<4;i++) {
    ctx.rotate(Math.PI/2); ctx.beginPath(); ctx.moveTo(1,0);
    ctx.bezierCurveTo(-3,-8,1,-20,9,-17); ctx.quadraticCurveTo(18,-8,1,0);
    ctx.fillStyle='#9ebfbd'; ctx.fill();
  }
  ctx.restore(); biomeEllipse(11,-1,3.3,5,'#efe3bc');
  toolLine([[-9,-24],[-9,20]],'#d9e1d1',1.4); ctx.restore();
}
function drawFork() {
  const steel=ctx.createLinearGradient(-16,0,16,0);
  steel.addColorStop(0,'#687580'); steel.addColorStop(.32,'#edece4'); steel.addColorStop(.56,'#95aab2'); steel.addColorStop(1,'#46555c');
  toolLine([[0,16],[0,-30]],'#3e444a',7); toolLine([[0,15],[0,-32]],steel,4.5);
  ctx.beginPath(); ctx.moveTo(-15,-46); ctx.quadraticCurveTo(-15,-32,0,-28); ctx.quadraticCurveTo(15,-32,15,-46);
  ctx.fillStyle=steel; ctx.fill();
  for (const x of [-13,-4.5,4.5,13]) {
    biomeShape('#394851',[[x-2,-41],[x-2.2,-58],[x,-71],[x+1.9,-56],[x+2,-41]]);
    toolLine([[x-.3,-43],[x-.6,-62],[x,-68]],'#f5e9d6',1.6);
  }
  biomeEllipse(0,17,9,3,'#8b725a');
}
function drawSaucepot(h) {
  for (let i=0;i<3;i++) {
    const p=splashPosition(h,i);
    if (!p || h.icon) continue;
    const x=p.x-h.x,y=p.y-h.y;
    biomeEllipse(x,y,8,9,'#8c3329',.4); biomeEllipse(x-.6,y-1,6.5,7,'#fa7950',.4); biomeEllipse(x-2,y-3.5,2,2.7,'#ffe4a1');
  }
  const lid=h.phase==='warn'?Math.abs(Math.sin(h.time*26))*5 : h.phase==='active'?9:0;
  toolLine([[-20,-14],[-31,-17],[-31,-12],[-22,-9]],'#d7b69a',3);
  toolLine([[20,-14],[31,-17],[31,-12],[22,-9]],'#d7b69a',3);
  ctx.beginPath(); ctx.moveTo(-23,-21);ctx.lineTo(-20,-4); ctx.bezierCurveTo(-18,5,18,5,20,-4);ctx.lineTo(23,-21);
  const coat=ctx.createLinearGradient(-22,0,21,0);coat.addColorStop(0,'#7a3027');coat.addColorStop(.28,'#de6945');coat.addColorStop(1,'#822f29');ctx.fillStyle=coat;ctx.fill();
  biomeEllipse(0,-21,24,5.5,'#eabf8e');biomeEllipse(0,-21,20.5,3.3,'#c45d2e');
  ctx.save(); ctx.translate(-h.dir*lid,-lid);ctx.rotate(-h.dir*lid*.032);
  biomeEllipse(0,-24,24,5,'#932e28');biomeEllipse(0,-26,20,3.5,'#e97451');biomeEllipse(0,-31,5,3,'#44312e'); ctx.restore();
}
function drawGrater(h) {
  ctx.save(); ctx.scale(h.dir,1);
  ctx.fillStyle='#645249';rrect(0,-56,12,112,3);ctx.fill();
  if (trapSprites.grater) ctx.drawImage(trapSprites.grater,1,-55,49,105);
  else {
    ctx.fillStyle='#a0a6a1';rrect(2,-51,37,99,5);ctx.fill();
    for(let y=-31;y<=39;y+=12) for(let x=10;x<36;x+=10) biomeEllipse(x,y,2.6,3,'#465056');
  }
  toolLine([[4,-49],[4,40]],'#e2d0ac',1.5);ctx.restore();
}
const KITCHEN_ART={roller:drawRoller,hood:drawHood,fork:drawFork,splash:drawSaucepot,grater:drawGrater};
function drawFlourSack(h) {
  if(h.phase==='cool') return;
  const drop=h.drop||0, impact=drop>=h.limit-h.y-9;
  toolLine([[0,-47],[0,-30]],'#76573f',2.5);
  biomeEllipse(0,-47,5,3,'#614a38');
  ctx.save(); ctx.translate(h.phase==='warn'?Math.sin(tGame*41)*2.7:0,drop);
  if(impact) {
    const t=Math.max(0,h.time-.54);
    for(let i=-3;i<=3;i++)biomeEllipse(i*(4+t*21),-6-Math.sin(i+4)*t*21,8+t*9,5+t*8,'rgba(247,227,190,'+clamp(1-t*1.8,0,1)+')');
  } else {
    const cloth=ctx.createLinearGradient(-18,0,18,0);
    cloth.addColorStop(0,'#ac835e'); cloth.addColorStop(.28,'#e3c59a'); cloth.addColorStop(.67,'#f2dbb3'); cloth.addColorStop(1,'#b58e67');
    ctx.beginPath(); ctx.moveTo(-5,-26); ctx.lineTo(-10,-36); ctx.lineTo(-4,-33);
    ctx.lineTo(1,-37); ctx.lineTo(4,-33); ctx.lineTo(9,-35); ctx.lineTo(5,-26);
    ctx.bezierCurveTo(11,-22,17,-16,18,-4); ctx.quadraticCurveTo(20,4,12,5);
    ctx.quadraticCurveTo(-2,7,-16,4); ctx.bezierCurveTo(-22,-1,-14,-19,-5,-26);
    trapFinish(cloth,'#694b37',1.8);
    toolLine([[-7,-25],[7,-26],[11,-22]],'#815739',2.4);
    toolLine([[-14,0],[-12,-10],[-8,-17]],'#bc936d',1.2);
    toolLine([[4,1],[1,-16]],'#865a35',1.5);
    for (let i=0;i<3;i++) {
      biomeEllipse(-1,-6-i*3.5,1.6,3,'#a77b48',-.65);
      biomeEllipse(4,-8-i*3.5,1.6,3,'#a77b48',.68);
    }
    if(h.phase==='warn')for(let i=0;i<3;i++)biomeEllipse(i*5-5,5+(tGame*49+i*10)%30,1.8,2,'#f6e7c6');
  }
  ctx.restore();
}
function kitchenIcon(type) {
  const scale={roller:.57,hood:.56,fork:.49,splash:.66,grater:.38}[type];
  ctx.translate(type==='grater'?-9:0,type==='fork'?12:type==='splash'?7:0);ctx.scale(scale,scale);
  KITCHEN_ART[type]({x:0,y:0,dir:1,time:0,phase:'idle',icon:true});
}
