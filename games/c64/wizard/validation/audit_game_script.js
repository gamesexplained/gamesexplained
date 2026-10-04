'use strict';
/* Prepared-input checks execute the private GAME interpreter, not a JS bytecode port.
 * Usage: node validation/audit_game_script.js [private-work-directory] [private-ROM-directory]
 * Inputs: entry.vsf, play-round1.vsf, game.prg and the emulator's BASIC/KERNAL ROMs.
 * The shared compiled_harness supplies I/O and suppresses printing. Individual tests
 * hook only named external effects. These checks do not prove full-machine timing,
 * player reachability or real disk persistence. No input bytes or reports are written.
 */
const fs=require('fs'),path=require('path'),assert=require('assert');
const game=path.resolve(__dirname,'..'),root=path.resolve(game,'../../..');
const {fresh,set,get,run}=require('./compiled_harness');
const {readSnapshot}=require(root+'/kit/c64/cpu6502');
const work=process.argv[2]?path.resolve(process.argv[2]):path.join(game,'work');
const entry=readSnapshot(path.join(work,'entry.vsf'));
const prg=fs.readFileSync(path.join(work,'game.prg')),base=prg.readUInt16LE(0);
assert.equal(base,0x801);assert.equal(base+prg.length-2,0x4a89);
assert.deepEqual(prg.subarray(2+0x296e-base),entry.ram.subarray(0x296e,0x4a89));
const records=[],quiet={0x8e56:c=>c.rts(),0x987d:c=>c.rts()};
function original(){const s=fresh();assert.deepEqual(s.m.slice(0x296e,0x4a89),entry.ram.slice(0x296e,0x4a89));return s;}
function test(name,fn){const evidence=fn();records.push({name,passed:true,...evidence});}
test('next-round glyph restore preserves demo playback',()=>{
 const s=original();s.m[0xc006]=3;s.m[0x801d]=0xea;
 const destinations=[0xc8e8,0xcad8,0xcae0,0xcb18,0xcb20,0xcb28];
 destinations.forEach((a,i)=>{s.m.fill(0x10+i,a,a+8);s.m.fill(0x90+i,a+0x400,a+0x408)});
 run(s,0x3831,[0x3835]);
 assert.equal(s.m[0xc006],3);assert.equal(s.m[0x801d],0xea);
 destinations.forEach((a,i)=>assert.deepEqual(Array.from(s.m.slice(a,a+8)),Array(8).fill(0x90+i)));
 return {entry:'$3831',stop:'$3835',demoSelection:s.m[0xc006],demoHook:s.m[0x801d],restoredGlyphs:destinations.map(a=>'$'+a.toString(16))};
});
test('failed-load abort enables game interrupts before indexing',()=>{
 const s=original();s.io[0x01a]=0;s.io[0xc0f]=0;
 run(s,0x3e6c,[0x3e70]);
 assert.equal(s.io[0x01a],4);assert.equal(s.io[0xc0f],1);assert.equal(s.m[0x314]+256*s.m[0x315],0x7cbf);
 return {entry:'$3E6C',stop:'$3E70',vicIrqMask:s.io[0x01a],cia1TimerBControl:s.io[0xc0f],irqVector:'$7CBF'};
});
test('final-score timeout runs 76 delays',()=>{
 const s=original();set(s,3,0);s.io[0xc00]=31;let delays=0;
 run(s,0x444f,[0x4479],{0x8e56:c=>{delays++;c.rts()}});
 assert.equal(delays,76);assert.equal(get(s,3),76);
 return {entry:'$444F',stop:'$4479',delays,counter:get(s,3)};
});
test('normal score screen counts statistics twice before final wait',()=>{
 const s=original();set(s,13,6);set(s,8,0);s.m[0xc006]=0;s.m.fill(0,0x2c6,0x2d8);s.m.fill(0,0xc15c,0xc160);
 const calls=[];run(s,0x3ea2,[0x444f],quiet,{observe:at=>{if(at===0x48f0)calls.push(at)}});
 assert.equal(calls.length,2);assert.equal(s.m[0xc15c],12);
 return {entry:'$3EA2',stop:'$444F',players:6,statisticsCalls:calls.length,ordinaryLow:s.m[0xc15c]};
});
test('spell event dispatch exhausts all 256 byte values',()=>{
 const table=[0x308e,0x308e,0x308e,0x308e,0x3091,0x30ee,0x3106,0x3117,0x3128,0x3132],stops=[0x304c,...new Set(table)];
 for(let v=0;v<256;v++){const s=original();s.m[0xc02c]=v;set(s,17,0xc02a);const at=run(s,0x3059,stops);assert.equal(at,(v&128)?0x304c:table[(v&63)-1]||0x308e);if(!(v&128))assert.equal(s.m[0xc02c],0);}
 return {cases:256,completion:'bit 7 set',dispatch:'low 6 bits; 5..10 handlers; 0..4 and 11..63 fall through'};
});
test('slow spell delay and horizontal pursuit constants',()=>{
 const out=[];for(const delay of [0,31,63,64,65,127]){const s=original();set(s,16,delay);run(s,0x3132,[0x2b67]);assert.equal(get(s,16),delay+(delay<64?1:0));assert.equal(s.m[0xc02d],1);assert.equal(s.m[0xc06e],1);assert.equal(s.m[0xc06f],255);out.push([delay,get(s,16)]);}return {cases:out};
});
test('player-count directional edges wrap six to one',()=>{
 const s=original();set(s,13,1);set(s,9,0xdc00);set(s,0,0xc6f7);set(s,3,0);const values=[];
 for(let i=0;i<7;i++){s.io[0xc00]=30;run(s,0x34ec,[0x354f],quiet);values.push(get(s,13));s.io[0xc00]=31;run(s,0x354f,[0x34ec],quiet);}assert.deepEqual(values,[2,3,4,5,6,1,2]);return {playersAfterEdges:values};
});
test('protection marker branches and RAM destruction bounds',()=>{
 const out=[];for(const addr of [0x99e8,0x58ff,0x99f0]){const s=original();s.m[0x99e8]=0;s.m[0x58ff]=0;s.m[0x99f0]=0;s.io[0x24]=0;s.m[addr]=250;const stop=run(s,0x2971,[0x297e,0x2988,0x489d]);out.push({marker:'$'+addr.toString(16),returnAt:'$'+stop.toString(16)});}
 const s=original();s.m[0x58ff]=0;s.m[0x99f0]=0;s.io[0x24]=0;const before=s.m.slice();run(s,0x4878,[0x48b4]);
 // The interpreter uses zero page/stack while copying; validate every stable source byte from $0200 onward.
 assert.deepEqual(s.m.slice(0x6600,0x8000),before.slice(0x200,0x1c00));assert.equal(s.m[0x63ff],before[0x63ff]);assert.equal(s.m[0x8000],before[0x8000]);
 return {markerCases:out,destroyedRange:'$6400-$7FFF',stableCopyVerified:'$0200-$1BFF -> $6600-$7FFF',caveat:'source zero page/stack evolves during interpreter execution; no claim of entry-snapshot identity there'};
});
test('demo advance clears account score but preserves score scalar',()=>{
 const out=[];for(const demo of [1,2,3,4]){const s=original();s.m[0xc006]=demo;set(s,12,123450);let initialized=0;run(s,0x4a3a,[0x4a59,0x4a86],{0x80a2:c=>{initialized++;c.rts()}});assert.equal(s.m[0xc006],demo-1);assert.equal(get(s,12),123450);if(demo>1){assert.equal(s.m[0x2c6]+s.m[0x2cc]+s.m[0x2d2],0);assert.equal(initialized,1);}out.push({demo,remaining:s.m[0xc006],scoreScalar:get(s,12),initialized});}return {cases:out,limitation:'demo native setup call intercepted; separate source trace needed for full setup effects'};
});
test('death gate covers travel, fatal flags, colors and invisibility',()=>{
 let cases=0;for(const travel of [0,1])for(const fatal of [0,1,128])for(const color of [2,4])for(const invisible of [0,1,16,32]){
  const s=original();set(s,1,0xd000);set(s,17,0xc02a);set(s,21,invisible);s.m[0xc035]=travel;s.m[0xc02a]=fatal;s.io[0x02e]=color;
  const at=run(s,0x2b45,[0x2b5e,0x2b90,0x30b3]);
  const want=travel||!fatal?0x2b5e:color!==2&&invisible?0x30b3:0x2b90;assert.equal(at,want);assert.equal(get(s,21),invisible);if(at===0x30b3||travel)assert.equal(s.m[0xc02a],0);cases++;
 }return {cases,expectation:'travel or fatal=0 bypasses death; color2 bypasses invisibility; only nonzero protected fatal goes30B3'};
});
test('invisibility consumes fatal reports with exact restoration thresholds',()=>{
 const s=original();set(s,1,0xd000);set(s,17,0xc02a);s.io[0x21]=6;s.io[0x1c]=255;
 run(s,0x3091,[0x2b67]);assert.equal(get(s,21),32);assert.equal(s.io[0x2e],6);assert.equal(s.io[0x1c],127);
 const colors=[];for(let i=31;i>=0;i--){run(s,0x30b3,[0x2b67]);assert.equal(get(s,21),i);if(i<=16)assert.equal(s.io[0x1c],255);if(i<9)colors.push([i,s.io[0x2e]]);}assert.equal(s.io[0x2e],4);return {initialCount:32,lastNineColors:colors};
});
test('teleport spell selects effect one through original native entry',()=>{
 const s=original();set(s,17,0xc02a);s.m[0xc02c]=6;s.m[0xc02d]=0;s.m[0xc035]=0;
 run(s,0x30ee,[0x2b67],quiet);assert.equal(s.m[0xc02d],1);assert.equal(s.m[0xc02c],0);assert.equal(s.m[0xc035],1);return {castLatch:1,event:0,effect:1};
});
test('score parser ignores nondigits without collapsing decimal positions',()=>{
 const s=original();s.m.set(Buffer.from('x1?2 3y4'),0xc7b7);s.m[0xc008]=6;s.m[0xc034]=0;run(s,0x3d96,[0x3de9]);assert.equal(get(s,12),1020304);return {cells:'x1?2 3y4',score:get(s,12),lives:get(s,10)};
});
test('split high scores round trip all byte boundaries',()=>{
 const values=[0,1,255,256,65535,65536,65537,0x123456,0xabcdef,0xffffff],s=original();
 values.forEach((v,i)=>{s.m[0xc11e+i]=v&255;s.m[0xc128+i]=(v>>>8)&255;s.m[0xc132+i]=v>>>16});
 run(s,0x4702,[0x4744]);s.m.fill(0,0xc11e,0xc13c);run(s,0x4745,[0x4799]);
 const result=values.map((v,i)=>s.m[0xc11e+i]+256*s.m[0xc128+i]+65536*s.m[0xc132+i]);assert.deepEqual(result,values);return {values,result};
});
test('difficulty and player-menu inactivity counters are shared at start prompt',()=>{
 const s=original();set(s,3,3299);set(s,9,0xdc00);s.io[0xc00]=31;
 run(s,0x35f2,[0x3600]);
 assert.equal(get(s,3),3301);return {entry:'$35F2',stop:'$3600',initialCounter:3299,expiryCounter:get(s,3),note:'V3 is not reset between player-count wait and final start prompt'};
});
assert.equal(records.length,15);
console.log(JSON.stringify({passed:true,probeGroups:records.length,
 privateInputChecks:{load:'$0801',endExclusive:'$4A89',bytecodeMatchesEntryAndPlaySnapshots:true},
 results:records},null,2));
