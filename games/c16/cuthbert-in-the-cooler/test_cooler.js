#!/usr/bin/env node
'use strict';
// Compare the published maze decoder and life-counter experiment with the original routines,
// using the committed source listing. No game binary or snapshot is required.
const path = require('path');
const assert = require('assert/strict');
const {game} = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const {CPU} = require(path.resolve(__dirname, '../../../kit/cpu/cpu6502.js'));
const g = game(__dirname), L = g.listing();
globalThis.CoolerData=g.run('reference/cooler-data.js','CoolerData').CoolerData;
const {Cooler}=g.run('reference/cooler.js','Cooler');
for(const [field,a,n] of [['font',0x3800,0x348],['playerHorizontal',0x330a,0x100],
  ['playerVertical',0x340a,0x180],['explosion',0x358a,0x80]]) {
  assert.deepEqual(Cooler.D[field],Array.from(L.ram.slice(a,a+n)),`embedded ${field} equals the listing`);
}
Cooler.useListing(L);
let cases = 0;
function cpu(m) {return new CPU(m, {ramSize: 0x4000});}
for (let level = 0; level < 256; level++) {
  const original = new Uint8Array(L.ram);
  original.fill(0x20, 0x0c00, 0x0fe8);
  original[0x2e] = level;
  const c = cpu(original);
  c.call(0x141c, {}, {maxSteps: 150000});
  const {m, board} = Cooler.memory(level);
  assert.deepEqual(original.slice(0x0cc8, 0x0fe8), m.slice(0x0cc8, 0x0fe8), `maze characters, level ${level}`);
  assert.deepEqual(original.slice(0x08c8, 0x0be8), m.slice(0x08c8, 0x0be8), `maze colours, level ${level}`);
  assert.equal(original[0x2f], board.objects.length, `object count, level ${level}`);
  assert.equal(original.slice(0x54,0x5b).filter(v => v < 128).length, board.enemies, `active enemies, level ${level}`);
  assert.deepEqual(Array.from(original.slice(0x6a,0x71)), Array(7).fill(board.shape), `enemy shapes, level ${level}`);
  assert.deepEqual(Array.from(original.slice(0x62,0x69)), Array(7).fill(board.colour), `enemy colours, level ${level}`);
  const spawns = Array.from({length: board.enemies}, (_,i) => original[0x44+i] | original[0x4c+i]<<8);
  assert.deepEqual(spawns, board.spawns, `enemy spawns, level ${level}`);
  cases++;
}
// Each pickup's hundreds value is checked through the actual collect_object routine. Put the
// player just left of the object, so it lies on the right sampled edge. Other objects are cleared
// in this controlled case to test that particular object's four glyph quadrants without priority.
for (let level = 1; level <= 10; level++) {
  const built = new Uint8Array(L.ram); built[0x2e]=level; built.fill(0x20,0xc00,0xfe8);
  cpu(built).call(0x141c,{}, {maxSteps:150000});
  for (const o of Cooler.decode(level).objects) {
    const m = new Uint8Array(built), a=0xc00+(5+o.y*2)*40+o.x*2;
    for(const other of Cooler.decode(level).objects) {
      if(other.packet===o.packet) continue;
      const p=0xc00+(5+other.y*2)*40+other.x*2;
      for(const off of [0,1,40,41]) m[p+off]=0x20;
    }
    m[0x1c]=(a-2)&255; m[0x1d]=(a-2)>>8; m[0x1f]=0;
    m.fill(0x30,0x12f2,0x12f8); m[0xc3a]=0x30;
    const c=cpu(m); c.call(0x1795); const before=m[0x2f]; c.call(0x187f);
    assert.equal(m[0x2f],before-1,`pickup count, level ${level}, packet ${o.packet}`);
    assert.equal(m[0x12f5]-0x30,o.type,`pickup hundreds, level ${level}, packet ${o.packet}`);
    assert.equal(m[a],0x20,`pickup erased, level ${level}, packet ${o.packet}`);
    cases++;
  }
}
// Follow extra-life awards far past the single digit display. Call the original comparison each
// time with a changed ten-thousands digit and compare with the reader's experiment.
{
  const m = new Uint8Array(L.ram); m[0x1a26]=0x34;
  const c=cpu(m);
  let broke = false;
  for(let n=1;n<=204;n++) {
    m[0x12f3]=0x31; m[0xc3a]=0x30;
    c.call(0x1952,{}, {hooks:{[0x1a27]:()=>{broke=true;return true;}}});
    assert.equal(m[0x1a26],Cooler.lifeAfter(n).value,`life character after ${n} awards`);
    assert.equal(broke,Cooler.lifeAfter(n).breaks,`inline life terminator after ${n} awards`);
    cases++;
  }
  assert.equal(m[0x1a26],0,'the character wraps to the inline string terminator');
  assert.equal(Cooler.lifeAfter(203).attempts,208,'last nonzero character permits 208 attempts');
  assert.equal(Cooler.lifeAfter(204).breaks,true,'next award returns into the second zero byte at $1A27');
}
// Verify the attempted lives by using the original death tail, with a hook only at game_over.
for (const initial of [0x34,0xff]) {
  const m=new Uint8Array(L.ram); m[0x1a26]=initial;
  const c=cpu(m); let ended=false, attempts=0;
  while(!ended && attempts<300) {
    c.call(0x19f8,{}, {maxSteps:150000, hooks:{[0x118d]:()=>{ended=true;return true;}}});
    attempts++;
  }
  assert.equal(attempts,initial===0x34?5:208,`attempts from stored life character ${initial}`);
  cases++;
}
for(let v=0;v<256;v++) {
  const m=new Uint8Array(L.ram);m[0x1c]=0xda;m[0x1d]=0x0c;m[0xcda]=v;
  let killed=false;
  cpu(m).call(0x1a34,{y:0},{hooks:{[0x19ab]:()=>{killed=true;return true;}}});
  assert.equal(killed,v>=0x69&&v<0xfa,`player contact character ${v}`);
  cases++;
}
for(let score=0;score<1000000;score+=100)for(let type=1;type<=3;type++) {
  const m=new Uint8Array(L.ram);
  m.set(Array.from(String(score).padStart(6,'0'),c=>c.charCodeAt(0)),0x12f2);
  m[0x1a26]=0x34;m[0xc3a]=m[0x12f3];
  cpu(m).call(0x12fa,{a:type});
  const actual=Number(String.fromCharCode(...m.slice(0x12f2,0x12f8)));
  assert.equal(actual,Cooler.addPickup(score,type),`score ${score}, pickup ${type}`);
  cases++;
}
assert.equal(Cooler.addPickup(800,3),1000);
assert.equal(Array(7).fill(3).reduce(Cooler.addPickup,0),1900);
for(const [direction,half,allowed]of [['right',0,true],['right',1,false],['left',0,false],['left',1,true]]) {
  const m=new Uint8Array(L.ram);m.fill(0x20,0xc00,0xfe8);
  m[0x1a]=20;m[0x1c]=0;m[0x1d]=0xe;m[0x1e]=half;m[0x1f]=0;m[0x20]=0;
  m.fill(0xff,0x11,0x16);m[direction==='right'?0x13:0x14]=0;m.fill(0x5c,0x22,0x2a);
  cpu(m).call(0x145a,{}, {hooks:{[0x1339]:c=>c.rts()}});
  assert.equal(m[0x1a],20+(allowed?(direction==='right'?1:-1):0),`${direction}, blocked neighbours, half ${half}`);
  const port=Cooler.horizontalStep(20,half,direction,true);
  assert.equal(m[0x1a],port.x);assert.equal(m[0x1e],port.half);
  cases++;
}
// Exercise the timer-driven candidate selector before its separate wall tests. Both timer-byte
// inputs are swept, including idle states that can be retained and masked on the next update.
{
  const m=new Uint8Array(L.ram);let reads=[],index=0,reached=false;
  const c=new CPU(m,{ramSize:0x4000,ioPages:[0xff],io:{read:a=>{
    assert.equal(a,0xff02);return reads[Math.min(index++,1)];
  },write:()=>{throw new Error('unexpected I/O write in candidate selector');}}});
  for(const state of [0,1,2,3,4,5,49])for(let first=0;first<256;first++)for(let fresh=0;fresh<256;fresh++) {
    m[0x54]=state;reads=[first,fresh];index=0;reached=false;
    c.call(0x1e64,{x:0},{maxSteps:50,hooks:{[0x1e7c]:()=>{reached=true;return true;}}});
    const expected=Cooler.directionCandidate(state,first,fresh);
    assert.equal(reached,expected.kind==='direction');
    if(reached)assert.equal(c.a&3,expected.direction);
    else assert.equal(m[0x54],expected.state);
    cases++;
  }
}
for(let slot=0;slot<=6;slot++) {
  const m=new Uint8Array(L.ram);cpu(m).call(0x1ef4,{x:slot});
  assert.equal(m[5]|m[6]<<8,slot===6?0x3e91:0x3e70+48*slot,`enemy glyph address, slot ${slot}`);
  cases++;
}
{
  const m=new Uint8Array(L.ram);m.fill(0x20,0xc00,0xfe8);m.fill(0xff,0x54,0x5b);
  for(const slot of [4,5]) {m[0x54+slot]=4;m[0x6a+slot]=1;m[0x44+slot]=slot===5?0:0x50;m[0x4c+slot]=0xe;}
  m[0xe00]=0x69;m.fill(0x30,0x12f2,0x12f8);m[0xc3a]=0x30;
  let updates=0;
  cpu(m).call(0x1c47,{}, {hooks:{[0x1dcc]:c=>{updates++;c.rts();}}});
  assert.equal(m[0x59],0xff);assert.equal(m[0x58],4);assert.equal(updates,0,'a kill exits the full guard scan');
  cases++;
}
console.log(`OK — ${cases} maze, score, collision, movement and life-counter cases against the original C16 routines`);
