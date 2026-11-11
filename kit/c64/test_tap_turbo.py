#!/usr/bin/env python3
"""The turbo formats of the C64's tape reader (kit/c64/tap.py) on a made-up tape, as a TAP of
version 1 and of version 0. The KERNAL's format has a test of its own, kit/c64/test_tap.py.

The tape is written here, pulse by pulse, as a game's tape is: a boot program in the KERNAL's
format whose header carries code after its name, then blocks in the turbo format of TURBO's
first row (a picture, a game, a block whose end address is not past its start, a block with a
gap of the recording inside it, and a block the tape ends in the middle of). Between them lie a
BASIC program whose first writing is damaged, a stretch of pulses in no format and a block whose
pilot is too short to be taken for one. Each item's label, place, address, bytes and problem are
checked; `tap.py` lists the tape and `tap.py extract` writes its blocks; then the tape goes
through the ledger (kit/scripts/media.py), where the game's listing holds the game block, and
the About row says what the tape holds. The reader's reading of ten real tapes is in
kit/lessons/2026-11-11-c64-tape-media.md: this test holds the mechanics, with no game's bytes.

Usage: test_tap_turbo.py
"""
import json, os, random, subprocess, sys, tempfile
from functools import reduce
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
sys.path[:] = [p for p in sys.path if os.path.abspath(p) != HERE]     # media.py here shadows the ledger's
sys.path.insert(0, os.path.join(KIT, "scripts"))
import media as M  # noqa: E402

