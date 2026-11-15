'use strict';
const assert=require('assert'),{game}=require('../../../kit/scripts/port_check.js'),g=game(__dirname);g.lib('cpu6502');const {recharge}=g.run('index.html','recharge');
function memory(id){const m=new Uint8Array(65536);for(const part of ['resident','complex-7',...(id==='load-4'?['load-4']:[])]){const L=g.listing('parts/'+part+'/listing.json');for(let a=0;a<65536;a++)if(L.has[a])m[a]=L.ram[a];}return m;}
let cases=0;for(const final of [false,true])for(const room of [6,7])for(const character of [0,1]){const original=memory(final?'load-4':'complex-7');for(let energy=0;energy<=224;energy++){
 const m=new Uint8Array(original),cpu=new C64Cpu.CPU(m,{port:0x35});m[0x45]=character;m[0xe]=m[0xf]=40;m[0xe+character]=energy;m[0x3c]=room;m[0x80]=0;m[0x13b3]=0;cpu.call(final?0x9157:0x9159,{}, {maxSteps:100000});const r=recharge(energy,final&&room===7);assert.equal(m[0xe+character],r.energy);assert.equal(m[0x45]!==character,r.switched);assert.equal(!!m[0x80],r.exploded);cases++;
}}
console.log(cases+' recharge cases match original code, including both bodies and final-room exception');
