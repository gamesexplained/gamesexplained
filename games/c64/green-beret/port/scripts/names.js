'use strict';
// The listing's names the port's source uses, by address: port/src/names.js (GBNames), made from
// symbols.json. Run it after the source names a symbol it did not before; port/test/names.js checks
// that the file is up to date.
//   node port/scripts/names.js
const fs = require('fs'), path = require('path');
const GAME = path.resolve(__dirname, '../..');
const SRC = path.join(GAME, 'port/src');
const OUT = path.join(SRC, 'names.js');

function make() {
  const syms = JSON.parse(fs.readFileSync(path.join(GAME, 'symbols.json'), 'utf8')).symbols;
  const words = new Set();
  for (const f of fs.readdirSync(SRC)) {
    if (!f.endsWith('.js') || f === 'names.js') continue;
    for (const w of fs.readFileSync(path.join(SRC, f), 'utf8').match(/[A-Za-z_][A-Za-z0-9_]*/g) || []) words.add(w);
  }
  const used = syms.filter(s => words.has(s.name) && !/^[bjrfa]_[0-9A-F]{4}$/.test(s.name)).sort((a, b) => a.address - b.address);
  const lines = used.map(s => '  ' + s.name + ': 0x' + s.address.toString(16).toUpperCase().padStart(s.address < 0x100 ? 2 : 4, '0') + ',');
  return `// Made by port/scripts/names.js from symbols.json: the listing's names the port uses, by address.
(function (root) {
'use strict';
root.GBNames = Object.freeze({
${lines.join('\n')}
});
})(typeof window !== 'undefined' ? window : globalThis);
`;
}
if (require.main === module) { fs.writeFileSync(OUT, make()); console.log('wrote ' + path.relative(process.cwd(), OUT)); }
module.exports = { make, OUT };
