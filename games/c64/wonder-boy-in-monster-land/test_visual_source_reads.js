'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{CPU}=require('../../../kit/cpu/cpu6502.js');
const root=__dirname,parts=path.join(root,'parts'),plans=JSON.parse(fs.readFileSync(path.join(root,'visual-source-observations.json'))),base=new Uint8Array(65536);
function load(part,m){for(const r of JSON.parse(fs.readFileSync(path.join(parts,part,'listing.json'))).records)if(r.b)m.set(r.b,r.a)}
load('resident',base);const groups=new Map();let bytes=0;
for(const p of plans){const key=p.stage+'/'+p.selector;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);bytes+=p.end-p.start+1}assert.equal(bytes,496);assert.equal(plans.length,74);
for(const group of groups.values()){
 const first=group[0],m=base.slice();load('stage-'+String(first.stage).padStart(2,'0'),m);const reads={tokenReads:new Set(),quadReads:new Set()},hooks={};
 for(const pc of [0x702e,0x7041,0x7047])hooks[pc]=cpu=>{assert.equal(m[pc],0xb1);reads.tokenReads.add(((m[0x52]|m[0x53]<<8)+cpu.y)&65535)};
 hooks[0x7089]=cpu=>{assert.equal(m[0x7089],0xbd);reads.quadReads.add(((m[0x708a]|m[0x708b]<<8)+cpu.x)&65535)};
 for(const p of group){const lo=p.kind==='tokenReads'?0x7f90:0x7f82,hi=p.kind==='tokenReads'?0x7f97:0x7f89;assert.equal(m[lo+p.selector]|m[hi+p.selector]<<8,p.base)}
 m[0x46]=0xc4;m[0x4d71]=0xc8;m[0x4d8a]=0;new CPU(m).call(0x7130,{x:first.selector},{hooks,maxSteps:500000});
 for(const p of group)for(let a=p.start;a<=p.end;a++)assert(reads[p.kind].has(a),`${p.stage}/${p.selector} ${p.kind} ${a.toString(16)}`);
}
console.log(`OK - ${bytes} bounded visual-source bytes in ${plans.length} segments are read by the game renderer`);
