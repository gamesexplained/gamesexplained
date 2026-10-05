// Test of C64.load in site/lib/c64.js: a page whose widgets load one listing several times
// fetches and parses it once, and each load still gets memory of its own.
//   node kit/c64/test_c64_load.js
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
let fetches = 0, fail = false;
globalThis.fetch = async (u) => {
  fetches++;
  if (fail) throw new Error('offline');
  return { json: async () => ({ records: [{ a: 0x1000, l: 'start', b: [1, 2, 3] }, { a: 0x2000, t: 'gap' }] }) };
};
require(path.join(ROOT, 'site/lib/c64.js'));

let failed = 0;
const check = (ok, what) => { if (!ok) { failed++; console.log('FAIL ' + what); } };

(async () => {
  const [a, b] = await Promise.all([C64.load('x/listing.json'), C64.load('x/listing.json')]);
  check(fetches === 1, `two loads of one listing fetched it ${fetches} times`);
  check(a.ram[0x1001] === 2 && b.ram[0x1001] === 2 && a.has[0x1002] && !a.has[0x2000], 'the bytes of the listing');
  a.ram[0x1001] = 99;
  check(b.ram[0x1001] === 2, 'a change to one load\'s memory reached the other');
  check(a.sym('start') === 0x1000 && b.names.get(0x1000) === 'start', 'the names of the listing');
  await C64.load('y/listing.json');
  check(fetches === 2, 'a second listing was not fetched');
  fail = true;
  let threw = false;
  try { await C64.load('z/listing.json'); } catch (e) { threw = true; }
  check(threw, 'a failed fetch did not reach the caller');
  fail = false;
  const z = await C64.load('z/listing.json').catch(() => null);
  check(z && z.ram[0x1000] === 1, 'a failed fetch was kept, so the next load failed too');
  console.log(failed ? `${failed} failed` : 'C64.load: one fetch a listing, memory of its own each load: ok');
  process.exit(failed ? 1 : 0);
})();
