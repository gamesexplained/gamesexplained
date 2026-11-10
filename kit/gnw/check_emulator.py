#!/usr/bin/env python3
"""kit/EMULATOR.md's four tests, run on the kit's Game & Watch server (kit/gnw/gnw_server.mjs)
with a test program of the kit's own, written here with kit/gnw/asm.py.

    python3 kit/gnw/check_emulator.py [--keep]     (or `tools.py --platform gnw check-emulator`)

It starts its own server on a spare port and stops it at the end; --keep leaves the files it
wrote in tools/gnw-home/check-emulator. The result goes to tools/logs/check-emulator/gnw.json,
which `tools.py status` reads, and the pass/fail table in kit/gnw/INSTALL.md is this script's.

The program, on page $0F where the chip starts: a loop that selects the button row R2, reads it
into cell 0, counts its passes in cell 1, takes one from cell 2 on each pass while beta (left)
is high, and counts the seconds in cell 3 from the 1 Hz flag. Each check names the phase of
kit/EMULATOR.md it tests.
"""
import json, os, socket, subprocess, sys, time, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from asm import assemble                       # noqa: E402
from gnw import connect                        # noqa: E402

OUT = os.path.join(ROOT, "tools", "gnw-home", "check-emulator")
RESULT = os.path.join(ROOT, "tools", "logs", "check-emulator", "gnw.json")
PORT = 6898
LOOP = 0x0F << 6 | 0x20         # physical pc of `loop`, the program's second step (PL $20)
NEVER = 0x10 << 6               # page $10, step 0: the program never calls it

PROGRAM = {0x0F: [
    (None, "LB", 0),
    ("loop", "LAX", 0xD),        # R = $D: every R output is R's complement, so R2 alone selects
    (None, "ATR"),
    (None, "KTA"),
    (None, "LBL", 0x00), (None, "EXC", 0),          # cell 0 = the buttons
    (None, "LBL", 0x01), (None, "LDA", 0), (None, "ADX", 1), (None, "SKIP"), (None, "EXC", 0),   # cell 1 += 1
    (None, "TB"), (None, "TR", "noleft"),
    (None, "LBL", 0x02), (None, "LDA", 0), (None, "ADX", 0xF), (None, "SKIP"), (None, "EXC", 0),  # cell 2 -= 1
    ("noleft", "TG"), (None, "TR", "second"),
    (None, "TR", "loop"),
    ("second", "LBL", 0x03), (None, "LDA", 0), (None, "ADX", 1), (None, "SKIP"), (None, "EXC", 0),  # cell 3 += 1
    (None, "TR", "loop"),
]}


def test_rom():
    """The test program as a ROM file in tools/gnw-home/check-emulator, and its path."""
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, "check.rom")
    with open(path, "wb") as f:
        f.write(assemble(PROGRAM))
    return path


def mame_set(rom_path):
    """The test program as a ROM set MAME runs, under the name of its first SM5A unit (AC-01):
    tools/gnw/home/check/gnw_ball.zip, with an empty screen."""
    d = os.path.join(ROOT, "tools", "gnw", "home", "check")
    os.makedirs(d, exist_ok=True)
    z = os.path.join(d, "gnw_ball.zip")
    with zipfile.ZipFile(z, "w") as f:
        f.write(rom_path, "ac-01")
        f.writestr("gnw_ball.svg", '<svg xmlns="http://www.w3.org/2000/svg" width="1671" height="1080"></svg>\n')
    return z


def start_server():
    p = subprocess.Popen(["node", os.path.join(HERE, "gnw_server.mjs"), "--port", str(PORT)],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=dict(os.environ, HOME=os.path.join(ROOT, "tools", "gnw-home")))
    for _ in range(100):
        try:
            socket.create_connection(("127.0.0.1", PORT), timeout=0.2).close()
            return p
        except OSError:
            time.sleep(0.05)
    p.kill()
    sys.exit("the server did not start: node kit/gnw/gnw_server.mjs --port %d" % PORT)


