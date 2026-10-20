#!/usr/bin/env python3
"""Check the site's model of TED's sound, site/lib/ted-sound.js, against plus4emu's own output.

For each case the check puts a short program of its own at $2000 and runs it with the interrupts
off: it sets D/A for a moment, which holds both voices' counters and fills the noise register
with 1s, so that plus4emu and the model start from the same state, then writes the case's values
to TED's sound registers, some of them over and over in a loop. The server records the program's
writes and plus4emu's own output at 48,000 samples a second (`sound` with `audio`) across one run
of 60 frames; the model renders the same writes under node, and the two are compared sample by
sample after 0.3 s, once the DC filters have settled, with the model's samples lined up with
plus4emu's to a fifth of a tick (kit/c16/ted_sound_check.js). A case passes when the difference is
under 1 % of plus4emu's own level. The cases: each voice's square at two
values and two volumes, both together, the noise at two rates, the noise with voice 1, voice 2's
square and noise both switched on, values 1022 and 1023, every volume from 0 to 15, and samples
played through D/A.

It resets the machine it is given, so give it one of its own:

  python3 kit/scripts/tools.py --platform c16 plus4emu --port 7508
  KIT_PLUS4EMU_PORT=7508 python3 kit/c16/sound.py test
  python3 kit/scripts/tools.py --platform c16 stop --port 7508

`test --record` also writes the logs, plus4emu's output with them, to
kit/c16/fixtures/ted-sound.json, which kit/c16/test_ted_sound.js holds the model to in CI.

Usage:
  sound.py test [--record]
"""
import base64, json, os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
LIB = os.path.join(ROOT, "site", "lib", "ted-sound.js")
CHECK = os.path.join(HERE, "ted_sound_check.js")
FIXTURE = os.path.join(HERE, "fixtures", "ted-sound.json")
PROG = 0x2000
RATE = 48000
FRAMES = 60
LIMIT = 0.01
WINDOW = 1536                 # samples of each case's output the fixture keeps
CLOCK = 1773447

# A case's writes: [(register, value), ...] made once, then `loop`, a list of steps each made in
# turn with a pause of `pause` (about 1,300 cycles each) after it, round and round. Register $12
# is written as voice 1's two high bits, the rest of $FF12 kept.
CASES = [
    ("voice 1's square, value $200, volume 8", [(0x0E, 0x00), (0x12, 2), (0x11, 0x18)], [], 0),
    ("voice 1's square, value $3C0, volume 4", [(0x0E, 0xC0), (0x12, 3), (0x11, 0x14)], [], 0),
    ("voice 2's square, value $100, volume 8", [(0x0F, 0x00), (0x10, 1), (0x11, 0x28)], [], 0),
    ("both squares, $2A0 and $2B0, volume 6", [(0x0E, 0xA0), (0x12, 2), (0x0F, 0xB0), (0x10, 2), (0x11, 0x36)], [], 0),
    ("noise, value $300, volume 8", [(0x0F, 0x00), (0x10, 3), (0x11, 0x48)], [], 0),
    ("noise, value $0E0, volume 8", [(0x0F, 0xE0), (0x10, 0), (0x11, 0x48)], [], 0),
    ("noise at $380 with voice 1 at $280, volume 7", [(0x0E, 0x80), (0x12, 2), (0x0F, 0x80), (0x10, 3), (0x11, 0x57)], [], 0),
    ("voice 2's square and noise both on: the square", [(0x0F, 0x80), (0x10, 1), (0x11, 0x68)], [], 0),
    ("voice 1 at 1022, then 1023, by turns", [(0x0E, 0xFE), (0x12, 3), (0x11, 0x18)], [[(0x0E, 0xFF)], [(0x0E, 0xFE)]], 255),
    ("voice 1 at $200, every volume from 0 to 15 in turn", [(0x0E, 0x00), (0x12, 2)], [[(0x11, 0x10 | v)] for v in range(16)], 4),
    ("D/A with voice 1, volume 0 to 8 and down", [], [[(0x11, 0x90 | v)] for v in list(range(9)) + list(range(7, 0, -1))], 1),
]


