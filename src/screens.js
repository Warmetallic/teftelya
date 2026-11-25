'use strict';
// ---------- экраны и кнопки: титул, смерть, финиш, пауза, заглушка рекламы, загрузка ----------
const buttons = []; // кнопки текущего кадра: { id, x, y, w, h, label, sub, ad }
const RANK_COLOR = { S: '#ffe08a', A: '#8ff0a4', B: '#9ad0ff', C: '#e6e6e6', D: '#ff9a8a' };
function clearButtons() { buttons.length = 0; }
function hitButton(x, y) { for (const b of buttons) if (Math.abs(x - b.x) <= b.w / 2 && Math.abs(y - b.y) <= b.h / 2) return b; return null; }
function dim(alpha) { const b = fieldBounds(); ctx.fillStyle = `rgba(20,12,8,${alpha})`; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); }
function fmtTime(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
// style: undefined — жёлтая основная; 'neutral' — светлая второстепенная; 'dim' — недоступная
function button(id, x, y, w, h, label, sub, ad, style, fontSize=24) {
  const b = { id, x, y, w, h, label, sub, ad }; buttons.push(b);
  ctx.save();
  ctx.fillStyle = ad ? '#2e7d32' : style === 'neutral' ? '#ece6da' : style === 'dim' ? 'rgba(71,62,53,.94)' : '#f6c343';
  rrect(x - w / 2, y - h / 2, w, h, 14); ctx.fill();
  ctx.fillStyle = ad ? '#fff' : style === 'dim' ? '#ede3d5' : '#1b1410'; ctx.textAlign = 'center';
  if (sub) { ctx.font = '800 22px system-ui, sans-serif'; ctx.fillText((ad ? '▶ ' : '') + label, x, y - 2); ctx.font = '500 13px system-ui, sans-serif'; ctx.globalAlpha = 0.85; ctx.fillText(sub, x, y + 17); }
  else { ctx.font = '800 '+fontSize+'px system-ui, sans-serif'; ctx.fillText(label, x, y + fontSize*.34, w-12); }
  ctx.restore();
  return b;
}
const JOURNAL_TOP=636, JOURNAL_ROWS=3;
let journalRows=[], journalOffset=0, wardrobeIndex=0;
function refreshJournal() {
  journalRows=Object.keys(save.log).map(Number).sort((a,b)=>b-a);
  journalOffset=0;
}
function scrollJournal(delta) {
  journalOffset=clamp(journalOffset+delta,0,Math.max(0,journalRows.length-JOURNAL_ROWS));
}
function drawJournal() {
  if (!journalRows.length) return;
  const left=48, y=JOURNAL_TOP, width=W-left*2;
  ctx.fillStyle='rgba(40,31,25,.94)';rrect(left,y-10,width,140,12);ctx.fill();
  ctx.textAlign='left';ctx.fillStyle='#f2d39d';ctx.font='bold 18px system-ui';
  ctx.fillText(T('journal'),left+17,y+17);
  const visible=journalRows.slice(journalOffset,journalOffset+JOURNAL_ROWS);
  visible.forEach((n,i)=>{
    const entry=save.log[n],line=y+46+i*29;
    ctx.textAlign='center';ctx.fillStyle=RANK_COLOR[entry.r];ctx.font='900 19px system-ui';ctx.fillText(entry.r,left+26,line);
    ctx.textAlign='left';ctx.font='15px system-ui';ctx.fillStyle='#f3ebdb';ctx.fillText(T('tower')+' '+n+' · '+T('theme.'+themeFor(n).id),left+48,line,196);
    if (isExamTower(n) && entry.r==='S') drawSkin(examSkin(n),W-left-96,line-5,.41);
    ctx.textAlign='right';ctx.fillText(fmtTime(entry.t),W-left-49,line);
  });
  if (journalRows.length>JOURNAL_ROWS) {
    if(journalOffset>0) button('journalUp',W-left-20,y+38,32,38,'↑','',false,'dim');
    if(journalOffset+JOURNAL_ROWS<journalRows.length) button('journalDown',W-left-20,y+91,32,38,'↓','',false,'dim');
  }
  ctx.textAlign='center';
}
function examTicket(n, y, line, heading, actionWidth=0) {
  const skin=examSkin(n);
  ctx.fillStyle='#efe2c3';rrect(49,y,382,65,10);ctx.fill();
  ctx.strokeStyle='#b79a6e';ctx.lineWidth=1;ctx.setLineDash([3,4]);
  ctx.beginPath();ctx.moveTo(114,y+5);ctx.lineTo(114,y+60);ctx.stroke();ctx.setLineDash([]);
  drawSkin(skin,82,y+38,.96);
  ctx.textAlign='left';ctx.fillStyle='#483b32';ctx.font='bold 18px system-ui';
  ctx.fillText(heading || T('exam.title',n)+' · '+skinName(skin),128,y+26,289-actionWidth);
  ctx.fillStyle='#624e3c';ctx.font='15px system-ui';ctx.fillText(line,128,y+49,288-actionWidth);ctx.textAlign='center';
}
function ownedLooks() { return [...new Set(['none',...save.skins,save.skin])]; }
function openWardrobe() {
  wardrobeIndex=Math.max(0,ownedLooks().indexOf(save.skin));
  state='wardrobe';
}
function wardrobeScreen() {
  clearButtons();dim(.82);
  const looks=ownedLooks(), id=looks[wardrobeIndex];
  ctx.textAlign='center';ctx.fillStyle='#f5e9d3';ctx.font='800 38px system-ui';ctx.fillText(T('wardrobe'),W/2,180);
  drawTefa(ctx,W/2,360,75,{hp:{cur:4,max:4},sx:1,sy:1,alpha:1,t:tGame});
  drawWornSkin(id,W/2,360,75);
  ctx.fillStyle='#f1d5a8';ctx.font='bold 23px system-ui';ctx.fillText(skinName(id),W/2,488);
  if(examNumber(id)) {ctx.font='16px system-ui';ctx.fillText(T('exam.title',examNumber(id))+' · S',W/2,516);}
  if(wardrobeIndex>0)button('skinPrev',72,368,45,48,'‹','',false,'dim');
  if(wardrobeIndex+1<looks.length)button('skinNext',W-72,368,45,48,'›','',false,'dim');
  if(id!==save.skin)button('wear',W/2,576,230,51,T('equip'),'',false);
  else {ctx.fillStyle='#b6d7b0';ctx.font='bold 19px system-ui';ctx.fillText('✓ '+T('equipped'),W/2,582);}
  button('backTitle',W/2,661,210,48,T('back'),'',false,'neutral');
}

function titleScreen() {
  clearButtons(); dim(0.6);
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.font = '900 56px system-ui, sans-serif'; ctx.fillText(T('tower') + ' ' + tower.tp.N, W / 2, H * 0.22);
  ctx.font = '600 22px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText(T('theme.' + tower.tp.theme) + (tower.tp.exam ? ' · '+T('exam') : ''), W / 2, H * 0.22 + 36, W-30);
  if (save.cp) { ctx.fillStyle = '#8ff0a4'; ctx.font = '600 18px system-ui, sans-serif'; ctx.fillText(T('checkpoint', save.cp), W / 2, H * 0.22 + 64); }
  ctx.font = '500 19px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const debut = towerMilestones().find(u => u.tower === tower.tp.N);
  const hint = 'hint.' + (debut ? debut.type : tower.tp.theme);
  [T('hint1'), T('hint2'), T(hint)].forEach((l, i) => ctx.fillText(l, W / 2, H * 0.36 + i * 28, W - 32));
  if (tower.tp.mods.length) { ctx.fillStyle = '#ffe08a'; ctx.font = '700 16px system-ui'; ctx.fillText(modifiersText(tower.tp), W / 2, H * 0.36 + 86, W - 32); }
  button('play', W / 2, H * 0.5, 260, 60, T('play'), '', false);
  const upcoming = towerMilestones().find(u => u.tower > tower.tp.N);
  if (upcoming) {
    ctx.font = '600 17px system-ui'; ctx.fillStyle = '#ffe4a3';
    ctx.fillText(T('until.' + upcoming.type, upcoming.tower - tower.tp.N), W / 2, H * 0.5 + 62, W - 32);
  }
  const examN = Math.ceil(tower.tp.N/5)*5;
  examTicket(examN,551,tower.tp.exam ? T('exam.goal',fmtTime(tower.tp.par)) : T('exam.rule'),
    tower.tp.exam ? T('exam.prize',skinName(examSkin(examN))) : undefined);
  drawJournal();
  const hasLooks=save.skins.length || save.skin!=='none';
  button('shop',hasLooks?143:W/2,806,184,43,T('shop'),'',false,'neutral',19);
  if (hasLooks) button('wardrobe',337,806,184,43,T('wardrobe'),'',false,'neutral',19);
  button('language',W-46,41,60,37,LANG.toUpperCase(),'',false,'dim',15);
}
function deadScreen(active) {
  clearButtons(); dim(0.72);
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.font = '900 64px system-ui, sans-serif'; ctx.fillText(T('fell'), W / 2, H * 0.28);
  ctx.font = '600 22px system-ui, sans-serif'; ctx.fillStyle = '#ff7a6b'; ctx.fillText(T('die.' + run.reason), W / 2, H * 0.28 + 44);
  ctx.font = '500 20px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
  [T('runCoins') + ': ' + run.runCoins + (run.usedDouble ? '  ×2' : ''), T('total') + ': ' + coins()].forEach((l, i) => ctx.fillText(l, W / 2, H * 0.28 + 90 + i * 30));
  if (!active) return;
  let y = H * 0.56;
  if (!run.usedContinue) { button('continue', W / 2, y, 300, 60, T('continueAd'), T('forAd'), true); y += 76; }
  if (run.cp > 0) { button('cp', W / 2, y, 300, 60, T('fromCp'), T('checkpoint', run.cp), false); y += 76; }
  button('restart', W / 2, y, 300, 60, T('restart'), '', false, run.cp > 0 ? 'neutral' : undefined);
}
function finishScreen(active) {
  clearButtons(); dim(0.78);
  const N = tower.tp.N, rt = run.rating, tp = tower.tp;
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.font = '900 40px system-ui, sans-serif'; ctx.fillText(T('towerDone', N), W / 2, H * 0.11);
  const pop = Math.min(1, tGame * 3); ctx.save(); ctx.translate(W / 2, H * 0.24); ctx.scale(0.5 + pop * 0.5, 0.5 + pop * 0.5); // буква появляется с ударом
  ctx.fillStyle = RANK_COLOR[rt.letter]; ctx.font = '900 120px system-ui, sans-serif'; ctx.fillText(rt.letter, 0, 42); ctx.restore();
  if (run.usedContinue) {
    ctx.fillStyle='#f2c2ac';ctx.font='bold 15px system-ui';
    ctx.fillText(T('rankContinue'),W/2,266,W-36);
  }
  ctx.font = '500 19px system-ui, sans-serif';
  const rows = [[rt.checks.noDeath, T('chk.noDeath')], [rt.checks.time, T('chk.time') + ' ' + fmtTime(run.time) + ' / ' + fmtTime(tp.par)],
    [rt.checks.food, T('chk.food') + ' ' + run.foodEaten + ' / ' + run.foodTotal + ' · ' + T('foodGoal')]];
  rows.forEach(([ok, l], i) => { ctx.fillStyle = ok ? '#8ff0a4' : 'rgba(255,255,255,0.5)'; ctx.fillText((ok ? '✓ ' : '✗ ') + l, W / 2, H * 0.34 + i * 28); });
  const earnedBeforeDouble = run.usedDouble ? run.runCoins/2 : run.runCoins;
  ctx.fillStyle='#f1e1c9'; ctx.font='16px system-ui';
  ctx.fillText(T('loot')+' +'+(earnedBeforeDouble-run.bonus)+'    '+T('bonus')+(tp.exam?' ×3':'')+' +'+run.bonus,W/2,403,W-32);
  ctx.fillStyle='#ffe08a';ctx.font='bold 22px system-ui';
  ctx.fillText(T('credited')+'  ● '+run.runCoins+(run.usedDouble?'  (×2)':''),W/2,434);
  const unlocked = towerMilestones().find(u => u.tower === N + 1);
  if (unlocked) {
    const y = 482;
    ctx.fillStyle = '#3d3022'; rrect(W / 2 - 150, y - 25, 300, 50, 13); ctx.fill();
    ctx.save();
    if (unlocked.type==='tea' || unlocked.type==='smokehouse') {
      ctx.translate(W/2-117,y+1); ctx.scale(.52,.52);
      drawLatePlatform({type:unlocked.type==='tea'?'teaLift':'damper',w:94,y:0});
    } else if (unlocked.type==='bakery') {
      ctx.translate(W/2-117,y+6); ctx.scale(.8,.8); drawFlourSack({phase:'idle',drop:0,limit:150,y:0});
    } else if (unlocked.type==='choice') {
      ctx.translate(W/2-117,y); toolLine([[0,13],[0,2],[-13,-10]],'#b7ccab',3);
      toolLine([[0,2],[13,-10]],'#ffca76',3); biomeEllipse(13,-10,4,4,'#f2bb63');
    } else if (unlocked.type==='pair') {
      for (const dir of [-1,1]) {ctx.save();ctx.translate(W/2-117+dir*9,y-15);ctx.rotate(dir*.22);ctx.scale(.29,.29);drawCleaver();ctx.restore();}
    } else if (KITCHEN_ART[unlocked.type]) {
      ctx.translate(W/2-117,y); kitchenIcon(unlocked.type);
    } else if (unlocked.type === 'pendulum') {
      ctx.translate(W / 2 - 109, y - 17); ctx.rotate(0.64); ctx.scale(0.43, 0.43); drawCleaver();
    } else if (unlocked.type === 'mallet') {
      ctx.translate(W / 2 - 119, y + 19); ctx.rotate(.25); ctx.scale(.35,.35); drawMalletHead();
    } else if (unlocked.type === 'mousetrap') {
      ctx.translate(W / 2 - 118, y + 11); ctx.scale(0.62, 0.62); drawMousetrap({ phase: 'idle' });
    } else {
      ctx.translate(W / 2 - 116, y + 17); ctx.scale(.48,.48);
      TRAP_DRAW[unlocked.type]({ phase:'active', time:.062, dir:1 });
    }
    ctx.restore();
    ctx.fillStyle = '#ffe4a3'; ctx.font = '700 20px system-ui';
    ctx.fillText(T('unlock.' + unlocked.type), W / 2 + 12, y + 7, 214);
  }
  const ticketY=unlocked ? 522 : 465;
  if(tp.exam) {
    const won=rt.letter==='S', skin=examSkin(N);
    examTicket(N,ticketY,won ? T('exam.won') : T('exam.missed'),skinName(skin),won?103:0);
    if (won && active && save.skin!==skin) button('wearReward',373,ticketY+32,95,39,T('equip'),'',false,undefined,17);
    if (won && save.skin===skin) {
      ctx.fillStyle='#48603e';ctx.textAlign='center';ctx.font='bold 14px system-ui';ctx.fillText('✓ '+T('equipped'),376,ticketY+37,87);
    }
    if (!won) {ctx.fillStyle='#e9d2ad';ctx.font='16px system-ui';ctx.fillText(T('exam.next',N+5),W/2,ticketY+88);}
  } else if(isExamTower(N+1)) {
    examTicket(N+1,ticketY,T('exam.goal',fmtTime(towerParams(N+1).par)),T('exam.next',N+1)+' · '+T('exam.prize',skinName(examSkin(N+1))));
  }
  if (!active) return;
  let y = tp.exam ? ticketY+(rt.letter==='S'?108:132) : (isExamTower(N+1) ? ticketY+108 : unlocked ? 557 : 525);
  if (!run.usedDouble && run.runCoins >= DOUBLE_MIN_COINS) { button('double', W / 2, y, 300, 53, T('doubleAd'), T('forAd'), true); y+=61; }
  button('next', W/2,y,300,52,T('next'),'',false);
  button('home',W/2,y+55,190,40,T('home'),'',false,'dim');
}
function pausedScreen(tapToContinue) {
  dim(0.6); ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.font = '900 48px system-ui, sans-serif'; ctx.fillText(T('paused'), W / 2, H * 0.45);
  if (tapToContinue) { ctx.font = '800 24px system-ui, sans-serif'; ctx.fillStyle = '#ffe08a'; ctx.fillText(T('tapToContinue'), W / 2, H * 0.53); }
}
function adStubScreen() {
  if (!YG.adStub) return;
  dim(0.85); ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.font = '800 30px system-ui, sans-serif'; ctx.fillText(T('adStub'), W / 2, H * 0.48);
  ctx.font = '500 18px system-ui, sans-serif'; ctx.fillText(YG.adStub.kind, W / 2, H * 0.53);
}
function loadingScreen() {
  beginField(); dim(1); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '600 22px system-ui, sans-serif'; ctx.fillText(T('loading'), W / 2, H * 0.5);
}
expose({ titleScreen, deadScreen, finishScreen, pausedScreen, adStubScreen, loadingScreen, fmtTime, get buttons() { return buttons; }, hitButton });
