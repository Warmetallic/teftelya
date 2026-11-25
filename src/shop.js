'use strict';
// Prices in tower coins. Each additional level costs 30% more.
const SHOP_BASE = {meat:60,crust:45,appetite:65,spice:55,nerve:110,grit:95,repel:60,charge:150,fury:180};
// A level is worth 1–3 points according to its effect on a run. Cosmetic purchases carry no points.
const STRENGTH_WEIGHT = {meat:2, crust:1, appetite:1, spice:1, nerve:2, grit:2, repel:1, charge:3, fury:3};
function tefaStrength() {
  return Object.entries(STRENGTH_WEIGHT).reduce((sum,[key,weight])=>sum+save.up[key]*weight,0);
}
function suggestedStrength(n) {
  return Math.min(n-1,29) + (isExamTower(n) ? 2 : 0);
}
const CHARGE_EXAMS = [3,10,25];
const TAILOR_PRICES = {bow:100,glasses:220,mustache:340};
let shopTab='upgrades', shopSelected='meat';

function offerFor(key) {
  if (Object.hasOwn(SHOP_BASE,key)) {
    const level=save.up[key];
    const full=UP_MAX[key]!==null && level>=UP_MAX[key];
    const gate=key==='charge' && !full ? CHARGE_EXAMS[level] : 0;
    const price=Math.ceil(SHOP_BASE[key]*1.3**level);
    return {price,full,locked:gate && save.tower<=gate ? gate : 0};
  }
  return {price:TAILOR_PRICES[key],full:save.skins.includes(key) || save.skin===key,locked:0};
}
function buyOffer(key) {
  if (!Object.hasOwn(SHOP_BASE,key) && !Object.hasOwn(TAILOR_PRICES,key)) return false;
  const {price,full,locked}=offerFor(key);
  if (full || locked || price>coins()) return false;
  save.spent+=price;
  if (Object.hasOwn(SHOP_BASE,key)) {
    save.up[key]++;
    // The title already has a fresh tower loaded before the player enters the shop.
    if(key==='meat') {
      const feet=ball.y+ball.r;
      ball.mass=massMax();ball.r=radiusFor(ball.mass);ball.y=feet-ball.r;
    }
    if(key==='charge') ball.charges=chargesMax();
  } else save.skins.push(key);
  persist();sfx.buy();return true;
}
function openShop(tab='upgrades') {
  shopTab=tab;shopSelected=tab==='upgrades'?'meat':'bow';state='shop';
}
function shopScreen() {
  clearButtons();dim(.89);
  ctx.textAlign='center';ctx.fillStyle='#f8e7cb';ctx.font='bold 33px system-ui';
  ctx.fillText(T('shop'),W/2,80);
  ctx.font='bold 19px system-ui';ctx.fillStyle='#ffdc86';ctx.fillText('● '+coins()+'     ·     '+T('strength',tefaStrength()),W/2,110,W-36);
  const upgrades=shopTab==='upgrades', keys=Object.keys(upgrades?SHOP_BASE:TAILOR_PRICES);
  button('shopUp',137,154,186,43,T('upgrades'),'',false,upgrades?'neutral':'dim');
  button('shopLooks',343,154,186,43,T('looks'),'',false,upgrades?'dim':'neutral');
  const r=clamp(radiusFor(massMax())*1.27,46,74);
  drawTefa(ctx,W/2,252,r,{hp:{cur:ball.mass,max:massMax()},t:tGame});
  drawWornSkin(upgrades?save.skin:shopSelected,W/2,252,r);
  keys.forEach((key,i)=>{
    const selected=key===shopSelected;
    const level=upgrades?' · '+save.up[key]:'';
    button('offer_'+key,88+(i%3)*152,342+Math.floor(i/3)*58,142,49,(upgrades?T('up.'+key):skinName(key))+level,'',false,selected?'neutral':'dim',17);
  });
  const offer=offerFor(shopSelected);
  const heading=upgrades?T('up.'+shopSelected)+' · '+T('level',save.up[shopSelected]):skinName(shopSelected);
  ctx.fillStyle='#f7e9d2';ctx.textAlign='center';ctx.font='bold 23px system-ui';ctx.fillText(heading,W/2,544);
  ctx.font='17px system-ui';ctx.fillStyle='#ddceba';
  ctx.fillText(upgrades?T('effect.'+shopSelected):T('cosmetic'),W/2,577,W-40);
  if (upgrades && !offer.full) {
    ctx.fillStyle='#c8dfb4';ctx.font='bold 17px system-ui';
    ctx.fillText(T('afterUpgrade',tefaStrength()+STRENGTH_WEIGHT[shopSelected]),W/2,607,W-40);
  }
  if(!upgrades && offer.full && shopSelected!==save.skin) button('equipShop',W/2,645,220,53,T('equip'),'',false);
  else if(!offer.full && !offer.locked && coins()>=offer.price) button('buy',W/2,645,255,53,T('buy')+'  ● '+offer.price,'',false);
  else {
    ctx.fillStyle='#e5cd9e';ctx.font='bold 18px system-ui';
    const label=offer.full ? (upgrades?T('maxLevel'):T('equipped')) : offer.locked ? T('afterTower',offer.locked) : T('shortCoins',offer.price-coins());
    ctx.fillText(label,W/2,651,W-40);
  }
  button('backTitle',W/2,754,200,48,T('back'),'',false,'neutral');
}

expose({ tefaStrength, suggestedStrength });
