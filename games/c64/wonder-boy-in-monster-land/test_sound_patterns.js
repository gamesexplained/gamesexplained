'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'parts/resident');const symbols=JSON.parse(fs.readFileSync(path.join(dir,'symbols.json'))), listing=JSON.parse(fs.readFileSync(path.join(dir,'listing.json'))), mem=new Uint8Array(65536);
for(const r of listing.records)if(r.b)mem.set(r.b,r.a);
const patterns=symbols.symbols.filter(x=>x.name.startsWith('captured_sound_pattern_')).sort((a,b)=>a.address-b.address);assert.equal(patterns.length,25);
const ranges=[[0x23f5,0x2401],[0x24d1,0x24fd],[0x25c0,0x2612]];
for(let i=0;i<patterns.length;i++){
 const a=patterns[i].address,end=i+1<patterns.length?patterns[i+1].address:0x2934;
 assert.equal(mem[end-1],0,`pattern ${i+1} terminator`);for(let p=a;p<end-1;p++)assert.notEqual(mem[p],0,`pattern ${i+1} interior`);
 const refs=[];for(const [lo,hi] of ranges)for(let p=lo;p<hi;p+=2)if((mem[p]|mem[p+1]<<8)===a)refs.push(p);
 assert(refs.length,`pattern ${i+1} pointer`);const c=symbols.comments.find(x=>x.address===a&&x.type==='line');assert(c&&c.text.includes(`${end-a-1} event bytes`)&&c.text.includes(`$${(end-1).toString(16).toUpperCase()}`));
 for(const p of refs)assert(c.text.includes(`$${p.toString(16).toUpperCase()}`),`pattern ${i+1} pointer description`);
}
console.log('OK - 25 built-in sound patterns, pointers and terminators');
