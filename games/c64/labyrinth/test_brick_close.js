'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname)),{ram}=g.listing('parts/scene-03/listing.json');
const {labyrinthBrickCloseData:d,labyrinthBrickCloseDoor:close,labyrinthBrickDoorCycle:cycle}=g.run('levels.html','labyrinth-brick-close','labyrinthBrickCloseData','labyrinthBrickCloseDoor','labyrinthBrickDoorCycle');
const {labyrinthBrickOpenDoor:open}=g.run('levels.html','labyrinth-brick-door','labyrinthBrickOpenDoor');
for(const [address,values] of [[0x72e,d.replacements],[0x73e,d.types]])assert.deepStrictEqual([...ram.slice(address,address+values.length)],[...values]);
assert.deepStrictEqual([...ram.slice(0x8b2e,0x8b30)],[32,45]);assert.equal(ram[0x8bee]+256*ram[0x8bef],0x8e9e);
const texts={};for(const address of [0x92e0,0x92ca,0x94bb]){
 const c=new CPU(Uint8Array.from(ram),{port:{dir:47,data:37}});c.m[0x10]=address&255;c.m[0x11]=address>>8;let text='';
 c.call(0x6782,{d:0},{hooks:{0x6942:c=>c.rts(),0x6891:c=>{if(c.a>=32&&c.a<127)text+=String.fromCharCode(c.a);c.rts();},0x67c4:()=>{text+=' ';},0x6866:c=>c.rts()}});texts[address]=text;
}
for(let mode=0;mode<256;mode++)for(let cell=0;cell<256;cell++){
 const c=new CPU(Uint8Array.from(ram));c.m[0x343]=mode;c.m[0x569]=0;let mutation=null,sound=null,response=null;
 c.call(0x8e9e,{d:0},{hooks:{0x0818:c=>{c.a=cell&15;c.x=d.types[cell&15];c.y=36;c.rts();},0x081b:c=>{mutation=[c.a,c.y];c.rts();},0x081e:c=>{sound=c.a;c.rts();},0x0827:c=>{assert.equal(c.a,5);response=texts[c.x*256+c.y];c.rts();}}});
 const r=close(cell,mode);assert.equal(r.closed,mutation!==null);
 if(r.closed){assert.deepStrictEqual(mutation,[r.cell,36]);assert.equal(sound,2);assert.equal(c.m[0x569],255);}
 else{assert.equal(r.cell,cell);assert.equal(response,r.message);assert.equal(sound,null);assert.equal(c.m[0x569],0);}
}
assert.equal(close(7).message,texts[0x92e0]);
for(const initialCount of [0,1,3,4,255]){
 const c=new CPU(Uint8Array.from(ram));c.m[0x343]=255;c.m[0x5e]=63;c.m[0x538]=2348&255;c.m[0x53c]=2348>>8;c.m[0x544]=24;c.m[0x531]=3;c.m[0x530]=255;c.m[0x624]=6;c.m[0x569]=initialCount;
 let state={cell:6,count:initialCount};
 for(const action of ['close','close','open','open']){
  let sound=null,response=null;c.m[0x530]=255;
  c.call(action==='close'?0x8e9e:0x9053,{d:0},{hooks:{0x081e:c=>{sound=c.a;c.rts();},0x0827:c=>{response=texts[c.x*256+c.y];c.rts();}}});
  const next=cycle(state,action,open);assert.equal(c.m[0x624],next.cell);assert.equal(c.m[0x569],next.count);assert.equal(c.m[0x530],next.changed?0:255);
  if(next.changed){assert.equal(sound,action==='close'?2:1);assert.equal(c.m[0x400],3);assert.equal(c.m[0x455],36);assert.equal(c.m[0x4aa],next.cell);}else assert.equal(response,next.message);
  state=next;
 }
 assert.equal(state.count,initialCount);assert.equal(state.cell,6);
}
const html=g.read('levels.html');assert(html.includes('data-initial-cell="6"'));assert(html.includes('data-initial-count="4"'));for(const action of ['close','open'])assert(html.includes('data-cycle-action="'+action+'"'));
assert.throws(()=>cycle({cell:6,count:4},'other',open),RangeError);
console.log('OK - 65,536 original CLOSE decisions, original reply parses, decrement wrap, and 20 complete classifier/mutation calls across five cycle counters including the page’s live count4 sequence');
