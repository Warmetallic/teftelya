'use strict';
const EXAM_STYLES = ['chef','kerchief','crown','beret','paper'];
function examNumber(id) {
  const match = typeof id === 'string' && /^exam_([1-9]\d*)$/.exec(id);
  const n = match ? Number(match[1]) : 0;
  return Number.isSafeInteger(n) && n % 5 === 0 ? n : 0;
}
const examSkin = n => 'exam_'+n;
function skinStyle(id) {
  const n=examNumber(id);
  return n ? EXAM_STYLES[(n/5-1)%EXAM_STYLES.length] : id;
}
function skinName(id) { return T('skin.'+skinStyle(id)); }
function equipSkin(id) {
  if (id!== 'none' && !save.skins.includes(id) && id!==save.skin) return;
  if (id===save.skin) return;
  if (save.skin!=='none' && !save.skins.includes(save.skin)) save.skins.push(save.skin);
  save.skin=id; save.equipRev=(save.equipRev||0)+1; persist();
}

// The same silhouette is used above Tefa, on the exam ticket and in the wardrobe.
function drawSkin(id,x,y,size) {
  if (!id || id==='none') return;
  const n=examNumber(id), style=skinStyle(id);
  const edition=Math.floor(Math.max(0,n/5-1)/EXAM_STYLES.length);
  const thread=edition ? 'hsl('+Math.round((edition*137.508+n*2)%360)+',54%,55%)' :
    ({chef:'#568e98',kerchief:'#b75b52',crown:'#ce924d',beret:'#577e78',paper:'#789bb1'}[style] || '#b85c54');
  ctx.save(); ctx.translate(x,y);ctx.scale(size,size);ctx.lineJoin='round';
  const edge='#423832', linen='#f7ead0';
  if (style==='chef') {
    ctx.beginPath(); ctx.moveTo(-16,6);ctx.lineTo(-17,-2);
    ctx.bezierCurveTo(-33,-5,-26,-22,-15,-20);ctx.bezierCurveTo(-14,-32,2,-32,7,-23);
    ctx.bezierCurveTo(23,-33,33,-10,16,-5);ctx.lineTo(16,6);ctx.closePath();trapFinish(linen,edge,2.2);
    for(const dx of [-9,0,9]) trapLine([[dx,-10],[dx*.8,-3]],'#c9b697',1.4);
    rrect(-17,1,34,8,2);trapFinish(thread,edge,1.8);
  } else if(style==='paper') {
    ctx.beginPath();ctx.moveTo(-24,8);ctx.lineTo(-15,-17);ctx.lineTo(21,-23);ctx.lineTo(15,8);ctx.closePath();trapFinish(linen,edge,2);
    trapLine([[-17,4],[16,-18],[3,4]],thread,2.5);
  } else if(style==='crown') {
    ctx.beginPath();ctx.moveTo(-22,-15);ctx.lineTo(-9,-6);ctx.lineTo(0,-23);ctx.lineTo(10,-6);ctx.lineTo(22,-15);
    ctx.lineTo(17,8);ctx.lineTo(-17,8);ctx.closePath();trapFinish('#e4b652',edge,2);
    biomeEllipse(0,0,4,5,thread);trapLine([[-15,4],[15,4]],'#fff0ac',2);
  } else if(style==='beret') {
    ctx.beginPath();ctx.moveTo(-20,4);ctx.bezierCurveTo(-35,-7,-12,-25,8,-19);ctx.bezierCurveTo(28,-15,31,0,16,5);
    ctx.closePath();trapFinish(thread,edge,2);trapLine([[-17,5],[15,5]],edge,5);trapLine([[1,-19],[4,-25]],edge,3);
  } else if(style==='glasses') {
    for(const dx of [-10,10]) {ctx.beginPath();ctx.arc(dx,0,8,0,Math.PI*2);ctx.strokeStyle=edge;ctx.lineWidth=3;ctx.stroke();}
    trapLine([[-2,-1],[2,-1]],edge,2);
  } else if(style==='mustache') {
    ctx.beginPath();ctx.moveTo(0,-2);ctx.bezierCurveTo(7,-8,12,4,19,-4);ctx.bezierCurveTo(15,8,4,7,0,2);
    ctx.bezierCurveTo(-6,8,-15,8,-19,-4);ctx.bezierCurveTo(-12,4,-7,-8,0,-2);ctx.fillStyle=edge;ctx.fill();
  } else if(style==='bow') {
    for(const dir of [-1,1]) {ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(dir*18,-8);ctx.lineTo(dir*16,9);ctx.closePath();trapFinish(thread,edge,1.5);}
    biomeEllipse(0,0,4,5,thread);
  } else {
    ctx.beginPath();ctx.moveTo(-23,5);ctx.quadraticCurveTo(-14,-28,5,-17);ctx.lineTo(21,0);ctx.lineTo(28,-5);
    ctx.lineTo(26,11);ctx.lineTo(16,5);ctx.quadraticCurveTo(-4,-3,-23,8);ctx.closePath();trapFinish(thread,edge,2);
    for(const dx of [-10,0,10]) biomeEllipse(dx,dx%3-7,1.7,1.7,linen);
  }
  ctx.restore();
}

function drawWornSkin(id,x,y,r) {
  const style=skinStyle(id);
  const offset=style==='glasses' ? -.22 : style==='mustache' ? .18 : -.81;
  drawSkin(id,x,y+r*offset,r*.021);
}

// A little prize tag stays on the starting plate while the player studies the exam.
function drawExamTag(x,y,n) {
  ctx.save();ctx.translate(x,y);
  for(const dx of [-31,31]) trapLine([[dx,15],[dx,29]],'#805f43',2.8);
  rrect(-45,26,90,36,6);trapFinish('#e9d5ab','#634c38',2.3);
  for(const dx of [-31,31]) biomeEllipse(dx,30,1.9,1.9,'#715b44');
  ctx.fillStyle='#704d26';ctx.font='900 21px system-ui';ctx.textAlign='center';ctx.fillText('S',-23,52);
  trapLine([[-10,44],[2,44],[-2,40]],'#826b49',1.8);trapLine([[2,44],[-2,48]],'#826b49',1.8);
  drawSkin(examSkin(n),23,47,.45);ctx.restore();
}
