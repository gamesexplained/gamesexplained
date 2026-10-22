'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const {ram}=game(__dirname).listing('parts/scene-06/listing.json');
const c=new CPU(Uint8Array.from(ram));
let checked=0;
function check(xLow,xHigh,depth){
  c.m[0x53a]=xLow;c.m[0x53e]=xHigh;c.m[0x546]=depth;c.m[0x531]=6;
  let path=null;
  c.call(0x8f5a,{a:1,x:1,y:24,d:0},{hooks:{
    0x90d4:c=>{path='blocked';assert.equal(c.y+256*c.x,0x987d);return true;},
    0x8f7b:c=>{path='clear';assert.equal(c.m[0x531],4);return true;}
  }});
  assert.equal(path,xLow===32&&xHigh===6&&depth>=22?'blocked':'clear');
  checked++;
}
for(let depth=0;depth<256;depth++)check(32,6,depth);
for(let xLow=0;xLow<256;xLow++)for(let xHigh of [5,6,7]){
  check(xLow,xHigh,21);check(xLow,xHigh,22);
}
const parser=new CPU(Uint8Array.from(ram),{port:{dir:47,data:37}});
parser.m[0x10]=0x7d;parser.m[0x11]=0x98;
let reply='';
parser.call(0x6782,{d:0},{hooks:{
  0x6942:c=>c.rts(),
  0x6891:c=>{if(c.a>=32&&c.a<127)reply+=String.fromCharCode(c.a);c.rts();},
  0x67c4:()=>reply+=' ',
  0x6866:c=>c.rts()
}});
assert.equal(reply.replace(/\s+/g,' ').trim(),"He's in the way!");
console.log(`OK - ${checked} original guarded-door position checks and original reply expansion`);
