'use strict';
// Run the saved opening's real prefix routines, without drawing the wheel rows.
const assert=require('assert');
const path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname)), L=require('./opening_image.js')(g);
function machine(wheel=0) {
 const writes=[];
 const cpu=new CPU(Uint8Array.from(L.ram),{port:{dir:0x2f,data:0x25},io:{write(a,v){writes.push([a,v]);}}});
 cpu.m[0x6667]=wheel;cpu.m[0x6682]=0;
 return {cpu,writes};
}
function type(state,char) {
 state.writes.length=0;
 state.cpu.call(0x5f20,{a:char.charCodeAt(0),d:0},{hooks:{0x5eb0:()=>true},maxSteps:10000});
 return {prefix:String.fromCharCode(...state.cpu.m.slice(0x6683,0x6683+state.cpu.m[0x6682])),selected:state.cpu.m[0x666d+state.cpu.m[0x6667]],red:state.writes.some(([a,v])=>a===0xd020&&v===2)};
}
const state=machine();
assert.deepStrictEqual(type(state,'g'),{prefix:'G',selected:4,red:false});
assert.deepStrictEqual(type(state,'z'),{prefix:'G',selected:4,red:true});
assert.deepStrictEqual(type(state,'o'),{prefix:'GO',selected:5,red:false});
state.cpu.call(0x61f7,{d:0});
assert.equal(state.cpu.m[0x6682],0);assert.equal(state.cpu.m[0x666d],5);
let prefixes=0, words=0;
for(let wheel=0;wheel<3;wheel++) {
 const base=L.ram[0x667d+wheel], count=L.ram[0x6679+wheel];
 for(let selected=1;selected<count;selected++) {
  if(L.ram[0x66fb+base+selected]&128)continue;
  const index=L.ram[0x6693+base+selected];
  const pointer=L.ram[0xd900+index]+256*L.ram[0xd800+index];
  let word='';for(let a=pointer;L.ram[a];a++){assert(L.has[a]);word+=String.fromCharCode(L.ram[a]);}
  // Space changes wheels in real input. Exercise only a word's leading letters here.
  const prefix=word.split(' ')[0].slice(0,10);
  const lower=machine(wheel), upper=machine(wheel);
  for(const letter of prefix) {
   const a=type(lower,letter.toLowerCase()), b=type(upper,letter.toUpperCase());
   assert.deepStrictEqual(a,b,`${word}: case folding`);
   assert(!a.red,`${word}: valid prefix rejected`);prefixes++;
  }
  words++;
 }
}
for(const length of [0,9,10]) {
 const {cpu}=machine();cpu.m[0x6682]=length;cpu.m.fill(0x41,0x6683,0x668d);
 cpu.call(0x5f2c,{a:0x7a,d:0});
 assert.equal(cpu.m[0x6682],length===10?10:length+1);
 if(length<10)assert.equal(cpu.m[0x6683+length],0x5a);
}
console.log(`OK - G/Z/O rejection and prefix clearing; ${prefixes} prefixes across ${words} available wheel entries; case folding and append-limit boundaries`);

const {labWheelReplay}=g.run('controls.html','labyrinth-wheel-replay','labWheelReplay');
const recorded=machine();
assert.equal(labWheelReplay.length,5);
for(const row of labWheelReplay) {
 let actual;
 if(row.key==='initial')actual={prefix:'',selected:recorded.cpu.m[0x666d],red:false};
 else if(row.key==='Delete') {recorded.cpu.call(0x61f7,{d:0});actual={prefix:'',selected:recorded.cpu.m[0x666d],red:false};}
 else actual=type(recorded,row.key);
 assert.equal(row.prefix,actual.prefix);assert.equal(row.selected,actual.selected);assert.equal(row.rejected,actual.red);
 const index=L.ram[0x6693+row.selected], pointer=L.ram[0xd900+index]+256*L.ram[0xd800+index];
 let word='';for(let a=pointer;L.ram[a];a++)word+=String.fromCharCode(L.ram[a]);
 assert.equal(row.word,word);
}
console.log('OK - every displayed wheel replay state matches the original routines');

for(const [value,suffix] of [[0,null],[1,'(2)'],[8,'(9)'],[9,'(:)'],[10,null]]) {
 const {cpu}=machine(2);
 cpu.m[0x665d]=2;cpu.m[0x668d]=23;cpu.m[0x66fb+52]=value;
 cpu.m.fill(0x20,0xcf70,0xcf98);
 cpu.call(0x6031,{x:15,y:52,d:0});
 const row=String.fromCharCode(...cpu.m.slice(0xcf70+15,0xcf98));
 assert(row.includes('dollar bill'));
 if(suffix)assert(row.includes(suffix),`quantity byte ${value}: ${row}`);
 else assert(!row.includes('('),`quantity byte ${value} should omit suffix`);
}
console.log('OK - inventory suffix bytes at zero, digit, colon, and omitted-suffix boundaries');

g.sameBlock('labyrinth-wheel-replay');
