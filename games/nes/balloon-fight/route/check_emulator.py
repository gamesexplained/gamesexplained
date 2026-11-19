#!/usr/bin/env python3
"""Replay the recorded games (route.json) on an emulator, read by read, and hold each to the
milestones the kit's NES reached (kit/skills/core/65-inputs, "Replay it on a second machine").

The emulator is the kit's server, jsnes on port 6855 or MesenCE on 6857
(`python3 kit/scripts/tools.py jsnes`, `... mesen`). The cartridge is the contributor's own, in the
game's gitignored work/ folder. The script powers the console on, stops at every call of
read_joypad_x ($E76A), sets the controller X names to the recording's next value, reads the bytes
the milestones are made of, and runs on. Each milestone must come at the same read with the same
value as on the kit's NES; the frame may differ by a constant, as an emulator boots on another
frame, and the script prints the spread. It exits 1 on any difference.

    python3 games/nes/balloon-fight/route/check_emulator.py [--port 6855] [--cartridge work/game.nes] [--seed N]

Without --seed it replays every game in route.json, one after another.

It is run by hand, as CI installs neither emulator with a cartridge. The results are in the
game's facts.md, "The recorded game".
"""
import argparse, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(HERE)
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(GAME)))
sys.path.insert(0, os.path.join(ROOT, "kit", "nes"))
from jsnes import connect   # noqa: E402

READ = 0xE76A
PLACE = 60
NAMES = ["a", "b", "select", "start", "up", "down", "left", "right"]
V = {"score": 0x03, "phase": 0x3B, "counter": 0x3C, "lives": 0x41, "balloons": 0x88, "x": 0x91, "y": 0x9A}
POPPED = 0x05CD


class Feeder:
    """Each controller's next value, from runs of [value, count] (route.js, feeder)."""
    def __init__(self, rec):
        self.at = [[rec.get("p1", []), 0, 0], [rec.get("p2", []), 0, 0]]

    def __call__(self, x):
        s = self.at[x & 1]
        while s[2] == 0:
            if s[1] >= len(s[0]):
                return 0
            s[2] = s[0][s[1] + 1]
            s[1] += 2
        s[2] -= 1
        return s[0][s[1] - 2]

    def done(self):
        return all(s[2] == 0 and s[1] >= len(s[0]) for s in self.at)


class Watch:
    """The milestones, kept as route.js's Watch keeps them."""
    def __init__(self):
        self.n, self.marks, self.last = 0, [], None

    def read(self, zp, popped, frame):
        score = 0
        for i in range(4, -1, -1):
            score = score * 10 + zp[V["score"] + i]
        now = {"phase": zp[V["phase"]], "counter": zp[V["counter"]], "score": score * 10, "lives": zp[V["lives"]],
               "balloons": zp[V["balloons"]], "popped": popped}
        was = self.last

        def mark(kind, v):
            self.marks.append([self.n, frame, kind, v])
        if not was or now["phase"] != was["phase"] or now["counter"] != was["counter"]:
            mark("phase", now["phase"] * 256 + now["counter"])
        for kind in ("score", "lives", "balloons"):
            if was and now[kind] != was[kind]:
                mark(kind, now[kind])
        if was and now["popped"] > was["popped"]:
            mark("popped", now["popped"])
        if self.n % PLACE == 0:
            mark("place", zp[V["x"]] * 256 + zp[V["y"]])
        self.last = now
        self.n += 1


def replay(m, rec, a):
    """One recorded game from power-on; returns 0 when every milestone is met."""
    want = rec["milestones"]
    feed, seen = Feeder(rec), Watch()
    m.delete()
    m.reset(hard=True)
    if a.clear_ram:
        m.write(0, bytes(0x800))
    m.release_buttons()
    m.checkpoint(READ)
    held = [0, 0]
    while not feed.done():
        r = m.run(frames=600)
        if r.get("reason") != "checkpoint":
            print("FAIL seed %d: the game made no read of a controller in 600 frames, after read %d" % (rec["seed"], seen.n))
            return 1
        x = m.registers()["x"] & 1
        v = feed(x)
        zp, popped, frame = m.read(0, 0x100), m.read(POPPED, 1)[0], m.status()["frames"]
        seen.read(zp, popped, frame)
        if v != held[x]:
            for i, name in enumerate(NAMES):
                bit = 1 << i
                if (v ^ held[x]) & bit:
                    m.button(name, down=bool(v & bit), controller=x + 1)
            held[x] = v
    m.release_buttons()
    got = seen.marks
    wrong = None
    for i, w in enumerate(want):
        g = got[i] if i < len(got) else None
        if not g or g[0] != w[0] or g[2] != w[2] or g[3] != w[3]:
            wrong = "milestone %d: got %s, want %s" % (i, g, w)
            break
    if not wrong and len(got) != len(want):
        wrong = "%d milestones, want %d" % (len(got), len(want))
    same = next((i for i, (g, w) in enumerate(zip(got, want)) if g[0] != w[0] or g[2:] != w[2:]), min(len(got), len(want)))
    gaps = sorted({g[1] - w[1] for g, w in zip(got[:same], want[:same])}) or [0]
    name = "MesenCE" if a.port == 6857 else "jsnes" if a.port == 6855 else "port %d" % a.port
    print("%s, seed %d: %d reads, %d milestones; frames after the kit's NES's: %s" % (
        name, rec["seed"], seen.n, len(got), gaps[0] if len(gaps) == 1 else "%d to %d" % (gaps[0], gaps[-1])))
    if wrong:
        print("FAIL " + wrong)
        return 1
    print("ok   every milestone at the same read with the same value")
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--port", type=int, default=6855, help="6855 jsnes, 6857 MesenCE")
    ap.add_argument("--cartridge", default=os.path.join(GAME, "work", "game.nes"))
    ap.add_argument("--clear-ram", action="store_true", help="write 0 to all 2 KB of RAM at power-on, as the kit's NES and the page start")
    ap.add_argument("--seed", type=int, help="replay only the game of this seed")
    a = ap.parse_args()
    games = json.load(open(os.path.join(HERE, "route.json")))["routes"]
    if a.seed is not None:
        games = [g for g in games if g["seed"] == a.seed]
    m = connect(port=a.port)
    m.cartridge(a.cartridge)
    fails = sum(replay(m, rec, a) for rec in games)
    m.delete()
    return 1 if fails or not games else 0


if __name__ == "__main__":
    sys.exit(main())
