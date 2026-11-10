#!/usr/bin/env python3
"""The Spectrum's media reader (kit/spectrum/media.py) on a made-up tape, as a TZX and a TAP.

The TZX holds a block of every kind the format has, so that the reader must step over each
correctly to number the next: a BASIC program and a code file under headers, the code's block
at turbo speed, a block with no header in the ROM's form, one whose parity is wrong, a pure
data block, a header that lies about its length, a header with nothing after it, and three
recordings. Each item's label, place, address, bytes and problem are checked, then the tape goes
through the ledger (kit/scripts/media.py): the code file is found in the game's listing, the
rest are answered, and the About row says what the tape holds.

When SkoolKit is installed its own tape parser is the oracle: the reader must number the
blocks as SkoolKit does and give the same bytes for each. With `KIT_REQUIRE_TOOLS` set, a
missing SkoolKit fails the test rather than skipping the oracle.

Usage: test_media.py
"""
import glob, json, os, struct, subprocess, sys, tempfile
from functools import reduce
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
sys.path[:] = [p for p in sys.path if os.path.abspath(p) != HERE]   # media.py and skoolkit.py here shadow others
sys.path.insert(0, os.path.join(KIT, "scripts"))
import media as M  # noqa: E402

R = M.reader("spectrum")

BASIC = bytes([0, 10, 5, 0, 0xEF, 0x22, 0x22, 0xAF, 0x0D])            # 10 LOAD ""CODE
CODE = bytes((i * 37 + 11) & 255 for i in range(600))
LEVEL = bytes((i * 91 + 5) & 255 for i in range(300))
SHORT = bytes((i * 7 + 3) & 255 for i in range(40))


def rom(flag, data, good=True):
    """A block in the ROM's form: the flag, the bytes, and a parity that makes them come to zero."""
    body = bytes([flag]) + data
    return body + bytes([reduce(lambda a, b: a ^ b, body, 0) ^ (0 if good else 0x55)])


def header(kind, name, length, p1=0, p2=0):
    return rom(0, bytes([kind]) + name.ljust(10).encode() + struct.pack("<HHH", length, p1, p2))


def std(block):
    return b"\x10" + struct.pack("<HH", 1000, len(block)) + block


def turbo(block):
    return b"\x11" + struct.pack("<HHHHHHBH", 2168, 667, 735, 600, 1200, 3223, 8, 1000) + len(block).to_bytes(3, "little") + block


def pure(block):
    return b"\x14" + struct.pack("<HHBH", 600, 1200, 8, 1000) + len(block).to_bytes(3, "little") + block


def text(t):
    return bytes([len(t)]) + t.encode()


LOOSE = rom(0xAA, LEVEL)
BAD = rom(0x00, LEVEL[:100], good=False)
RECORDING = bytes(range(64))
TZX = [                                                                         # block
    b"\x30" + text("made for the kit's test"),                                 # 1  text
    b"\x32" + struct.pack("<H", 8) + b"\x01\x00" + text("TITLE"),              # 2  archive info
    b"\x33\x01\x00\x00\x00",                                                   # 3  hardware
    b"\x21" + text("the files"),                                               # 4  group start
    std(header(0, "GAME", len(BASIC), 10, len(BASIC))),                        # 5  header
    std(rom(0xFF, BASIC)),                                                     # 6  its program
    b"\x22",                                                                   # 7  group end
    b"\x20\x00\x00",                                                           # 8  stop the tape
    std(header(3, "code", len(CODE), 0x8000, 0x8000)),                         # 9  header
    b"\x12" + struct.pack("<HH", 2168, 3000),                                  # 10 a tone
    b"\x13\x02" + struct.pack("<HH", 667, 735),                                # 11 two pulses
    turbo(rom(0xFF, CODE)),                                                    # 12 its code, at turbo speed
    b"\x24\x02\x00",                                                           # 13 loop start
    turbo(LOOSE),                                                              # 14 no header, ROM's form
    b"\x25",                                                                   # 15 loop end
    turbo(BAD),                                                                # 16 no header, parity wrong
    b"\x15" + struct.pack("<HHB", 79, 0, 8) + len(RECORDING).to_bytes(3, "little") + RECORDING,   # 17 a recording
    b"\x35" + b"kit test".ljust(16) + struct.pack("<I", 3) + b"abc",           # 18 custom info
    b"\x5aXTape!\x1a\x01\x14",                                                 # 19 glue
    b"\x2a" + struct.pack("<I", 0),                                            # 20 stop if 48K
    b"\x2b" + struct.pack("<IB", 1, 1),                                        # 21 signal level
    b"\x31\x05" + text("a message"),                                           # 22 message
    b"\x23\x01\x00",                                                           # 23 jump
    b"\x26\x01\x00\x01\x00",                                                   # 24 call sequence
    b"\x27",                                                                   # 25 return
    b"\x28" + struct.pack("<H", 7) + b"\x01" + struct.pack("<H", 1) + text("one"),   # 26 select
    b"\x18" + struct.pack("<I", 10 + len(RECORDING)) + struct.pack("<H", 0) + (44100).to_bytes(3, "little")
    + b"\x01" + struct.pack("<I", 64) + RECORDING,                             # 27 a CSW recording
    b"\x19" + struct.pack("<I", len(RECORDING)) + RECORDING[::-1],             # 28 generalized data
    b"\x16" + struct.pack("<I", 4) + b"c64r",                                  # 29 C64 ROM data (deprecated)
    b"\x17" + struct.pack("<I", 4) + b"c64t",                                  # 30 C64 turbo data (deprecated)
    b"\x34" + bytes(8),                                                        # 31 emulation info (deprecated)
    b"\x40\x00" + (3).to_bytes(3, "little") + b"sna",                          # 32 snapshot (deprecated)
    std(header(3, "short", 99, 0xC000, 0x8000)),                               # 33 header that says 99
    std(rom(0xFF, SHORT)),                                                     # 34 a block of 40
    std(header(3, "alone", 10, 0x9000, 0x8000)),                               # 35 header with nothing after it
]


