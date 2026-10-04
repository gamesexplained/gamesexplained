/* Original BLDR interpreter and editor bytecode checks.
 * Usage: node validation/audit_editor_script.js [private-work-directory] [private-ROM-directory]
 * Requires private bldr.prg and editor-menu.vsf, plus the local BASIC/KERNAL ROMs.
 * The snapshot supplies initialized scalar/array/zero-page state. Interpreter
 * bytes are restored from the PRG and the entire script is checked against it.
 * CPU/chip inputs are synthetic; these are not fresh full-machine observations.
 * This validator reads private inputs and writes no files or emulator state.
 */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const GAME = path.resolve(__dirname, '..'), ROOT = path.resolve(GAME, '../../..');
const WORK = process.argv[2] ? path.resolve(process.argv[2]) : path.join(GAME, 'work');
const ROM = process.argv[3] ? path.resolve(process.argv[3]) : path.join(ROOT, 'tools/vice-mcp/share/vice/C64');
const {CPU,readSnapshot}=require(ROOT+'/kit/c64/cpu6502');
const snap=readSnapshot(WORK+'/editor-menu.vsf');
const raw=fs.readFileSync(WORK+'/bldr.prg'),base=raw.readUInt16LE(0);
const rom={basic:fs.readFileSync(ROM+'/basic-901226-01.bin'),kernal:fs.readFileSync(ROM+'/kernal-901227-03.bin')};
assert.equal(base,0x801);
assert.deepEqual(Buffer.from(snap.ram.slice(0x3320,0x530d)),raw.subarray(2+0x3320-base,2+0x530d-base));
function fresh(){const io=new Uint8Array(4096);io[0xc00]=31;io[0xc01]=255;const m=Uint8Array.from(snap.ram);m.set(raw.subarray(2+0x826-base,2+0x2800-base),0x826);const cpu=new CPU(m,{port:{dir:0x2f,data:0x37},rom,io:{read:a=>io[a-0xd000],write:(a,v)=>io[a-0xd000]=v}});return{cpu,m:cpu.m,io};}
function set(s,i,n){let v=[0,0,(n>>8)&255,n&255,0,0];if(n>32767||n< -32768){const bits=Math.floor(Math.log2(Math.abs(n)))+1,man=Math.abs(n)*2**(32-bits);v=[128+bits,Math.floor(man/2**24)&255,Math.floor(man/2**16)&255,Math.floor(man/256)&255,man&255,n<0?128:0];}s.m.set(v,0x2800+8*i);s.m[0x2806+8*i]=(s.m[0x2806+8*i]&4)|(v[0]?0:1);}
function get(s,i){const a=0x2800+8*i,v=s.m.slice(a,a+6);if(s.m[a+6]&1){const n=v[2]*256+v[3];return n>=32768?n-65536:n;}if(!v[0])return 0;return(v[5]&128?-1:1)*(v[1]*2**24+v[2]*2**16+v[3]*256+v[4])*2**(v[0]-160);}
function run(s,entry,stops,extra={}){const{cpu,m}=s;m[0x39]=entry&255;m[0x3a]=entry>>8;cpu.pc=0x92c;cpu.sp=255;cpu.d=0;let at;
 let count;try{count=cpu.run({maxSteps:12000000,hooks:{0x92c:c=>{at=m[0x39]+m[0x3a]*256;return stops.includes(at);},...extra}});}catch(e){console.error({entry:entry.toString(16),lastBytecode:at.toString(16),v0:get(s,0),v1:get(s,1),v4:get(s,4)});throw e;}
 assert(stops.includes(at),'unexpected stop '+at?.toString(16));return{stop:at,steps:count};}
