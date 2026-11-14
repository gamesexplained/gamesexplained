'use strict';
const assert=require('assert'),vm=require('vm'),{game}=require('../../../kit/scripts/port_check.js'),g=game(__dirname);g.lib('cpu6502');
const page=g.read('index.html'),data=JSON.parse(page.match(/id="hf-sound-data">([\s\S]*?)<\/script>/)[1]);
const block=g.block('index.html','createHammerfistSound').text;
const context=vm.createContext({});vm.runInContext(block+';globalThis.factory=createHammerfistSound;',context);const factory=context.factory;
function memory(id){const m=new Uint8Array(65536);for(const part of ['resident','complex-7',...(id==='load-4'?['load-4']:[])]){const L=g.listing('parts/'+part+'/listing.json');for(let a=0;a<65536;a++)if(L.has[a])m[a]=L.ram[a];}return m;}
for(const module of data.modules){if(module.name==='loading')continue;const m=memory(module.name==='final'?'load-4':'complex-7');for(const [a,bs]of module.blocks)assert.deepStrictEqual(Array.from(m.slice(a,a+bs.length)),bs);}
const original=memory('complex-7');for(const [a,bs]of data.effects.blocks)assert.deepStrictEqual(Array.from(original.slice(a,a+bs.length)),bs);
let frames=0;
for(const kind of ['music','effects'])for(let index=0;index<(kind==='music'?data.tunes.length:18);index++){
 const d={...data,kind},driver=factory(d,C64Cpu),ram=new Uint8Array(65536),writes=[];
 const cpu=new C64Cpu.CPU(ram,{port:0x35,io:{write:(a,v)=>writes.push(a-0xd400,v),read:a=>{throw Error('Unexpected SID read '+a);}}});
 let entry,module;
 if(kind==='music'){const tune=data.tunes[index];module=data.modules.find(m=>m.name===tune.module);for(const [a,bs]of module.blocks)ram.set(bs,a);ram[module.request]=tune.number;entry=module.entry;cpu.call(entry);}
 else{for(const [a,bs]of data.effects.blocks)ram.set(bs,a);ram[0x13b3]=0x80;cpu.call(0xfc2f);cpu.call(0xfc35);cpu.call(0x32da,{a:index,x:0});entry=0xfc32;}
 driver.init(index);assert.deepStrictEqual(Array.from(driver.writes),writes,'initial request '+kind+index);let gates=0;
 for(let f=0;f<600;f++){writes.length=0;if(driver.playing())cpu.call(entry,{}, {maxSteps:200000});driver.play();assert.deepStrictEqual(Array.from(driver.writes),writes,kind+' '+index+' frame '+f);for(let v=0;v<3;v++)if((driver.sid[v*7+4]&1)&&(driver.sid[v*7]|driver.sid[v*7+1]))gates++;frames++;}
 assert.equal(!!gates,kind==='music'||index!==17,kind+' '+index+' gated activity');driver.stop();assert(!driver.playing());
}
console.log('12 music selections and 18 effects: '+frames+' frame calls, every SID write matched; effect17 silent');
