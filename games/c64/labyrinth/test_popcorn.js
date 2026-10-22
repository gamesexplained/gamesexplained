'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=game(__dirname),{ram}=require('./opening_image.js')(g);
const {labyrinthPopcornPurchase,labyrinthPopcornReplies}=g.run('levels.html','labyrinth-popcorn','labyrinthPopcornPurchase','labyrinthPopcornReplies');
let cases=0;
for(let dollars=1;dollars<=9;dollars++)for(let flag=0;flag<256;flag++){
 const c=new CPU(Uint8Array.from(ram));
 c.m[0x8c80]=7;c.m[0x666f]=6;c.m[0x672f]=dollars-1;c.m[0x6739]=255;c.m[0x9688]=flag;
 const replies=[];
 c.call(0x9327,{d:0},{hooks:{
  0x8cda:c=>{replies.push(c.y+256*c.x);c.rts();},
  0x8ce3:c=>{replies.push(c.m[0x10]+256*c.m[0x11]);c.rts();},
  0x5fbd:c=>c.rts()
 }});
 const expected=labyrinthPopcornPurchase(dollars,flag);
 assert.deepStrictEqual({dollars:c.m[0x672f]&128?0:c.m[0x672f]+1,popcorn:c.m[0x6739]&128?0:c.m[0x6739]+1,flag:c.m[0x9688],reply:replies.at(-1)},JSON.parse(JSON.stringify(expected)),`${dollars} dollars, flag ${flag}`);
 if(expected.popcorn){assert.equal(c.m[0x968b],0);assert.equal(c.m[0x968c],1);assert.equal(c.m[0x968d],2);assert.equal(c.m[0xaab3],0x11);assert.equal(c.m[0xaaa5]+256*c.m[0xaa97],0xa257);}
 cases++;
}
for(const [address,text] of Object.entries(labyrinthPopcornReplies)){
 const c=new CPU(Uint8Array.from(ram),{port:{dir:0x2f,data:0x25}});c.m[0x10]=Number(address)&255;c.m[0x11]=Number(address)>>8;
 let actual='';c.call(0x67b5,{d:0},{hooks:{0x6891:c=>{actual+=String.fromCharCode(c.a);c.rts();},0x6866:c=>c.rts(),0x67c4:c=>{actual+='\n';}}});assert.equal(text,actual);
}
console.log(`OK - ${cases} popcorn purchases and all three replies match the original routines`);
