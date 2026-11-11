'use strict';
// Replay the published joystick recording through the original game on the
// kit's timed C16. The recording also replayed in plus4emu from a fresh PRG
// boot. No original program file, ROM, or snapshot is needed by this test.
const fs=require('fs'),path=require('path'),assert=require('assert');
const {Machine,loadListing}=require(path.resolve(__dirname,'../../../kit/c16/machine.js'));

function replay(route,{makePositions=false}={}){
 assert.equal(route.schema,1);assert.equal(route.platform,'c16');
 assert.deepStrictEqual(route.start.bootRam,[[44,16],[45,214],[46,40]]);
 assert.equal(route.start.pc,0x2000);assert.equal(route.start.pollAt,0x2704);
 const inputs=[];
 for(const [count,mask] of route.runs){
  assert(Number.isInteger(count)&&count>0);assert([0,4,8,16,20,24].includes(mask));
  for(let i=0;i<count;i++)inputs.push(mask);
 }
 assert.equal(inputs.length,route.polls);
 const ram=loadListing(path.join(__dirname,'listing.json'));
 assert(ram.slice(0,0x800).every(v=>v===0),'runtime RAM begins clear');
 // These three bytes are left by the supplied PRG's cold BASIC/loader route.
 // The game reads them as its random seed before writing them ($27E0).
 // The emulator replay verified them; all other runtime RAM starts clear.
 for(const [a,v] of route.start.bootRam)ram[a]=v;
 const m=new Machine({ram,pc:route.start.pc,passAt:route.start.pollAt});
 // 318004-05 KERNAL $FCC3-$FCC8: PLA/TAY/PLA/TAX/PLA/RTI, 22 cycles.
 // The game jumps directly here; the kit supplies the IRQ's entry path.
 m.hooks[0xfcc3]=c=>{c.y=c.pull();c.x=c.pull();c.a=c.pull();c.rti();m.spend(22);};
 const vec=()=>[ram[2],ram[0x2f],ram[0x30],ram[0x24]|ram[0x25]<<8,
  ram[0x27],ram[0x28],ram[0x29],ram[0x2a],ram[0x3f],
  ...ram.slice(0x2c,0x2f),...ram.slice(0xc07,0xc0c)];
 const checkpoints=new Map(route.checkpoints.map(c=>[c.poll,c.values]));
 const milestones=new Map();for(const x of route.milestones){
  if(!milestones.has(x.poll))milestones.set(x.poll,[]);milestones.get(x.poll).push(x);
 }
 const seen=new Set(),positions=[],finishes=[],crashes=[];
 let previousState=-1,lastPtr=null,wraps=0;
 m.onPass=q=>{
  const poll=q.passes-1,current=vec();
  if(checkpoints.has(poll)){
   assert.deepStrictEqual(current,checkpoints.get(poll),`emulator checkpoint ${poll}`);seen.add(poll);
  }
  if(milestones.has(poll))for(const x of milestones.get(poll))assert.deepStrictEqual(current,x.values,x.label);
  if(poll%10===0||poll===route.polls)positions.push([poll,ram[0x2f],current[3],ram[0x27]]);
  if(ram[2]===3&&previousState!==3)finishes.push([ram[0x2f],poll]);
  if(ram[2]===5&&previousState!==5)crashes.push([ram[0x2f],poll]);
  if(lastPtr!==null&&lastPtr>0x3f00&&current[3]<lastPtr)wraps++;
  assert(ram[2]!==6,'recording must not enter game over');
  if(poll>0)assert(ram[2]!==0,'recording must remain in the same game');
  previousState=ram[2];lastPtr=current[3];
  if(poll===route.polls)return true;
  q.joy1=31^inputs[poll];
 };
 m.runPasses(route.polls+1);
 assert.equal(seen.size,checkpoints.size,'every checkpoint reached');
 assert.deepStrictEqual(finishes.map(x=>x[0]),Array.from({length:16},(_,i)=>i));
 assert.equal(crashes.length,5);assert.equal(wraps,1);
 assert.equal(ram[0x2f],16);assert.equal(ram[2],2);assert.equal(ram[0x30],5);assert.equal(ram[0x2a],249);
 assert.equal(m.romReads,0,'the game requires no omitted ROM data');
 if(!makePositions)assert.deepStrictEqual(positions,route.positions,'published trajectory regenerates');
 return {positions,finishes,crashes,wraps,frames:m.frames};
}
module.exports={replay};
if(require.main===module){
 const route=JSON.parse(fs.readFileSync(path.join(__dirname,'reference/ending-route.json')));
 const r=replay(route);
 console.log(`PASS Kikstart route: ${route.polls} polls, 16 finishes, ${r.crashes.length} recoveries, ${r.wraps} wrap, next-lap controls, ${route.checkpoints.length} checkpoints`);
}
