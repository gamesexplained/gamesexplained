'use strict';
const path=require('path'),assert=require('assert');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=game(__dirname),L=g.listing();
const {roomData}=g.run('levels.html','duckula-drawing','roomData');
g.sameBlock('duckula-drawing');
let count=0;
for(let id=0;id<78;id++){
 if(L.ram[0xff40+id]===255)continue;
 const mem=L.ram.slice(),colour=new Uint8Array(1024),expected=roomData(mem,id);
 mem[0xe7]=id;mem[0x142f]=0;
 const cpu=new CPU(mem,{port:0x35,io:{read(a){throw Error('unexpected read '+a.toString(16));},write(a,v){if(a>=0xd800&&a<0xdc00)colour[a-0xd800]=v&15;else if(a<0xd400||a>0xd418)throw Error('unexpected write '+a.toString(16));}}});
 cpu.call(0x2e53,{}, {maxSteps:500000});
 assert.deepStrictEqual(Array.from(mem.slice(0xe000,0xf900)),Array.from(expected.bitmap.slice(0,6400)),'bitmap room '+id);
 assert.deepStrictEqual(Array.from(mem.slice(0xc000,0xc320)),Array.from(expected.screen.slice(0,800)),'screen room '+id);
 assert.deepStrictEqual(Array.from(mem.slice(0x400,0x720)),Array.from(expected.collision.slice(0,800)),'collision room '+id);
 assert.deepStrictEqual(Array.from(colour.slice(0,800)),Array.from(expected.colour.slice(0,800)),'colour room '+id);count++;
}
assert.strictEqual(count,48);
for(let p=16;p<120;p++)for(let i=0;i<64;i++)assert(L.has[0xc000+p*64+i],'missing sprite data');
// the poses and rates the Graphics tab's cast is drawn with, against the bytes the game reads
const {CAST}=g.run('graphics.html','duckula-cast','CAST'),m=L.ram,at=a=>m[a],four=a=>Array.from(m.slice(a,a+4));
assert.deepStrictEqual(CAST.walkRight,four(0x3b5a).reverse(),'walking right');
assert.deepStrictEqual(CAST.walkLeft,four(0x3b56).reverse(),'walking left');
assert.deepStrictEqual(CAST.crowClimb,four(0x4b73),'crow climbing');
assert.deepStrictEqual([CAST.walkEvery,CAST.mummyEvery,CAST.crowEvery,CAST.batEvery,CAST.igorEvery,CAST.bobEvery],[at(0x3aee),at(0x49d4),at(0x4b5b),at(0x4eb1),at(0x5003),at(0x44aa)],'dividers');
assert.deepStrictEqual([CAST.mummyLeft,CAST.mummyRight],[at(0x4a3a),at(0x4a3b)],'mummy facing');
assert.deepStrictEqual([CAST.batLeft,CAST.batRight,CAST.crowDrop,CAST.igorLegs,CAST.rock,CAST.rockHalf,2*CAST.rockHalf],[at(0x4ec5),at(0x4ece),at(0x4b99),at(0x5011),at(0x4bc9),at(0x4c0e),at(0x4bf3)],'shapes');
console.log('ok - all 48 room renderers match native bitmap and three attribute planes; all 104 sprites present; the cast uses the game\'s poses and rates');
