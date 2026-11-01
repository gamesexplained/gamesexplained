'use strict';
// Writes port/src/names.js: the address of each of the listing's code labels but the branch
// targets (b_...), for the routines the game reaches through a table of addresses (on_goto, the
// script engine's commands, the interrupt's hook), which the port looks up by address.
//   node port/scripts/names.js
const fs = require('fs'), path = require('path');
const GAME = path.resolve(__dirname, '../..');
const L = JSON.parse(fs.readFileSync(path.join(GAME, 'listing.json'), 'utf8'));
const names = {};
for (const r of L.records) if (r.t === 'code' && r.l && !/^(b|f)_/.test(r.l) && !r.l.startsWith('unused') && names[r.l] === undefined) names[r.l] = r.a;
const body = Object.keys(names).sort((a, b) => names[a] - names[b]).map(k => k + ':0x' + names[k].toString(16).toUpperCase()).join(',');
fs.writeFileSync(path.join(GAME, 'port/src/names.js'),
  '// The address of each code label of the listing (port/scripts/names.js writes this file).\n' +
  "(function (root) { 'use strict'; root.AMNames = {" + body + "}; })(typeof window !== 'undefined' ? window : globalThis);\n");
console.log(Object.keys(names).length + ' names');
