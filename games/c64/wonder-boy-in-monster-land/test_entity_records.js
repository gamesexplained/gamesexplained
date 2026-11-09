'use strict';
// Check each ten-byte entity record against the resident copy routine.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { CPU } = require('../../../kit/cpu/cpu6502.js');
const parts = path.join(__dirname, 'parts');
function load(mem, file) { for (const r of JSON.parse(fs.readFileSync(file)).records) if (r.b) mem.set(r.b, r.a); }
const base = new Uint8Array(65536); load(base, path.join(parts, 'resident/listing.json'));
const arrays = [0x1919,0x19e5,0x193b,0x194c,0x197f,0x1990,0x19f6,0x1a18,0x192a,0x1a6d];
let total = 0;
for (let number = 2; number <= 31; number++) {
  const dir = path.join(parts, `stage-${String(number).padStart(2, '0')}`), mem = base.slice();
  load(mem, path.join(dir, 'listing.json'));
  const symbols = JSON.parse(fs.readFileSync(path.join(dir, 'symbols.json')));
  const end = parseInt(JSON.parse(fs.readFileSync(path.join(dir, 'part.json'))).ranges[0][1].slice(1), 16);
  const pointer = mem[0x7f4f] | mem[0x7f50] << 8, limit = mem[0x7f51];
  let count = 0;
  while (pointer + count * 10 <= end && mem[pointer + count * 10] !== 0 && count < 25) {
    const address = pointer + count * 10, bytes = [...mem.slice(address, address + 10)];
    const block = symbols.blocks.find(b => b.start === address);
    assert(block && block.type === 'Byte' && block.end === address + 9, `load ${number}, record ${count + 1}: block`);
    const comment = symbols.comments.find(c => c.address === address && c.type === 'line');
    const x = (bytes[2] << 8 | bytes[3]).toString(16).toUpperCase().padStart(4, '0');
    const y = (bytes[4] << 8 | bytes[5]).toString(16).toUpperCase().padStart(4, '0');
    const hex = v => v.toString(16).toUpperCase().padStart(2, '0');
    const when = count < limit ? 'within the initial slot limit' : 'beyond the initial slot limit';
    assert(comment && comment.text.includes(`Entity record ${count + 1} (${when})`), `load ${number}, record ${count + 1}: slot limit`);
    assert(comment.text.includes(`type byte $${hex(bytes[0])}`) && comment.text.includes(`$${hex(bytes[1])} is copied to the base-sprite array`), `load ${number}, record ${count + 1}: type and base`);
    assert(comment.text.includes(`world-X arrays $193B/$194C receive $${x}`) && comment.text.includes(`world-Y arrays $197F/$1990 receive $${y}`), `load ${number}, record ${count + 1}: coordinates`);
    assert(comment.text.includes(`remaining bytes $${hex(bytes[6])}, $${hex(bytes[7])}, $${hex(bytes[8])} and $${hex(bytes[9])}`), `load ${number}, record ${count + 1}: remaining fields`);
    const run = mem.slice(); run[0xe2] = pointer & 255; run[0xe3] = pointer >> 8;
    const cpu = new CPU(run); cpu.call(0x369e, {x: 1, y: count * 10});
    assert.deepEqual(arrays.map(a => run[a + 1]), bytes, `load ${number}, record ${count + 1}: copy`);
    assert.equal(cpu.y, (count + 1) * 10); count++; total++;
  }
  assert(count >= limit && count < 25, `load ${number}: record bounds`);
  const sentinel = pointer + count * 10;
  assert.equal(mem[sentinel], 0, `load ${number}: zero terminator`);
  const endBlock = symbols.blocks.find(b => b.start === sentinel);
  assert(endBlock && endBlock.type === 'Byte' && endBlock.end === sentinel, `load ${number}: terminator block`);
}
console.log(`OK - ${total} entity records match the copy routine and their descriptions`);
