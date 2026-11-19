'use strict';
const assert=require('assert');
const {game}=require('../../../kit/scripts/port_check.js');
const {CPU}=require('../../../kit/cpu/cpu6502.js');
const g=game(__dirname);
const {IC}=g.run('levels.html','icicle-core','IC');
const {ICNetwork}=g.run('levels.html','icicle-network','ICNetwork');
const source=g.listing().ram,rooms=[],expected=[];
// Use the original loader's runtime door cells as the source of truth.
for(let room=0;room<16;room++){
  const m=source.slice();m[0xFF09]=2;m[0x4F]=m[0x25]=m[0x82]=0;m[0x53]=room;m[0xA5F1+room]=1;
  new CPU(m).call(0x6377,{}, {maxSteps:400000});
  let index=0;
  for(let cell=0;cell<1026;cell++)if((m[0x2200+cell]&15)===9)
    expected.push({from:room,to:m[0x2200+cell]>>4,x:cell%38,y:Math.floor(cell/38),index:index++});
  rooms.push(IC.decodeRoom(source,room));
}
const graph=ICNetwork.fromRooms(rooms);
assert.deepStrictEqual(graph.doors,expected);
assert.strictEqual(graph.doors.length,42);
assert.strictEqual(graph.links.length,24);
assert.strictEqual(graph.oneWay,6);
const expanded=[];
for(const link of graph.links){
  if(link.forward)expanded.push(link.a+':'+link.b);
  if(link.backward)expanded.push(link.b+':'+link.a);
  assert(!/NaN|undefined/.test(ICNetwork.path(link.a,link.b)));
}
assert.deepStrictEqual(expanded.sort(),expected.map(d=>d.from+':'+d.to).sort());
assert.deepStrictEqual(graph.doors.filter(d=>!expected.some(e=>e.from===d.to&&e.to===d.from)).map(d=>[d.from+1,d.to+1]),[[6,7],[7,11],[7,3],[8,4],[8,14],[9,8]]);
assert.strictEqual(ICNetwork.positions.length,16);
for(const door of expected)assert(['Left door','Right door','Top door','Bottom door'].includes(ICNetwork.doorName(door)));
console.log('All 42 door directions and positions match the original 16 room loads; 24 connections, six one-way links.');
