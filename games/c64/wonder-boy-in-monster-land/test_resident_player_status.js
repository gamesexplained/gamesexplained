'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [player,index,quantity,item] of [[0,0,0x42,1],[0,2,0x07,2],[1,0,0x89,2],[1,2,0x51,1]]){
 const m=base.slice();m[(player?0x5223:0x51e3)+index]=quantity;m[(player?0x5203:0x51c3)+index]=item;m.set([5,6,7],0x52a4);const cpu=new CPU(m);cpu.a=index;cpu.y=player;cpu.pc=0x530c;cpu.run({until:0x5355,maxSteps:250});assert.equal(cpu.pc,0x5355);assert.deepEqual([...m.slice(0x4f9b,0x4f9d)],[(quantity>>4)+1,(quantity&15)+1]);assert.equal(m[0x534a],5+item);
}
console.log('OK - resident first and second player status selection');
