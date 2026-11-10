'use strict';
// Reproduce the stream audit with the contributor's extracted disk files and ignored snapshots.
// See parts/resident/facts.md for the extraction commands; no game bytes are written outside work/.

const fs=require('fs'),path=require('path'),{CPU,loadSnapshot}=require('../../../kit/cpu/cpu6502.js');const root=__dirname,work=path.join(root,'work'),out=[];
for(let n=2;n<=31;n++){
 const prefix=n.toString(16).toUpperCase().padStart(2,'0')+'-',dir=path.join(work,n<20?'side-a-files':'side-b-files'),names=fs.readdirSync(dir).filter(name=>name.startsWith(prefix));if(names.length!==1)throw Error(`load ${n}: ${names.length} files`);
 const counts={literal_copy_iterations:0,reference_copy_iterations:0,prefix_steps:0,wide_lengths:0,table_lengths:0,distance_decodes:0,end_markers:0};const data=fs.readFileSync(path.join(dir,names[0])),m=loadSnapshot(path.join(root,`parts/stage-${String(n-1).padStart(2,'0')}/work/play.vsf`)),expected=loadSnapshot(path.join(root,`parts/stage-${String(n).padStart(2,'0')}/work/entry.vsf`));
 let offset=0;const fetch=c=>{if(offset>=data.length)throw Error('end of disk file');c.a=data[offset++];c.rts()};const streams=[];
 for(let segment=0;segment<2;segment++){
  const start=offset,writes=new Uint8Array(65536),cpu=new CPU(m);cpu.call(0x7c2c,{sp:0xff,d:0},{maxSteps:10000000,hooks:{0x7d89:fetch,0x7c8c:c=>{counts[c.c?'reference_copy_iterations':'literal_copy_iterations']++},0x7ca0:()=>{counts.prefix_steps++},0x7cb0:()=>{counts.wide_lengths++},0x7cbd:()=>{counts.table_lengths++},0x7cf2:()=>{counts.distance_decodes++},0x7cae:c=>{if(c.z)counts.end_markers++}},writes});
  const ranges=[];let different=0;const examples=[];
  for(let a=0x0200;a<65536;a++)if(writes[a]){if(!ranges.length||a>ranges.at(-1)[1]+1)ranges.push([a,a]);else ranges.at(-1)[1]=a;if(m[a]!==expected[a]){different++;if(examples.length<4)examples.push(a);}}
  streams.push({input_start:start,input_end:offset,ranges,different,examples});
 }
 if([10,14,28,29].includes(n)){
  m[0x2a91]=n;new CPU(m).call(0x2a90,{sp:0xff,d:0},{maxSteps:10000});
  for(const segment of streams){segment.after_patch_different=0;for(const [lo,hi] of segment.ranges)for(let a=lo;a<=hi;a++)if(m[a]!==expected[a])segment.after_patch_different++;}
 }
 const cfg=JSON.parse(fs.readFileSync(path.join(root,`parts/stage-${String(n).padStart(2,'0')}/part.json`))),owned=cfg.ranges.map(([a,b])=>[parseInt(a.slice(1),16),parseInt(b.slice(1),16)]);
 const actual=streams.flatMap(s=>s.ranges).sort((a,b)=>a[0]-b[0]);const match=JSON.stringify(actual)===JSON.stringify(owned)&&streams.every(s=>(s.after_patch_different??s.different)===0);
 out.push({load:n,counts,input_bytes:data.length,consumed:offset,streams,owned,patch_applied:[10,14,28,29].includes(n),match});console.log(`load ${n}: ${match?'MATCH':'MISMATCH'}, streams ${streams.map(s=>s.input_end-s.input_start).join('+')} of ${data.length} bytes, differences ${streams.map(s=>s.different).join('+')}`);
}
fs.writeFileSync(path.join(work,'disk-stream-audit.json'),JSON.stringify(out,null,2)+'\n');

if(out.some(x=>!x.match))process.exitCode=1;
