'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=game(__dirname),{ram}=g.listing('parts/scene-03/listing.json');
const {labyrinthBrickPanel:p,labyrinthBrickAskDoor:ask}=g.run('levels.html','labyrinth-brick-panel','labyrinthBrickPanel','labyrinthBrickAskDoor');
const {labyrinthBrickOpenDoor:open}=g.run('levels.html','labyrinth-brick-door','labyrinthBrickOpenDoor');
const texts={};for(const a of [0xd49,0x94bb]){
 const c=new CPU(Uint8Array.from(ram),{port:{dir:47,data:37}});c.m[0x10]=a&255;c.m[0x11]=a>>8;let s='';
 c.call(0x6782,{d:0},{hooks:{0x6942:c=>c.rts(),0x6891:c=>{if(c.a>=32&&c.a<127)s+=String.fromCharCode(c.a);c.rts();},0x67c4:()=>{s+=' ';},0x6866:c=>c.rts()}});texts[a]=s;
}
assert.equal(p.cell,ram[0x60c]);assert.equal(p.type,ram[0x73e+p.cell]);assert.equal(p.noDoor,texts[0xd49]);
for(let mode=0;mode<256;mode++)for(let type=0;type<256;type++){
 const c=new CPU(Uint8Array.from(ram));c.m[0x343]=mode;let response,continued=0;
 c.call(0x8dd1,{d:0},{hooks:{0x0998:c=>{c.x=type;c.a=1;c.y=12;c.rts();},0x8dd4:()=>{continued++;},0x674c:c=>{response=texts[c.m[0x10]+256*c.m[0x11]];c.rts();}}});
 assert.equal(response,ask(type,mode));assert.equal(continued,mode>=128&&(type===2||type===3)?1:0);
}
for(const [action,address,expected] of [[30,0x8dd1,ask(p.type)],[37,0x9053,open(p.cell).message]]){
 assert(g.read('levels.html').includes('data-action="'+action+'"'));assert(g.read('levels.html').includes('data-map-cell="1"'));
 const c=new CPU(Uint8Array.from(ram));c.m[0x343]=255;c.m[0x5e]=63;c.m[0x538]=32;c.m[0x53c]=3;c.m[0x544]=6;c.m[0x531]=3;c.m[0x530]=255;let response;
 c.call(address,{d:0},{hooks:{0x674c:c=>{response=texts[c.m[0x10]+256*c.m[0x11]];c.rts();}}});assert.equal(response,expected);assert.equal(c.m[0x60c],1);assert.equal(c.m[0x531],3);assert.equal(c.m[0x530],255);
}
console.log('OK - 65,536 original ASK DOOR prerequisite/caller cases, original response parses, and both real command paths at the page’s observed arrival');
