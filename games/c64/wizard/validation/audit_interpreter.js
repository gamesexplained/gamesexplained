#!/usr/bin/env node
'use strict';
/* Original-instruction review probes for the shared GAME/BLDR interpreter.
 *
 * Usage, from the repository root:
 *   node games/c64/wizard/validation/audit_interpreter.js [private-directory] [ROM-directory]
 *
 * Private inputs: entry.vsf, game.prg, bldr.prg.
 * ROM inputs: basic-901226-01.bin, kernal-901227-03.bin.
 * Defaults match compiled_harness.js: this game's work/ directory and the
 * repository's tools/vice-mcp/share/vice/C64/ directory.
 *
 * Executes original instructions from private PRGs and local ROMs using the
 * public kit CPU. No bytecode decoder or work/ helper is imported. Prepared
 * states are not full-game reachability proofs. Hardware I/O is not modeled;
 * the limited NEW/STOP hooks are documented in their individual probes.
 * This script writes no files and does not change the frozen review reports.
 */
const fs = require('fs'), path = require('path'), assert = require('assert');
const GAME = path.resolve(__dirname, '..'), ROOT = path.resolve(GAME, '../../..');
const WORK = process.argv[2] ? path.resolve(process.argv[2]) : path.join(GAME, 'work');
const ROM = process.argv[3] ? path.resolve(process.argv[3]) : path.join(ROOT, 'tools/vice-mcp/share/vice/C64');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node games/c64/wizard/validation/audit_interpreter.js [private-directory] [ROM-directory]');
  console.log('Private inputs: entry.vsf, game.prg, bldr.prg. ROMs: basic-901226-01.bin, kernal-901227-03.bin.');
  process.exit(0);
}
const {CPU, readSnapshot} = require(path.join(ROOT, 'kit/c64/cpu6502'));
const snap = readSnapshot(path.join(WORK, 'entry.vsf'));
const rom = {
  basic: fs.readFileSync(path.join(ROM, 'basic-901226-01.bin')),
  kernal: fs.readFileSync(path.join(ROM, 'kernal-901227-03.bin'))
};
const prg = fs.readFileSync(path.join(WORK, 'game.prg'));
assert.equal(snap.port.dir & 7, 7, 'The prepared entry snapshot must drive all three banking lines.');
assert.equal(snap.port.data & 7, 7, 'These probes require BASIC, KERNAL and I/O banked in.');
const results = [];

function fresh() {
  const m = Uint8Array.from(snap.ram);
  m.set(prg.subarray(2), prg.readUInt16LE());
  const c = new CPU(m, {port: {...snap.port}, rom});
  c.sp = 0xf8;
  word(c, 0x33, 0xa000);
  word(c, 0x31, 0x4b89);
  word(c, 0x37, 0xa000);
  return c;
}
function word(c, a, v) {
  c.m[a] = v & 255;
  c.m[a + 1] = v >>> 8 & 255;
}
function w(c, a) { return c.m[a] | c.m[a + 1] << 8; }
function int(c, n, secondary = false) {
  const a = secondary ? 0x6c : 0x64;
  c.m[a] = n >> 8 & 255;
  c.m[a + 1] = n & 255;
  c.m[secondary ? 0xb6 : 0xb5] = 1;
}
function val(c, secondary = false) {
  const a = secondary ? 0x6c : 0x64, n = c.m[a] * 256 + c.m[a + 1];
  return n < 32768 ? n : n - 65536;
}
function run(c, entry, hooks = {}) {
  c.pc = entry;
  return c.run({maxSteps: 100000, hooks: {0x926: () => true, 0x92c: () => true, ...hooks}});
}
function op(c, opcode, operand = [], at = 0x5000) {
  c.m.set([opcode, ...operand], at);
  word(c, 0x39, at);
  c.pc = 0x92c;
  c.step(); // Move past the initial dispatch boundary before enabling stops.
  c.run({maxSteps: 100000, hooks: {0x926: () => true, 0x92c: () => true}});
  return c.pc === 0x926 ? (w(c, 0x39) + 1) & 65535 : w(c, 0x39);
}
function strings(c, a, b) {
  c.m.set(Buffer.from(a), 0x5100);
  c.m.set(Buffer.from(b), 0x5200);
  c.m[0x64] = a.length;
  word(c, 0x65, 0x5100);
  c.m[0x6c] = b.length;
  word(c, 0x6d, 0x5200);
  c.m[0xb5] = c.m[0xb6] = 255;
}
function save(name, detail) {
  results.push({name, status: 'pass', ...detail});
  console.log(`${name}: ${detail.cases || 0} cases passed`);
}