R = M.reader("c64")
T = R.tap_mod
S, MD, L = (x // 8 * 8 for x in (T.SHORT, T.MEDIUM, T.LONG))       # as a TAP's bytes hold them
FMT = T.TURBO[0]
ZERO, ONE = 280, 528                                # the turbo format's two pulses
GAP = 300000

BOOT = bytes((i * 37 + 11) & 255 for i in range(101))
LOADER = bytes((i * 5 + 1) & 255 or 1 for i in range(171))
BASIC = bytes((i * 13 + 7) & 255 for i in range(120))
PICTURE = bytes((i * 7 + 3) & 255 for i in range(300))
GAME = bytes((i * 91 + 5) & 255 for i in range(600))
HELD = bytes((i * 29 + 3) & 255 for i in range(64))
CUT = bytes((i * 17 + 9) & 255 for i in range(200))


def kernal_byte(v):
    bits = [v >> n & 1 for n in range(8)]
    bits.append(1 - sum(bits) % 2)                                       # odd parity
    return [L, MD] + [x for b in bits for x in ((MD, S) if b else (S, MD))]


def kernal_block(body, damage_first=False):
    """A block written twice: a leader, the countdown, the bytes, their exclusive or, a long and
    a trailer of shorts."""
    body = bytes(body) + bytes([reduce(lambda a, b: a ^ b, body, 0)])
    out = []
    for n, count in enumerate((range(0x89, 0x80, -1), range(0x09, 0x00, -1))):
        data = bytearray(bytes(count) + body)
        if damage_first and n == 0:
            data[40] ^= 0x10
        out += [S] * 300 + [x for v in data for x in kernal_byte(v)] + [L] + [S] * 78
    return out


def header(kind, name, start=0, end=0, rest=b""):
    return bytes([kind, start & 255, start >> 8, end & 255, end >> 8]) + name.ljust(16).encode() + rest.ljust(171, b" ")


def turbo_bits(data):
    return [ONE if v >> n & 1 else ZERO for v in data for n in range(8)]


def turbo(load, data, end=None, pilot=96, gap_at=None, keep=None):
    """A turbo block: the pilot, the sync byte, the first address and the address after the last,
    the bytes, and the byte and seven pulses the real tapes have after them, which no loader
    reads. gap_at puts a gap of the recording before that byte; keep cuts the block's pulses."""
    end = load + len(data) if end is None else end
    head = bytes([load & 255, load >> 8, end & 255, end >> 8])
    out = turbo_bits(bytes([FMT["pilot"]] * pilot + [FMT["sync"]]) + head)
    body = turbo_bits(data)
    if gap_at is not None:
        body[8 * gap_at] = GAP
    out += body + turbo_bits(b"\x44") + [ZERO, ZERO, ONE, ZERO, ONE, ZERO, ONE]
    return (out if keep is None else out[:keep]), head + data


def tap(pulses, version):
    body = bytearray()
    for w in pulses:
        if w % 8 == 0 and 0 < w < 2048:
            body.append(w // 8)
        else:
            body += b"\0" + w.to_bytes(3, "little") if version == 1 else b"\0"
    return b"C64-TAPE-RAW" + bytes([version, 0, 0, 0]) + len(body).to_bytes(4, "little") + bytes(body)


def the_tape():
    rnd = random.Random(64)
    picture, picture_raw = turbo(0x0C00, PICTURE)
    game, game_raw = turbo(0x4000, GAME)
    one, _ = turbo(0x0300, b"\x8b", end=0x0300)                         # the loader stores a byte before it compares
    short, _ = turbo(0x5000, HELD, pilot=4)
    held, _ = turbo(0x6000, HELD, gap_at=20)
    cut, _ = turbo(0x7000, CUT, keep=8 * (96 + 5 + 150))
    pulses = ([GAP]                                                     # the tape's blank start
              + kernal_block(header(3, "BOOT", 0x02A7, 0x02A7 + len(BOOT), LOADER)) + kernal_block(BOOT) + [GAP]
              + picture + [GAP]
              + kernal_block(header(1, "PLAIN", 0x0801, 0x0801 + len(BASIC)), damage_first=True) + kernal_block(BASIC)
              + [S] * 100 + [rnd.choice((248, 704)) for _ in range(2000)] + [S] * 100 + [GAP]     # a format of its own
              + game + [GAP] + one + [GAP]
              + [S] * 100 + short + [S] * 100 + [GAP]
              + held + [GAP] + cut)
    return pulses, picture_raw, game_raw


def run(*args):
    r = subprocess.run([sys.executable, os.path.join(KIT, "scripts", "media.py"), *map(str, args)],
                       capture_output=True, text=True)
    assert r.returncode == 0, f"media.py {' '.join(map(str, args))}\n{r.stdout}{r.stderr}"
    return r.stdout


def check_items(its, picture_raw, game_raw):
    labels = [i["label"] for i in its]
    stretches = [x for x in labels if x.startswith("pulses ")]
    assert len(stretches) == 2, labels
    assert labels == ["BOOT", "BOOT (header)", "turbo block 1", "PLAIN", stretches[0], "turbo block 2", "turbo block 3",
                      stretches[1], "turbo block 4", "turbo block 5"], labels
    by = {i["label"]: i for i in its}

    b = by["BOOT"]
    assert b["place"]["type"] == "program" and b["load"] == 0x02A7 and b["data"] == BOOT and "problem" not in b, b["place"]
    assert b["raw"] == header(3, "BOOT", 0x02A7, 0x02A7 + len(BOOT), LOADER) + BOOT
    h = by["BOOT (header)"]
    assert h["load"] == 0x033C and len(h["data"]) == 192 and h["data"][0] == 3 and h["data"][21:] == LOADER, h["place"]
    assert h["place"]["pulse"] == b["place"]["pulse"]

    p = by["PLAIN"]
    assert p["place"]["type"] == "relocatable program" and p["load"] == 0x0801 and p["data"] == BASIC
    assert p["problem"] == "its first writing's checksum is wrong; the copy is listed", p["problem"]
    assert "PLAIN (header)" not in by                                    # nothing but spaces after its name

    t = by["turbo block 1"]
    assert t["place"]["type"] == "turbo, " + FMT["name"] and t["load"] == 0x0C00 and t["data"] == PICTURE, t["place"]
    assert t["raw"] == picture_raw and "problem" not in t
    g = by["turbo block 2"]
    assert g["load"] == 0x4000 and g["data"] == GAME and g["raw"] == game_raw and "problem" not in g
    assert g["place"]["pulse"] > by[stretches[0]]["place"]["pulses"][1]
    o = by["turbo block 3"]
    assert o["load"] == 0x0300 and o["data"] == b"\x8b" and "problem" not in o, o
    k = by["turbo block 4"]
    assert k["load"] == 0x6000 and len(k["data"]) == len(HELD) and k["data"][:20] == HELD[:20]
    assert k["problem"] == "a gap in the recording falls inside it", k["problem"]
    c = by["turbo block 5"]
    assert c["load"] == 0x7000 and c["data"] == CUT[:150] and c["problem"] == "the tape ends 150 bytes into it", c["problem"]

    u = by[stretches[0]]
    assert u["data"] == b"" and "pulses" in u["place"], u
    assert u["problem"].endswith("in a format the kit does not decode, most of them 248 or 704 cycles long"), u["problem"]
    w = by[stretches[1]]                                                 # the block with four pilot bytes
    assert "in a format the kit does not decode" in w["problem"], w["problem"]


def main():
    tmp = Path(tempfile.mkdtemp())
    pulses, picture_raw, game_raw = the_tape()
    v1, v0 = tmp / "side a.tap", tmp / "old.tap"
    v1.write_bytes(tap(pulses, 1))
    v0.write_bytes(tap(pulses, 0))
    got = R.items(str(v1))
    assert got["what"] == "tape"
    check_items(got["items"], picture_raw, game_raw)
    check_items(R.items(str(v0))["items"], picture_raw, game_raw)
    assert T.waves(tap([S, GAP, L], 1)) == [S, GAP, L] and T.waves(tap([S, GAP, L], 0)) == [S, T.GAP, L]
    assert T.GAP >= T.SILENCE                                           # a version 0 gap still counts as one inside a block

    assert T.free([(3, 5), (9, 12)], 20) == [(0, 3), (5, 9), (12, 20)] and T.free([(0, 4)], 4) == []
    assert T.lengths([248] * 9 + [704] * 5 + [400] * 2 + [GAP] * 30) == [248, 704]
    msb = dict(FMT, lsb=False)                                          # a format whose bytes come highest bit first
    flipped = [ONE if v >> (7 - n) & 1 else ZERO for v in bytes([0xE3] * 16 + [0xED, 0x00, 0x20, 0x04, 0x20]) + b"TURN" for n in range(8)]
    back = T.turbo_blocks([GAP] + flipped + [GAP], [], msb)
    assert len(back) == 1 and back[0]["load"] == 0x2000 and back[0]["data"] == b"TURN", back
    assert T.turbo_blocks([GAP] + flipped + [GAP], [], FMT) == []

    # the command line: the list names the turbo blocks, and extract writes them beside the programs
    tool = lambda *a: subprocess.run([sys.executable, os.path.join(HERE, "tap.py"), *map(str, a)], capture_output=True, text=True)
    r = tool(v1)
    assert r.returncode == 0 and "2 items in the KERNAL's format and 5 turbo blocks" not in r.stdout, r.stdout + r.stderr
    assert "3 items in the KERNAL's format and 5 turbo blocks" in r.stdout, r.stdout
    assert "turbo block 2" in r.stdout and "$4000-$4258" in r.stdout and "most of them 248 or 704 cycles long" in r.stdout, r.stdout
    r = tool("extract", v1, tmp / "out")
    assert r.returncode == 0, r.stdout + r.stderr
    assert (tmp / "out" / "turbo block 2.prg").read_bytes() == b"\x00\x40" + GAME
    assert (tmp / "out" / "BOOT.prg").read_bytes() == b"\xa7\x02" + BOOT
    assert (tmp / "out" / "BOOT.header.prg").read_bytes()[:3] == b"\x3c\x03\x03"

    # through the ledger: a C64 game whose listing holds the game block
    g = tmp / "game"
    g.mkdir()
    game = {"platform": "c64", "tier": "silver", "created": "2099-01-01"}
    (g / "game.json").write_text(json.dumps(game))
    (g / "listing.json").write_text(json.dumps({"records": [{"a": 0x4000, "b": list(GAME)}]}))
    run("scan", g, f"tape={v1}")
    it = {i["label"]: i for i in json.loads((g / "media.json").read_text())["items"]}
    assert (it["turbo block 2"]["answer"], it["turbo block 2"]["at"], it["turbo block 2"]["matched"]) == ("part", "$4000", len(GAME)), it["turbo block 2"]
    assert it["BOOT (header)"]["load"] == "$033C" and it["BOOT"]["answer"] == "open"
    assert M.problems(str(g), game), "a new Silver game with open tape items must not pass"
    run("answer", g, "BOOT*", "loader", "--why", "the boot program, and the turbo loader in its header")
    run("answer", g, "*", "data", "--why", "made for the test", "--open-only")
    assert M.problems(str(g), game) == [], M.problems(str(g), game)
    s = M.summary(str(g))
    assert (s["files"], s["stretches"], s["blocks"], s["runs"], s["banks"]) == (8, 2, 0, 0, 0), s
    import build
    row = build.media_row(str(g))
    assert ">The tape holds 8 files and 2 stretches the kit cannot decode." in row, row

    print(f"ok - c64 tap.py turbo: {len(got['items'])} items of a made-up tape of {len(pulses):,} pulses read as they must, "
          "as a TAP of version 1 and of version 0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
