'use strict';
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const {game} = require('../../../kit/scripts/port_check.js');
const source = game(__dirname).listing('parts/airshaft/listing.json').ram;
for (const [entry, operand, cases] of [[0xb454,0x87d9,[0x20,0x21,0x22,0x23,0]], [0xb503,0x88bc,[0x25,0x26,0x27,0x28,0]]]) {
 for (const shape of cases) {
  const outcomes = [[],[],[]];
  for (let val=0; val<256; val++) {
   const m=source.slice(); m[0xb055]=0x60; m[0xb0fa]=0x60; m[0x8045]=0; m[0x8046]=0; m[0x8047]=0; m[operand]=shape; m[0xb110]=val;
   const cpu=new CPU(m,{port:0x35}); cpu.call(entry,{}, {maxInstructions: 100}); outcomes[m[0x8045] ? (m[0x8046] ? 2 : 1) : 0].push(val);
  }
  const ranges = a => {const r=[];for(const n of a)if(r.length&&r.at(-1)[1]+1===n)r.at(-1)[1]=n;else r.push([n,n]);return r.map(([a,b])=>a===b?a.toString(16):`${a.toString(16)}-${b.toString(16)}`)};
  console.log(entry.toString(16),shape.toString(16),JSON.stringify(outcomes.map(ranges)));
 }
}
