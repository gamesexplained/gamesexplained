'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname)),image=require('./opening_image.js')(g),{ram,has}=image;
for(const entry of [0x90ba,0x90d6,0x90e5,0x90f4,0x9114,0x9123,0x9327]) {
 assert.equal(image.listing.records.find(r=>r.a===entry)?.t,'code',`handler $${entry.toString(16)} must be listed as code`);
}
const {labyrinthEastTable,labyrinthNoTicketReply,labyrinthEastOutcome}=g.run('levels.html','labyrinth-east','labyrinthEastTable','labyrinthNoTicketReply','labyrinthEastOutcome');
for(let i=0;i<14;i++) {
 assert(has[0xaa20+i]&&has[0xaa2e+i]);
 assert.equal(labyrinthEastTable[i].high,ram[0xaa20+i]);
 assert.equal(labyrinthEastTable[i].low,ram[0xaa2e+i]);
}
let cases=0;
for(let location=0;location<14;location++)for(let ticket=0;ticket<256;ticket++) {
 const cpu=new CPU(Uint8Array.from(ram));cpu.m[0x8c80]=location;cpu.m[0x6740]=ticket;
 let actual;
 cpu.call(0x90f4,{d:0},{hooks:{
  0x8fd7:c=>{actual={kind:'move',destination:c.m[0x8c80]};return true;},
  0x8cda:c=>{actual={kind:'reply',address:c.y+256*c.x};c.rts();},
  0x8ce3:c=>{actual={kind:'reply',address:c.m[0x10]+256*c.m[0x11]};c.rts();}
 }});
 assert.deepStrictEqual(JSON.parse(JSON.stringify(labyrinthEastOutcome(location,ticket))),actual);
 if(actual.kind==='reply')assert.equal(cpu.m[0x8c80],location);
 cases++;
}
{
 const cpu=new CPU(Uint8Array.from(ram),{port:{dir:0x2f,data:0x25}});cpu.m[0x10]=0x52;cpu.m[0x11]=0x9f;
 let text='';cpu.call(0x67b5,{d:0},{hooks:{0x6891:c=>{text+=String.fromCharCode(c.a);c.rts();},0x6866:c=>c.rts()}});
 assert.equal(labyrinthNoTicketReply,text);
}
for(let dollars=1;dollars<=9;dollars++) {
 const cpu=new CPU(Uint8Array.from(ram));
 cpu.m[0x8c80]=6;cpu.m[0x666f]=6;cpu.m[0x672f]=dollars-1;cpu.m[0x6740]=255;
 const replies=[];
 cpu.call(0x9327,{d:0},{hooks:{
  0x8cda:c=>{replies.push(c.y+256*c.x);c.rts();},
  0x8ce3:c=>{replies.push(c.m[0x10]+256*c.m[0x11]);c.rts();},
  0x5fbd:c=>c.rts()
 }});
 const money=cpu.m[0x672f]&128?0:cpu.m[0x672f]+1;
 assert.equal(money,dollars<5?dollars:dollars-5,`${dollars} dollars`);
 assert.equal(cpu.m[0x6740],dollars<5?255:0);
 assert(replies.includes(dollars<5?0xa886:0xa00d));
}
console.log(`OK - ${cases} eastward decisions and refusal text match the original; all 9 owned-dollar purchase cases charge five or refuse`);