const result={evidence_scope:'offline synthetic original-runtime execution; archived editor-menu.vsf provides initialized RAM only, not a new live observation',input:[],fullNumericInput:[],portalChecks:[],portalPlacement:[],shapes:[],erasure:[],cursor:[],saveReset:[],title:[],bounds:[],status:[],callback:[],dataInitialization:[]};
for(const input of ['-1','+1','1.2','1,2','-1,-2','',',','123456789012345678']){const s=fresh(),queue=[...Buffer.from(input),13];let reads=0;run(s,0x48b6,[0x4982,0x4994,0x49a5],{0xffe4:c=>{c.a=queue[reads++]??0;c.rts();},0xc6d:c=>{c.pc=0x926;}});result.fullNumericInput.push({input,first:get(s,0),second:get(s,5),acceptedLength:get(s,14),reads});}
{
 const s=fresh(),records=[];let p=0x291c;
 while(p<0x2da2){const a=p,h=s.m[p++],n=h&63,t=Buffer.from(s.m.slice(p,p+n)).toString('latin1');p+=n;let v=t;if(h&128){v=s.m[p]+256*s.m[p+1];if(v>=32768)v-=65536;p+=2;}else if(h&64)v=s.m[p++];records.push({address:a,value:v});}
 s.m.fill(0,0x2da2,0x330c);s.m.set([11,0,0],0x2f1c);s.m.set([24,0,0],0x3206);run(s,0x47e4,[0x48b5]);
 const number=a=>{const v=s.m.slice(a,a+5);if(!v[0]){const n=256*v[1]+v[2];return n>=32768?n-65536:n;}return(v[1]&128?-1:1)*(0x80000000+(v[1]&127)*2**24+v[2]*2**16+v[3]*256+v[4])*2**(v[0]-160);};
 const string=a=>Buffer.from(s.m.slice(s.m[a+1]+256*s.m[a+2],s.m[a+1]+256*s.m[a+2]+s.m[a])).toString('latin1');
 function check(kind,a,expected){const actual=kind==='number'?number(a):string(a);assert.equal(actual,expected,'DATA at '+a.toString(16));result.dataInitialization.push({kind,address:a.toString(16),expected,actual});}
 let i=0;for(let j=0;j<11;j++){check('number',0x2fc4+5*j,records[i++].value);check('number',0x307d+5*j,records[i++].value);}assert.equal(records[i++].value,-1);assert.equal(get(s,30),10);
 for(let j=0;j<21;j++)check('string',0x2da2+3*j,records[i++].value);
 for(const a of [0x2de1,0x2e4a,0x2eb3])for(let j=1;j<=20;j++)check('number',a+5*j,records[i++].value);
 for(let j=0;j<11;j++)for(let k=0;k<3;k++)check('number',0x2f1f+55*k+5*j,records[i++].value);
 for(let j=0;j<16;j++)check('string',0x318e+3*j,records[i++].value);
 for(let j=0;j<24;j++)check('string',0x31be+3*j,records[i++].value);
 for(let j=0;j<24;j++){check('number',0x3209+5*j,records[i++].value);check('number',0x3281+5*j,records[i++].value);}
 for(let j=0;j<6;j++)check('string',0x32f9+3*j,records[i++].value);
 assert.equal(records[i].address,0x2da1);assert.equal(records[i].value,'');
}
for(let c=0;c<256;c++){const s=fresh();set(s,0,c);const r=run(s,0x48f7,[0x4915,0x48c5]);result.input.push({code:c,accepted:r.stop===0x4915});}
assert.deepEqual(result.input.filter(x=>x.accepted).map(x=>x.code),[44,48,49,50,51,52,53,54,55,56,57]);
for(const obstacle of [null,-41,-40,-39,-1,0,1]){const s=fresh(),p=0xc598;s.m.fill(32,0xc400,0xc770);if(obstacle!==null)s.m[p+obstacle]=91;set(s,0,8);set(s,5,10);set(s,2,p);set(s,4,19);const r=run(s,0x4cef,[0x4d80,0x4b64]);result.portalChecks.push({obstacleOffset:obstacle,accepted:r.stop===0x4d80});}
for(const obstacle of [null,-41,-40,-39,-1,0,1]){const s=fresh(),p=0xc598;s.m.set([13,8,7,14],0xc30c);run(s,0x49ea,[0x4a0b]);s.m.fill(32,0xc400,0xc770);if(obstacle!==null)s.m[p+obstacle]=91;set(s,7,88);set(s,9,130);set(s,4,19);run(s,0x4c54,[0x4b64]);result.portalPlacement.push({obstacleOffset:obstacle,before:obstacle===null?null:91,after:obstacle===null?null:s.m[p+obstacle],placed:s.m[p-40]===105,cells:[-41,-40,-39,-1,0,1].map(off=>({offset:off,glyph:s.m[p+off]}))});}
for(let object=18;object<=23;object++){const s=fresh(),p=0xc598;s.m.set([13,8,7,14],0xc30c);run(s,0x49ea,[0x4a0b]);s.m.fill(32,0xc400,0xc770);s.io.fill(9,0x800,0xbe8);set(s,2,p);set(s,4,object);run(s,0x4d80,[0x4b64]);result.shapes.push({object,glyphWrites:Array.from(s.m.slice(p-42,p+42),(v,i)=>({offset:i-42,value:v})).filter(x=>x.value!==32),colorWrites:Array.from(s.io.slice(p-0xc400+0x800-42,p-0xc400+0x800+42),(v,i)=>({offset:i-42,value:v})).filter(x=>x.value!==9)});}
for(const glyph of [27,28,29,30,31,32,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,114,200]){const s=fresh(),p=0xc598;s.m.fill(200,0xc400,0xc770);s.io.fill(9,0x800,0xbe8);s.m[p]=glyph;set(s,2,p);set(s,3,glyph);set(s,15,5);set(s,18,5);run(s,0x4ef3,[0x4b64]);result.erasure.push({glyph,clearedOffsets:Array.from(s.m.slice(p-82,p+82),(v,i)=>({offset:i-82,value:v})).filter(x=>x.value===32).map(x=>x.offset),treasures:get(s,15),fires:get(s,18)});}
for(const [mode,x,y,joy] of [[4,160,146,30],[4,160,146,29],[4,160,146,27],[4,160,146,23],[8,160,146,30],[8,160,146,29],[8,160,146,27],[8,160,146,23],[8,8,50,26],[8,328,210,21]]){const s=fresh();set(s,6,0xd000);set(s,7,x);set(s,9,y);set(s,16,0xc7f8);set(s,22,mode);set(s,29,0);s.m[0xc7f8]=63;s.io[0xc00]=joy;const r=run(s,0x463d,[0x4734,0x4735]);result.cursor.push({mode,x,y,joy,nextX:get(s,7),nextY:get(s,9),stop:r.stop,delay:get(s,29)});}
{const s=fresh();s.m.set([0,1,7,7,20,255],0xc370);s.m.fill(33,0xc306,0xc30c);s.m.fill(0xa5,0xc316,0xc31c);s.m[0xc35f]=0xab;run(s,0x45ef,[0x4639]);result.saveReset.push({types:Array.from(s.m.slice(0xc370,0xc376)),ys:Array.from(s.m.slice(0xc306,0xc30c)),velocities:Array.from(s.m.slice(0xc316,0xc31c)),duration:s.m[0xc35f]});}
for(const initial of [7498,7499,7500]){const s=fresh();set(s,11,initial);s.io[0xc00]=31;const r=run(s,0x52ea,[0x52ce,0x5308]);result.title.push({initial,next:get(s,11),exits:r.stop===0x5308});}
for(let status=0;status<256;status++){const s=fresh();s.m[0xfb]=status;const load=run(s,0x3414,[0x341c,0x3423]).stop;const save=run(s,0x4202,[0x4260,0x4221,0x4214]).stop;result.status.push({status,loadAccepted:load===0x341c,savePath:save===0x4260?'SAVE FAILED':save===0x4221?'WRONG DISK':'menu without error'});}
for(const first of [0,1,0x60,0x4c,255]){const s=fresh();s.m.set([first,0xaa,0xbb],0xc376);run(s,0x4135,[0x4158]);result.callback.push({before:[first,0xaa,0xbb],after:Array.from(s.m.slice(0xc376,0xc379))});}
for(const [name,start,accept,reject,lo,hi,varIndex] of [['screen',0x33ee,0x33fd,0x33cf,0,99,31],['type',0x394d,0x395c,0x3906,0,20,0],['color',0x3a3f,0x3a4e,0x3a20,0,15,0],['image',0x3a89,0x3a98,0x3a66,0,127,0],['span',0x3adb,0x3aea,0x3ab3,0,4,0],['x-velocity',0x3b5b,0x3b6a,0x3b3e,0,15,0],['y-velocity',0x3b88,0x3b97,0x3b6a,0,15,5],['duration',0x3bc4,0x3bd3,0x3ba8,0,255,0],['spell',0x3bfc,0x3c0b,0x3be0,0,11,0],['charges',0x3c32,0x3c41,0x3c17,0,9,0],['treasure',0x3d84,0x3d93,0x3d5c,0,15,12],['counter',0x3e20,0x3e2f,0x3e05,0,255,0],['stride',0x3e55,0x3e64,0x3e05,0,255,0],['patch-color',0x3e98,0x3ea7,0x3e70,0,16,0],['slide',0x3fec,0x3ffb,0x3f87,0,2,12],['slide-stride',0x4043,0x4052,0x4022,0,255,0],['slide-active',0x4088,0x4097,0x405e,0,7,0],['slide-normal',0x40c3,0x40d2,0x4097,0,15,5],['save',0x418c,0x419b,0x4158,0,99,0]]){
 for(const n of [lo-1,lo,hi,hi+1]){const s=fresh();set(s,varIndex,n);const r=run(s,start,[accept,reject]);assert.equal(r.stop===accept,n>=lo&&n<=hi);result.bounds.push({name,value:n,accepted:r.stop===accept});}
}

