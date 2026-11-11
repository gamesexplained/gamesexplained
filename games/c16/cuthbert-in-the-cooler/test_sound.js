#!/usr/bin/env node
'use strict';
// Regenerate the sound player's excerpts from original game code on the kit's C16 machine.
// Input changes land at poll_inputs, not at a host-clock time. --write updates the data asset.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'../../..');
const {Machine,loadListing}=require(path.join(ROOT,'kit/c16/machine.js'));
require(path.join(ROOT,'site/lib/ted-sound.js'));
const ROUTES=[
  {name:'Walking',keys:Array.from({length:20},(_,i)=>i<10?['C=']:[':'])},
  {name:'Bomb and detonation',keys:[['SPACE'],...Array(6).fill(['C=']),['SPACE'],...Array(13).fill([])]},
  {name:'Held fire at the exit',keys:Array(20).fill(['SPACE']),gameOver:true}
];
function run(route) {
  let polls=0,start=null,done=false;
  const deaths=[], m=new Machine({ram:loadListing(path.join(__dirname,'listing.json')),pc:0x1100,passAt:0x1172});
  m.onPass=()=>{if(start===null){start=m.tick;m.soundLog=[];}};
  m.hooks[0x1339]=()=>{
    if(polls>=route.keys.length){done=true;return true;}
    m.releaseAll();for(const key of route.keys[polls])m.press(key);polls++;
  };
  m.hooks[0x19f8]=()=>{deaths.push({poll:polls,life_before:m.ram[0x1a26]});};
  m.hooks[0x118d]=()=>{done=true;return true;};
  m.runFrames(2000);
  assert(done,`route ${route.name} did not reach its boundary`);
  assert(start!==null);
  const log={clock:1773447,frame:35568,start:0,end:m.tick-start,
    writes:m.soundLog.map(([tick,r,v])=>[tick-start,0xff00+r,v])};
  const samples=TEDSound.render(log,22050);
  assert(samples.some(x=>Math.abs(x)>0.01),`${route.name} renders silence`);
  if(route.gameOver) {
    const original=JSON.parse(fs.readFileSync(path.join(__dirname,'reference/bomb-route.json'),'utf8'));
    assert.deepEqual(deaths,original.deaths,'held-fire route milestones agree with plus4emu');
    assert.equal(polls,original.polls);assert.equal(m.ram[0x1a26],original.last_life_byte);
    assert.equal(m.ram[0x7b],original.bombs_left);
  }
  return {name:route.name,log};
}
const sounds=ROUTES.map(run),out='// Original TED writes regenerated from the committed listing and input-poll routes.\nconst CoolerSounds = '+JSON.stringify(sounds)+';\nif(typeof module!=="undefined")module.exports=CoolerSounds;\n';
const file=path.join(__dirname,'reference/sound-data.js');
if(process.argv.includes('--write'))fs.writeFileSync(file,out);
else assert.equal(fs.readFileSync(file,'utf8'),out,'sound player data matches the original-code replay');
console.log(`OK — ${sounds.length} audible original-code excerpts; held-fire milestones match plus4emu`);
