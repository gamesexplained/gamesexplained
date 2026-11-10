'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const {CPU}=require('../../../kit/cpu/cpu6502.js');
const html=fs.readFileSync(path.join(__dirname,'discoveries.html'),'utf8');
const match=html.match(/\/\* GAUNTLET_BEGIN \*\/([\s\S]*?)\/\* GAUNTLET_END \*\//);assert(match);
const context={};vm.runInNewContext(match[1],context);
const base=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/resident/listing.json'))).records)if(r.b)base.set(r.b,r.a);
for(let tier=1;tier<=5;tier++){
 const m=base.slice();m[0x4dbd]=0;m[0x4ddb]=tier;m[0x49]=50;m[0x4a]=0x6e;m[0x4dae]=100;m[0x1177]=0;m[0x4de2]=0;
 m.set([0x38,0x60],0x75e3);m[0x7a91]=0x60;new CPU(m).call(0x76e9,{x:2},{maxSteps:1000});
 for(let contact=1;contact<=11;contact++){
  m[0x5285]=1;m[0x1a6f]=100;new CPU(m).call(0x7430,{x:2},{maxSteps:1000});
  assert.equal(context.gauntletDamage(tier,contact),100-m[0x1a6f],`tier ${tier}, contact ${contact}`);
 }
}
console.log('OK - Discoveries Gauntlet widget matches 55 game-code contacts');
