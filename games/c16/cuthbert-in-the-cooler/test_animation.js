'use strict';
const assert=require('assert/strict'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=game(__dirname),L=g.listing();
globalThis.CoolerData=g.run('reference/cooler-data.js','CoolerData').CoolerData;
const {Cooler}=g.run('reference/cooler.js','Cooler');

// Derive how long each fire image remains from the original bomb state machine.
const m=new Uint8Array(L.ram),cpu=new CPU(m,{ramSize:0x4000});
m[0x7b]=3;m[0x15]=0;m[0x1c]=0;m[0x1d]=0xe;m[0x7d]=0;
const phases=[];
for(let update=0;update<30;update++) {
  cpu.call(0x1a6a);
  if(m[0x7e]>=2)phases.push(m[0x7e]);
  if(update>0&&!m[0x7d])break;
}
assert.equal(m[0x7d],0,'the original explosion completes');
const durations=[2,3,4,5].map(phase=>phases.filter(n=>n===phase).length);
assert.deepEqual(Array.from(Cooler.explosionFrameUpdates),durations);

// The actual page helper keeps display-frame remainders at several refresh rates.
function run(times,delays,start=0) {
  let frame=start,elapsed=0,advances=0,last=0;
  for(const t of times) {
    const r=Cooler.advanceAnimation(frame,elapsed,t-last,delays);
    ({frame,elapsed}=r);advances+=r.advances;last=t;
  }
  return {frame,elapsed,advances};
}
for(const hz of [30,60,120,144]) {
  const times=Array.from({length:hz*10},(_,i)=>(i+1)*1000/hz);
  const r=run(times,[55,55,55,55]);
  assert.equal(r.advances,181,`${hz} Hz retains the 55 ms walking pace`);
  assert.equal(r.frame,1);assert(Math.abs(r.elapsed-45)<1e-6);
}
const irregular=[8,41,98,201,222,503,800,1000,5500,10000];
assert.equal(run(irregular,[55,55,55,55]).advances,181);
const fireDelays=durations.map(n=>n*55);
for(const [time,frame] of [[164,0],[165,1],[329,1],[330,2],[494,2],[495,3],[549,3],[550,0]]) {
  assert.equal(run([time],fireDelays).frame,frame,`fire frame at ${time} ms`);
}
for(let start=0;start<4;start++) {
  const r=run([5500],fireDelays,start);
  assert.equal(r.frame,start);assert.equal(r.advances,40);
}
console.log('OK — original fire-frame durations, 30/60/120/144 Hz pacing, irregular frames, and all explosion boundaries');
