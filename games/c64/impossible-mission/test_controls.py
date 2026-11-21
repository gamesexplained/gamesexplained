#!/usr/bin/env python3
"""Hold controls.html's port against the game's own code.

The Controls tab moves the agent with a port of the room's loop ($7259:
the fire count and the search), agent_read_stick ($87ED), agent_move
($8859) and agent_animate ($8817), and types the hall of fame's name with
a port of read_key ($BE2D) and the name entry ($BD18). It also ports the
lift loop's fire ($39F6). A port is a claim about the game, so this runs
both sides and compares them:

  the game   the routines in the kit's 6502 simulator (kit/cpu/cpu6502.js), on
             the bytes in the committed listing.json, with $DC00 and $DC01
             answering as the stick and the keyboard matrix would
  the page   the functions between "// ---- port" and "// end of port" in
             controls.html, run by node

Every frame with every stick and fire state for agent_read_stick and
agent_animate; every frame, fire state and stick for the room's and the
lift's input; 5,000 moves; every key of the matrix alone and twice, and
2,000 random pairs, through read_key; 2,000 random key sequences through
the name entry.

Everything it needs is committed: no game image, no snapshot, no emulator.
It needs node; with KIT_REQUIRE_TOOLS set it fails without it.

  python3 games/c64/impossible-mission/test_controls.py
"""
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = HERE
while not os.path.isfile(os.path.join(ROOT, "kit", "cpu", "cpu6502.js")):
    parent = os.path.dirname(ROOT)
    if parent == ROOT:
        sys.exit("test_controls.py must run from inside the repository")
    ROOT = parent

