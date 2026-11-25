'use strict';
// All three designs use the centre of the landing zone as their origin; y = 0 is the shelf.
function trapFinish(fill, outline, width = 1.5) {
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = width; ctx.stroke();
}
function trapLine(points, color, width) {
  ctx.beginPath(); ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
function trapGradient(top, bottom, colors) {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  colors.forEach((color,i) => g.addColorStop(i / (colors.length - 1), color));
  return g;
}
function cheeseBait(x, y, height = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, height);
  // The top is triangular; a scallop interrupts the rind on the front edge.
  ctx.beginPath(); ctx.moveTo(-13,-10); ctx.lineTo(3,-18); ctx.lineTo(13,-13);
  ctx.lineTo(13,-2); ctx.quadraticCurveTo(12,0,9,0); ctx.lineTo(5,0);
  ctx.bezierCurveTo(5,-4,1,-4,0,-0.5); ctx.lineTo(-12,-1); ctx.closePath();
  trapFinish(trapGradient(-15,0,['#ffce53','#e79b27']), '#96572a', 1.2);
  biomeShape('#ffe795',[[-13,-10],[3,-18],[13,-13],[0,-8]]);
  biomeShape('#d98728',[[0,-8],[13,-13],[13,-2],[9,0],[5,0],[3,-3],[0,-2]]);
  trapLine([[-11,-10],[0,-8],[11,-12]], '#fff0ab', 0.9);
  biomeEllipse(3,-14,2.8,1.1,'#d39937',-.14);
  biomeEllipse(-6,-6,2.1,1.7,'#bf7424');
  biomeEllipse(8,-6,1.9,2,'#ac6827',.18);
  ctx.restore();
}
function classicTrap(open) {
  const ink = '#523721';
  // Bevel, end grain and two proud screw heads give the wooden base its depth.
  ctx.beginPath(); ctx.moveTo(-41,-8); ctx.lineTo(-36,-16); ctx.lineTo(36,-16);
  ctx.quadraticCurveTo(40,-16,40,-13); ctx.lineTo(42,-6); ctx.lineTo(39,0);
  ctx.lineTo(-38,0); ctx.quadraticCurveTo(-42,-1,-41,-8); ctx.closePath();
  trapFinish(trapGradient(-16,0,['#f2cd8a','#bc8e57','#94643b']),ink);
  biomeShape('#dfb276',[[-40,-8],[-35,-14],[36,-14],[40,-8],[37,-6],[-38,-6]]);
  trapLine([[-37,-5],[37,-5]],'#f6d69d',1);
  for (const x of [-32,-22,25]) trapLine([[x,-3],[x+6,-3.2]],'#95683f',.8);
  biomeEllipse(-33,-10,2,1.3,'#826747'); biomeEllipse(33,-10,2,1.3,'#826747');
  biomeEllipse(15,-10,18,3.4,'#987645');
  // The far rail passes behind the bait. The crossbar lands on the other side of it.
  const a = 0.08 + open * 2.22, reach = 36 * Math.cos(a), lift = 31 * Math.sin(a);
  const front = [-7,-7.5], back = [2,-16], tip = [reach-7,-7.5-lift], farTip = [reach+2,-16-lift];
  trapLine([back,farTip],'#353e40',3.8); trapLine([back,farTip],'#adb8b7',1.9);
  cheeseBait(15,-10,.67+.33*open);
  const bow = [front,tip,farTip];
  trapLine(bow,'#30393b',4.5); trapLine(bow,'#a8b4b5',2.8);
  trapLine(bow.map(([x,y])=>[x-.4,y-.65]),'#f4f3de',.95);
  for (let i = 0; i < 5; i++) {
    const x = 2-i*2.1, y = -15.5+i*1.9;
    biomeEllipse(x,y,3.3,2.5,'#434944',.65);
    biomeEllipse(x-.4,y-.65,2.5,1,'#d8d5bc',.65);
  }
}
function enamelTrap(open) {
  // Rounded enamel press; the red upper jaw moves as one piece around the rear rivet.
  ctx.beginPath(); ctx.moveTo(-40,-9); ctx.quadraticCurveTo(-38,-13,-29,-13);
  ctx.lineTo(32,-12); ctx.quadraticCurveTo(44,-12,40,-4); ctx.quadraticCurveTo(39,0,33,0);
  ctx.lineTo(-33,0); ctx.quadraticCurveTo(-42,-1,-40,-9); ctx.closePath();
  trapFinish(trapGradient(-13,0,['#fff0ce','#cbbda3','#9b8773']), '#513d38');
  trapLine([[-33,-8],[-19,-8],[33,-7]],'#fff3cd',1.2);
  cheeseBait(18,-9,.4+.6*open);
  ctx.save(); ctx.translate(-29,-11); ctx.rotate(-0.09-open*0.52);
  ctx.beginPath(); ctx.moveTo(51,-1); ctx.lineTo(67,-2); ctx.lineTo(66,3);
  ctx.quadraticCurveTo(58,6,52,4); ctx.closePath(); trapFinish('#e2ccaa','#69473f',1.2);
  ctx.beginPath(); ctx.moveTo(-6,-7); ctx.bezierCurveTo(0,-13,19,-12,33,-8);
  ctx.bezierCurveTo(43,-6,53,-7,63,-8); ctx.quadraticCurveTo(70,-8,69,-3);
  ctx.quadraticCurveTo(69,0,64,1); ctx.bezierCurveTo(48,4,30,2,15,-1);
  ctx.quadraticCurveTo(4,-2,-5,2); ctx.closePath();
  trapFinish(trapGradient(-12,3,['#ff8971','#d44838','#a52d31','#72242b']), '#54242a',1.8);
  ctx.beginPath(); ctx.moveTo(4,-8); ctx.bezierCurveTo(16,-11,27,-7,35,-6);
  ctx.strokeStyle='#ffc3a3'; ctx.lineWidth=1.6; ctx.stroke();
  trapLine([[50,0],[62,-1],[66,-2]],'#f4b29b',1.1);
  ctx.restore();
  biomeEllipse(-29,-10,6,6,'#513e38'); biomeEllipse(-29,-10,4.4,4.4,'#dfc8a1');
  biomeEllipse(-29,-10,2.2,2.2,'#8b7969'); trapLine([[-30.4,-9],[-27.7,-11]],'#483f3a',1.2);
}
function clocheTrap(open) {
  // The left rim is hinged. The foot of the fixed-length brass stay slides along the dish.
  biomeEllipse(0,-4,42,6,'#273e43'); biomeEllipse(0,-6,41,5,'#588184');
  biomeEllipse(0,-7.5,38,3.8,'#9db8ac'); biomeEllipse(0,-8,31,2.8,'#507676');
  cheeseBait(6,-9);
  const tilt = -0.43*open;
  const rimX = -33 + 65*Math.cos(tilt), rimY = -8 + 65*Math.sin(tilt);
  const foot = rimX - Math.sqrt(29*29 - (rimY+8)**2);
  trapLine([[foot,-8],[rimX,rimY]],'#684e32',3.5);
  trapLine([[foot,-9],[rimX-.5,rimY]],'#e5b974',1.4);
  biomeEllipse(foot,-8,2.6,1.8,'#82633c');
  ctx.save(); ctx.translate(-33,-8); ctx.rotate(tilt);
  ctx.beginPath(); ctx.moveTo(0,0); ctx.bezierCurveTo(2,-3,3,-5,4,-10);
  ctx.bezierCurveTo(6,-41,55,-45,61,-12); ctx.quadraticCurveTo(62,-4,65,0);
  ctx.quadraticCurveTo(34,4,0,0); ctx.closePath();
  trapFinish(trapGradient(-37,3,['rgba(211,244,243,.58)','rgba(133,196,198,.19)','rgba(74,151,160,.39)']),'#31585e',2.5);
  ctx.beginPath(); ctx.moveTo(5,-4); ctx.bezierCurveTo(7,-18,8,-26,19,-31);
  ctx.strokeStyle='#effcf4'; ctx.lineWidth=2.6; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(23,-33); ctx.quadraticCurveTo(27,-35,30,-35);
  ctx.strokeStyle='#e6f9ed'; ctx.lineWidth=1.6; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(30,4,65,0);
  ctx.strokeStyle='#80623b'; ctx.lineWidth=3.2; ctx.stroke();
  ctx.strokeStyle='#f1d299'; ctx.lineWidth=1.2; ctx.stroke();
  biomeEllipse(32,-36,5,1.7,'#7e613c');
  biomeEllipse(32,-40,4.2,3.9,'#765533'); biomeEllipse(31.8,-40.6,3.3,2.8,'#d7a959');
  biomeEllipse(31,-41.6,1.6,.9,'#ffe4a7');
  ctx.restore();
}
const MOUSETRAP_DESIGNS = { classic: classicTrap, enamel: enamelTrap, cloche: clocheTrap };
let mousetrapDesign = 'classic';
function setMousetrapDesign(name) {
  mousetrapDesign = Object.hasOwn(MOUSETRAP_DESIGNS, name) ? name : 'classic';
}
function drawMousetrap(h) {
  const warn = h.phase === 'warn', snap = h.phase === 'snap';
  let open = h.phase === 'spent' ? 0 : 1;
  if (warn) open -= .12 * (1-h.time/MOUSETRAP_WARN) + .035*Math.sin(h.time*55);
  if (snap) open = .88 * (h.time / MOUSETRAP_SNAP) ** 2;
  ctx.save();
  ctx.lineCap='round'; ctx.lineJoin='round';
  biomeEllipse(0,-.3,43,3,'rgba(18,25,28,.32)');
  MOUSETRAP_DESIGNS[mousetrapDesign](open);
  if (warn || snap) {
    const flare = snap ? 1 : 1-h.time/MOUSETRAP_WARN;
    for (const side of [-1,1]) {
      const stroke = [[side*41,-12],[side*(46+3*flare),-16]];
      trapLine(stroke,'#713d2a',3.8); trapLine(stroke,'#ffc775',2.1);
      trapLine([[side*38,-18],[side*(41+3*flare),-24]],'#ffc775',2.2);
    }
  }
  ctx.restore();
}
expose({ setMousetrapDesign, drawMousetrap, get mousetrapDesign() { return mousetrapDesign; } });
