#!/usr/bin/env python3
"""The C64's tape reader (kit/c64/tap.py) on a tape the KERNAL wrote, and on a made-up one.

The first is kit/c64/fixtures/tape-kernal-save.json: the pulses VICE's datasette recorded while
the C64's own KERNAL saved a one-line BASIC program and 700 bytes of made-up code, kept as the
TAP's data, compressed. The reader must give back the two files, byte for byte, with the types
and addresses they were saved with, from the TAP as version 1 and as version 0. That holds the
pulse lengths and the format to the machine, where a tape written here could only agree with
itself. `test_tap.py record` makes the fixture again, with the emulator running
(python3 kit/scripts/tools.py vice).

The second is written here, pulse by pulse: a program whose header carries code after its name,
a BASIC program whose first writing is damaged, a stretch in a format of its own, a data file of
two blocks, and the end-of-tape block. Each item's label, place, address, bytes and problem are
checked, `tap.py` lists it, `tap.py extract` writes its programs, and the media ledger
(kit/scripts/media.py) takes it for a C64 game. No game's bytes are here.
"""
import base64, json, os, random, subprocess, sys, tempfile, zlib
from functools import reduce
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
FIXTURE = os.path.join(HERE, "fixtures", "tape-kernal-save.json")
sys.path.insert(0, HERE)
import tap  # noqa: E402

S, M, L = 376, 528, 696                             # as the fixture's KERNAL wrote them

LINE = bytes.fromhex("1b080a00992248454c4c4f223a8f20534f4d45204241534943000000")   # 10 PRINT"HELLO":REM SOME BASIC
CODE = bytes((i * 7 + 3) & 255 for i in range(700))
STAGE = bytes((i * 37 + 11) & 255 for i in range(256))
LOADER = bytes((i * 5 + 1) & 255 or 1 for i in range(171))
BASIC = bytes((i * 13 + 7) & 255 for i in range(120))
RECORD = bytes((i * 3 + 2) & 255 for i in range(191))


# --- the tape the KERNAL wrote -------------------------------------------------------------------

def record():
    """Have the KERNAL save LINE and CODE to a tape in the running emulator, and keep the pulses."""
    import datetime, time
    import codemap, vice
    from tools import vice_build
    rpc = vice.connect()
    path = os.path.join(KIT, "..", "tools", "vice-home", "kit-tape-record.tap")
    path = os.path.abspath(path)
    with open(path, "wb") as f:                     # the emulator attaches no empty tape: a short tone to start on
        f.write(b"C64-TAPE-RAW" + bytes([1, 0, 0, 0]) + (64).to_bytes(4, "little") + b"\x30" * 64)
    vice.reset(rpc, "hard")
    vice.warp(rpc, True)
    time.sleep(3)
    try:
        vice.tape(rpc, path, play=False)
        codemap.monitor("tapectrl 4", rpc)                                      # RECORD
        vice.ask(rpc, "vice_keyboard_type", {"text": '10 PRINT"HELLO":REM SOME BASIC\n'})
        time.sleep(1)
        vice.ask(rpc, "vice_keyboard_type", {"text": 'SAVE"BASIC ONE",1\n'})    # type 1: a relocatable program
        time.sleep(25)
        codemap.monitor("tapectrl 4", rpc)
        vice.poke(rpc, 0xC000, CODE)
        vice.poke(rpc, 0xCF40, b"CODE")
        vice.poke(rpc, 0xCF00, bytes([0xA9, 0x01, 0xA2, 0x01, 0xA0, 0x01, 0x20, 0xBA, 0xFF,      # SETLFS 1,1,1: type 3
                                      0xA9, 0x04, 0xA2, 0x40, 0xA0, 0xCF, 0x20, 0xBD, 0xFF,      # SETNAM "CODE"
                                      0xA9, 0x00, 0x85, 0xFB, 0xA9, 0xC0, 0x85, 0xFC,            # from $C000
                                      0xA9, 0xFB, 0xA2, 0xBC, 0xA0, 0xC2, 0x20, 0xD8, 0xFF, 0x60]))   # SAVE to $C2BC
        vice.ask(rpc, "vice_keyboard_type", {"text": "SYS52992\n"})
        time.sleep(25)
        codemap.monitor("tapectrl 0", rpc)
        codemap.monitor("detach 1", rpc)
    finally:
        vice.warp(rpc, False)
    with open(path, "rb") as f:
        blob = f.read()
    os.remove(path)
    assert blob[12] == 1, "the emulator wrote another TAP version"
    with open(FIXTURE, "w") as f:
        json.dump({"source": "kit/c64/test_tap.py record", "recorded": datetime.date.today().isoformat(),
                   "emulator": f"VICE {vice.ask(rpc, 'vice_ping', {}).get('version', '?')}, {vice_build()}", "what": "the C64 KERNAL's SAVE of a one-line BASIC program "
                   "(device 1, secondary address 0) and of 700 made-up bytes at $C000 (secondary address 1), "
                   "as the datasette recorded it: the data of a TAP of version 1, zlib-compressed, in base64",
                   "data": base64.b64encode(zlib.compress(blob[20:], 9)).decode()}, f, indent=1)
        f.write("\n")
    print(f"{FIXTURE}: {len(blob) - 20:,} bytes of pulses")


