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
console.log('ok - all 48 room renderers match native bitmap and three attribute planes; all 104 sprites present');
