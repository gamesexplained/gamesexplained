'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname)),{ram}=g.listing('parts/scene-04/listing.json');
const {labyrinthGuardLeftDoorData:data,labyrinthGuardLeftDoor:door}=g.run('levels.html','labyrinth-guard-left-door','labyrinthGuardLeftDoorData','labyrinthGuardLeftDoor');
const {labyrinthGuardAfter:ask}=g.run('levels.html','labyrinth-guard-after','labyrinthGuardAfter');
assert.deepStrictEqual([...ram.slice(0x8b30,0x8b32)],[32,45]);assert.equal(ram[0x8bf0]+256*ram[0x8bf1],0x9273);
assert.deepStrictEqual([...ram.slice(0x8b8e,0x8b90)],[37,45]);assert.equal(ram[0x8c4e]+256*ram[0x8c4f],0x92b3);
function seed(c,cell,flag,depth){for(const[a,v]of [[0x5e,255],[0x343,255],[0x531,4],[0x530,255],[0x538,99],[0x53c,0],[0x544,depth],[0x569,15],[0x56a,1],[0x56b,15],[0x8f04,2],[0x8f0c,0],[0x8f06,1],[0x8f13,flag],[0x601,cell]])c.m[a]=v;}
const c=new CPU(Uint8Array.from(ram));
for(const action of ['open','close'])for(const cell of [1,2])for(let flag=0;flag<256;flag++)for(let depth=0;depth<256;depth++){
 seed(c,cell,flag,depth);let sound=null,address=null;
 c.call(action==='open'?0x92b3:0x9273,{d:0},{hooks:{0x09dd:c=>{address=c.y+256*c.x;c.rts();},0x081e:c=>{sound=c.a;c.rts();},0x0827:c=>{address=c.y+256*c.x;c.rts();}}});
 const result=door({cell,flag},action,depth);
 assert.deepStrictEqual({cell:c.m[0x601],flag:c.m[0x8f13],changed:sound!==null,address},JSON.parse(JSON.stringify(result)),`${action} cell${cell} flag${flag} depth${depth}`);
 assert.deepStrictEqual([...c.m.slice(0x569,0x56c)],[15,1,15]);
 assert.equal(c.m[0x530],result.changed?0:255);assert.deepStrictEqual([...c.m.slice(0x400,0x4fe)],[...ram.slice(0x400,0x4fe)]);
 if(result.changed){assert.equal(sound,action==='open'?1:2);assert.equal(c.m[0x5928],result.cell);assert.equal(c.m[0x5929],1);}
}
const live=new CPU(Uint8Array.from(ram));seed(live,data.cell,data.flag,data.depth);let state={cell:data.cell,flag:data.flag};
assert.equal(data.brickCount,15);assert.equal(data.depth,24);assert.deepStrictEqual([...data.actions],['open','ask','close','ask']);
for(const action of data.actions){
 if(action==='ask'){
  live.m[0x53e]=0;let address;
  live.call(0x8fa8,{d:0},{hooks:{0x0812:c=>{c.a=c.nz(0);c.rts();},0x0827:c=>{address=c.y+256*c.x;return true;}}});
  const result=ask(2,state.flag);assert.equal(address,result.address);assert.equal(live.m[0x8f04],result.next);
 }else{
  live.m[0x530]=255;live.call(action==='open'?0x92b3:0x9273,{d:0},{hooks:{0x081e:c=>c.rts()}});const result=door(state,action,data.depth);state={cell:result.cell,flag:result.flag};
 }
 assert.equal(live.m[0x601],state.cell);assert.equal(live.m[0x8f13],state.flag);assert.deepStrictEqual([...live.m.slice(0x569,0x56c)],[15,1,15]);
}
assert.equal(state.cell,1);assert.equal(state.flag,255);
for(const bad of [-1,256,.5,NaN]){assert.throws(()=>door({cell:1,flag:bad},'open'),RangeError);assert.throws(()=>door({cell:1,flag:255},'open',bad),RangeError);}
assert.throws(()=>door({cell:3,flag:255},'open'),RangeError);assert.throws(()=>door({cell:1,flag:255},'other'),RangeError);
console.log('OK - 262,144 original left-door OPEN/CLOSE cases across both captured cells, all flags and depths; real map query/proximity/mutation, count retained; page’s complete OPEN/ASK/CLOSE/ASK sequence matches original code');
