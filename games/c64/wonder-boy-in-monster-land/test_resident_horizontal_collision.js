'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [pc,mode,col,tile,carry,result,first,undo,scan] of [[0x45bc,0,1,0,0,4,1,0,0],[0x45bc,1,255,0,1,15,1,1,0],[0x45bc,1,0,0,0,3,1,0,0],[0x45bc,1,1,0,0,0,1,0,1],[0x45bc,1,1,4,1,4,1,1,1],[0x4574,0,1,0,0,4,1,0,0],[0x4574,1,9,0,1,15,1,1,0],[0x4574,1,3,0,0,0,1,0,1],[0x4574,1,3,4,1,4,1,1,1]]){
 const a=base.slice();a[0x7a]=mode;a[0x7f4b]=10;a.fill(0,0x300,0x304);const firstAddr=pc===0x45bc?0x43a2:0x43f0,undoAddr=pc===0x45bc?0x43f0:0x43a2;a.set([0x8d,3,3,0xee,0,3,0x18,0x60],firstAddr);a.set([0xee,1,3,0x60],undoAddr);a.set([0xa2,col,0xa0,9,0xa9,2,0x60],0x71db);a.set([0xee,2,3,0xa9,tile,0x60],0x460c);a.set([0xa2,2,0xa0,7,0xa9,4,0x20,pc&255,pc>>8,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f9,maxSteps:100});assert.equal(cpu.pc,0x2f9);assert.deepStrictEqual([cpu.a,cpu.c,cpu.x,cpu.y],[result,carry,2,7]);assert.deepStrictEqual([...a.slice(0x300,0x304)],[first,undo,scan,4]);
}
for(const flags of [[0,0,0,0],[2,2,1,1],[2,0,1,0],[255,255,255,255]]){
 const a=base.slice();a.set(flags,0x7002);a.set([0xb9,0,0x70,0x60],0x4632);a.set([0xa2,2,0xa0,3,0x20,0x0c,0x46,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f7,maxSteps:100});assert.equal(cpu.pc,0x2f7);const result=((flags[0]>>1&1)<<3)|((flags[1]>>1&1)<<2)|((flags[2]&1)<<1)|(flags[3]&1);assert.deepStrictEqual([cpu.a,cpu.x,cpu.y,cpu.c],[result,2,5,0]);
}
for(const [pointer,col,row,tile,attribute] of [[0x70fe,2,3,4,0xa5],[0x7000,0,5,7,0x33],[0x70ff,255,9,11,0xfe]]){
 const a=base.slice();a[0x85d0+row]=pointer&255;a[0x8621+row]=pointer>>8;a[(pointer+col+1)&65535]=tile;a[0x80cf+tile]=attribute;a.set([0xa2,col,0xa0,row,0x20,0x32,0x46,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f7,maxSteps:60});assert.equal(cpu.pc,0x2f7);assert.deepStrictEqual([cpu.a,cpu.x,cpu.y],[attribute,col,row]);
}
for(const flags of [[2,0,1,1],[0,2,0,1]]){
 const a=base.slice();for(let i=0;i<4;i++){const row=i+2,pointer=0x7000+row*16;a[0x85d0+row]=pointer&255;a[0x8621+row]=pointer>>8;a[pointer+3]=10+i;a[0x80cf+10+i]=flags[i];}a.set([0xa2,2,0xa0,3,0x20,0x0c,0x46,0xea],0x2f0);const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f7,maxSteps:250});assert.equal(cpu.pc,0x2f7);const result=((flags[0]>>1&1)<<3)|((flags[1]>>1&1)<<2)|((flags[2]&1)<<1)|(flags[3]&1);assert.deepStrictEqual([cpu.a,cpu.x,cpu.y,cpu.c],[result,2,5,0]);
}
console.log('OK - resident horizontal collision wrappers and tile reads');
