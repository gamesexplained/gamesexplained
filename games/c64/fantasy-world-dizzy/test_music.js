'use strict';
const assert=require('assert'),path=require('path'),vm=require('vm');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const CPU=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=game(__dirname),L=g.listing();
const {createDriver}=g.run('index.html','dizzyMusic','createDriver');
const factory=vm.runInNewContext('('+createDriver.toString()+')',{});
const data={music:Array.from(L.ram.slice(0xb00,0x1749)),foot:Array.from(L.ram.slice(0x2ab7,0x2af3))};
let compared=0;
for(let tune=0;tune<5;tune++){
 const d=factory(data,CPU);let writes=[];const m=new Uint8Array(L.ram),sid=new Uint8Array(25);
 const cpu=new CPU.CPU(m,{port:0x35,io:{read:()=>0,write:(a,v)=>{if(a>=0xd400&&a<=0xd418){sid[a-0xd400]=v;writes.push(a-0xd400,v)}}}});
 sid.fill(0);
 if(tune===4){m[0x2b48]=1;m[0x3c4]=1;m[0x3c8]=0;cpu.call(0x2ab7)}
 else {m[0xb00]=tune+1;cpu.call(0xb01)}
 d.init(tune);assert.deepEqual(Array.from(d.writes),writes);let audible=false,steps=0;
 for(let tick=1;tick<=2400;tick++){
  writes=[];if(tune<4&&(tick&7)!==7)cpu.call(0xb01);
  // the walk: the main loop calls the footstep routine once a pass, every six ticks here
  if(tune===4&&tick%6===0&&tick<44){m[0x3c4]++;cpu.call(0x2ab7);if(m[0x3c4]&1)steps++;}
  d.play();assert.deepEqual(Array.from(d.writes),writes);assert.deepEqual(Array.from(d.sid),Array.from(sid));compared++;
  if((sid[24]&15)&&[0,7,14].some(o=>(sid[o+4]&0xf1)>0x10&&(sid[o]|sid[o+1]<<8)))audible=true;
  if(tune===4&&!d.playing()){assert.equal(steps,3,'three more footsteps after the first');break;}
  if(tune<4&&!d.playing())break;
 }
 assert(audible,'silent sound '+tune);
}
// the sound player starts its list at the driver's third selection
for(let tune=0;tune<3;tune++){
 const a=factory(data,CPU),b=factory({...data,first:2},CPU);a.init(tune+2);b.init(tune);
 for(let tick=0;tick<120;tick++){assert.deepEqual(Array.from(b.writes),Array.from(a.writes));a.play();b.play();}
}
console.log('OK: five sound selections, the footstep walk and the sound player\'s offset; '+compared+' timer ticks agree, every SID write in order, worklet-isolated factory.');
