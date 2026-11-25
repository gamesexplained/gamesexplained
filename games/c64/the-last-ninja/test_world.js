'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {CPU}=require('../../../kit/cpu/cpu6502.js');
const data=require('./reference/mechanics.json'),{build}=require('./reference/ninja-world.js'),world=build(data);
const nodes=new Map(world.nodes.map(n=>[n.key,n]));
assert.equal(nodes.size,135);assert.equal(world.chapters.length,6);
const native=[];
for(let ch=0;ch<6;ch++){
 const m=new Uint8Array(65536);for(const part of ['resident',data.slugs[ch]])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 const known=new Set(data.chapters[ch].rooms.map(r=>r.slot));
 const cpu=new CPU(m,{port:0x35}),points=[];for(let x=2;x<=247;x+=4)points.push([x,8],[x,189]);for(let y=9;y<189;y+=4)points.push([247,y],[1,y]);
 for(const room of data.chapters[ch].rooms){const dests=new Set();for(const [x,y]of points){m[0xa2]=room.slot;m[0x54]=x;m[0x55]=y;cpu.call(0x7478);dests.add(m[0x278]>>2);}for(const dest of dests)if(known.has(dest)&&dest!==room.slot)native.push(ch+':'+room.slot+'>'+ch+':'+dest);}

 for(const room of data.chapters[ch].rooms){const n=nodes.get(ch+':'+room.slot);assert(n&&n.index===data.chapters[ch].rooms.indexOf(room));assert(n.x>=0&&n.y>=0&&n.x+240<=world.width&&n.y+144<=world.height);}
}
assert.deepEqual(world.edges.filter(e=>!e.transition).map(e=>e.from+'>'+e.to).sort(),native.sort());
const transitions=world.edges.filter(e=>e.transition);assert.equal(transitions.length,5);
for(let ch=0;ch<5;ch++){const e=transitions[ch];assert.equal(e.to,(ch+1)+':1');const room=+e.from.split(':')[1];assert(Object.values(data.chapters[ch].rooms.find(r=>r.slot===room).exits).flat().includes(0));}
for(let i=0;i<world.nodes.length;i++)for(let j=i+1;j<world.nodes.length;j++){const a=world.nodes[i],b=world.nodes[j];assert(Math.abs(a.x-b.x)>=240||Math.abs(a.y-b.y)>=144,'Room pictures overlap: '+a.key+' and '+b.key);}
for(const e of world.edges)assert(nodes.has(e.from)&&nodes.has(e.to));
// A chapter load joins each next opening to the previous chapter, rather than a separate map.
const reachable=new Set(['0:1']);let changed=true;while(changed){changed=false;for(const e of world.edges)if(reachable.has(e.from)&&!reachable.has(e.to)){reachable.add(e.to);changed=true;}}
for(let ch=0;ch<6;ch++)assert(reachable.has(ch+':1'),'Opening disconnected: '+ch);
console.log('PASS: 135 non-overlapping rooms, '+native.length+' native room links, 5 chapter loads, all six chapter openings connected.');
