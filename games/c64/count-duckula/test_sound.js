'use strict';
const path=require('path'),assert=require('assert'),vm=require('vm');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const Cpu=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=game(__dirname),L=g.listing(),b=g.block('index.html','duckula-music').text;
const createDriver=vm.runInNewContext(b+'\ncreateDriver',{});
const driver=createDriver(Array.from(L.ram.slice(0xe00,0x171a)),Cpu);
let expected=[];const sid=new Uint8Array(25),mem=L.ram.slice();
const cpu=new Cpu.CPU(mem,{port:0x35,io:{read(a){throw Error('unexpected read '+a.toString(16));},write(a,v){assert(a>=0xd400&&a<=0xd418);sid[a-0xd400]=v;expected.push(a-0xd400,v);}}});
mem[0x142f]=0x87;cpu.call(0xe00);driver.init(0);assert.deepStrictEqual(Array.from(driver.writes),expected);
let audible=0;
for(let t=0;t<9000;t++){
 expected=[];cpu.call(0xe00);driver.play();assert.deepStrictEqual(Array.from(driver.writes),expected,'writes tick '+t);assert.deepStrictEqual(Array.from(driver.sid),Array.from(sid),'SID tick '+t);
 const gated=[4,11,18].some(a=>sid[a]&1);if(gated){assert(sid[24]&15,'gated voice at zero volume');audible++;}
}
assert(audible>1000);driver.stop();assert(!driver.playing());assert([4,11,18].every(a=>!(driver.sid[a]&1)));
console.log('ok - isolated worklet driver: 9000 ticks agree write for write with the native theme; gates have volume');
