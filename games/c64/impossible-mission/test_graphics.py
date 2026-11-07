#!/usr/bin/env python3
"""Hold graphics.html's port against the game's own code.

The Graphics tab draws the agent with a port of agent_frame ($8729: the
sprite pointers, sprite 2 switched off, and the in-place mirroring through
the reversal table at $C500), moves him with a port of agent_move ($8859:
the walk and the somersault's per-sprite steps, with the ninth X bits), and
dissolves him with a port of the electrocution's pass ($9629). A port is a
claim about the game, so this runs both sides and compares them:

  the game   the routines in the kit's 6502 simulator (kit/cpu/cpu6502.js), on
             the bytes in the committed listing.json
  the page   the functions between "// ---- port" and "// end of port" in
             graphics.html, run by node

All 28 frames from both stored facings to both facings (pointers, sprite 2,
every shape byte of $6000-$6FFF); a 3,000-step random sequence of frames and
facings on one memory; 20,000 calls of agent_move from random positions,
frames, facings and speeds; one dissolve pass with `random` answering from
the same stream. It also measures the electrocution's flash and pass in
cycles, the figures the page's timeline uses.

Everything it needs is committed: no game image, no snapshot, no emulator.
It needs node; with KIT_REQUIRE_TOOLS set it fails without it.

  python3 games/c64/impossible-mission/test_graphics.py
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
        sys.exit("test_graphics.py must run from inside the repository")
    ROOT = parent

JS = r"""// Written out and run by test_graphics.py; see there.
const fs = require('fs'), path = require('path');
const GAME = process.argv[2], ROOT = process.argv[3];
const { CPU } = require(ROOT + '/kit/cpu/cpu6502.js');
const src = fs.readFileSync(path.join(GAME, 'graphics.html'), 'utf8');
const P = new Function(src.slice(src.indexOf('// ---- port'), src.indexOf('// end of port')) + '\nreturn { REV, agentPointers, agentMirror, agentMove, dissolvePass };')();
const L = JSON.parse(fs.readFileSync(GAME + '/listing.json', 'utf8'));
const base = new Uint8Array(65536); for (const r of L.records) if (r.b) base.set(r.b, r.a);
for (let v = 0; v < 256; v++) base[0xC500 + v] = P.REV[v];         // the table the start-up builds
let fail = 0; const bad = (...a) => { if (fail++ < 8) console.log('DIFFERS', ...a); };
function machine(ram) {
  const vic = new Uint8Array(64);
  const io = { read: a => (a >= 0xD000 && a < 0xD040 ? vic[a & 63] : 0), write: (a, v) => { if (a >= 0xD000 && a < 0xD040) vic[a & 63] = v; } };
  return { cpu: new CPU(ram, { port: { dir: 0x2F, data: 0x35 }, io }), vic };
}
// 1. every frame, both facings, from both stored facings: pointers, sprite 2 on/off, every shape byte
let n1 = 0;
for (let f = 0; f < 0x1C; f++) for (const start of [0x80, 0x01]) for (const facing of [0x01, 0x80]) {
  const ram = base.slice(), port = base.slice();
  if (start === 0x01) { P.agentMirror(ram, f, 0x01); P.agentMirror(port, f, 0x01); }
  const m = machine(ram); m.vic[0x15] = 0x0E;
  ram[0x3F] = f; ram[0x50] = facing;
  m.cpu.call(0x8736, {}, { maxSteps: 1e6 });
  const p = P.agentPointers(port, f); P.agentMirror(port, f, facing);
  const s2on = !!(m.vic[0x15] & 4);
  if (ram[0x43F9] !== p.s1 || ram[0x43FB] !== p.s3 || s2on !== (p.s2 >= 0) || (p.s2 >= 0 && ram[0x43FA] !== p.s2)) bad('pointers frame', f.toString(16), [ram[0x43F9], ram[0x43FA], ram[0x43FB], s2on], p);
  for (let a = 0x6000; a < 0x7000; a++) if (ram[a] !== port[a]) { bad('shape byte $' + a.toString(16), 'frame', f.toString(16), 'facing', facing); break; }
  n1++;
}
// 2. a long random sequence of frames and facings on one memory, as play would do it
{
  const ram = base.slice(), port = base.slice(), m = machine(ram); let s = 7;
  const rnd = n => { s = (s * 1103515245 + 12345) >>> 0; return (s >>> 16) % n; };
  for (let k = 0; k < 3000; k++) {
    const f = rnd(0x1C), facing = rnd(2) ? 0x01 : 0x80;
    ram[0x3F] = f; ram[0x50] = facing; m.cpu.call(0x8736, {}, { maxSteps: 1e6 }); P.agentMirror(port, f, facing);
    let d = -1; for (let a = 0x6000; a < 0x7000; a++) if (ram[a] !== port[a]) { d = a; break; }
    if (d >= 0) { bad('sequence step', k, 'byte $' + d.toString(16)); break; }
  }
}
// 3. agent_move: walking both ways and every somersault frame both ways, from random positions
let n3 = 0;
{
  let s = 99; const rnd = n => { s = (s * 1103515245 + 12345) >>> 0; return (s >>> 16) % n; };
  for (let k = 0; k < 20000; k++) {
    const ram = base.slice(), m = machine(ram);
    const f = rnd(0x1C), facing = rnd(2) ? 0x01 : 0x80, speed = [0, 5, 0xFB][rnd(3)];
    const st = { x: [rnd(256), rnd(256), rnd(256)], y: [rnd(256), rnd(256), rnd(256)], bits: rnd(8) << 1 };
    for (let i = 0; i < 3; i++) { ram[0x2C + 2 * i] = st.x[i]; ram[0x2D + 2 * i] = st.y[i]; }
    ram[0x32] = st.bits; ram[0x3F] = f; ram[0x50] = facing; ram[0x39] = speed;
    m.cpu.call(0x8859, {}, { maxSteps: 1e5 });
    P.agentMove(base, st, f, facing, speed);
    const got = [0, 1, 2].map(i => [ram[0x2C + 2 * i], ram[0x2D + 2 * i]]).flat().concat(ram[0x32]);
    const want = [0, 1, 2].map(i => [st.x[i], st.y[i]]).flat().concat(st.bits);
    if (got.join() !== want.join()) { bad('agent_move frame', f.toString(16), 'facing', facing, 'speed', speed, got, want); }
    n3++;
  }
}
// 4. the dissolve: one pass of the game's loop ($9629-$964B) with `random` answering from a stream
{
  const ram = base.slice(), m = machine(ram);
  for (let a = 0x4D80; a < 0x4E40; a++) ram[a] = 0xFF;
  let s = 5; const stream = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s & 0xFF; };
  const hooks = { 0x82E3: c => { c.a = stream(); c.z = c.a ? 0 : 1; c.n = c.a >> 7; const lo = c.pull(), hi = c.pull(); c.pc = ((hi << 8 | lo) + 1) & 0xFFFF; } };
  // run from $9629 (ldx #$30) to $964D, the end of one pass, skipping nothing
  m.cpu.pc = 0x9629; m.cpu.run({ until: 0x964D, hooks, maxSteps: 1e6 });
  s = 5; const S = [new Uint8Array(64).fill(0xFF), new Uint8Array(64).fill(0xFF), new Uint8Array(64).fill(0xFF)];
  P.dissolvePass(S, stream);
  for (let k = 0; k < 3; k++) for (let i = 0; i < 64; i++) if (ram[0x4D80 + 64 * k + i] !== S[k][i]) { bad('dissolve sprite', k, 'byte', i); k = 3; break; }
}
// 5. timing of the electrocution, in cycles, the game's code as it is (interrupts are off throughout)
{
  const ram = base.slice(), m = machine(ram);
  let c0 = m.cpu.cycles; m.cpu.call(0x9765, { x: 0 }, { maxSteps: 1e7 }); const flash = m.cpu.cycles - c0;
  c0 = m.cpu.cycles; m.cpu.pc = 0x9629; m.cpu.run({ until: 0x964D, maxSteps: 1e7 }); const pass = m.cpu.cycles - c0;
  console.log(`timing: one flash ${flash} cycles, one dissolve pass ${pass} cycles (without its flash)`);
}
console.log(`${n1} frame/facing cases, a 3,000-step sequence, ${n3} moves and a dissolve pass: ${fail ? fail + ' differences' : 'all the same as the game'}`);
process.exit(fail ? 1 : 0);
"""


def main():
    node = shutil.which("node")
    if not node:
        if os.environ.get("KIT_REQUIRE_TOOLS"):
            sys.exit("test_graphics.py: node is needed and was not found")
        print("test_graphics.py: skipped, node was not found")
        return 0
    with tempfile.TemporaryDirectory() as tmp:
        script = os.path.join(tmp, "test_graphics.js")
        with open(script, "w") as f:
            f.write(JS)
        r = subprocess.run([node, script, HERE, ROOT])
    return r.returncode


if __name__ == "__main__":
    sys.exit(main())
