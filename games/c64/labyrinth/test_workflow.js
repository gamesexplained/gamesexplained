'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname)),{ram}=require('./opening_image.js')(g);
const {labyrinthWorkflowNodes:nodes,labyrinthWorkflowEdges:edges}=g.run('levels.html','labyrinth-workflow','labyrinthWorkflowNodes','labyrinthWorkflowEdges');
assert.equal(nodes.length,8);assert.equal(edges.length,11);
const ids=new Set(nodes.map(n=>n.id));assert.equal(ids.size,nodes.length);
for(const n of nodes){
 const c=new CPU(Uint8Array.from(ram),{port:{dir:0x2f,data:0x25}});c.m[0x10]=n.address&255;c.m[0x11]=n.address>>8;
 let text='';c.call(0x67b5,{d:0},{hooks:{0x6891:c=>{text+=String.fromCharCode(c.a);c.rts();},0x67c4:()=>{text+='\n';},0x6866:c=>c.rts()}});assert.equal(n.text,text,n.id);
}
let moves=0;
for(const e of edges){assert(ids.has(e.source)&&ids.has(e.target));assert(e.condition&&e.result);if(e.kind!=='move')continue;
 for(const ticket of [0,127,128,255]){
  const c=new CPU(Uint8Array.from(ram));c.m[0x8c80]=e.fromLocation;c.m[0x6740]=ticket;let result;
  c.call(e.entry,{d:0},{hooks:{0x8fd7:c=>{result=c.m[0x8c80];return true;},0x8cda:c=>{result=c.y+256*c.x;c.rts();},0x8ce3:c=>{result=c.m[0x10]+256*c.m[0x11];c.rts();}}});
  assert.equal(result,e.id==='ticket-lobby'&&ticket>=128?0x9f52:e.toLocation,e.id);moves++;
 }
}
for(const [id,location,price] of [['buy-ticket',6,5],['buy-popcorn',7,2]]){
 const edge=edges.find(e=>e.id===id);assert.equal(edge.source,location===6?'ticket':'counter');
 for(let dollars=1;dollars<=9;dollars++){
  const c=new CPU(Uint8Array.from(ram));c.m[0x8c80]=location;c.m[0x666f]=6;c.m[0x672f]=dollars-1;c.m[0x6740]=255;c.m[0x6739]=255;c.m[0x9688]=0;
  c.call(0x9327,{d:0},{hooks:{0x8cda:c=>c.rts(),0x8ce3:c=>c.rts(),0x5fbd:c=>c.rts()}});
  const raw=c.m[0x672f];assert.equal(raw<128?raw+1:0,dollars>=price?dollars-price:dollars,id);assert.equal(c.m[location===6?0x6740:0x6739],dollars>=price?0:255,id);
 }
}
const {labyrinthChangeStart:start,labyrinthChangeStep:step}=g.run('levels.html','labyrinth-change','labyrinthChangeStart','labyrinthChangeStep');
let s=start();s=step(s,'complain').state;s=step(s,'complain').state;assert.equal(s.changeByte,3);s=step(s,'take').state;assert.equal(s.quarterByte,2);s=step(s,'take').state;assert.equal(s.nickelTaken,1);s=step(s,'return').state;assert.equal(s.karma,255);
assert(edges.find(e=>e.id==='complaint-refund').entry===0x95b7);assert(edges.find(e=>e.id==='nickel-offer').entry===0x9485);
console.log(`OK - eight workflow texts, ${moves} movement/ticket cases, 18 purchases and the linked refund/return sequence`);
