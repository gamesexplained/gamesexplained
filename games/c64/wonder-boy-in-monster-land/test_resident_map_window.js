'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const base=new Uint8Array(65536);
for(const part of ['resident','stage-24'])for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts',part,'listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(const [ox,oy] of [[0,0],[1,0],[0,1],[1,1]]){
 const a=base.slice();a[0x46]=0xc4;a[0x7f4d]=ox;a[0x7f4e]=oy;
 for(let r=0;r<10;r++){a[0x85cf+r]=r*32%256;a[0x8620+r]=0x70+Math.floor(r*32/256);for(let c=0;c<20;c++)a[0x7000+r*32+c]=(r+c)%20;}
 for(let n=0;n<4;n++)for(let i=0;i<20;i++)a[[0x81cf,0x82cf,0x83cf,0x84cf][n]+i]=n*32+i;
 a.fill(0,0x300,0x303);a.set([0xee,0,3,0x60],0x2e77);a.set([0xee,1,3,0x60],0x2c8d);a.set([0xee,2,3,0x60],0x6f3e);a.set([0x20,0x17,0x6d,0xea],0x2f0);
 const cpu=new CPU(a);cpu.pc=0x2f0;cpu.run({until:0x2f3,maxSteps:20000});assert.equal(cpu.pc,0x2f3);
 for(let row=0;row<10;row++)for(let sub=0;sub<2;sub++){
  const expected=[];for(let col=0;col<20;col++){const v=(row+col)%20;expected.push(sub*64+v,sub*64+32+v);}
  assert.deepStrictEqual([...a.slice(0xc0c8+row*80+sub*40,0xc0f0+row*80+sub*40)],expected);
 }
 assert.deepStrictEqual([...a.slice(0x569b,0x569f)],[ox,ox+38,oy,oy+19]);assert.deepStrictEqual([...a.slice(0x300,0x303)],[oy,ox,1]);
}
console.log('OK - resident map window for four forced origins');
