'use strict';
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const {game} = require('../../../kit/scripts/port_check.js');
const source = game(__dirname).listing('parts/airshaft/listing.json').ram;
for (const [entry,operand,flag,cases] of [[0xafc3,0x87d9,0xaf12,[0x20,0x21,0x22,0x23,0]], [0xb065,0x88bc,0xaf13,[0x25,0x26,0x27,0x28,0]]]) {
 for(const shape of cases) {
  const yes=[];
  for(let v=0;v<256;v++) { const ram=source.slice();ram[operand]=shape;ram[0xaf0d]=v;ram[flag]=0; const cpu=new CPU(ram,{port:0x35});cpu.call(entry,{}, {maxInstructions:100});if(ram[flag])yes.push(v); }
  const ranges=[];for(const n of yes)if(ranges.length&&ranges.at(-1)[1]+1===n)ranges.at(-1)[1]=n;else ranges.push([n,n]);
  console.log(entry.toString(16),shape.toString(16),ranges.map(([a,b])=>a===b?a.toString(16):`${a.toString(16)}-${b.toString(16)}`).join(','));
 }
}
