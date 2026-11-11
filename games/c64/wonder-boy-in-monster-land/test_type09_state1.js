'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),base=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(parts,'resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
const entries=[[5,0x9424],[7,0x9a7f],[13,0x9541],[21,0x952e],[22,0xa094],[24,0x9bfb]];
for(const [load,dispatch] of entries){
 const m=base.slice();for(const r of JSON.parse(fs.readFileSync(path.join(parts,`stage-${String(load).padStart(2,'0')}`,'listing.json'))).records)if(r.b)m.set(r.b,r.a);
 function fresh({col=10,row=10,slotPresent=0,counter=1,target=12,step=0,playerY=60,slotY=50,threshold=20,anchor=8,random=3,hit=0,health=10,contact=0}={}){
  const s=m.slice();s.set([0xa2,col,0xa0,row,0xa9,1,0x60],0x71db);s.set([0xa9,random,0x60],0x3020);s.set([0xa9,5,slotPresent?0x38:0x18,0x60],0x1902);
  s.set([0x8d,0xe0,2,0x60],0x43f0);s.set([0x8d,0xe1,2,0x60],0x43a2);s.set([0x8d,0xe3,2,0x60],0x4342);s.set([0x8d,0xe4,2,0x60],0x4368);
  s[0x792c]=0x60;s.set([hit?0x38:0x18,0x60],0x732a);s.set([contact?0x38:0x18,0x60],0x7227);s.set([0x8d,0xe5,2,0x60],0x5d7a);s.set([0x38,0x60],0x72fc);
  for(const a of [0x2e0,0x2e1,0x2e3,0x2e4,0x2e5])s[a]=0;
  s[0x1ab2]=1;s[0x1af6]=counter;s[0x1ad4]=target;s[0x1ae5]=step;s[0x49]=playerY;s[0x4cd4]=slotY;s[0x7f4b]=threshold;s[0x1ac3]=anchor;s[0x1a6e]=health;s[0x19e6]=0x40;s[0x1b07]=0;
  return s;
 }
 function run(s){new CPU(s).call(dispatch+0x53,{x:1},{maxSteps:10000});return s;}
 // Positive and negative movement countdowns select different callbacks and frame offsets.
 {const s=run(fresh({counter:1}));assert.equal(s[0x1af6],0);assert.equal(s[0x2e0],3);assert.equal(s[0x2e1],0);assert.equal(s[0x19c4],0x48);}
 {const s=run(fresh({counter:0xff}));assert.equal(s[0x1af6],0);assert.equal(s[0x2e1],3);assert.equal(s[0x2e0],0);assert.equal(s[0x19c4],0x40);}
 // A zero countdown reloads a positive or negative value according to the comparisons.
 {const s=run(fresh({counter:0,col:10,threshold:20,anchor:8}));assert.equal(s[0x1af6],15);assert.equal(s[0x2e0],3);assert.equal(s[0x19c4],0x4a);}
 {const s=run(fresh({counter:0,col:20,threshold:20,anchor:8}));assert.equal(s[0x1af6],0xf1);assert.equal(s[0x2e1],3);assert.equal(s[0x19c4],0x42);}
 {const s=run(fresh({counter:0,col:10,threshold:20,anchor:8,random:0x80}));assert.equal(s[0x1af6],0xf1);assert.equal(s[0x2e1],3);assert.equal(s[0x19c4],0x42);}
 // Vertical comparisons change a signed step, clamp it to -3..3 and call a direction routine.
 for(const [row,target,step,slotY,expected,up,down] of [[10,12,0,50,1,0,1],[20,12,0,50,0xff,1,0],[15,12,3,50,3,0,3],[15,12,0xfd,70,0xfd,3,0]]){
  const s=run(fresh({slotPresent:1,row,target,step,slotY}));assert.equal(s[0x1ae5],expected);assert.equal(s[0x2e3],up);assert.equal(s[0x2e4],down);
 }
 // Exercise the helper's comparisons, including eight-bit subtraction wrap.
 {
  const s=m.slice(),cpu=new CPU(s),helper=dispatch+0x129;
  for(const threshold of [0,16,128,255])for(const anchor of [0,8,127,255])for(const random of [0,0x80]){
   s[0x7f4b]=threshold;s[0x1ac3]=anchor;s.set([0xa9,random,0x60],0x3020);
   for(let col=0;col<256;col++){
    s[helper+1]=col;cpu.call(helper,{x:1},{maxSteps:100});
    const negative=col>=threshold?true:col<anchor?false:((col-8)&255)>=anchor?true:!!(random&0x80);
    assert.equal(s[0x1af6],negative?0xf0:0x10,`load ${load}, column ${col}, anchor ${anchor}, threshold ${threshold}`);
    assert.equal(cpu.n,negative?1:0);
   }
  }
 }
 // A contact transitions to state 2 or 3 depending on the signed health field.
 {const s=run(fresh({hit:1,health:10}));assert.equal(s[0x1ab2],2);assert.equal(s[0x1b29],3);assert.equal(s[0x1b18],3);assert.equal(s[0x1b07],0x80);}
 for(const health of [0,0x80]){const s=run(fresh({hit:1,health}));assert.equal(s[0x1ab2],3);assert.equal(s[0x1b29],3);assert.equal(s[0x1b18],3);}
 {const s=run(fresh({contact:1}));assert.equal(s[0x2e5],2);assert.equal(s[0x1ab2],1);}
}
console.log('OK - six type-9 state-one movement, bounds and contact paths with external routines stubbed');
