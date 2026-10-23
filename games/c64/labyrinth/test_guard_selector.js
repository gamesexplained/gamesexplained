'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname)),{ram}=g.listing('parts/scene-04/listing.json');
const {labyrinthGuardCapturedSeed:captured,labyrinthGuardSelectorSeed:port}=g.run('levels.html','labyrinth-guard-selector','labyrinthGuardCapturedSeed','labyrinthGuardSelectorSeed');
const c=new CPU(Uint8Array.from(ram));
function original(seed,flag=255){
 c.m[0x502]=seed&255;c.m[0x503]=seed>>8;c.m[0x8f03]=flag;c.m[0x8f06]=165;c.m[0x8f07]=90;let firstSeed=null,setup=0;
 c.call(0x8f15,{d:0},{hooks:{0x0833:c=>{assert.equal(c.x+256*c.y,0x9f84);setup++;c.rts();},0x8f2a:c=>{firstSeed=c.m[0x502]+256*c.m[0x503];},0x8f37:()=>true}});
 return {firstSeed,nextSeed:c.m[0x502]+256*c.m[0x503],selector:c.m[0x8f06],second:c.m[0x8f07],flag:c.m[0x8f03],setup};
}
for(let seed=0;seed<65536;seed++){const actual=original(seed);const {flag,setup,...values}=actual;assert.equal(flag,0);assert.equal(setup,1);assert.deepStrictEqual(JSON.parse(JSON.stringify(port(seed))),values,'seed '+seed);}
for(let flag=0;flag<256;flag++){const actual=original(captured,flag);if(flag<128)assert.deepStrictEqual(actual,{firstSeed:null,nextSeed:captured,selector:165,second:90,flag,setup:0});else{assert.equal(actual.flag,0);assert.equal(actual.setup,1);const{flag:f,setup:s,...values}=actual;assert.deepStrictEqual(JSON.parse(JSON.stringify(port(captured))),values);}}
for(const [seed,firstSeed,nextSeed,selector,second] of [[63287,47876,1957,1,1],[0,17,646,0,0],[7,276,10229,1,1]])assert.deepStrictEqual(JSON.parse(JSON.stringify(port(seed))),{firstSeed,nextSeed,selector,second});
for(const seed of [-1,65536,.5,NaN])assert.throws(()=>port(seed),RangeError);
assert(g.read('levels.html').includes('value="'+captured+'"'));
console.log('OK - all 65,536 original two-call selector initializations, all 256 setup-guard bytes, and three VICE scalar observations; ordinary revisit/restart behavior remains open');
