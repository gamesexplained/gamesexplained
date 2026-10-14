// Test of C64.load, BBC.load and Spectrum.load in site/lib/: a listing the build embedded in the
// page, in <script type="application/json" data-listing="url">, is read from the page and never
// fetched; a tag the build has not filled in, still the list of pieces, is passed over and the
// listing fetched, as is a listing the page does not carry.
//   node kit/scripts/test_embedded_listing.js
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const fetched = [];
globalThis.fetch = async (u) => {
  fetched.push(u);
  return { json: async () => ({ records: [{ a: 0x2000, l: 'fetched', b: [9] }] }) };
};
const tag = (url, body) => ({ getAttribute: k => k === 'data-listing' ? url : null, textContent: JSON.stringify(body) });
globalThis.document = {
  querySelectorAll: () => [
    tag('parts/one/listing.json', { schema: 1, records: [{ a: 0x1000, t: 'data', l: 'tune', b: [1, 2, 3] }] }),
    tag('parts/two/listing.json', ['tune']),
  ],
};
for (const lib of ['c64.js', 'bbc.js', 'spectrum.js']) require(path.join(ROOT, 'site', 'lib', lib));

let failed = 0;
const check = (ok, what) => { if (!ok) { failed++; console.log('FAIL ' + what); } };

(async () => {
  for (const [name, M] of [['C64', C64], ['BBC', BBC], ['Spectrum', Spectrum]]) {
    fetched.length = 0;
    const one = await M.load('parts/one/listing.json');
    check(fetched.length === 0, `${name}.load fetched a listing the page carries`);
    check(one.ram[0x1002] === 3 && one.has[0x1000] && !one.has[0x1003] && one.sym('tune') === 0x1000,
          `${name}.load: the embedded listing's bytes and names`);
    const two = await M.load('parts/two/listing.json');
    check(fetched.join() === 'parts/two/listing.json', `${name}.load did not fetch a listing whose tag is unbuilt`);
    check(two.sym('fetched') === 0x2000, `${name}.load: the fetched listing`);
    await M.load('elsewhere/listing.json');
    check(fetched.length === 2, `${name}.load did not fetch a listing the page lacks`);
  }
  console.log(failed ? `${failed} failed` : 'C64, BBC and Spectrum.load: an embedded listing is read from the page: ok');
  process.exit(failed ? 1 : 0);
})();
