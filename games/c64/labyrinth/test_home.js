'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=game(__dirname),{ram,has}=require('./opening_image.js')(g);
const {labyrinthHomeTable,labyrinthHomeMessages,labyrinthHomeOutcome}=g.run('levels.html','labyrinth-home','labyrinthHomeTable','labyrinthHomeMessages','labyrinthHomeOutcome');
assert.equal(labyrinthHomeTable.length,14);
for(let location=0;location<14;location++) {
 assert(has[0xaa58+location]&&has[0xaa66+location]);
 assert.equal(labyrinthHomeTable[location].high,ram[0xaa58+location]);
 assert.equal(labyrinthHomeTable[location].low,ram[0xaa66+location]);
 const cpu=new CPU(Uint8Array.from(ram));cpu.m[0x8c80]=location;
 let actual;
 cpu.call(0x9114,{d:0},{hooks:{
  0x8fd7:c=>{actual={kind:'move',destination:c.m[0x8c80]};return true;},
  0x8ce3:c=>{actual={kind:'reply',address:c.m[0x10]+256*c.m[0x11]};c.rts();}
 }});
 assert.deepStrictEqual(JSON.parse(JSON.stringify(labyrinthHomeOutcome(location))),actual,`location ${location}`);
 if(actual.kind==='reply')assert.equal(cpu.m[0x8c80],location);
}
for(const [address,expected] of Object.entries(labyrinthHomeMessages)) {
 const cpu=new CPU(Uint8Array.from(ram),{port:{dir:0x2f,data:0x25}});
 cpu.m[0x10]=Number(address)&255;cpu.m[0x11]=Number(address)>>8;
 let actual='';cpu.call(0x67b5,{d:0},{hooks:{
  0x6891:c=>{actual+=String.fromCharCode(c.a);c.rts();},
  0x67c4:()=>{actual+='\n';},0x6866:c=>c.rts()
 }});
 assert.equal(actual,expected,`reply $${Number(address).toString(16)}`);
}
for(const n of [-1,14,0.5,NaN])assert.throws(()=>labyrinthHomeOutcome(n),/Unknown location/);
console.log('OK - GO HOME agrees with all 14 original table decisions; all 3 reply texts match the parser');
