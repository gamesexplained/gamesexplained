'use strict';
// Exercise the decoded later-load update entries at both sides of their boundaries.
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const parts=path.join(__dirname,'parts'),memory=new Uint8Array(65536);function layer(file){for(const r of JSON.parse(fs.readFileSync(file)).records)if(r.b)memory.set(r.b,r.a);}
layer(path.join(parts,'resident/listing.json'));
const conditions={2:(c,r,f)=>c===0x70,3:(c,r,f)=>c===0x64,4:()=>false,5:c=>c===0,6:(c,r)=>c===0x2f&&r<7,7:()=>false,8:(c,r)=>c===0&&r>=5,9:(c,r)=>c===9&&r===14,10:c=>c===0x2e,11:()=>false,12:(c,r)=>r===9&&c>=9&&c<12,13:(c,r)=>r===0x2b,14:c=>c===0x64,15:(c,r)=>r===14&&c===0x38,16:(c,r,f)=>r===0&&(f&0x40)!==0,17:()=>false,18:(c,r)=>c===0x51&&r<6,19:()=>false,20:(c,r)=>r===0,21:(c,r)=>r===12,22:()=>false,23:c=>c===0x40,24:(c,r)=>c===0x17&&r>=0x43,28:(c,r)=>c===0x37&&r===14,29:c=>c===0x2e,30:()=>false,31:()=>false};
const constants=[0,0,2,2,2,3,3,3,4,4,4,4,5,5,5,5,5,5,6,6,7,7,7,8,8,8,9,9,0x10,0x10,0x10,0x11];
const cols=[0,1,8,9,10,11,12,22,23,24,45,46,47,48,54,55,56,57,63,64,65,80,81,82,99,100,101,111,112,113,255],rows=[0,1,4,5,6,7,8,9,10,11,12,13,14,15,42,43,44,66,67,68,255],flags=[0,0x40],falls=[0,4,5,255];let tested=0;
for(let n=1;n<=31;n++){
 const dir=path.join(parts,`stage-${String(n).padStart(2,'0')}`);layer(path.join(dir,'listing.json'));if(n===1)continue;
 const m=memory.slice(),symbols=JSON.parse(fs.readFileSync(path.join(dir,'symbols.json'))),entry=m[0x7f3f]|m[0x7f40]<<8,header=symbols.blocks.find(b=>b.start===0x7f3f);assert(header&&header.type==='Word'&&header.end===0x7f40);
 assert.deepEqual([...m.slice(entry,entry+4)],[0xae,0xbd,0x4d,0xa9]);assert.equal(m[entry+4],constants[n]);assert.deepEqual([...m.slice(entry+5,entry+8)],[0x9d,0xcb,0x4d]);
 const cpu=new CPU(m);m[0x4dbd]=1;m[0x4dcc]=0;cpu.pc=entry;cpu.step();cpu.step();cpu.step();assert.equal(m[0x4dcc],constants[n]);
 const pred=conditions[n];if(!pred){
  const counter=n===25?0x94a7:0x8fcf,table=counter+1,pattern=[0xff,0,0,0xff,0,0];assert.deepEqual([...m.slice(table,table+6)],pattern);
  const label=symbols.symbols.find(s=>s.address===entry&&s.name==='load_update_entry');assert(label,`load ${n} complex entry label`);
  for(let index=0;index<6;index++)for(const v1 of [0,1,255])for(const v2 of [0,1,255])for(const col of [0,1,255]){
   m[0x4dbd]=1;m[0x4dcc]=0;m[0x4db6]=v1;m[0x4db3]=v2;m[0x6f3c]=col;m[counter]=index;m[0xe1]=0x77;cpu.pc=entry;let steps=0;
   while(cpu.pc!==0x0200&&cpu.pc!==0x0732){assert(steps++<60,`load ${n}: no complex terminal`);cpu.step();}
   assert.equal(cpu.pc,n===26&&col===0?0x0732:0x0200);assert.equal(m[0xe1],v1||v2?255:pattern[index]);assert.equal(m[counter],v1||v2?index:(index+1)%6);assert.equal(m[0x4dcc],constants[n]);
  }
  continue;
 }
 const label=symbols.symbols.find(s=>s.address===entry&&s.name==='load_update_entry');assert(label,`load ${n} entry label`);
 for(const col of cols)for(const row of rows)for(const flag of flags)for(const fall of falls){
  m[0x4dbd]=1;m[0x4dcc]=0;m[0x6f3c]=col;m[0x6f3d]=row;m[0x4de3]=flag;m[0x4db5]=fall;cpu.pc=entry;let steps=0;
  while(cpu.pc!==0x0200&&cpu.pc!==0x0732){assert(steps++<60,`load ${n}: no terminal`);cpu.step();}
  assert.equal(cpu.pc,pred(col,row,flag)?0x0732:0x0200,`load ${n}, col ${col}, row ${row}, flag ${flag}`);
  assert.equal(m[0x4dcc],constants[n]);assert.equal(m[0x4db5],(n===10||n===29)&&fall>=5?4:fall);tested++;
 }
}
assert.equal(tested,140616);console.log(`OK - 30 update vectors and ${tested} boundary decisions in 27 simple entries and gate checks in three more`);
