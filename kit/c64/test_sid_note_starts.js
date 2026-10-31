'use strict';
// Where a voice starts a note, for the bouncing ball and the piano roll (site/lib/sid.js). Some
// drivers keep a voice's gate on from note to note and start each note by turning the gate off
// and on again within one frame; the chip restarts the envelope, but the frame ends with the gate
// on, as it began (games/c64/power-drift, the race tune: 325 notes on voice 1, of which a check of
// the gate between frames finds 2). So:
// - engine().restarted(writes) finds, per voice, a gate turned off and then on within the writes,
//   and nothing else: not on then off, not a gate left on, not another register's bit 0;
// - the player's snapshot of a frame carries it as again, for a driver that keeps its writes,
//   and is false for one that does not;
// - startsNote, mount's mark by default, starts a note where the gate comes on and where it is
//   restarted, but not where a voice is restarted on the frame after another restart: a driver
//   that does that every frame holds one sound (games/c64/castle-master, the alarm);
// - a gate held on is one note, however often the driver writes it.
// Exits 1 on any failure.
// node kit/c64/test_sid_note_starts.js
const path = require('path');
require(path.join(__dirname, '..', '..', 'site', 'lib', 'sid.js'));
const S = globalThis.C64Sid, E = S.engine();
let fails = 0;
const check = (ok, what) => { if (!ok) fails++; console.log((ok ? 'ok   ' : 'FAIL ') + what); };
const same = (a, b) => a.join() === b.join();

check(same(E.restarted([4, 0x40, 4, 0x41, 11, 0x41, 18, 0x80, 18, 0x81]), [true, false, true]),
      'restarted: a gate off then on is a restart; a gate written on alone is not');
check(same(E.restarted([4, 0x41, 4, 0x40]), [false, false, false]), 'restarted: a gate on then off is not');
check(same(E.restarted([11, 0x40, 11, 0x40]), [false, false, false]), 'restarted: a gate turned off and left off is not');
check(same(E.restarted([5, 0x00, 5, 0x01, 23, 0x00, 23, 0x01, 24, 0x00, 24, 0x0F]), [false, false, false]),
      'restarted: bit 0 of another register is no gate');
check(same(E.restarted(null), [false, false, false]) && same(E.restarted([]), [false, false, false]),
      'restarted: no writes, no restart');

// Voice 1 is restarted every 8 frames with its gate left on, voice 2 is held on and its control
// register written every frame, voice 3 is restarted every frame.
function driver(keep) {
  const sid = new Uint8Array(25);
  let f = 0, on = false, writes = [];
  const w = (r, v) => { sid[r] = v; writes.push(r, v); };
  return {
    sid, get writes() { return keep ? writes : undefined; },
    init() { f = 0; on = true; sid.fill(0); for (const [r, v] of [[24, 15], [1, 0x20], [5, 0x09], [8, 0x18], [12, 0x09], [15, 0x30], [19, 0x09]]) sid[r] = v; },
    stop() { on = false; },
    play() {
      writes = [];
      if (f % 8 === 0) { w(4, 0x10); w(4, 0x11); }
      w(11, 0x21);
      w(18, 0x40); w(18, 0x41);
      f++;
    },
    playing: () => on && f < 48,
  };
}
function notes(keep) {
  const p = E.createPlayer(driver(keep), 8000, {}), shots = [];
  p.command({ cmd: 'start', tune: 0 });
  p.render(new Float32Array(8000), 8000, 0, (s) => { if (shots.length < 48) shots.push(s); });   // the driver's 48 frames
  const at = [[], [], []];
  shots.forEach((s, i) => s.v.forEach((v, x) => { if (S.startsNote(v, i ? shots[i - 1].v[x] : null)) at[x].push(i); }));
  return { shots, at };
}
{
  const { shots, at } = notes(true);
  check(shots.length === 48 && shots.slice(1).every((s) => s.v[0].again === (s.frame % 8 === 1) && !s.v[1].again && s.v[2].again),
        'a driver that keeps its writes: the snapshot marks each restart, frame by frame');
  check(same(at[0], [0, 8, 16, 24, 32, 40]), 'voice 1, restarted every 8 frames: a note each time (' + at[0].join(' ') + ')');
  check(same(at[1], [0]), 'voice 2, held on: one note (' + at[1].join(' ') + ')');
  check(same(at[2], [0]), 'voice 3, restarted every frame: one note (' + at[2].join(' ') + ')');
}
{
  const { shots, at } = notes(false);
  check(shots.every((s) => s.v.every((v) => !v.again)), 'a driver that keeps no writes: no restarts');
  check(same(at[0], [0]) && same(at[1], [0]) && same(at[2], [0]), 'and each voice starts one note, where its gate comes on');
}
check(!S.startsNote({ ctrl: 0x40, again: true }, { ctrl: 0x41 }), 'startsNote: a voice that ends the frame with its gate off starts nothing');
check(S.startsNote({ ctrl: 0x41, again: true }, { ctrl: 0x40, again: true }), 'startsNote: a gate that comes on is a note, whatever came before');

console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(fails ? 1 : 0);
