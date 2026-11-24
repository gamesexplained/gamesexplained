'use strict';
// Small ports of the control selector, pose reader, free movement, contact test,
// landing rectangles and opponent decisions. test_mechanics.js checks these against
// the original routines. Terrain collision and projectile flight are outside these ports.
(function(root){
function create(data){
 const u=n=>n&255;
 function select({facing=1,heading=4,weapon=1,mode='held',boundary=0}){
  if(mode==='rest')return {offset:null,pointer:0,family:facing>>1,crouch:true};
  let offset;
  if(mode==='move'||(boundary>=16&&boundary<=19)){
   const distance=Math.min(u(heading-facing+8)%8,u(facing-heading+8)%8);
   offset=distance<=1?4:0;
  }else offset=12+4*heading+(weapon===0||weapon>=4?32:0);
  const mirror=((facing+2)&4)>>1;
  return {offset,pointer:data.actions[offset>>2][mirror>>1],family:(facing>>1)+data.families[offset>>2],crouch:false};
 }
 function move(s,mode=0){
  const t=data.movement,k=s.facing>>1,mask=1<<s.heading;
  let fx=s.x*256+(s.fx||0),fy=s.y*256+(s.fy||0);
  const dx=256*t.xw[mode]+t.xf[mode],dy=256*t.yw[mode]+t.yf[mode];
  if(t.masks[k]&mask){const n=fx-dx;fx=(Math.max(0,n>>8)<<8)|(n&255);}
  if(t.masks[4+k]&mask){const n=fx+dx;fx=((n>65535?254:n>>8)<<8)|(n&255);}
  if(!(t.masks[20+k]&mask)){
   if(t.masks[8+k]&mask){fy-=dy;if(t.masks[16+k]&mask)fy-=dy;}
   if(t.masks[12+k]&mask){fy+=dy;if(t.masks[16+k]&mask)fy+=dy;}
  }
  s.x=(fx>>8)&255;s.fx=fx&255;s.y=(fy>>8)&255;s.fy=fy&255;return s;
 }
 function step(s){
  s.event=0;s.fresh=false;
  if(s.pointer<256)return s;
  if(s.remaining>1){s.remaining--;if(s.flags&4)move(s);return s;}
  const r=data.records[s.pointer];if(!r)throw Error('Unknown pose record '+s.pointer);
  s.fresh=true;s.record=s.pointer;s.flags=r.flags;
  if(r.interval!==null)s.interval=r.interval;
  s.remaining=s.interval;s.pose=r.pose;s.x=u(s.x+r.dx);s.y=u(s.y+r.dy);s.event=r.event;s.extra=r.extra;s.pointer=r.next;
  if(s.pointer>=256&&(r.flags&4))move(s);
  s.mirror=(r.flags&16)?s.facing&2:r.flags&64;return s;
 }
 function timeline(params){
  const chosen=select(params);if(chosen.crouch)return [{x:params.x||100,y:params.y||90,pose:params.facing===3||params.facing===5?17:16,mirror:params.facing&2,event:0,fresh:true,tick:0,pointer:0}];
  const s={...params,x:params.x??100,y:params.y??90,fx:params.fx||0,fy:params.fy||0,pointer:chosen.pointer,remaining:0,interval:0,flags:0,family:chosen.family};
  const out=[];for(let tick=0;tick<256;tick++){step(s);out.push({...s,tick});if(s.pointer<256)break;}
  if(out.length===256)throw Error('Action failed to stop');return out;
 }
 function contact({ax=100,ay=90,bx=124,by=90,family=20,defender=0,weapon=0,type=128,attacker=0,closeCount=0}){
  const face=family&3,override=attacker===2&&type===133;
  const index=override?20:((weapon<4?weapon*4:weapon<6?0:16)|((u(family-20))>>2));
  const range={xmin:data.contact.xmin[index],xmax:data.contact.xmax[index],ymin:data.contact.ymin[index],ymax:data.contact.ymax[index]};
  let h=face<2?bx-ax:ax-bx;const inFront=h>=0;let v=8+((face===0||face===3)?ay-by:by-ay);
  if(!override&&(family&1))h=Math.max(0,h-3);
  let reason='Outside the attack area';let hit=false;
  if(type<128)reason='No active opponent';
  else if((defender&252)===12)reason='The target is somersaulting';
  else if(inFront&&h>=range.xmin&&h<range.xmax&&v>=range.ymin&&v<range.ymax){
   if((defender&252)===16&&((defender^family)&2)&&closeCount<4)reason='The target is guarding toward the attack';
   else {hit=true;reason='Contact';}
  }
  return {hit,reason,index,h,v,range,wounds:data.contact.wounds[index]??null};
 }
 const safe=(rectangles,x,y)=>rectangles.some(([l,r,t,b])=>l<=x&&x<r&&t<=y&&y<b);
 function pickup({code,bounds,x,y,facing=1,bag=true,holding=10,owned=false}){
  // Called with carry set, as after the original heading checks on a pickup path.
  const hand=x-(facing>=4?36:0);
  if(hand<0||!safe([bounds],hand,y))return 'Out of reach';
  if(owned)return 'Already collected';
  if(!bag&&code!==2&&code<10)return 'The pouch is required';
  if(code===1&&holding!==6)return 'Selecting the glove is required';
  if(code===16)return 'Starts the scripted room effect';
  if(code===18||code===19)return 'Activates a hidden effect';
  return 'Can collect';
 }
 function enemyWait(variant,random){return (random&31)+(variant?16:0);}
 function target({px,py,ex,ey,heading=1,variant=0}){
  let aim=heading>=128?px:heading<4?px-8:px+8;
  if(aim<0||aim>255)return {close:true,target:px,distance:0};
  let t;if(aim<ex){t=px+data.spacing[variant];if(t>255)t=px-data.spacing[variant];}else{t=px-data.spacing[variant];if(t<0)t=px+data.spacing[variant];}
  const distance=Math.min(255,Math.abs(t-ex)+Math.abs(py-ey));
  return {target:t,distance,close:distance<6};
 }
 function closeAction(variant,random,playerFamily,facing=1){
  if((playerFamily&252)===36)return {state:8,offset:null,family:0};
  const n=(random&(variant?3:1))*4;return {state:7,offset:28+n,family:20+n+(facing>>1)};
 }
 function closeWait({px,py,savedX,savedY,count,random,elapsed}){const moved=Math.abs(px-savedX)>=8||Math.abs(py-savedY)>=4,delay=16+(random&31);return {moved,delay,next:moved||count>=3?'approach':(elapsed&255)>=delay?'close':'wait'};}
 function useItem(puzzle,{holding,weapon=0,selectedWeapon=weapon,facing=1,flowerOwned=true}){return holding===puzzle.code&&(!puzzle.requiresHands||weapon===0)&&(!puzzle.checksSelectedWeapon||selectedWeapon===0)&&(!puzzle.requiresFacing||facing===1)&&(!puzzle.consumes||flowerOwned);}
 return {select,move,step,timeline,contact,safe,pickup,enemyWait,target,closeAction,closeWait,useItem};
}
if(typeof module==='object'&&module.exports)module.exports={create};else root.NinjaRules={create};
})(globalThis);