def assemble(writes, loop, pause):
    """The case's program at PROG: its bytes."""
    b = [0x78, 0xA9, 0x80, 0x8D, 0x11, 0xFF, 0xA2, 0x10, 0xCA, 0xD0, 0xFD]   # SEI, D/A on, 16 x DEX/BNE

    def store(r, v):
        if r == 0x12:
            b.extend([0xAD, 0x12, 0xFF, 0x29, 0xFC, 0x09, v & 3, 0x8D, 0x12, 0xFF])   # LDA $FF12, AND, ORA, STA
        else:
            b.extend([0xA9, v, 0x8D, r, 0xFF])
    for r, v in writes:
        store(r, v)
    top = PROG + len(b)
    for step in loop:
        for r, v in step:
            store(r, v)
        if pause:
            b.extend([0xA0, pause, 0xA2, 0x00, 0xCA, 0xD0, 0xFD, 0x88, 0xD0, 0xF8])   # LDY #n: LDX #0: DEX/BNE, DEY/BNE
    if not loop:
        top = PROG + len(b)
    b.extend([0x4C, top & 0xFF, top >> 8])
    return bytes(b)


def node(logs):
    """The model's rendering of each log against plus4emu's output, under node."""
    script = ("const fs = require('fs'), vm = require('vm');"
              "vm.runInThisContext(fs.readFileSync(process.argv[1], 'utf8'));"
              "const { check } = require(process.argv[2]);"
              "const logs = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));"
              "console.log(JSON.stringify(logs.map(l => check(TEDSound, l))));")
    with tempfile.TemporaryDirectory() as d:
        path = os.path.join(d, "logs.json")
        json.dump(logs, open(path, "w"))
        r = subprocess.run(["node", "-e", script, LIB, CHECK, path], capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"ted-sound.js under node failed:\n{r.stderr}")
    return json.loads(r.stdout)


def test(record=False):
    sys.path.insert(0, HERE)
    from plus4emu import connect
    logs = []
    with connect() as m:
        m.reset(hard=True)
        m.frames(150)
        for name, writes, loop, pause in CASES:
            m.write(PROG, assemble(writes, loop, pause))
            m.set_registers(pc=PROG)
            m.sound("start", audio=RATE)
            m.frames(FRAMES)
            log = m.sound("stop")
            log["name"] = name
            logs.append(log)
    failed = 0
    for log, r in zip(logs, node(logs)):
        ok = r["error"] < LIMIT
        failed += not ok
        print(f"{'PASS' if ok else 'FAIL'}  {log['name']}: {len(log['writes'])} writes, the model {100 * r['error']:.2f} % "
              f"off plus4emu's level of {r['rms']:.4f} (plus4emu {r['lag']:+d} samples)")
    if record:
        # the fixture keeps WINDOW samples of plus4emu's output from 0.3 s, with room for the lag
        # either side, and the writes before its end
        keep = []
        for log in logs:
            rate = log["audio"]["rate"]
            first = int(0.3 * rate) - 64
            raw = base64.b64decode(log["audio"]["samples"])[2 * first:2 * (first + WINDOW + 128)]
            end = log["start"] + (first + WINDOW + 128) * CLOCK // rate
            keep.append(dict(log, end=end, writes=[w for w in log["writes"] if w[0] < end],
                             audio=dict(log["audio"], first=first, samples=base64.b64encode(raw).decode())))
        os.makedirs(os.path.dirname(FIXTURE), exist_ok=True)
        with open(FIXTURE, "w") as f:
            json.dump({"made": "kit/c16/sound.py test --record, plus4emu 1.2.11 (git 939e652) in the kit's server",
                       "from": 0.3, "to": 0.3 + WINDOW / RATE, "logs": keep}, f, separators=(",", ":"))
        print(f"wrote {os.path.relpath(FIXTURE, ROOT)}")
    print("nothing differed" if not failed else f"{failed} case(s) differed")
    sys.exit(1 if failed else 0)


def main():
    a = sys.argv[1:]
    if not a or a[0] in ("-h", "--help"):
        print(__doc__); return
    if a[0] == "test":
        test(record="--record" in a); return
    sys.exit(__doc__)


if __name__ == "__main__":
    main()
