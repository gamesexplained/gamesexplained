'use strict';
// Holds the clock widgets on the How it works and Discoveries tabs to the game's own code, run on
// the committed listing in the kit's 6502:
// - igorGift and ankhGift against Igor's bonus ($BD43) and the ankh's ($41DA) for every time the
//   clock can show;
// - contactRun, the mummy walking through Duckula, against the clock divider ($57F7) and the
//   contact test ($BCC0), frame by frame: the clock and Duckula's three colours;
// - panelPixels against the game's own drawing of the clock digits ($5841).
const path=require('path'),assert=require('assert');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=game(__dirname),L=g.listing();
const {igorGift,ankhGift}=g.run('discoveries.html','duckula-gifts','igorGift','ankhGift');
const {contactRun}=g.run('index.html','duckula-contact','contactRun');
const {panelPixels,bitmapPixels}=g.run('index.html','duckula-drawing','panelPixels','bitmapPixels');
g.sameBlock('duckula-drawing');
const HOURS=0x587f,TENS=0x5881,UNITS=0x5882,DIVIDER=0x5800,FLASH=0xbccb,ANKH_USED=0x4208,IGOR_VISIT=0x4eff;

// a machine with a VIC whose sprite colour registers read back with the top four bits set, as the
// chip's do, and colour RAM
function machine(){
 const mem=L.ram.slice(),vic=new Uint8Array(64),colour=new Uint8Array(1024);
 const cpu=new CPU(mem,{port:0x35,io:{
  read(a){if(a>=0xd000&&a<0xd040){const r=a&0x3f;return r>=0x27&&r<=0x2e?vic[r]|0xf0:vic[r];}throw Error('unexpected read '+a.toString(16));},
  write(a,v){if(a>=0xd000&&a<0xd040)vic[a&0x3f]=v;else if(a>=0xd800&&a<0xdc00)colour[a-0xd800]=v&15;else throw Error('unexpected write '+a.toString(16));}}});
 return {mem,vic,colour,call:a=>cpu.call(a,{},{maxSteps:100000})};
}
const clockOf=mem=>[mem[HOURS],mem[TENS],mem[UNITS]];

// every time the clock can show
let n=0;
for(let h=0;h<10;h++)for(let t=0;t<6;t++)for(let u=0;u<10;u++){
 const M=machine();
 M.mem[HOURS]=h;M.mem[TENS]=t;M.mem[UNITS]=u;M.call(0xbd43);
 assert.deepStrictEqual(igorGift([h,t,u]),clockOf(M.mem),'Igor at '+h+':'+t+u);
 const A=machine();
 A.mem[HOURS]=h;A.mem[TENS]=t;A.mem[UNITS]=u;A.mem[ANKH_USED]=0;A.call(0x41da);
 assert.deepStrictEqual(ankhGift([h,t,u]),clockOf(A.mem),'ankh at '+h+':'+t+u);
 n++;
}
assert.strictEqual(n,600);
assert.deepStrictEqual(igorGift([9,3,6]),[9,0,6]);

// the mummy walking through Duckula, standing and walking
const cost={};
for(const walk of [false,true]){
 const M=machine(),run=contactRun(walk);
 M.mem[HOURS]=9;M.mem[TENS]=5;M.mem[UNITS]=9;M.mem[DIVIDER]=70;M.mem[FLASH]=0xff;M.mem[IGOR_VISIT]=0;
 M.vic[0x27]=7;M.vic[0x28]=7;M.vic[0x29]=5;
 for(let a=10;a<=20;a++){M.mem[0x2946+a]=0;M.mem[0x295e+a]=0;M.mem[0x2976+a]=0;}
 run.forEach((s,f)=>{
  M.vic[0]=s.px&255;M.vic[1]=s.py;M.vic[0x10]=s.px>255?1:0;
  for(const [a,y] of [[10,s.my],[11,s.my+21]]){M.mem[0x2946+a]=y;M.mem[0x295e+a]=s.mx&255;M.mem[0x2976+a]=s.mx>255?1:0;}
  M.call(0x57f7);M.call(0xbcc0);
  assert.deepStrictEqual(s.clock,clockOf(M.mem),(walk?'walking':'standing')+', frame '+f+': clock');
  assert.deepStrictEqual(s.colours,[M.vic[0x27]&15,M.vic[0x28]&15,M.vic[0x29]&15],(walk?'walking':'standing')+', frame '+f+': colours');
 });
 cost[walk]=run[run.length-1].hits;
}
assert.strictEqual(cost[false],9,'standing still costs nine minutes');
assert.strictEqual(cost[true],5,'walking into the mummy costs five');

// the clock digits in the panel, as the game draws them
for(const clock of [[9,5,9],[9,0,6],[0,0,0],[7,5,9],[1,2,3]]){
 const M=machine();
 M.mem.set(L.ram.slice(0x69c0,0x69c0+1600),0xf900);M.mem.set(L.ram.slice(0x6830,0x6830+200),0xc320);
 for(let i=0;i<200;i++)M.colour[0x320+i]=L.ram[0x68f8+i]&15;
 M.mem[HOURS]=clock[0];M.mem[HOURS+1]=0x20;M.mem[TENS]=clock[1];M.mem[UNITS]=clock[2];M.call(0x5841);
 const game=bitmapPixels(M.mem.slice(0xf900,0xf900+1600),M.mem.slice(0xc320,0xc320+200),M.colour.slice(0x320,0x320+200),0,40);
 assert.deepStrictEqual(Array.from(panelPixels(L.ram,clock)),Array.from(game),'panel at '+clock.join(''));
}
console.log('ok - Igor and the ankh match the game for all 600 clock times; the mummy costs 9 and 5 minutes frame for frame; the panel digits match');
