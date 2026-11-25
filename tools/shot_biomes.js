// Capture real encounter phases using the ordinary game update and renderer.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { execFileSync } = require('node:child_process');
const { createCanvas } = require('canvas');
const { loadArt } = require('./_art');
const out = path.join(__dirname, '..', 'shots');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'teft-biome-shots-'));
const col = 280, imgH = 286, frames = 54;
const captions = [
  ['Кухня','Доска с ножом','#e8b770'],
  ['Холодильник','Сосульки и скользкий лёд','#a4daef'],
  ['Духовка','Струи пара и горячие полки','#f99b6c'],
  ['Погреб','Крысы в темноте','#afc39d'],
  ['Пиршественный зал','Перчики среди угощений','#d9a1bb'],
];
async function record(n) {
  const screen = createCanvas(480,854), g = require('./_env')(screen.getContext('2d'),{worldSeed:42});
  global.document.createElement = () => createCanvas(1,1);
  global.setInterval = () => 0;
  const d = g.dbg(); await loadArt(d); await g.boot(); await d.jumpTower(n);
  const trap = d.BIOMES[d.tower.tp.theme].trap;
  const encounters = d.hazards.filter(h => h.type === trap && (trap !== 'knife' || h.board !== undefined));
  // Pick broad landing areas for the camera so the moving prop and player are both visible.
  const h = (n >= 4 && encounters.find(h => d.platforms.find(p => p.id === h.host).w >= 175)) || encounters[0];
  const host = d.platforms.find(p => p.id === (h.host ?? h.board));
  d.run.bannerT = 0;
  let x = host.x;
  if (n === 2 || n === 5) x = h.x;
  if (n === 4) x = h.dir > 0 ? h.right : h.left;
  d.ball.x = x; d.landOn(host); d.setCamY(host.y-480);
  const images = [], phases = new Set();
  for (let frame = 0; frame < frames; frame++) {
    // The pepper and the icicle are evaded by an actual tap during their tells.
    if ((n === 2 || n === 5) && frame === 9) {
      d.jumpTo(x < 240 ? x + 174 : x - 174, host.y - 52);
    }
    if (n === 3 && frame === 10) d.jumpTo(x + 70, host.y - 160);
    for (let i=0; i<4; i++) d.update(1/60);
    phases.add(h.phase);
    d.drawBg(); d.drawWorld();
    const shot = createCanvas(col,imgH), ctx = shot.getContext('2d');
    const center = host.y - d.camY - (n===2 ? 112 : 82);
    const top = Math.max(0, Math.min(854-490, center-245));
    ctx.drawImage(screen,0,top,480,490,0,0,col,imgH);
    images.push(shot);
  }
  if (!phases.has(n===1?'strike':'active')) throw Error(trap+' never attacked');
  return images;
}
function sheet(images) {
  const canvas=createCanvas(col*5+6*10, imgH+92), c=canvas.getContext('2d');
  c.fillStyle='#201d1a'; c.fillRect(0,0,canvas.width,canvas.height);
  images.forEach((im,i)=>{
    const x=10+i*(col+10), [title,sub,color] = captions[i];
    c.drawImage(im,x,10); c.fillStyle=color; c.fillRect(x,imgH+10,col,3);
    c.fillStyle='#f8ecda'; c.font='bold 25px Georgia'; c.fillText(title,x+3,imgH+47);
    c.fillStyle='#d7cabb'; c.font='16px sans-serif'; c.fillText(sub,x+3,imgH+72);
  }); return canvas;
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const clips=[];
  for(let n=1;n<=5;n++) clips.push(await record(n));
  const still=sheet(clips.map((clip,i)=>clip[[22,15,18,14,15][i]]));
  fs.writeFileSync(path.join(out,'biomes-gameplay.png'),still.toBuffer('image/png'));
  for(let f=0; f<frames; f++){
    fs.writeFileSync(path.join(temp,'frame-'+String(f).padStart(3,'0')+'.png'),sheet(clips.map(clip=>clip[f])).toBuffer('image/png'));
  }
  execFileSync('ffmpeg',['-loglevel','error','-y','-framerate','15','-i',path.join(temp,'frame-%03d.png'),'-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,'biomes-gameplay.mp4')]);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>fs.rmSync(temp,{recursive:true,force:true}));
