'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=game(__dirname),{ram,has}=require('./opening_image.js')(g);
const {labyrinthOpeningResponses:records}=g.run('levels.html','labyrinth-responses','labyrinthOpeningResponses');
const {labyrinthChangeReplies:counterReplies}=g.run('levels.html','labyrinth-change-text','labyrinthChangeReplies');
for(const [address,text] of Object.entries(counterReplies))assert.equal(text,records.find(r=>r.address===Number(address))?.text,'counter reply '+address);
const symbols=g.json('parts/opening/symbols.json');
function parse(memory,address){
 const c=new CPU(Uint8Array.from(memory),{port:{dir:0x2f,data:0x25}});
 c.m[0x10]=address&255;c.m[0x11]=address>>8;
 let text='';c.call(0x67b5,{d:0},{hooks:{
  0x6891:c=>{text+=String.fromCharCode(c.a);c.rts();},
  0x67c4:c=>{text+='\n';},0x6866:c=>c.rts()
 },maxSteps:30000});return text;
}
assert.equal(records.length,127);
let bytes=0;
const ranges=[[0x7910,0x8340],[0x968e,0xa9e8]];
let range=0,next=ranges[0][0];
for(const record of records){
 assert.equal(record.address,next);assert(record.end-record.address<256);
 let i=record.address;
 while(i<record.end){
  assert(has[i]);const token=ram[i++];assert.notEqual(token,0);
  if(token>=0xfb&&token<=0xfe){assert(i<record.end&&has[i]);i++;}
  else assert(token===0xff||token===0x40||token>=32&&token<127,`unhandled byte $${(i-1).toString(16)}`);
 }
 assert.equal(i,record.end);assert(has[i]);assert.equal(ram[i],0);
 assert.equal(parse(ram,record.address),record.text,`reply $${record.address.toString(16)}`);
 const comment=symbols.comments.find(c=>c.address===record.address&&c.type==='line');
 assert(comment&&comment.text.includes(JSON.stringify(record.text)),`listing description for $${record.address.toString(16)}`);
 next=record.end+1;bytes+=record.end-record.address+1;
 if(next===ranges[range][1]&&range+1<ranges.length){range++;next=ranges[range][0];}
}
assert.equal(next,0xa9e8);assert.equal(bytes,0x8340-0x7910+0xa9e8-0x968e);
// Execute the actual setup writer before checking the editable word in its reply.
const c=new CPU(Uint8Array.from(ram));
c.call(0x8e16,{d:0},{hooks:{0x8ce3:c=>c.rts(),0x8cda:c=>c.rts(),0x8edb:c=>{c.m[0x6683]=0x57;c.rts();}}});
assert.equal(c.m[0x9fbe],0x10);
const offer=records.find(r=>r.address===0x9fb4);
assert.equal(parse(c.m,offer.address),offer.text.replace('girl','boy'));
console.log(`OK - all 127 response texts, listing descriptions and ${bytes} stored bytes match; setup's editable-word path also matches`);
