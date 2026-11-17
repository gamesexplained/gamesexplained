'use strict';
const path = require('node:path'), assert = require('node:assert/strict');
const {game} = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname), {SCENES,mapCell} = g.run('levels.html', 'ddMap', 'SCENES', 'mapCell');
const {CPU} = require(path.resolve(__dirname, '../../../kit/cpu/cpu6502.js'));
const shared = g.listing('parts/resident/listing.json');
let cells = 0;
for (let i=0; i<SCENES.length; i++) {
  const {ram,has} = g.listing(`parts/l${i}/listing.json`);
  const [base,c1,c2] = SCENES[i], m = shared.ram.slice();
  const entry = 0x5fd3 + 2*i;
  assert.equal(base, m[entry] + 256*m[entry+1], 'map start in native table');
  assert.deepEqual([c1,c2],[m[0x5fc7+i],m[0x5fcd+i]], 'colours in native tables');
  for (let a=0; a<ram.length; a++) if (has[a]) m[a] = ram[a];
  for (const x of [0,1,40,80,140,200]) {
    const c = new CPU(m.slice(),{port:0x35});
    for (const [a,v] of [[4,base+x],[6,0xc000],[8,0x8200]]) {
      c.m[a]=v&255;
      c.m[a+1]=v>>8;
    }
    c.call(0x6049);
    for (let y=0; y<24; y++) for (let col=0; col<40; col++) {
      const k=y*40+col, a=base+x+y*240+col;
      assert.equal(has[a],1,'map cell is present in the listing');
      assert.equal(has[0x8e00+ram[a]],1,'colour is present in the listing');
      const cell=mapCell(m,base+x,col,y);
      assert.equal(cell.code,c.m[0xc000+k]);
      assert.equal(cell.colour,c.m[0x8200+k]&15);
      cells++;
    }
  }
}
console.log(`PASS: ${cells} map and colour cells match the native renderer`);