def skoolkit():
    for p in glob.glob(os.path.join(KIT, "..", "tools", "skoolkit", "lib", "python*", "site-packages")):
        sys.path.insert(0, p)
    try:
        from skoolkit.tape import parse_tzx
        return parse_tzx
    except ImportError:
        return None


def check_items(its, tzx):
    by = {i["label"]: i for i in its}
    n = lambda a, b=None: a if tzx else {5: 1, 6: 2, 9: 3, 12: 4, 14: 5, 16: 6, 33: 7, 34: 8, 35: 9}[a]
    want = ["GAME", "code", f"block {n(14)}", f"block {n(16)}"] + (["block 17", "block 27", "block 28"] if tzx else []) + ["short", f"block {n(35)}"]
    assert [i["label"] for i in its] == want, [i["label"] for i in its]

    g = by["GAME"]
    assert g["place"] == {"file": "GAME", "type": "program", "blocks": [n(5), n(6)]}, g["place"]
    assert g["load"] is None and g["data"] == BASIC and "problem" not in g
    assert g["raw"] == header(0, "GAME", len(BASIC), 10, len(BASIC)) + rom(0xFF, BASIC)

    c = by["code"]
    place = {"file": "code", "type": "code", "blocks": [n(9), n(12)]}
    assert c["place"] == (dict(place, timing="turbo") if tzx else place), c["place"]
    assert c["load"] == 0x8000 and c["data"] == CODE and "problem" not in c

    loose = by[f"block {n(14)}"]
    place = {"block": n(14), "flag": "$AA"}
    assert loose["place"] == (dict(place, timing="turbo") if tzx else place), loose["place"]
    assert loose["data"] == LEVEL and loose["raw"] == LOOSE and loose["load"] is None

    bad = by[f"block {n(16)}"]
    assert "flag" not in bad["place"] and bad["data"] == BAD == bad["raw"], bad["place"]   # listed whole

    if tzx:
        rec = by["block 17"]
        assert rec["data"] == b"" and rec["raw"] == RECORDING and "direct recording" in rec["problem"], rec
        assert by["block 27"]["place"] == {"block": 27, "timing": "CSW recording"}, by["block 27"]["place"]
        assert by["block 28"]["place"] == {"block": 28, "timing": "generalized data"} and by["block 28"]["raw"] == RECORDING[::-1]

    s = by["short"]
    assert s["data"] == SHORT and s["load"] == 0xC000
    assert s["problem"] == "its header says 99 bytes and the block holds 40", s["problem"]

    alone = by[f"block {n(35)}"]
    assert alone["problem"] == "a header for alone with no block after it", alone["problem"]
    assert alone["data"] == header(3, "alone", 10, 0x9000, 0x8000)[1:-1]


