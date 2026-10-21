#!/usr/bin/env node
// Hold index.html's code sheet against the game's own code. The page's code_sheet block
// (pageNumbers) works out the twenty numbers of a page of the manual; this runs the menu's own
// arithmetic, choose_question from $9F2F (after the page and line are mixed), on the simulator
// over the committed listing, for all 16 pages and 20 lines, and compares the number it leaves in
// code_expected; then the first five numbers of the manual's last table (its page 18), read by eye.
//   node games/c64/lemmings/test_code_sheet.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { pageNumbers } = g.run('index.html', 'code_sheet', 'pageNumbers');
const L = g.listing('parts/menu/listing.json');
const page = L.sym('question_page'), line = L.sym('question_line');
const lo = L.sym('code_expected'), hi = L.sym('code_expected_hi');
const first = L.sym('page_first_lo'), firstHi = L.sym('page_first_hi');
let bad = 0, n = 0;
for (let p = 0; p < 16; p++) {
  const nums = pageNumbers(L.ram[first + p] | L.ram[firstHi + p] << 8);
  for (let l = 0; l < 20; l++) {
    const m = Uint8Array.from(L.ram);
    m[page] = p; m[line] = l;
    new CPU(m).call(0x9F2F);
    const want = m[lo] | m[hi] << 8;
    n++;
    if (want !== nums[l]) { if (bad++ < 10) console.log(`DIFFERS page ${p + 1} line ${l + 1}: game ${want}, page ${nums[l]}`); }
  }
}
// the manual's sixteenth table, on its page 18 (the lemming on stilts): its first five numbers
const manual = [37349, 3689, 26860, 50031, 16371];
manual.forEach((v, i) => { if (pageNumbers(L.ram[first + 15] | L.ram[firstHi + 15] << 8)[i] !== v) { bad++; console.log('DIFFERS from the manual at line', i + 1); } });
if (bad) { console.log(`FAILED: ${bad} of ${n} differ`); process.exit(1); }
console.log(`OK - all ${n} numbers match the game's own arithmetic`);
