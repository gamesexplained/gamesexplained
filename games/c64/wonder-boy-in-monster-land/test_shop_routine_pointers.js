'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
const sources=JSON.parse(fs.readFileSync(path.join(__dirname,'shop-routine-observations.json')));let cases=0;
for(const o of sources){const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(o.load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 for(const selector of o.selectors){assert.equal(m[selector.patch-1],0x20);for(let i=0;i<o.entries;i++){const run=m.slice(),cpu=new CPU(run),ptr=o.table+i*8+selector.offset;cpu.pc=selector.entry;cpu.a=i;cpu.run({until:selector.entry+16,maxSteps:30});assert.equal(run[selector.patch]|run[selector.patch+1]<<8,m[ptr]|m[ptr+1]<<8,`load ${o.load} index ${i} offset ${selector.offset}`);cases++}}
}
console.log(`OK - ${cases} controlled item-table subroutine-pointer patches`);