JS = r"""// Written out and run by test_controls.py; see there.
const fs = require('fs'), path = require('path');
const GAME = process.argv[2], ROOT = process.argv[3];
const { CPU } = require(ROOT + '/kit/cpu/cpu6502.js');
const src = fs.readFileSync(path.join(GAME, 'controls.html'), 'utf8');
const P = new Function(src.slice(src.indexOf('// ---- port'), src.indexOf('// end of port')) +
  '\nreturn { readStick, animate, roomInput, liftInput, agentMove, readKey, nameStart, nameKey };')();
const L = JSON.parse(fs.readFileSync(GAME + '/listing.json', 'utf8'));
const base = new Uint8Array(65536); for (const r of L.records) if (r.b) base.set(r.b, r.a);
let fail = 0; const bad = (...a) => { if (fail++ < 10) console.log('DIFFERS', ...a); };
const hex = v => '$' + v.toString(16).toUpperCase();
// The chips: $DC00 reads the stick (or, while read_key drives it, the rows it wrote), $DC01 the
// keyboard's columns for the rows driven low; everything else reads 0 and keeps its writes.
function machine(ram, o = {}) {
  const chip = new Uint8Array(0x1000); let pa = 0xFF;
  const io = {
    read: a => {
      if (a === 0xDC00) return o.stick !== undefined ? o.stick : pa;
      if (a === 0xDC01) { let cols = 0; for (let r = 0; r < 8; r++) if (!(pa & (1 << r))) for (const [kr, kc] of (o.keys || [])) if (kr === r) cols |= 1 << kc; return 0xFF ^ cols; }
      return chip[a & 0xFFF];
    },
    write: (a, v) => { if (a === 0xDC00) pa = v; chip[a & 0xFFF] = v; } };
  return new CPU(ram, { port: { dir: 0x2F, data: 0x35 }, io });
}
let s = 11; const rnd = n => { s = (s * 1103515245 + 12345) >>> 0; return (s >>> 16) % n; };
const STICKS = []; for (let v = 0; v < 32; v++) STICKS.push(0xE0 | v);
// 1. agent_read_stick and agent_animate: every frame, stick, fire count and step
let n1 = 0;
for (let f = 0; f < 0x1C; f++) for (const d of STICKS) for (const fire of [0, 1]) for (const speed of [0, 5, 0xFB]) for (const facing of [0x01, 0x80]) {
  const ram = base.slice(); ram[0x3F] = f; ram[0x51] = fire; ram[0x39] = speed; ram[0x50] = facing;
  const cpu = machine(ram, { stick: d });
  const st = { f, fire, speed, facing };
  cpu.call(0x87ED); P.readStick(st, d);
  if ([ram[0x3F], ram[0x39], ram[0x50]].join() !== [st.f, st.speed, st.facing].join()) bad('agent_read_stick', hex(f), hex(d), [ram[0x3F], ram[0x39], ram[0x50]], st);
  cpu.call(0x8817); P.animate(st, d);
  if ([ram[0x3F], ram[0x51]].join() !== [st.f, st.fire].join()) bad('agent_animate', hex(f), hex(d), fire, speed, [ram[0x3F], ram[0x51]], st);
  n1++;
}
// 2. the room's loop from $7259 to the agent's update ($7288) or past it ($728B); the search ($92A0) stopped
let n2 = 0;
for (let f = 0; f < 0x1C; f++) for (const d of STICKS) for (const held of [0, 1]) for (const falling of [0, 1]) {
  const ram = base.slice(); ram[0x3F] = f; ram[0xDE] = held; ram[0x41] = falling; ram[0x51] = 3;
  const cpu = machine(ram, { stick: d }); let went = null;
  const stop = w => () => { went = w; return true; };
  cpu.pc = 0x7259; cpu.run({ hooks: { 0x7288: stop('update'), 0x92A0: stop('search'), 0x728B: stop('skip') } });
  const st = { f, held, falling, fire: 3 }, want = P.roomInput(st, d);
  if (went !== want || ram[0xDE] !== st.held || ram[0x51] !== st.fire) bad('room loop', hex(f), hex(d), held, falling, went, want, ram[0xDE], ram[0x51], st);
  n2++;
}
// 3. the lift loop's fire, $39F6 to $3A18 or the pocket computer ($3A80)
let n3 = 0;
for (let f = 0; f < 0x1C; f++) for (const d of STICKS) for (const held of [0, 1]) {
  const ram = base.slice(); ram[0x3F] = f; ram[0xDE] = held; ram[0x51] = 0;
  const cpu = machine(ram, { stick: d }); let went = null;
  cpu.pc = 0x39F6; cpu.run({ hooks: { 0x3A18: () => { went = 'on'; return true; }, 0x3A80: () => { went = 'computer'; return true; } } });
  const st = { f, held, fire: 0 }, want = P.liftInput(st, d);
  if (went !== want || ram[0xDE] !== st.held || ram[0x51] !== st.fire) bad('lift loop', hex(f), hex(d), held, went, want);
  n3++;
}
// 4. agent_move, as the Graphics tab's test does it, on the copy in this page
for (let k = 0; k < 5000; k++) {
  const ram = base.slice(), cpu = machine(ram);
  const f = rnd(0x1C), facing = rnd(2) ? 0x01 : 0x80, speed = [0, 5, 0xFB][rnd(3)];
  const st = { x: [rnd(256), rnd(256), rnd(256)], y: [rnd(256), rnd(256), rnd(256)], bits: rnd(8) << 1 };
  for (let i = 0; i < 3; i++) { ram[0x2C + 2 * i] = st.x[i]; ram[0x2D + 2 * i] = st.y[i]; }
  ram[0x32] = st.bits; ram[0x3F] = f; ram[0x50] = facing; ram[0x39] = speed;
  cpu.call(0x8859); P.agentMove(base, st, f, facing, speed);
  const got = [0, 1, 2].map(i => [ram[0x2C + 2 * i], ram[0x2D + 2 * i]]).flat().concat(ram[0x32]);
  const want = [0, 1, 2].map(i => [st.x[i], st.y[i]]).flat().concat(st.bits);
  if (got.join() !== want.join()) { bad('agent_move', hex(f), facing, speed); break; }
}
// 5. read_key: no key, every key alone and held, random pairs
let n5 = 0;
function keyCase(keys, heldBefore) {
  const ram = base.slice(); ram[0xDF] = heldBefore;
  const cpu = machine(ram, { keys }); cpu.call(0xBE2D);
  const st = { held: heldBefore }, want = P.readKey(base, st, (r, c) => keys.some(([kr, kc]) => kr === r && kc === c));
  if (cpu.a !== want || ram[0xDF] !== st.held) bad('read_key', JSON.stringify(keys), heldBefore, hex(cpu.a), hex(want), ram[0xDF], st.held);
  n5++;
}
keyCase([], 0); keyCase([], 1);
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { keyCase([[r, c]], 0); keyCase([[r, c]], 1); }
for (let k = 0; k < 2000; k++) keyCase([[rnd(8), rnd(8)], [rnd(8), rnd(8)]], rnd(2));
// 6. the name entry, $BD18 to $BD54, with read_key answering from a sequence
let n6 = 0;
const CODES = [0x00, 0x01, 0xF0, 0xFF, 0x71, 0x8A, 0x8B, 0x96, 0xFD, 0xFE, 0x98, 0x95];
for (let k = 0; k < 2000; k++) {
  const seq = []; for (let i = 0; i < 12; i++) seq.push(rnd(3) ? CODES[4 + rnd(8)] : CODES[rnd(4)]);
  seq.push(0x00);
  const ram = base.slice(), off = 0x20;
  for (let i = 0; i < 6; i++) ram[0x4300 + off + i] = 0x53;
  ram[0x4300 + off] = 0xDB; ram[0xE5] = off; ram[0xE6] = 0;
  const cpu = machine(ram); let i = 0;
  const rts = c => { const lo = c.pull(), hi = c.pull(); c.pc = ((hi << 8 | lo) + 1) & 0xFFFF; };
  cpu.pc = 0xBD18;
  cpu.run({ hooks: { 0x9791: c => { rts(c); }, 0xBE2D: c => { c.a = seq[i++]; c.z = c.a ? 0 : 1; c.n = c.a >> 7; rts(c); }, 0xBD54: () => true }, maxSteps: 1e5 });
  const st = P.nameStart(); for (let j = 0; j < i; j++) P.nameKey(st, seq[j]);
  const got = Array.from(ram.slice(0x4300 + off, 0x4300 + off + 5)), want = st.cells.slice(0, 5).map(v => v < 0 ? 0x53 : v);
  if (!st.done || got.join() !== want.join()) bad('name entry', seq.slice(0, i).map(hex).join(' '), got.map(hex), want.map(hex));
  n6++;
}
console.log(`${n1} stick cases, ${n2} room-loop cases, ${n3} lift cases, 5,000 moves, ${n5} keyboard cases, ${n6} names: ${fail ? fail + ' differences' : 'all the same as the game'}`);
process.exit(fail ? 1 : 0);
"""


def main():
    node = shutil.which("node")
    if not node:
        if os.environ.get("KIT_REQUIRE_TOOLS"):
            sys.exit("test_controls.py: node is needed and was not found")
        print("test_controls.py: skipped, node was not found")
        return 0
    with tempfile.TemporaryDirectory() as tmp:
        script = os.path.join(tmp, "test_controls.js")
        with open(script, "w") as f:
            f.write(JS)
        r = subprocess.run([node, script, HERE, ROOT])
    return r.returncode


if __name__ == "__main__":
    sys.exit(main())