def as_version_0(data):
    """A version 1 TAP's data as version 0: a pulse too long for a byte becomes a zero alone."""
    out, p = bytearray(), 0
    while p < len(data):
        out.append(data[p])
        p += 4 if data[p] == 0 else 1
    return bytes(out)


def check_fixture():
    with open(FIXTURE) as f:
        fix = json.load(f)
    data = zlib.decompress(base64.b64decode(fix["data"]))
    for version, body in ((1, data), (0, as_version_0(data))):
        W = tap.waves(b"C64-TAPE-RAW" + bytes([version, 0, 0, 0]) + len(body).to_bytes(4, "little") + body)
        its = tap.items(W)
        assert [(i["label"], i["place"]["type"], i["load"], i.get("problem")) for i in its] == \
            [("BASIC ONE", "relocatable program", 0x0801, None), ("CODE", "program", 0xC000, None)], its
        assert its[0]["data"] == LINE and its[1]["data"] == CODE
        blocks = tap.kernal_blocks(tap.kernal_runs(W))
        assert [(len(b["data"]), b["copies"]) for b in blocks] == [(192, 2), (len(LINE), 2), (192, 2), (len(CODE), 2)], blocks
        assert blocks[0]["data"][:21] == b"\x01\x01\x08\x1d\x08BASIC ONE       " and not blocks[0]["data"][21:].strip(b" ")
    return fix, len(W)


# --- a made-up tape ------------------------------------------------------------------------------

def kernal_byte(v):
    bits = [v >> n & 1 for n in range(8)]
    bits.append(1 - sum(bits) % 2)                                       # odd parity
    return [L, M] + [x for b in bits for x in ((M, S) if b else (S, M))]


def kernal_block(body, damage_first=False):
    """A block written twice: a leader, the countdown, the bytes, their exclusive or, a long and
    a short, and a trailer."""
    body = bytes(body) + bytes([reduce(lambda a, b: a ^ b, body, 0)])
    out = []
    for n, count in enumerate((range(0x89, 0x80, -1), range(0x09, 0x00, -1))):
        data = bytearray(bytes(count) + body)
        if damage_first and n == 0:
            data[40] ^= 0x10
        out += [S] * 300 + [x for v in data for x in kernal_byte(v)] + [L, S] + [S] * 78
    return out


def header(kind, name, start=0, end=0, rest=b""):
    return bytes([kind, start & 255, start >> 8, end & 255, end >> 8]) + name.ljust(16).encode() + rest.ljust(171, b" ")


