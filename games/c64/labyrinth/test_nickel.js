'use strict';
// The Discoveries tab's nickel outcomes against the Wise Man's own code on the kit's 6502: the gift
// with nothing owed ($901B, reaching $9023) and the dollar ($906E), for every value of $0575 and
// every debt from 0 to 3. The theater offer's port is checked by its rule, $0575 equal to 1, which
// test_change.js holds against $9485.
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=require('./layered.js')(game(__dirname));
g.sameBlock('labyrinth-dictionary');
const {labWiseGiftTaken,labWiseChange,labTheaterOffer}=g.run('discoveries.html','lab-nickel','labWiseGiftTaken','labWiseChange','labTheaterOffer');
const {ram}=g.listing('parts/scene-09/listing.json');
let cases=0;
const close=c=>{c.rts();};                       // wise_require_close: the player is beside him
for(let n=0;n<256;n++){
 // A gift with nothing owed: does $080F (remove the item) run?
 {const c=new CPU(Uint8Array.from(ram));c.m[0x575]=n;c.m[0x574]=0;let removed=false;
  c.call(0x901B,{},{hooks:{0x92CD:close,0x080F:c=>{removed=true;c.rts();},0x92E8:c=>{c.rts();}}});
  assert.equal(labWiseGiftTaken(n),removed,`gift, $0575=${n}`);cases++;}
 for(let d=0;d<4;d++){
  const c=new CPU(Uint8Array.from(ram));c.m[0x575]=n;c.m[0x574]=d;
  c.call(0x906E,{},{hooks:{0x92CD:close,0x080F:c=>{c.rts();},0x92E8:c=>{c.rts();}}});
  assert.equal(labWiseChange(n,d),c.m[0x8D3B],`dollar, $0575=${n}, debt ${d}`);cases++;
 }
 assert.equal(labTheaterOffer(n),n===1?'whole box':'handful');
}
console.log(`OK - ${cases} Wise Man payments match $901B and $906E for every value of $0575`);
