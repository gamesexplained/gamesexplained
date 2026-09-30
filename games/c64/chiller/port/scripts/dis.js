'use strict';
// The listing as text: node dis.js [$from [$to]] prints the code (and, with --data, the data
// records) between two addresses, with labels, operands named, callers and the listing's comments.
const fs = require('fs'), path = require('path');
const L = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../listing.json'), 'utf8'));
const args = process.argv.slice(2), data = args.includes('--data');
const nums = args.filter(a => !a.startsWith('--')).map(a => parseInt(a.replace('$', ''), 16));
const from = nums[0] || 0, to = nums[1] !== undefined ? nums[1] : (nums[0] !== undefined ? from + 0xFF : 0xFFFF);
const names = new Map(L.records.filter(r => r.l).map(r => [r.a, r.l]));
const h = (v, n = 4) => '$' + v.toString(16).toUpperCase().padStart(n, '0');
for (const r of L.records) {
  if (r.a < from || r.a > to) continue;
  if (r.t !== 'code' && !(data && r.b)) continue;
  const lab = r.l ? r.l + ':' : '';
  let op = r.t === 'code' ? r.m + (r.o ? ' ' + r.o : '') : '.byte ' + r.b.slice(0, 16).map(b => h(b, 2)).join(',') + (r.b.length > 16 ? ' ...(' + r.b.length + ')' : '');
  if (r.oa !== undefined && !names.has(r.oa)) op += '   [' + h(r.oa) + ']';
  const x = r.x && r.l ? '  <- ' + r.x.slice(0, 8).map(a => h(a)).join(' ') + (r.x.length > 8 ? ' ...' : '') : '';
  console.log(h(r.a).slice(1) + ' ' + r.b.map(b => h(b, 2).slice(1)).join(' ').padEnd(9) + ' ' + lab.padEnd(22) + op.padEnd(34) + x + (r.c ? '\n' + ' '.repeat(38) + '; ' + r.c : ''));
}