def tap_file(waves, version):
    body = bytearray()
    for w in waves:
        if w % 8 == 0 and 0 < w < 2048:
            body.append(w // 8)
        else:
            body += b"\0" + (w.to_bytes(3, "little") if version == 1 else b"")
    return b"C64-TAPE-RAW" + bytes([version, 0, 0, 0]) + len(body).to_bytes(4, "little") + bytes(body)


def the_tape():
    rnd = random.Random(64)
    return ([400000]                                                    # the tape's blank start
            + kernal_block(header(3, "STAGE", 0x02A7, 0x03A7, LOADER)) + kernal_block(STAGE)
            + [S] * 2000 + [rnd.choice((216, 328)) for _ in range(5000)] + [S] * 100      # a fast format of its own
            + kernal_block(header(1, "PLAIN", 0x0801, 0x0801 + len(BASIC)), damage_first=True) + kernal_block(BASIC)
            + kernal_block(header(4, "SCORES")) + kernal_block(b"\x02" + RECORD) + kernal_block(b"\x02" + RECORD[::-1])
            + kernal_block(header(5, "")))


def check_items(its):
    labels = [i["label"] for i in its]
    stretch = next(x for x in labels if x.startswith("pulses "))
    assert labels == ["STAGE", "STAGE (header)", stretch, "PLAIN", "SCORES"], labels
    by = {i["label"]: i for i in its}
    s = by["STAGE"]
    assert s["place"]["type"] == "program" and s["load"] == 0x02A7 and s["data"] == STAGE and "problem" not in s, s["place"]
    assert s["raw"] == header(3, "STAGE", 0x02A7, 0x03A7, LOADER) + STAGE
    h = by["STAGE (header)"]
    assert h["load"] == 0x033C and len(h["data"]) == 192 and h["data"][21:] == LOADER, h["place"]   # the code is at $0351
    assert h["place"]["pulse"] == s["place"]["pulse"]
    p = by["PLAIN"]
    assert p["place"]["type"] == "relocatable program" and p["load"] == 0x0801 and p["data"] == BASIC
    assert p["problem"] == "its first writing's checksum is wrong; the copy is listed", p["problem"]
    assert "PLAIN (header)" not in by                                    # nothing but spaces after its name
    u = by[stretch]
    a, b = u["place"]["pulses"]                                          # the stretch, with the tones around it
    assert u["data"] == b"" and "in a format the kit does not decode" in u["problem"] and 5000 <= b - a < 8000, u
    f = by["SCORES"]
    assert f["place"]["type"] == "data file" and f["load"] is None and f["data"] == RECORD + RECORD[::-1]


def run(script, *args):
    r = subprocess.run([sys.executable, os.path.join(KIT, script), *map(str, args)], capture_output=True, text=True)
    assert r.returncode == 0, f"{script} {' '.join(map(str, args))}\n{r.stdout}{r.stderr}"
    return r.stdout


def main():
    fix, pulses = check_fixture()

    tmp = Path(tempfile.mkdtemp())
    waves = the_tape()
    v1, v0 = tmp / "side a.tap", tmp / "old.tap"
    v1.write_bytes(tap_file(waves, 1))
    v0.write_bytes(tap_file(waves, 0))
    check_items(tap.read(str(v1)))
    check_items(tap.read(str(v0)))

    once = tap.kernal_blocks(tap.kernal_runs([S] * 50 + [x for v in bytes(range(0x89, 0x80, -1)) + b"\x07\x07" for x in kernal_byte(v)]))
    assert once[0]["problem"] == "written once, where the KERNAL writes every block twice", once
    assert tap.is_tone([S] * 200 + [400000] + [M] * 300) and not tap.is_tone([S, M, S, S, M] * 20)
    for bad, why in ((b"C16-TAPE-RAW" + bytes(8), "not a C64 TAP"), (b"C64-TAPE-RAW\x02" + bytes(7), "TAP version 2")):
        (tmp / "bad.tap").write_bytes(bad)
        r = subprocess.run([sys.executable, os.path.join(HERE, "tap.py"), tmp / "bad.tap"], capture_output=True, text=True)
        assert r.returncode and why in r.stderr, r.stderr

    # the tool: list and extract
    out = run("c64/tap.py", "list", v1)
    assert out == run("c64/tap.py", v1)
    assert "4 items in the KERNAL's format" in out and "$02A7-$03A7" in out and "STAGE (header)" in out, out
    assert "pulses in a format the kit does not decode" in out and "seconds of tape" in out and "data file" in out, out
    run("c64/tap.py", "extract", v1, tmp / "files")
    got = {p.name: p.read_bytes() for p in (tmp / "files").iterdir()}
    assert got == {"STAGE.prg": b"\xa7\x02" + STAGE, "STAGE.header.prg": b"\x3c\x03" + header(3, "STAGE", 0x02A7, 0x03A7, LOADER),
                   "PLAIN.prg": b"\x01\x08" + BASIC}, sorted(got)
    assert tap.file_name("A/B*") == "A$2FB$2A"

    # through the ledger: a C64 game whose listing holds the program the KERNAL loads
    sys.path[:] = [p for p in sys.path if os.path.abspath(p) != HERE]     # media.py here shadows the ledger's
    sys.path.insert(0, os.path.join(KIT, "scripts"))
    import media as ledger
    g = tmp / "game"
    g.mkdir()
    game = {"platform": "c64", "tier": "silver", "created": "2099-01-01"}
    (g / "game.json").write_text(json.dumps(game))
    (g / "listing.json").write_text(json.dumps({"records": [{"a": 0x02A7, "b": list(STAGE)}]}))
    run("scripts/media.py", "scan", g, f"tape={v1}")
    it = {i["label"]: i for i in json.loads((g / "media.json").read_text())["items"]}
    assert (it["STAGE"]["answer"], it["STAGE"]["at"], it["STAGE"]["matched"]) == ("part", "$02A7", len(STAGE)), it["STAGE"]
    assert it["STAGE (header)"]["load"] == "$033C" and it["PLAIN"]["answer"] == "open"
    assert len(ledger.problems(str(g), game)) > 0                         # a new Silver game answers every item
    run("scripts/media.py", "answer", g, "*", "data", "--why", "made for the test", "--open-only")
    assert ledger.problems(str(g), game) == [], ledger.problems(str(g), game)
    s = ledger.summary(str(g))
    assert (s["files"], s["stretches"], s["blocks"]) == (4, 1, 0), s

    print(f"ok - tap.py: the two files the KERNAL saved in {fix['emulator']} read back from {pulses:,} pulses, as a TAP of "
          f"version 1 and of version 0; {len(tap.read(str(v1)))} items of a made-up tape read as they must, listed, "
          "extracted and taken by the ledger")
    return 0


if __name__ == "__main__":
    if sys.argv[1:] == ["record"]:
        record()
        sys.exit(0)
    sys.exit(main())
