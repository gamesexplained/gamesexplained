// Test of site/lib/listing-reads.js, the check a page opened with ?listing-reads makes on the
// listing pieces it carries: C64.load, BBC.load and Spectrum.load hand the page the whole listing
// behind an embedded one, and every byte or label the page reads that the pieces leave out is
// reported, through copies of the image too (new Uint8Array(image), Uint8Array.from and an
// emulator's 64 KB memory among them), while bytes the page wrote first, and pages opened
// without the flag, are left alone.
//   node kit/scripts/test_listing_reads.js
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const LIB = path.join(ROOT, 'site', 'lib');

const whole = { records: [{ a: 0x1000, t: 'data', l: 'tune', b: [1, 2, 3] }, { a: 0x2000, t: 'data', l: 'pic', b: Array.from({ length: 64 }, (_, i) => i + 4) }] };
const pieces = { records: [whole.records[0]] };
const fetched = [];
globalThis.fetch = async (u) => { fetched.push(u); return { ok: true, json: async () => whole }; };
const tag = (url, body) => ({ getAttribute: k => k === 'data-listing' ? url : null, textContent: JSON.stringify(body) });
const errors = [], RealU8 = Uint8Array;
console.error = (m) => errors.push(String(m));
function page(search) {
  globalThis.location = { search };
  globalThis.document = {
    currentScript: { src: 'https://example.org/lib/c64.js?v=1' },
    querySelectorAll: () => [tag('one/listing.json', pieces), tag('all/listing.json', whole)],
  };
  for (const lib of ['c64.js', 'bbc.js', 'spectrum.js']) delete require.cache[require.resolve(path.join(LIB, lib))];
  for (const lib of ['listing-reads.js', 'c64.js', 'bbc.js', 'spectrum.js']) require(path.join(LIB, lib));
}

let failed = 0;
const check = (ok, what) => { if (!ok) { failed++; console.log('FAIL ' + what); } };
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  page('?listing-reads');
  for (const [name, M] of [['C64', C64], ['BBC', BBC], ['Spectrum', Spectrum]]) {
    const G = await M.load('one/listing.json');
    check(G.ram[0x1001] === 2 && G.ram[0x2001] === 5, `${name}.load with ?listing-reads: the page gets the whole listing's bytes`);
    G.ram[0x2000] = 9;
    check(G.ram[0x2000] === 9, `${name}.load: a byte the page writes reads back`);
    const copy = G.ram.slice(0x2010, 0x2014);
    check(copy[1] === 21 && copy.length === 4, `${name}.load: a copy of the image holds its bytes`);
    const all = new Uint8Array(G.ram);
    check(all[0x201F] === 35 && all.length === 0x10000 && all instanceof Uint8Array && new Uint8Array(2) instanceof Uint8Array,
          `${name}.load: a whole copy of the image holds its bytes, and Uint8Array works as before`);
    const mem = new Uint8Array(0x10000);
    mem.set(G.ram); mem[0x2031] = 1;
    check(mem[0x2030] === 52 && mem[0x2031] === 1, `${name}.load: an emulator's memory holds the image's bytes`);
    check(Uint8Array.from(G.ram)[0x203F] === 67, `${name}.load: Uint8Array.from copies the image`);
    G.sym('pic'); G.byName.get('tune');
  }
  await wait(400);
  const R = ListingReads.report()['one/listing.json'];
  check(JSON.stringify([R.ranges, R.labels]) === JSON.stringify([['$2001-$2001', '$2011-$2011', '$201F-$201F', '$2030-$2030', '$203F-$203F'], ['pic']]),
        'the report names the bytes and labels read that the pieces leave out, and no others: ' + JSON.stringify(R));
  check(R.where['$2001-$2001'].some(w => w.includes('test_listing_reads.js')), 'the report names the line that read each range: ' + JSON.stringify(R.where));
  check(errors.some(e => e.includes('one/listing.json') && e.includes('$2001-$2001') && e.includes('pic')),
        'the console carries the error, with the pieces to add');

  const A = await C64.load('all/listing.json');
  check(A.ram[0x2001] === 5, 'pieces that carry the whole listing are handed over');
  check(JSON.stringify(ListingReads.report()['all/listing.json']) === JSON.stringify({ ranges: [], labels: [], where: {} }),
        'pieces that carry the whole listing report nothing');

  fetched.length = 0;
  globalThis.Uint8Array = RealU8;   // a page opened without the flag never wraps it
  page('');
  const P = await C64.load('one/listing.json');
  check(fetched.length === 0 && P.ram[0x2001] === 0 && ArrayBuffer.isView(P.ram),
        'without ?listing-reads the page gets its pieces alone and fetches nothing');

  console.log(failed ? `${failed} failed` : 'listing-reads: a page reading bytes or labels its pieces leave out is reported: ok');
  process.exit(failed ? 1 : 0);
})();
