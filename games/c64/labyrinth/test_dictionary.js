'use strict';
// Compare the page's expansion with the original parser and dictionary in the listing.
const assert=require('assert');
const path=require('path');
const root=path.resolve(__dirname,'../../..');
const {game}=require(path.join(root,'kit/scripts/port_check.js'));
const {CPU}=require(path.join(root,'kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname));
const {labyrinthWords,expandLabyrinthWord,labyrinthPassages,splitLabyrinthPassage}=g.run('levels.html','labyrinth-dictionary','labyrinthWords','expandLabyrinthWord','labyrinthPassages','splitLabyrinthPassage');
const {ram,has}=require('./opening_image.js')(g);
for(const [a,b] of [[0x67b5,0x67fd],[0x68d4,0x691d],[0xd800,0xdcd5]]) {
 for(let i=a;i<=b;i++)assert(has[i],`missing source byte $${i.toString(16)}`);
}
assert.equal(labyrinthWords.length,256);
let cases=0;
for(let index=0;index<256;index++) {
 const pointer=ram[0xd900+index]+256*ram[0xd800+index];
 let stored='';
 for(let a=pointer;ram[a];a++) {assert(has[a]);stored+=String.fromCharCode(ram[a]);}
 assert.equal(labyrinthWords[index],stored,`dictionary entry ${index}`);
 for(const token of [0xfb,0xfc,0xfd,0xfe]) {
  const memory=Uint8Array.from(ram);
  memory.set([token,index,0],0x0400);memory[0x10]=0;memory[0x11]=4;
  let actual='';
  const cpu=new CPU(memory,{port:{dir:0x2f,data:0x25}});
  cpu.call(0x67b5,{d:0},{hooks:{
   0x6891:c=>{actual+=String.fromCharCode(c.a);c.rts();},
   0x6866:c=>c.rts()
  },maxSteps:10000});
  assert.equal(expandLabyrinthWord(index,token),actual,`entry ${index}, token ${token}`);
  cases++;
 }
}
console.log(`OK - page dictionary expansion matches the original parser in ${cases} cases`);

let passageCases=0;
for(const passage of labyrinthPassages) {
 for(let i=0;i<passage.bytes.length;i++) {
  assert(has[passage.address+i]);
  assert.equal(passage.bytes[i],ram[passage.address+i],`passage byte ${i}`);
 }
 const pieces=splitLabyrinthPassage(passage.bytes);
 assert.equal(pieces.at(-1).kind,'end');
 for(let count=0;count<=pieces.length;count++) {
  const prefix=pieces.slice(0,count).flatMap(p=>p.bytes);
  if(prefix.at(-1)!==0)prefix.push(0);
  const memory=Uint8Array.from(ram);
  memory.set(prefix,0x0400);memory[0x10]=0;memory[0x11]=4;
  let actual='';
  const cpu=new CPU(memory,{port:{dir:0x2f,data:0x25}});
  cpu.call(0x67b5,{d:0},{hooks:{
   0x6891:c=>{actual+=String.fromCharCode(c.a);c.rts();},
   0x67c4:c=>{actual+='\n';},
   0x6866:c=>c.rts()
  },maxSteps:10000});
  assert.equal(pieces.slice(0,count).map(p=>p.text).join(''),actual,`${passage.title}, step ${count}`);
  passageCases++;
 }
}
console.log(`OK - ${labyrinthPassages.length} stored passages match the listing and parser at all ${passageCases} displayed prefixes`);