def run(*args):
    r = subprocess.run([sys.executable, os.path.join(KIT, "scripts", "media.py"), *map(str, args)],
                       capture_output=True, text=True)
    assert r.returncode == 0, f"media.py {' '.join(map(str, args))}\n{r.stdout}{r.stderr}"
    return r.stdout


def main():
    tmp = Path(tempfile.mkdtemp())
    tzx = tmp / "side a.tzx"
    tzx.write_bytes(b"ZXTape!\x1a\x01\x14" + b"".join(TZX))
    tap = tmp / "game.tap"
    tap.write_bytes(b"".join(struct.pack("<H", len(b)) + b for b in (
        header(0, "GAME", len(BASIC), 10, len(BASIC)), rom(0xFF, BASIC), header(3, "code", len(CODE), 0x8000, 0x8000),
        rom(0xFF, CODE), LOOSE, BAD, header(3, "short", 99, 0xC000, 0x8000), rom(0xFF, SHORT),
        header(3, "alone", 10, 0x9000, 0x8000))))

    blocks = R.tzx_blocks(tzx.read_bytes())
    assert len(blocks) == len(TZX), (len(blocks), len(TZX))
    got = R.items(str(tzx))
    assert got["what"] == "tape"
    check_items(got["items"], True)
    check_items(R.items(str(tap))["items"], False)
    assert R.name_of(b"a\x7fb\x00    ") == "a{7F}b{00}"
    whole, = R.tape_items([(1, 0x14, LOOSE)])           # a pure data block is listed whole, whatever it comes to
    assert whole["data"] == LOOSE and whole["place"] == {"block": 1, "timing": "pure data"}, whole["place"]
    snap = tmp / "game.z80"
    snap.write_bytes(bytes(100))
    assert R.items(str(snap))["items"] is None and "memory" in R.items(str(snap))["unread"]

    # through the ledger: a Spectrum game whose listing holds the code file
    g = tmp / "game"
    g.mkdir()
    game = {"platform": "spectrum", "tier": "silver", "created": "2099-01-01"}
    (g / "game.json").write_text(json.dumps(game))
    (g / "listing.json").write_text(json.dumps({"records": [{"a": 0xC000, "b": list(CODE)}]}))
    run("scan", g, f"tape={tzx}")
    it = {i["label"]: i for i in json.loads((g / "media.json").read_text())["items"]}
    assert (it["code"]["answer"], it["code"]["at"], it["code"]["load"]) == ("part", "$C000", "$8000"), it["code"]
    assert it["block 17"]["bytes"] == 0 and it["block 17"]["answer"] == "open"
    assert any("open item" in p for p in M.problems(str(g), game))
    run("answer", g, "GAME", "loader", "--why", "the BASIC program that loads the code")
    run("answer", g, "block *", "data", "--why", "a level the code loads")
    run("answer", g, "short", "unused", "--why", "nothing loads it")
    assert M.problems(str(g), game) == [], M.problems(str(g), game)
    s = M.summary(str(g))
    assert (s["files"], s["blocks"], s["runs"], s["banks"], s["copies"]) == (3, 6, 0, 0, 0), s
    import build
    row = build.media_row(str(g))
    assert ">The tape holds 3 files and 6 blocks with no header." in row, row

    parse = skoolkit()
    if parse is None:
        if os.environ.get("KIT_REQUIRE_TOOLS"):
            sys.exit("FAILED - test_media.py: SkoolKit is not installed, so the oracle cannot run "
                     "(python3 kit/scripts/tools.py --platform spectrum get-skoolkit)")
        print(f"ok - spectrum media.py: {len(got['items'])} items of a {len(TZX)}-block TZX and a TAP read as they "
              "must (SkoolKit not installed: oracle skipped)")
        return 0
    tape = parse(tzx.read_bytes())
    assert not getattr(tape, "error", None), tape.error      # SkoolKit 10.1 raises instead
    assert [b.number for b in tape.blocks] == [n for n, _, _ in blocks], "SkoolKit numbers the blocks differently"
    same = 0
    for sk, (n, i, data) in zip(tape.blocks, blocks):
        if i in (0x10, 0x11, 0x14):
            assert bytes(sk.data) == data, f"block {n}: SkoolKit reads other bytes"
            same += 1
    print(f"ok - spectrum media.py: {len(got['items'])} items of a {len(TZX)}-block TZX and a TAP read as they must, "
          f"and SkoolKit numbers the {len(blocks)} blocks the same and reads the same bytes in {same}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
