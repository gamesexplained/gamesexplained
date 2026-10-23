'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname)),{ram,has}=require('./opening_image.js')(g);
const fixture=g.json('analysis-records.json'),symbols={comments:[...g.json('parts/resident/symbols.json').comments,...g.json('parts/opening/symbols.json').comments]};
for(const rec of fixture.headered_text){
 for(let a=rec.address;a<=rec.end;a++)assert(has[a],`text byte $${a.toString(16)}`);
 assert.deepStrictEqual(Array.from(ram.slice(rec.address,rec.address+2)),rec.header);
 assert.equal(ram[rec.end],0);
 const c=new CPU(Uint8Array.from(ram),{port:{dir:0x2f,data:0x25}});c.m[0x10]=rec.address&255;c.m[0x11]=rec.address>>8;
 let out='';c.call(0x6782,{d:0},{hooks:{0x6942:c=>c.rts(),0x6891:c=>{if(c.a>=32)out+=String.fromCharCode(c.a);c.rts();},0x67c4:c=>{out+='\n';},0x6866:c=>c.rts()}});
 assert.equal(out,rec.text,`headered text $${rec.address.toString(16)}`);
 assert(symbols.comments.find(x=>x.address===rec.address)?.text.includes(JSON.stringify(rec.text)));
}
for(const rec of fixture.sound_events){
 for(let a=rec.address;a<=rec.end;a++)assert(has[a],`sound byte $${a.toString(16)}`);
 const c=new CPU(Uint8Array.from(ram),{port:{dir:0x2f,data:0x25},io:{write(){}}}),slot=rec.slot;
 c.m[0x1c05]=slot;c.m[0x1c09]=slot<3?255:0;c.m[0x1bb8+slot]=rec.address&255;c.m[0x1bbf+slot]=rec.address>>8;c.m[0x1bfe+slot]=1;
 let used;c.call(0x1d93,{d:0},{hooks:{0x1d1f:c=>{used=c.y+1;return true;},0x1ca5:c=>{used=2;return true;},0x1de0:c=>{used=2;return true;}}});
 assert.equal(used,rec.end-rec.address+1,`event $${rec.address.toString(16)}`);
 const field=rec.description.find(x=>x.startsWith('cached value '));
 if(field)assert.equal(c.m[0x1bdb+slot]+256*c.m[0x1bd4+slot],parseInt(field.split('$')[1],16));
 for(const [prefix,lo,hi] of [['duration ',0x1be9,0x1be2],['slide ',0x1bf7,0x1bf0],['envelope bytes ',0x1ba5,0x1ba8]]){
  const f=rec.description.find(x=>x.startsWith(prefix));if(f)assert.equal(c.m[lo+slot]+256*c.m[hi+slot],parseInt(f.split('$')[1],16),`${prefix}at ${rec.address.toString(16)}`);
 }
}
for(const colour of [3,5]){
 const c=new CPU(Uint8Array.from(ram));c.m.set([0xfa,88,255,0xf9,89,255,0xf8,90,255,0xf7,87,0],0x400);c.m[0x10]=0;c.m[0x11]=4;c.m[0x0341]=colour;c.m[0x691f]=0;
 const out=[];let lines=0;c.call(0x67b5,{d:0},{hooks:{0x6891:c=>{out.push(c.a);c.rts();},0x6a4e:c=>{lines++;c.rts();}}});
 assert.deepStrictEqual(out,[1,88,3,5,89,6,2,90,4,7,87,8]);assert.equal(lines,colour<5?5:6);
}
console.log(`OK - ${fixture.headered_text.length} headered messages, ${fixture.sound_events.length} sound-event lengths/values and both framing-colour paths match original code`);
