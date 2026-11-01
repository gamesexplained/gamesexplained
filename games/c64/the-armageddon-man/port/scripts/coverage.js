'use strict';
// The routines of the game the port has written, beside those the lockstep's sessions called
// (scripts/time-stretches.js's rows: each stretch's calls, and its interrupts'): which routines the
// sessions never ran, so that "every session in step" is read with what the sessions reached.
//   node coverage.js rows.jsonl...
const fs = require('fs'), path = require('path');
const files = process.argv.slice(2);
if (!files.length) { console.log('usage: node coverage.js rows.jsonl...'); process.exit(2); }
globalThis.window = globalThis;
const AM = require(path.join(__dirname, '../test/port.js')).loadPort();
const P = AM.makePort(new Uint8Array(65536), {});
const names = globalThis.AMNames;
const seen = new Set();
for (const f of files) for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
  if (!l) continue;
  const r = JSON.parse(l);
  for (const k in r.calls) seen.add(k);
  for (const k in r.icalls || {}) seen.add(k);
}
// the interrupt itself is no call: a row's '#irq' counts it
if (seen.has('#irq')) seen.add('irq');
const all = Object.keys(P).filter(k => typeof P[k] === 'function' && k in names);
const never = all.filter(k => !seen.has(k));
console.log(all.length + ' routines of the game ported, ' + (all.length - never.length) + ' called in the sessions' +
  (never.length ? '; never called: ' + never.join(' ') : ''));
