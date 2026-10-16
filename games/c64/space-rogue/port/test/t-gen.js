'use strict';
// GEN against the game's code: a routine waits when it polls the interrupt's bytes in a loop
// (wait_key, wait_fire_up, wait_ticks) or reaches one that does, by a call, a jump or a branch to
// its label, or by running on into it. That closure, over the parts the port has written, is
// what GEN must list, so that a routine the port writes as a plain function can never be one
// that waits, and the stand-in for a routine not yet written is a generator when the routine
// can wait. Two things are left out of the closure:
// - disk_prompt, the "Insert DATA disk..." after a failed load or save: the port's disk always
//   holds the game's files, so a load never fails (close_after_io throws if one does);
// - main_loop, which is GEN's though nothing it calls waits: it runs for ever, a checkpoint at
//   each call.
const fs = require('fs'), path = require('path');
const lib = require('./lib.js');
const { loadPort } = require('./lockstep.js');

const PARTS = ['engine', 'flight'];
const ROOTS = ['wait_key', 'wait_fire_up', 'wait_ticks'];
const NEVER = new Set(['disk_prompt']);
const EXTRA = new Set(['main_loop']);
const BRANCH = new Set(['bcc', 'bcs', 'beq', 'bne', 'bmi', 'bpl', 'bvc', 'bvs']);
const ENDS = new Set(['rts', 'rti', 'jmp']);
const local = l => /^[brj]_/.test(l);

function waiting(parts) {
  const edges = new Map();
  for (const part of parts) {
    const L = JSON.parse(fs.readFileSync(path.join(lib.GAME, 'parts', part, 'listing.json'), 'utf8'));
    const at = new Map();
    for (const r of L.records) if (r.t === 'code' && r.l && !local(r.l)) at.set(r.a, r.l);
    let cur = null, last = null;
    for (const r of L.records) {
      if (r.t === 'note') continue;                   // a note inside an instruction
      if (r.t !== 'code') { cur = null; last = null; continue; }
      if (r.l && !local(r.l)) {
        // running on into the next routine is a call of it
        if (cur && last && !ENDS.has(last.m)) edges.get(cur).add(r.l);
        cur = r.l;
        if (!edges.has(cur)) edges.set(cur, new Set());
      }
      if (cur && (r.m === 'jsr' || r.m === 'jmp' || BRANCH.has(r.m)) && r.oa !== undefined && r.oa !== null) {
        const to = at.get(r.oa) || (typeof r.o === 'string' && !local(r.o) && !r.o.startsWith('(') && !r.o.startsWith('$') ? r.o : null);
        if (to && to !== cur) edges.get(cur).add(to);
      }
      last = r;
    }
  }
  const W = new Set(ROOTS);
  for (let more = true; more;) {
    more = false;
    for (const [f, to] of edges) {
      if (W.has(f) || NEVER.has(f)) continue;
      for (const t of to) if (W.has(t) && !NEVER.has(t)) { W.add(f); more = true; break; }
    }
  }
  return W;
}

if (require.main === module) {
  const W = waiting(PARTS);
  const SR = loadPort();
  const P = SR.makePort(new Uint8Array(65536), {});
  let bad = 0;
  for (const k of W) if (!P.GEN.has(k)) { console.log('waits, GEN leaves it out: ' + k); bad++; }
  for (const k of P.GEN) if (!W.has(k) && !EXTRA.has(k)) { console.log('in GEN, never waits: ' + k); bad++; }
  console.log(bad ? bad + ' differences' : 'GEN is the ' + W.size + ' routines that wait, and main_loop');
  process.exitCode = bad ? 1 : 0;
}
module.exports = { waiting };
