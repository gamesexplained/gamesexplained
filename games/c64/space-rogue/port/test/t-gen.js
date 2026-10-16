'use strict';
// GEN against the game's code: a routine waits when it polls the interrupt's bytes in a loop
// (wait_key, wait_fire_up, wait_ticks) or reaches one that does, by a call, a jump or a branch to
// its label, or by running on into it. That closure, over the parts the port has written, is
// what GEN must list, so that a routine the port writes as a plain function can never be one
// that waits, and the stand-in for a routine not yet written is a generator when the routine
// can wait. These are left out of the closure:
// - disk_prompt, the "Insert DATA disk..." after a failed load or save: the port's disk always
//   holds the game's files, so a load never fails (close_after_io throws if one does);
// - the callers of game_over, the death screen, which player_destroyed jumps to and which never
//   returns (it ends at the title): the port throws P.Goto, so game_over runs as a program of its
//   own and its waits are not its callers';
// - main_loop, which is GEN's though nothing it calls waits: it runs for ever, a checkpoint at
//   each call;
// - nav_status, which calls the status pages of SEG1 (the station part), loaded over SEG0 at
//   $A500 first: they wait for the menu's choice, but the flight's parts do not hold them.
// The closure is taken over flight's parts and over a base's, and GEN is the two together.
//
// The title, the intro and the ending are programs of their own (src/g-screens.js), each with its
// GEN. Theirs is the closure of the routines that wait for a key (wait_key, pause, play_effect,
// get_key_cursor) and of those that yield the cycles they take where the screen changes (the
// dissolves, the wipes, the scrolls) or at a checkpoint before they call key_waiting (the
// title's) or print_inline (the intro's and the ending's), which are plain functions themselves.
// Their JSRs to load_inline and print_inline are followed by the file's name or the text, and
// the code after it goes on with the routine. The closure is taken from the program's start, so a
// label only run on into (title_screen after the title's loads) is a part of the routine before
// it unless the port writes it as one of its own (each page of the story), and GEN is held to the
// routines the program reaches.
const fs = require('fs'), path = require('path');
const lib = require('./lib.js');
const { loadPort } = require('./lockstep.js');

// flight (SEG0 at $A500), and a base (SEG1 there, SEG1A at $E400, HIVE! over TALK), each with
// the resident engine. In a base only what the visit reaches runs: MAIN's calls into $A500-$BCFF
// from flight's routines are SEG0's, never SEG1's.
const PARTS = [{ parts: ['engine', 'flight'] }, { parts: ['engine', 'station', 'hive'], from: 'station_run' }];
// the routines reached by an RTS from a table of addresses less one: the base's actions
// (action_routines, $AB2E) and the talk scripts' (talk_ops, $E7B1)
const DISPATCH = {
  do_action: ['act_notice', 'act_ship', 'act_hive', 'act_alarm_plate', 'talk_to', 'act_lock', 'act_item', 'act_read'],
  talk_do: ['talk_set1', 'talk_set0', 'talk_inc', 'talk_dec', 'talk_give_credits', 'talk_take_credits', 'talk_alarm', 'talk_doom'],
};
const ROOTS = ['wait_key', 'wait_fire_up', 'wait_ticks'];
const NEVER = new Set(['disk_prompt']);
const ENTERED = new Set(['game_over']);
const EXTRA = new Set(['main_loop', 'nav_status']);
const BRANCH = new Set(['bcc', 'bcs', 'beq', 'bne', 'bmi', 'bpl', 'bvc', 'bvs']);
const ENDS = new Set(['rts', 'rti', 'jmp']);
const local = l => /^[brj]_/.test(l);

// the screens' programs: the elements of the distress call, reached through a patched JSR
const PROGRAMS = ['title', 'intro', 'ending'];
const SCREEN_ROOTS = ['wait_key', 'pause', 'play_effect', 'get_key_cursor', 'key_waiting', 'print_inline',
  'dissolve_in', 'dissolve_in_matrix', 'dissolve_out', 'wipe_left', 'wipe_right', 'scroll_up', 'scroll_down'];
const SCREEN_DISPATCH = { distress_call: ['morse_dot', 'morse_dash', 'morse_gap', 'silence_18', 'silence_4'] };
const BEFORE = new Set(['key_waiting', 'print_inline']);
const INLINE = new Set(['load_inline', 'print_inline']);

