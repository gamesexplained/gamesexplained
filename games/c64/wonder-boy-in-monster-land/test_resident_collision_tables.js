'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(let type=0;type<46;type++){const m=base.slice(),h=0x79b6+type*2,v=0x7a12+type*2;m[0x191b]=type;m[0x1a2b]=3;m[0x4c52]=1;m[0x4c72]=0x22;m[0x4cd2]=0xa0;const expected=[(0x91+m[h])&255,(0xa0+m[v])&255,m[h+1],m[v+1]];const cpu=new CPU(m);cpu.x=2;cpu.call(0x792c,{}, {maxSteps:40});assert.deepEqual([...m.slice(0x762e,0x7632)],expected);assert.equal(cpu.x,2);}
console.log('OK - 46 collision rectangle table entries');
