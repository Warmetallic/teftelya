// Exam invitations, earned looks, purchases and pickups through the usual game entry points.
const assert=require('node:assert/strict');
const noop=()=>{};
const ctx=new Proxy({},{get:(_,key)=>/Gradient$/.test(key)?()=>({addColorStop:noop}):noop});
const makeEnv=require('./_env');
const bot=require('./bot');

(async()=>{
  const g=makeEnv(ctx),d=g.dbg();
  await g.boot();g.step();
  function button(id) {return d.buttons.find(b=>b.id===id);}
  function tap(id) {
    const b=button(id);assert.ok(b,'visible control: '+id);
    g.tap(b.x,b.y);g.step();
  }
  tap('language');assert.equal(d.lang,'en');tap('language');tap('language');
  assert.equal(d.lang,'ru');assert.equal(g.store.get('teft_language'),'ru');
  // A saved log earns the same prize as a live finish, including later editions.
  const old=d.migrate({v:4,tower:32,log:{4:{r:'S',t:40},5:{r:'A',t:30},10:{r:'S',t:90},30:{r:'S',t:120}}});
  assert.deepEqual(old.skins,['exam_10','exam_30']);
  const merged=d.mergeSaves(old,d.migrate({v:5,log:{5:{r:'S',t:80}},skin:'exam_5',equipRev:2}));
  assert.deepEqual(merged.skins,['exam_10','exam_30','exam_5']);assert.equal(merged.skin,'exam_5');

  d.save.worldSeed=42;
  const random=Math.random;
  try {
    Math.random=d.mulberry32(47);
    d.startTower(5);d.state='play';bot.climbLive(d);
  } finally {Math.random=random;}
  assert.equal(d.run.rating.letter,'S');
  for(let i=0;i<45;i++)g.step();
  assert.ok(d.run.foodEaten>=d.run.foodTotal*.8 && d.run.deaths===0);
  assert.ok(d.save.skins.includes('exam_5'));tap('wearReward');assert.equal(d.save.skin,'exam_5');
  const wallet=d.coins();d.finishTower();assert.equal(wallet,d.coins());
  d.doubleCoins();const doubled=d.coins();d.doubleCoins();assert.equal(d.coins(),doubled);
  tap('home');assert.equal(d.state,'title');assert.equal(d.tower.tp.N,6);
  tap('wardrobe');tap('skinPrev');tap('wear');assert.equal(d.save.skin,'none');tap('backTitle');
  tap('shop');tap('buy');assert.equal(d.save.up.meat,1);assert.equal(d.ball.mass,5);
  tap('offer_charge');tap('buy');assert.equal(d.save.up.charge,1);assert.equal(d.ball.charges,4);assert.ok(!button('buy'));
  tap('shopLooks');tap('buy');tap('equipShop');assert.equal(d.save.skin,'bow');
  const paid=d.save.spent;assert.ok(!button('buy'));tap('backTitle');
  const saved=JSON.parse(g.store.get('teft_save'));assert.equal(saved.spent,paid);assert.equal(saved.skin,'bow');
  d.startTower(10);d.state='play';d.finishTower();assert.equal(d.run.rating.letter,'A');assert.ok(!d.save.skins.includes('exam_10'));
  d.startTower(10);d.state='play';d.run.usedContinue=1;d.run.foodEaten=d.run.foodTotal;d.finishTower();
  assert.equal(d.run.rating.letter,'D');assert.ok(!d.save.skins.includes('exam_10'));
  for(const type of ['sauce','parsley']) {
    d.startTower(1);d.state='play';
    const p=d.tower.pickups.find(p=>p.kind===type);assert.ok(p);
    d.ball.x=p.x;d.ball.y=p.y;d.ball.vy=0;d.ball.onPlatform=null;
    d.resetPours(1e9);d.hazards.length=0;d.resetFlies();for(const it of d.items)it.dead=true;
    d.setCamY(p.y-350);d.ball.charges=0;
    const total=d.run.foodTotal;d.update(1/60);assert.ok(p.dead);assert.equal(total,d.items.length);assert.equal(d.run.foodEaten,0);
    if(type==='sauce') {
      const mass=d.ball.mass;assert.equal(d.run.shield,true);
      d.damage(1,'knife',p.x,p.y);assert.equal(d.ball.mass,mass);assert.equal(d.run.shield,false);
      d.run.invuln=0;d.damage(1,'knife',p.x,p.y);assert.equal(d.ball.mass,mass-1);
    } else {
      assert.equal(d.chargesMax(),5);assert.equal(d.ball.charges,1);assert.ok(d.jumpTo(p.x,p.y-180));
      d.state='title';const remaining=d.run.parsleyTime;d.update(1);assert.equal(d.run.parsleyTime,remaining);
      d.state='play';d.run.parsleyTime=.01;d.ball.charges=5;d.update(1/60);
      assert.equal(d.chargesMax(),4);assert.equal(d.ball.charges,4);
    }
  }
  for(const lang of ['ru','en','tr']) {
    d.setLang(lang);for(const k of ['exam.goal','exam.rule','exam.won','exam.missed','skin.chef','credited','pickup.sauce','pickup.parsley','up.meat'])
      assert.notEqual(d.T(k),k);
  }
  console.log('test_rewards ok');
})().catch(e=>{console.error(e);process.exitCode=1;});