function waiting(parts, from, roots = ROOTS, dispatch = DISPATCH, inline = new Set(), ported = new Set()) {
  const edges = new Map(), real = new Map();
  const call = (f, t) => { edges.get(f).add(t); real.get(f).add(t); };
  // the routines' addresses over all the parts, so that a jump from one part into another (SR's
  // to INIT at $E900) is followed; the parts checked share no addresses
  const Ls = parts.map(part => JSON.parse(fs.readFileSync(path.join(lib.GAME, 'parts', part, 'listing.json'), 'utf8')));
  const at = new Map();
  for (const L of Ls) for (const r of L.records) if (r.t === 'code' && r.l && !local(r.l) && !at.has(r.a)) at.set(r.a, r.l);
  // a routine whose last instruction before a gap does not end runs on into whatever is loaded
  // after it (MAIN's station_view into SEG1 at $A501)
  const runOn = [];
  for (const L of Ls) {
    let cur = null, last = null;
    for (const r of L.records) {
      if (r.t === 'note') continue;                   // a note inside an instruction
      if (r.t !== 'code') {
        if (cur && last && last.m === 'jsr' && inline.has(at.get(last.oa))) continue;   // its argument
        if (cur && last && !ENDS.has(last.m)) runOn.push([cur, last.a + last.b.length]);
        cur = null; last = null; continue;
      }
      if (r.l && !local(r.l)) {
        // running on into the next routine is a call of it
        if (cur && last && !ENDS.has(last.m)) edges.get(cur).add(r.l);
        cur = r.l;
        if (!edges.has(cur)) { edges.set(cur, new Set()); real.set(cur, new Set()); }
      }
      if (cur && (r.m === 'jsr' || r.m === 'jmp' || BRANCH.has(r.m)) && r.oa !== undefined && r.oa !== null) {
        const to = at.get(r.oa) || (typeof r.o === 'string' && !local(r.o) && !r.o.startsWith('(') && !r.o.startsWith('$') ? r.o : null);
        if (to && to !== cur) call(cur, to);
      }
      last = r;
    }
  }
  for (const [f, a] of runOn) if (at.has(a)) edges.get(f).add(at.get(a));
  for (const [f, to] of Object.entries(dispatch)) if (edges.has(f)) for (const t of to) call(f, t);
  if (from) {
    const seen = new Set([from]), todo = [from];
    while (todo.length) for (const t of edges.get(todo.pop()) || []) if (!seen.has(t)) { seen.add(t); todo.push(t); }
    for (const f of [...edges.keys()]) if (!seen.has(f)) edges.delete(f);
  }
  // in a base, a label that nothing it runs calls, jumps or branches to, only reached by running
  // on into it, is a part of the routine before it (SEG1's labels that MAIN calls in flight, when
  // SEG0 is there); flight's routines reached by a table of keys are not, so it is left as it is
  const called = new Set(from ? [from] : edges.keys());
  if (from) for (const f of edges.keys()) for (const t of real.get(f)) called.add(t);
  const W = new Set(roots.filter(k => edges.has(k)));
  for (let more = true; more;) {
    more = false;
    for (const [f, to] of edges) {
      if (W.has(f) || NEVER.has(f)) continue;
      for (const t of to) if (W.has(t) && !NEVER.has(t) && !ENTERED.has(t)) { W.add(f); more = true; break; }
    }
  }
  for (const f of edges.keys()) if (!called.has(f) && !ported.has(f)) W.delete(f);
  W.reached = new Set(edges.keys());
  return W;
}

if (require.main === module) {
  const W = new Set();
  for (const p of PARTS) for (const k of waiting(p.parts, p.from)) W.add(k);
  const SR = loadPort();
  const P = SR.makePort(new Uint8Array(65536), {});
  let bad = 0;
  for (const k of W) if (!P.GEN.has(k)) { console.log('waits, GEN leaves it out: ' + k); bad++; }
  for (const k of P.GEN) if (!W.has(k) && !EXTRA.has(k)) { console.log('in GEN, never waits: ' + k); bad++; }
  console.log(bad ? bad + ' differences' : 'GEN is the ' + W.size + ' routines that wait, and main_loop');
  for (const prog of PROGRAMS) {
    const Q = SR.makePort(new Uint8Array(65536), {}, { program: prog });
    const ported = new Set(Object.keys(Q).filter(k => typeof Q[k] === 'function'));
    const V = waiting([prog], globalThis.SRPrograms[prog].start, SCREEN_ROOTS, SCREEN_DISPATCH, INLINE, ported), has = V.reached;
    for (const k of BEFORE) V.delete(k);
    let n = 0;
    for (const k of V) if (!Q.GEN.has(k)) { console.log(prog + ': waits, GEN leaves it out: ' + k); n++; }
    for (const k of Q.GEN) if (has.has(k) && !V.has(k)) { console.log(prog + ': in GEN, never waits: ' + k); n++; }
    console.log(n ? prog + ': ' + n + ' differences' : prog + ': GEN is the ' + V.size + ' routines that wait or pace');
    bad += n;
  }
  process.exitCode = bad ? 1 : 0;
}
module.exports = { waiting };
