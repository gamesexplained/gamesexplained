'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname)),{ram,has}=require('./opening_image.js')(g);
const cells=[];
for(let i=0;i<128;i++){
 const a=0x2e63+11*i;assert(has[a+10]);
 assert.deepStrictEqual(Array.from(ram.slice(a,a+11)).filter((_,j)=>![1,2,4,10].includes(j)),[0xbc,0xb1,0x25,0xc7,0x05,0xc8,0x91]);
 assert.equal(ram[a+4],ram[a+10]);
 cells.push({table:ram[a+1]+256*ram[a+2],pointer:ram[a+4]});
}
assert.equal(ram[0x33e3],0x60);
let cases=0;
for(let start=0;start<128;start++)for(const x of [0,5,11])for(const [and,or] of [[255,0],[0,255],[0x55,0x82]]){
 const memory=Uint8Array.from(ram),expected=new Uint8Array(0x700);
 for(let i=0;i<expected.length;i++)expected[i]=memory[0x8000+i]=(i*73+start*17)&255;
 for(let zp=0x40;zp<=0x4c;zp+=2){memory[zp]=0;memory[zp+1]=0x80+(zp-0x40)/2;}
 memory[0xc7]=and;memory[0xc8]=or;
 for(const cell of cells.slice(start)){
  const address=(cell.pointer-0x40)/2*256+memory[cell.table+x];
  expected[address]=(expected[address]&and)|or;
 }
 const c=new CPU(memory);c.call(0x2e63+11*start,{x,d:0});
 assert.deepStrictEqual(c.m.slice(0x8000,0x8700),expected,`cell ${start}, X ${x}, masks ${and}/${or}`);cases++;
}
// Compare the fixed-point byte multiplier over the full input/depth domain.
let products=0;
for(let depth=0;depth<256;depth++)for(let input=0;input<256;input++){
 const c=new CPU(Uint8Array.from(ram));c.m[0x0544]=depth;
 c.call(0x2acf,{a:input,x:0,d:0});
 const step=(depth+(depth>>1)+(depth&1))&255;
 const factor=255-Math.max(0,step-16);
 let expected=0;for(let bit=0;bit<8;bit++)if(input&(1<<bit))expected+=((factor>>(7-bit))+1)>>1;
 assert.equal(c.a,expected,`depth ${depth}, input ${input}`);products++;
}
console.log(`OK - ${cases} unrolled painter suffix/mask cases and ${products} depth scaling cases agree with original code`);