// ON: a two-entry inline table. Sweep every valid byte index.
let on=[];
for(let n=0;n<256;n++){let c=fresh();int(c,n);let next=op(c,0xe2,[6,0xd1,0x34,0x52,0x78,0x56]);let offset=(n*2)&255;let expected=n===0||offset>=6?0x5007:offset===0?0xd106:offset===2?0x5234:0x5678;assert.equal(next,expected);if([0,1,2,3,127,128,129,130,131,255].includes(n))on.push({index:n,next});}
save('ON byte-index wrap',{cases:256,entry:0x133f,selected_results:on,conclusion:'Indices 128..255 wrap; 128 targets header/selector $D106 in this prepared table,129 aliases1,130 aliases2.'});
// Comparisons including signed boundaries, equality, string prefix/empty ordering.
let ints=[-32768,-32767,-257,-256,-1,0,1,255,256,32766,32767],n=0;
for(let a of ints)for(let b of ints)for(let [oc,rel] of [[0x94,(a,b)=>a===b],[0x93,(a,b)=>a!==b],[0x8b,(a,b)=>a<b],[0x8c,(a,b)=>a>b],[0x95,(a,b)=>a<=b],[0x96,(a,b)=>a>=b]]){let c=fresh();int(c,a);int(c,b,true);op(c,oc);assert.equal(val(c),rel(a,b)?-1:0);assert.equal(c.m[0xb5],1);n++;}
save('Signed integer comparisons',{cases:n,values:ints,opcodes:[0x94,0x93,0x8b,0x8c,0x95,0x96]});
let ss=['','A','AA','AB','B','Z'],ns=0;
for(let a of ss)for(let b of ss)for(let[oc,rel]of[[0x9d,(a,b)=>a===b],[0x9c,(a,b)=>a!==b],[0x98,(a,b)=>a<b],[0x99,(a,b)=>a>b],[0x9a,(a,b)=>a<=b],[0x9b,(a,b)=>a>=b]]){let c=fresh();strings(c,a,b);op(c,oc);assert.equal(val(c),rel(a,b)?-1:0);assert.equal(c.m[0xb5],1);ns++;}
save('String relations and BASIC booleans',{cases:ns,strings:ss,entries:[0x1d16,0x1d1f,0x1d28,0x1d2c,0x1d30,0x1d34]});
// Integer sign across complete 16-bit domain, one reused CPU to avoid allocation cost.
{let c=fresh();for(let v=-32768;v<=32767;v++){int(c,v);c.call(0x1717);assert.equal(c.y,Math.sign(v)&255);}save('Integer sign complete domain',{cases:65536,entry:0x1717});}
{let out=[];for(let v of [-32768,-10000,-1000,-100,-10,-1,0,1,9,10,99,100,999,1000,9999,10000,32767]){let c=fresh();int(c,v);c.call(0xbd2);let bytes=[];for(let i=0x100;c.m[i];i++)bytes.push(c.m[i]);let text=Buffer.from(bytes).toString('ascii');assert.equal(text,(v<0?'':' ')+v);assert.equal(c.m[0xc21],1);out.push({value:v,text});}save('Signed decimal formatting',{cases:out.length,entry:0xbd2,results:out});}
{let out=[];for(let [oc,expect]of[[0xab,0],[0x97,1]]){let c=fresh();int(c,-7654,true);op(c,oc);assert.equal(val(c,true),expect);assert.equal(c.m[0xb6],1);out.push({opcode:oc,value:val(c,true)});}for(let b of [0,127,128,255]){let c=fresh();let next=op(c,0x55,[b],0x50fe);assert.equal(val(c,true),b);assert.equal(next,0x5100);out.push({opcode:0x55,byte:b,next});}save('Secondary constants and byte operand width',{cases:out.length,results:out});}
{let out=[];for(let type of [0,1,5,0xff]){let c=fresh();c.m.set([0x88,0x99,0xfe,0xdc,0xba,0x80,type],0x2808);op(c,1);assert.equal(c.m[0xb6],type&0xfb);if(type===0)assert.deepEqual(Array.from(c.m.slice(0x69,0x6f)),[0x88,0x99,0xfe,0xdc,0xba,0x80]);else {assert.equal(c.m[0x6c],0xfe);assert.equal(c.m[0x6d],0xdc);if(type&128)assert.equal(c.m[0x6e],0xba);}out.push({record_type:type,loaded_type:c.m[0xb6],fields:Array.from(c.m.slice(0x69,0x6f))});}save('Typed short secondary load',{cases:4,entry:0x999,results:out});}
{let c=fresh();c.m.set([0xfe,0xdc],0x5300);let next=op(c,0xee,[0,0x53],0x50fe);assert.equal(next,0x5101);assert.equal(val(c,true),-292);assert.equal(c.m[0xb6],1);save('Inline secondary integer pointer',{cases:1,entry:0x2054,next,integer:val(c,true),note:'Pointer little endian; addressed integer high byte then low byte.'});}
// Packed DATA strings precede optional binary numeric tails.
{let rows=[[3,65,66,67],[0x43,49,50,51,123],[0x82,45,49,255,255]],out=[];for(let bytes of rows){let c=fresh();word(c,0x41,0x53fd);c.m.set(bytes,0x53fd);word(c,0x39,0x5000);c.m[0x5001]=0x9e;run(c,0x167f);assert.equal(c.m[0x64],bytes[0]&63);assert.equal(w(c,0x65),0x53fe);assert.equal(w(c,0x41),0x53fd+bytes.length);out.push({header:bytes[0],length:c.m[0x64],pointer:w(c,0x65),next_data:w(c,0x41)});}save('Packed DATA string descriptors and binary tails',{cases:3,entry:0x167f,results:out});}
// MID one character and variable-length zero short circuit.
{let out=[];for(let pos of [1,3,5,6]){let c=fresh();strings(c,'ABCDE','');int(c,pos,true);op(c,0xe0);let len=c.m[0x64],ptr=w(c,0x65),text=Buffer.from(c.m.slice(ptr,ptr+len)).toString();assert.equal(text,'ABCDE'.slice(pos-1,pos));out.push({position:pos,text});}let c=fresh();strings(c,'ABCDE','');int(c,0,true);c.m[0x60]=0;op(c,0xaa);assert.equal(c.m[0x64],0);save('MID character selection and zero-length bypass',{cases:5,entry:0x1ec9,results:out,edge:'$1EC2 returns empty for requested length0 before rejecting position0.'});}
// Save/restore complete typed numeric values through the actual assignment path.
{let out=[];for(let type of [0,1,5]){let c=fresh();let old=type===0?[0x82,0xa0,0,0,0,0,0]:[0,0,0xff,0xfb,0,0,type];c.m.set(old,0x2808);int(c,42);op(c,0xa7,[8,0x28]);assert.equal(c.m[0x280a]*256+c.m[0x280b],42);op(c,0xa4);assert.equal(c.m[0x280e],type);if(type===0)assert.deepEqual(Array.from(c.m.slice(0x2808,0x280f)),old);else assert.deepEqual(Array.from(c.m.slice(0x280a,0x280c)),old.slice(2,4));out.push({old_type:type,restored:true});}save('Local scalar save assignment restore',{cases:3,entries:[0x2372,0x23c3],results:out});}
// Initialization both original PRGs, preserving declarations and header array clear bounds.
{let out=[];for(let f of ['game.prg','bldr.prg']){let c=fresh(),p=fs.readFileSync(path.join(WORK, f));c.m.set(p.subarray(2),p.readUInt16LE());let end=w(c,0x81c),scalar=[];for(let a=0x2800;a<end;a+=a<0x2900?8:7)scalar.push({a,type:c.m[a+6]});c.call(0x2281);for(let s of scalar){assert.deepEqual(Array.from(c.m.slice(s.a,s.a+6)),[0,0,0,0,0,0]);assert.equal(c.m[s.a+6],s.type===5||s.type>0x96?s.type:1);}out.push({file:f,scalar_count:scalar.length,header_data:end,array_start:w(c,0x81e),array_end:w(c,0x820),initializers_begin:w(c,0x820)});}save('Compiled scalar initialization',{cases:2,entry:0x2281,results:out,note:'Scalar record clearing/preserved declarations asserted; array initializer bytes inspected statically, not exhaustively asserted here.'});}
// TI$ uses actual BASIC and KERNAL ROM clock read and conversion.
{let out=[];for(let ticks of [0,60,60*60,60*3661])for(let ext of [8,13]){let c=fresh();c.m[0xa0]=ticks>>16&255;c.m[0xa1]=ticks>>8&255;c.m[0xa2]=ticks&255;op(c,0x80,[ext]);let base=ext===8?0x64:0x6c,len=c.m[base],ptr=w(c,base+1),text=Buffer.from(c.m.slice(ptr,ptr+len)).toString();let secs=Math.floor(ticks/60),expect=[Math.floor(secs/3600),Math.floor(secs/60)%60,secs%60].map(v=>String(v).padStart(2,'0')).join('');assert.equal(text,expect);assert.equal(c.m[ext===8?0xb5:0xb6],255);out.push({ticks,extension:ext,text});}save('Clock string via original BASIC and KERNAL ROM',{cases:out.length,entry:0x260a,results:out});}
// STOP and NEW execute native setup, verified at their external ROM destination.
{let c=fresh();word(c,0x39,0x5000);c.m.set([0xe1,0x34,0x12],0x5000);let cleanup=0;run(c,0x1886,{0xa660:q=>{cleanup++;q.rts();},0xa84b:()=>true});assert.equal(w(c,0x39),0x1234);assert.equal(c.c,1);save('STOP inline pointer and BASIC stop transfer',{cases:1,entry:0x1886,cursor:w(c,0x39),cleanup_calls:cleanup,rom_target:c.pc,note:'Cleanup was hooked to preserve synthetic environment; no user-facing STOP display tested.'});}
{let c=fresh();run(c,0x2342,{0xffe7:q=>q.rts(),0xa474:()=>true});assert.equal(c.pc,0xa474);assert.equal(c.m[w(c,0x2b)],0);assert.equal(c.m[w(c,0x2b)+1],0);save('NEW ROM cleanup to READY boundary',{cases:1,entry:0x2342,rom_target:c.pc,note:'Actual BASIC ROM NEW/cleanup executes, with KERNAL CLALL $FFE7 hooked; the unhooked attempt reached CIA2 and was stopped as unsupported hardware I/O.'});}
// FOR frame, increment, signed limit and explicit negative step.
{let out=[];for(let [start,limit,step]of[[1,3,1],[-2,1,1],[3,1,-1],[-39,-41,1]]){let c=fresh();c.m[0x1f9]=0xff;let initialSp=c.sp;if(step===1){int(c,limit);op(c,0xcb);}else{int(c,limit);op(c,0xf5);int(c,step);op(c,0xcc);}int(c,start);op(c,0xcd,[8,0x28],0x5001);let values=[start];let frameSp=c.sp;for(let i=0;i<10;i++){op(c,0xd5,[],0x5100);let v=c.m[0x280a]*256+c.m[0x280b];v=v<32768?v:v-65536;if(c.sp!==frameSp){assert.equal(c.sp,initialSp);break;}values.push(v);}let expected=[];for(let v=start,k=0;k<10;k++,v+=step){expected.push(v);if(step>0?v+step>limit:v+step<limit)break;}assert.deepEqual(values,expected);out.push({start,limit,step,body_values:values});}save('FOR integer frames and signed NEXT',{cases:out.length,entries:[0xc9b,0xd5a,0xd97,0xee7],results:out});}
{let c=fresh();let sp=c.sp;let next=op(c,0xd2,[0x34,0x52],0x50fe);assert.equal(next,0x5234);assert.equal(c.sp,sp-3);let stack=Array.from(c.m.slice(c.sp+1+0x100,sp+1+0x100));let back=op(c,0xd8,[],0x5234);assert.equal(back,0x5101);assert.equal(c.sp,sp);save('GOSUB RETURN little-endian target and page carry',{cases:1,entries:[0x12fc,0x1315],target:next,continuation:back,stack});}
{let out=[];for(let [oc,size]of[[0xa3,2],[0xa6,3],[0xa0,5]])for(let index of[0,1,11,255]){let c=fresh();word(c,0x49,0x5300);int(c,index);op(c,oc);assert.equal(w(c,0x3d),0x5300+index*size);out.push({opcode:oc,index,size,pointer:w(c,0x3d)});}save('Array element address widths',{cases:out.length,entries:[0x1f62,0x1fc0,0x1ffb],results:out});}
{let out=[];for(let [type,size]of[[0,5],[1,2],[255,3]]){let c=fresh();word(c,0x49,0x5300);c.m.set([11,0,type],0x52fd);int(c,2);int(c,3,true);op(c,0xa8);assert.equal(w(c,0x3d),0x5300+(2*11+3)*size);out.push({type,stride:11,indices:[2,3],pointer:w(c,0x3d)});}save('Two dimensional array linearization',{cases:3,entry:0x21bd,results:out});}
{let out=[];for(let f of ['game.prg','bldr.prg']){let c=fresh(),p=fs.readFileSync(path.join(WORK, f));c.m.set(p.subarray(2),p.readUInt16LE());let header=w(c,0x824);run(c,0x2245,{0x2267:()=>true});assert.equal(w(c,0x31),header+0x100);out.push({file:f,header,floor:w(c,0x31)});}save('Header program end and actual allocation floor',{cases:2,entry:0x2245,results:out});}
{let c=fresh();op(c,0x80,[17]);assert.deepEqual(Array.from(c.m.slice(0x926,0x929)),[0x4c,0xde,0x19]);word(c,0x39,0x50ff);c.m[0x91]=0;c.pc=0x926;c.step();c.run({until:0x92c,maxSteps:100});assert.equal(w(c,0x39),0x5100);let fetchTarget=c.pc;op(c,0x80,[18]);assert.deepEqual(Array.from(c.m.slice(0x926,0x929)),[0xe6,0x39,0xd0]);save('Optional STOP-fetch code and restoration',{cases:2,entries:[0x19be,0x19de,0x19cc],fetchTarget,cursor_after_checked_fetch:0x5100,note:'Executes $19DE-$19EF code classified Undefined at baseline db7640a; no STOP-matched ROM path execution.'});}
{let c=fresh();function add(text,dest){c.m.set(Buffer.from(text),0x5500);word(c,0x24,0x5500);c.call(0x1d6e,{y:text.length,z:text.length===0});if(dest){c.m.set([0,0,0],dest);op(c,0xf3,[dest&255,dest>>8]);}return w(c,0x65);}let first=add('ONE',0x5400),discarded=add('FREE',null),second=add('TWO',0x5403),before=w(c,0x33);c.call(0x270d);for(let [a,expected]of[[0x5400,'ONE'],[0x5403,'TWO']]){let ptr=w(c,a+1),len=c.m[a];assert.equal(Buffer.from(c.m.slice(ptr,ptr+len)).toString(),expected);}assert.equal(w(c,0x33),0xa000-10);save('Managed string ownership and heap compaction',{cases:1,entries:[0x1d6e,0x2143,0x270d],before,after:w(c,0x33),first_pointer:first,discarded_pointer:discarded,second_pointer:second,reclaimed:6,note:'Two live three-character strings and one unowned four-character temporary; tests heap movement/owner repair, not tagged expression-stack collector frames. Direct helper entry sets Z consistently with Y length as real callers do; the first synthetic attempt omitted that flag precondition and was corrected.'});}
console.log(`PASS: ${results.length} probe groups, ${results.reduce((sum, row) => sum + (row.cases || 0), 0)} prepared cases.`);
