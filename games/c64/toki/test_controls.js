'use strict';
// Compare every displayed flat-ground aim with the original branch in player_fire.
const fs=require('fs'), vm=require('vm'), assert=require('assert'), path=require('path');
const root=path.resolve(__dirname,'../../..');
const C=require(path.join(root,'kit/cpu/cpu6502.js'));
const page=fs.readFileSync(root+'/games/c64/toki/controls.html','utf8');
const scripts=[...page.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const script=scripts.find(s=>s.includes("let selected='idle'"));
assert(script,'aiming script found');
const directions={ul:10,u:14,ur:6,l:11,idle:15,r:7,dl:9,d:13,dr:5};
const buttons=Object.keys(directions).map(key=>({dataset:{aim:key},attrs:{},setAttribute(n,v){this.attrs[n]=String(v)}}));
const facing={value:'right'},result={textContent:''};
const document={getElementById(id){return id==='facing'?facing:result},querySelectorAll(){return buttons}};
vm.runInNewContext(script,{document});
const ram=new Uint8Array(65536);
for(const rec of JSON.parse(fs.readFileSync(root+'/games/c64/toki/listing.json')).records)ram.set(rec.b||[],rec.a);
const names={0:'straight up',9:'straight up',1:'diagonally up-right',2:'to the right',7:'to the left',8:'diagonally up-left'};
let cases=0;
for(const side of ['right','left'])for(const button of buttons){
 facing.value=side;facing.onchange();button.onclick();
 const mem=ram.slice();mem[8]=directions[button.dataset.aim];mem[24]=side==='left'?8:0;
 const cpu=new C.CPU(mem);cpu.pc=0xaf79;cpu.run({until:0xafca,maxSteps:100});
 const expected=names[mem[0x297]];
 assert(expected,'known aim index '+mem[0x297]);
 assert(result.textContent.startsWith('Shot '+expected),`${side} ${button.dataset.aim}: ${result.textContent} versus ${expected}`);
 assert.equal(buttons.filter(b=>b.attrs['aria-pressed']==='true').length,1);
 assert.equal(button.attrs['aria-pressed'],'true');cases++;
}
console.log(`PASS: ${cases} aiming cases match the original flat-ground branch at $AF79-$AFC9`);