// Independent expectations from the native comparisons, FOR bounds and writes.
// The portal controls distinguish checking a cell from actually overwriting it.
for (const row of result.portalChecks) {
  assert.equal(row.accepted, [null, -41, -40, 0].includes(row.obstacleOffset));
}
for (const row of result.portalPlacement) {
  const accepted = [null, -41, -40].includes(row.obstacleOffset);
  assert.equal(row.placed, accepted, 'Portal placement at offset ' + row.obstacleOffset);
  const wanted = accepted ? [104, 105, 106, 107, 32, 107] :
    [-41, -40, -39, -1, 0, 1].map(off => off === row.obstacleOffset ? 91 : 32);
  assert.deepEqual(row.cells.map(cell => cell.glyph), wanted);
}
const expectedShapes = [
  [[-1, 101], [0, 102], [1, 103]],
  [[-41, 104], [-40, 105], [-39, 106], [-1, 107], [1, 107]],
  [[0, 94], [1, 92]],
  [[-1, 92], [0, 93]],
  [[-1, 97], [0, 98], [1, 92]],
  [[-1, 92], [0, 95], [1, 96]]
];
for (const row of result.shapes) {
  const expected = expectedShapes[row.object - 18];
  assert.deepEqual(row.glyphWrites.map(cell => [cell.offset, cell.value]), expected);
  const color = row.object === 18 ? 8 : row.object === 19 ? 14 : 13;
  assert.deepEqual(row.colorWrites.map(cell => [cell.offset, cell.value]),
    expected.map(([offset]) => [offset, color]));
}
const expectedErasure = {
  93: [-1, 0], 94: [0, 1], 95: [-1, 0, 1], 96: [-2, -1, 0],
  97: [0, 1, 2], 98: [-1, 0, 1], 101: [0, 1, 2],
  102: [-1, 0, 1], 103: [-2, -1, 0],
  104: [0, 1, 2, 40, 41, 42], 105: [-1, 0, 1, 39, 40, 41],
  106: [-2, -1, 0, 38, 39, 40], 107: [-40, -39, -38, 0, 1, 2]
};
for (const row of result.erasure) {
  assert.deepEqual(row.clearedOffsets, expectedErasure[row.glyph] || [0]);
  assert.equal(row.treasures, row.glyph >= 28 && row.glyph <= 31 ? 4 : 5);
  assert.equal(row.fires, row.glyph === 114 ? 4 : 5);
}
assert.deepEqual(result.cursor.map(row => [row.nextX, row.nextY]), [
  [160, 145], [160, 147], [156, 146], [164, 146],
  [160, 138], [160, 154], [152, 146], [168, 146], [328, 210], [8, 50]
]);
for (const row of result.cursor) assert.equal(row.delay, row.mode === 8 ? 8 : 0);
assert.deepEqual(result.saveReset[0], {
  types: [0, 1, 7, 7, 20, 255], ys: [33, 33, 197, 197, 33, 33],
  velocities: [31, 31, 31, 31, 31, 31], duration: 144
});
assert.deepEqual(result.title.map(row => [row.next, row.exits]),
  [[7499, false], [7500, false], [7501, true]]);
for (const row of result.status) {
  assert.equal(row.loadAccepted, row.status === 64);
  assert.equal(row.savePath, row.status === 64 ? 'SAVE FAILED' :
    row.status === 1 ? 'WRONG DISK' : 'menu without error');
}
for (const row of result.callback) {
  assert.deepEqual(row.after, row.before[0] === 0 ? [96, 96, 96] : row.before);
}
assert.deepEqual(result.fullNumericInput.slice(0, 7).map(row =>
  [row.first, row.second, row.acceptedLength]), [
  [1, 0, 1], [1, 0, 1], [12, 0, 2], [1, 2, 3], [1, 2, 3], [0, 0, 0], [0, 0, 1]
]);
assert.equal(result.fullNumericInput[7].acceptedLength, 17);
assert.equal(result.fullNumericInput[7].reads, 19);
assert.equal(result.dataInitialization.length, 230);
const counts = Object.fromEntries(Object.entries(result)
  .filter(([, value]) => Array.isArray(value)).map(([key, value]) => [key, value.length]));
console.log(JSON.stringify({counts, passed: true, evidence: result.evidence_scope}, null, 2));