def main():
    keep = "--keep" in sys.argv
    if any(a in ("-h", "--help") for a in sys.argv[1:]):
        print(__doc__); return 0
    passed, failed = [], []

    def check(name, ok, detail=""):
        (passed if ok else failed).append(name)
        print(("ok   " if ok else "FAIL ") + name + (": " + detail if detail else ""))

    rom = test_rom()
    wiring = {"time": "R2.K1", "game_b": "R2.K2", "game_a": "R2.K3", "left": "beta", "right": "alpha"}
    srv = start_server()
    try:
        m = connect(port=PORT, timeout=30)
        m.rom(rom); m.wiring(wiring)
        m.run(seconds=0.5)

        # Phase 1: a snapshot the kit parses; the same bytes through the server and from the file
        snap = os.path.join(OUT, "phase1.gnw.json.gz")
        m.save(snap)
        from snapshot import read as read_snapshot   # noqa: E402
        flat = read_snapshot(snap)
        through = m.read("data", 0, 0x80)
        check("phase 1: the data memory read through the server and out of the snapshot match",
              through == bytes(flat[0x1000:0x1080]) and any(through), "128 cells")
        regs = m.registers()
        check("phase 1: the registers by name", all(k in regs for k in ("acc", "bl", "bm", "c", "cb", "su", "div", "gamma", "w", "w_prime")))

        # Phase 2: a counting checkpoint counts on through a save and a load
        cp = m.checkpoint(LOOP, stop=False)["checkpoint"]
        m.run(seconds=0.25)
        n1 = next(c["hits"] for c in m.checkpoints() if c["checkpoint"] == cp)
        m.save("phase2"); m.load("phase2"); m.run(seconds=0.25)
        n2 = next(c["hits"] for c in m.checkpoints() if c["checkpoint"] == cp)
        check("phase 2: a counting checkpoint counts on after a load", n1 > 0 and n2 > n1, f"{n1:,} passes, then {n2:,}")
        m.delete(cp)
        # a stopping checkpoint with an ignore count, from the same snapshot three times: the same stop
        stops = []
        for i in range(3):
            if i == 2:
                m.close(); srv.terminate(); srv.wait(); srv = start_server()   # and after a restart
                m = connect(port=PORT, timeout=30); m.wiring(wiring)
            m.load("phase2")
            c = m.checkpoint(LOOP, stop=True, ignore=100)["checkpoint"]
            r = m.run(seconds=10)
            regs = {k: v for k, v in m.registers().items() if k not in ("id", "ok")}
            stops.append((r["reason"], r["cycles"], m.read("data", 0, 0x80), json.dumps(regs, sort_keys=True)))
            m.delete(c)
        check("phase 2: the stop after an ignore count of 100 is the same after a load, another, and a restart",
              stops[0][0] == "checkpoint" and stops[0] == stops[1] == stops[2], f"at cycle {stops[0][1]:,}")

        # Phase 3: counts while running; a routine that never runs counts 0
        m.load("phase2")
        a = m.checkpoint(LOOP, stop=False)["checkpoint"]
        b = m.checkpoint(NEVER, stop=False)["checkpoint"]
        m.run(seconds=1)
        cps = {c["checkpoint"]: c["hits"] for c in m.checkpoints()}
        check("phase 3: a checkpoint on the loop counts, one on code that never runs stays at 0",
              cps[a] > 500 and cps[b] == 0, f"{cps[a]:,} and {cps[b]}")
        secs = m.read("data", 3, 1)[0]
        check("phase 3: the 1 Hz flag, counted by the program, gives a second a second", secs in (1, 2), f"cell 3 is {secs} after 1.5 s")
        m.delete(a); m.delete(b)
        # a run answers a second connection between two instructions, and stop ends it there: ten
        # hours of the machine's time, which would take the server about half a minute
        other = connect(port=PORT, timeout=30)
        m.file.write((json.dumps({"id": 99, "cmd": "run", "seconds": 36000}) + "\n").encode()); m.file.flush()
        time.sleep(0.05)
        s = other.status()
        other.stop()
        r = json.loads(m.file.readline())
        check("phase 3: a call during a run is answered, and stop ends the run", s["running"] and r.get("reason") == "stopped")
        other.close()

        # Phase 4: an exact stop; left pressed while stopped is seen at once; one pass moves cell 2 by one
        m.load("phase2")
        c = m.checkpoint(LOOP, stop=True)["checkpoint"]
        m.run(seconds=1)
        times, moves, exact = [], [], True
        for i in range(10):
            t = time.time()
            m.press("left")
            seen = m.registers()["beta"] == 1
            before = m.read("data", 2, 1)[0]
            r = m.run(seconds=1)
            after = m.read("data", 2, 1)[0]
            m.press("left", down=False)
            times.append(time.time() - t)
            moves.append((before - after) & 15)
            exact = exact and seen and r["reason"] == "checkpoint" and r["pc"] == LOOP
        check("phase 4: a stop is exact, an input set while stopped is seen at once, and each pass moves one step",
              exact and moves == [1] * 10, f"moves {moves}")
        check("phase 4: ten steps with input in under a second", sum(times) < 1, f"{sum(times) * 1000:.0f} ms")
        m.delete(c)
        m.close()
    finally:
        srv.terminate()
    os.makedirs(os.path.dirname(RESULT), exist_ok=True)
    json.dump({"when": time.strftime("%Y-%m-%d %H:%M"), "passed": passed, "failed": failed}, open(RESULT, "w"), indent=1)
    if not keep:
        for f in os.listdir(OUT):
            if f.endswith(".gnw.json.gz"):
                os.remove(os.path.join(OUT, f))
        for f in os.listdir(os.path.join(ROOT, "tools", "gnw-home", "snapshots")) if os.path.isdir(os.path.join(ROOT, "tools", "gnw-home", "snapshots")) else []:
            if f.startswith("phase2"):
                os.remove(os.path.join(ROOT, "tools", "gnw-home", "snapshots", f))
    print(f"{len(passed)} passed, {len(failed)} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
