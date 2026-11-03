'use strict';
// Every routine the port has written that does not wait, checked alone against the game's own on
// the moments the sessions call it (check.js). ONLY=name,... checks those alone.
const { check, prefetch } = require('./check.js');
const { loadPort } = require('./port.js');
const standin = require('./standin.js');
const LS = loadPort();
const P = LS.makePort(new Uint8Array(65536), {});
const L = standin.labels();
// endTurn returns past its callers, which a case cannot
const SKIP = new Set(['endTurn']);
const names = Object.values(P.CODE).filter(n => !P.GEN.has(n) && L.byName.has(n) && !SKIP.has(n));
const missing = Object.entries(P.CODE).filter(([a, n]) => !L.byName.has(n)).map(([a, n]) => n + ' $' + (+a).toString(16));
if (missing.length) console.log('no label in the listing for: ' + missing.join(', '));
// A routine that waits, called without yield*, makes a generator and runs nothing; a name that is
// neither the port's nor the game's is a call of nothing: every call in the port's files is read
// for both first.
{
  const fs = require('fs'), path = require('path'), src = path.join(__dirname, '..', 'src');
  let bad = 0;
  for (const f of fs.readdirSync(src).filter(f => f.endsWith('.js'))) {
    fs.readFileSync(path.join(src, f), 'utf8').split('\n').forEach((l, i) => {
      const re = /(yield\* )?P\.(\w+)\(/g;
      for (let m; (m = re.exec(l));) {
        if (P.GEN.has(m[2]) && !m[1]) { console.log('FAIL ' + f + ':' + (i + 1) + ': ' + m[2] + ' waits, and is called without yield*'); bad++; }
        if (P[m[2]] === undefined && !L.byName.has(m[2]) && m[2] !== 'at') { console.log('FAIL ' + f + ':' + (i + 1) + ': P.' + m[2] + ' is neither the port\'s nor a label of the game'); bad++; }
      }
    });
  }
  if (bad) process.exit(1);
}
const O = { per: 6, passes: 60, most: 200 };
prefetch(names, O);
let fails = 0, none = [];
for (const name of names) {
  const r = check(Object.assign({ name, cases: 60 }, O));
  fails += r.fails ? 1 : 0;
  if (!r.cases) none.push(name);
}
console.log(names.length + ' routines, ' + fails + ' failing' + (none.length ? '; never called: ' + none.join(', ') : ''));
process.exit(fails ? 1 : 0);
