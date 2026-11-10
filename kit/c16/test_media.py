#!/usr/bin/env python3
"""The C16's media reader (kit/c16/media.py) on a made-up tape, as a TAP of version 1 and 2.

The tape is written here, wave by wave, in the two formats the reader knows: the KERNAL's (a
program whose header carries code after its name, a BASIC program whose first writing is
damaged, a data file of two blocks, the end-of-tape block) and Novaload's (a named file of two
blocks and a part of one, a file with no name that ends on a whole block, a file with a byte
changed in its second block). Between them lies a stretch of waves in no format. Each item's
label, place, address, bytes and problem are checked; then the tape goes through the ledger
(kit/scripts/media.py), where the game's listing holds the Novaload file, and the About row says
what the tape holds. The reader's reading of three real tapes is in
kit/lessons/2026-11-10-c16-tape-media.md: this test holds the mechanics, with no game's bytes.

Usage: test_media.py
"""
import json, os, random, subprocess, sys, tempfile
from functools import reduce
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
sys.path[:] = [p for p in sys.path if os.path.abspath(p) != HERE]     # media.py here shadows the ledger's
sys.path.insert(0, os.path.join(KIT, "scripts"))
import media as M  # noqa: E402

R = M.reader("c16")
S, L, W = R.SHORT, R.LONG, R.MARK
ZERO, ONE = 296, 536                                # Novaload's two waves

STAGE = bytes((i * 37 + 11) & 255 for i in range(256))
LOADER = bytes((i * 5 + 1) & 255 or 1 for i in range(171))
BASIC = bytes((i * 13 + 7) & 255 for i in range(120))
GAME = bytes((i * 91 + 5) & 255 for i in range(600))
MORE = bytes((i * 29 + 3) & 255 for i in range(512))
BROKEN = bytes((i * 17 + 9) & 255 for i in range(700))
RECORD = bytes((i * 3 + 2) & 255 for i in range(191))


def kernal_byte(v):
    bits = [v >> n & 1 for n in range(8)]
    bits.append(1 - sum(bits) % 2)                                       # odd parity
    return [W, L] + [x for b in bits for x in ((L, S) if b else (S, L))]


def kernal_block(body, damage_first=False):
    """A block written twice: a leader, the countdown, the bytes, their exclusive or, a long and
    194 shorts."""
    body = bytes(body) + bytes([reduce(lambda a, b: a ^ b, body, 0)])
    out = []
    for n, count in enumerate((range(0x89, 0x80, -1), range(0x09, 0x00, -1))):
        data = bytearray(bytes(count) + body)
        if damage_first and n == 0:
            data[40] ^= 0x10
        out += [S] * 300 + [x for v in data for x in kernal_byte(v)] + [L] + [S] * 194
    return out


def header(kind, name, start=0, end=0, rest=b""):
    return bytes([kind, start & 255, start >> 8, end & 255, end >> 8]) + name.ljust(16).encode() + rest.ljust(171, b" ")


def nova_bits(data):
    return [ONE if v >> n & 1 else ZERO for v in data for n in range(8)]


def novaload(name, load, data, damage=None):
    """A Novaload file: a leader of 0 bits, a 1, $AA, then the name's length, the name, six bytes
    and a checksum, then blocks of 256 bytes with a checksum after each, and a trailer."""
    whole, last = divmod(len(data), 256)
    stream = bytearray([len(name)]) + name + bytes([load - 0x100 & 255, load - 0x100 >> 8, load + len(data) & 255,
                                                    load + len(data) >> 8, last, whole + 1])
    stream.append(sum(stream) & 255)
    for p in range(0, len(data), 256):
        stream += data[p:p + 256]
        stream.append(sum(stream) & 255)
    if damage is not None:
        stream[damage] ^= 0x01
    return [ZERO] * 2063 + [ONE] + nova_bits(b"\xaa") + nova_bits(stream) + [ZERO] * 200, bytes(stream)


def tap(waves, version):
    body = bytearray()
    for w in ([h for x in waves for h in (x // 2, x - x // 2)] if version == 2 else waves):
        body += bytes([w // 8]) if w % 8 == 0 and 0 < w < 2048 else b"\0" + w.to_bytes(3, "little")
    return b"C16-TAPE-RAW" + bytes([version, 2, 0, 0]) + len(body).to_bytes(4, "little") + bytes(body)


def the_tape():
    rnd = random.Random(16)
    game, game_raw = novaload(b"NOVA", 0x1000, GAME)
    more, more_raw = novaload(b"", 0x2000, MORE)
    broken, _ = novaload(b"BAD", 0x3000, BROKEN, damage=1 + 3 + 7 + 257 + 30)      # a byte of its second block
    waves = ([20000]                                                    # the tape's blank start
             + kernal_block(header(3, "STAGE", 0x0140, 0x0240, LOADER)) + kernal_block(STAGE)
             + game
             + kernal_block(header(1, "PLAIN", 0x1001, 0x1001 + len(BASIC)), damage_first=True) + kernal_block(BASIC)
             + [S] * 100 + [rnd.choice((250, 700)) for _ in range(400)] + [S] * 100       # a format of its own
             + more + broken
             + kernal_block(header(4, "SCORES")) + kernal_block(b"\x02" + RECORD) + kernal_block(b"\x02" + RECORD[::-1])
             + kernal_block(header(5, "")))
    return waves, game_raw, more_raw


def run(*args):
    r = subprocess.run([sys.executable, os.path.join(KIT, "scripts", "media.py"), *map(str, args)],
                       capture_output=True, text=True)
    assert r.returncode == 0, f"media.py {' '.join(map(str, args))}\n{r.stdout}{r.stderr}"
    return r.stdout


def check_items(its, game_raw, more_raw):
    labels = [i["label"] for i in its]
    stretch = next(x for x in labels if x.startswith("pulses "))
    assert labels == ["STAGE", "STAGE (header)", "NOVA", "PLAIN", stretch, "Novaload file 2", "BAD", "SCORES"], labels
    by = {i["label"]: i for i in its}

    s = by["STAGE"]
    assert s["place"]["type"] == "program" and s["load"] == 0x0140 and s["data"] == STAGE and "problem" not in s, s["place"]
    assert s["raw"] == header(3, "STAGE", 0x0140, 0x0240, LOADER) + STAGE
    h = by["STAGE (header)"]
    assert h["load"] == 0x0333 and len(h["data"]) == 191 and h["data"][20:] == LOADER, h["place"]
    assert h["place"]["pulse"] == s["place"]["pulse"]

    g = by["NOVA"]
    assert g["place"]["type"] == "Novaload" and g["load"] == 0x1000 and g["data"] == GAME and g["raw"] == game_raw
    assert "problem" not in g
    m = by["Novaload file 2"]
    assert m["load"] == 0x2000 and m["data"] == MORE and m["raw"] == more_raw and "problem" not in m
    b = by["BAD"]
    assert b["data"] == BROKEN[:256], len(b["data"])
    assert b["problem"] == "the checksum after its first 512 bytes is wrong; what came before is listed", b["problem"]

    p = by["PLAIN"]
    assert p["place"]["type"] == "BASIC program" and p["load"] == 0x1001 and p["data"] == BASIC
    assert p["problem"] == "its first writing's checksum is wrong; the copy is listed", p["problem"]
    assert "PLAIN (header)" not in by                                    # nothing but spaces after its name

    u = by[stretch]
    assert u["data"] == b"" and "in a format the kit does not decode" in u["problem"] and "pulses" in u["place"]
    f = by["SCORES"]
    assert f["place"]["type"] == "data file" and f["load"] is None and f["data"] == RECORD + RECORD[::-1]


def main():
    tmp = Path(tempfile.mkdtemp())
    waves, game_raw, more_raw = the_tape()
    v1, v2 = tmp / "side a.tap", tmp / "halves.tap"
    v1.write_bytes(tap(waves, 1))
    v2.write_bytes(tap(waves, 2))
    got = R.items(str(v1))
    assert got["what"] == "tape"
    check_items(got["items"], game_raw, more_raw)
    check_items(R.items(str(v2))["items"], game_raw, more_raw)
    assert R.petscii(b"A\x00b") == "A{00}{62}"

    assert R.is_tone([ZERO] * 200 + [400000] + [S] * 300 + [L] + [S] * 50) and not R.is_tone([S, L, S, S, L] * 20)
    once = R.kernal_blocks(R.kernal_runs([S] * 50 + [x for v in bytes(range(0x89, 0x80, -1)) + b"\x07\x07" for x in kernal_byte(v)]))
    assert once[0]["problem"] == "written once, where the KERNAL writes every block twice", once

    prg = tmp / "game.prg"
    prg.write_bytes(b"\x01\x10" + BASIC)
    one = R.items(str(prg))
    assert one["what"] == "program file" and one["items"][0]["load"] == 0x1001 and one["items"][0]["data"] == BASIC
    assert R.items(str(tmp / "game.crt"))["items"] is None

    # through the ledger: a C16 game whose listing holds the Novaload file
    g = tmp / "game"
    g.mkdir()
    game = {"platform": "c16", "tier": "silver", "created": "2099-01-01"}
    (g / "game.json").write_text(json.dumps(game))
    (g / "listing.json").write_text(json.dumps({"records": [{"a": 0x1000, "b": list(GAME)}]}))
    run("scan", g, f"tape={v1}")
    it = {i["label"]: i for i in json.loads((g / "media.json").read_text())["items"]}
    assert (it["NOVA"]["answer"], it["NOVA"]["at"], it["NOVA"]["matched"]) == ("part", "$1000", len(GAME)), it["NOVA"]
    assert it["STAGE (header)"]["load"] == "$0333" and it["STAGE"]["answer"] == "open"
    run("answer", g, "STAGE*", "loader", "--why", "the stage that starts the turbo loader, and the loader in its header")
    run("answer", g, "*", "data", "--why", "made for the test", "--open-only")
    assert M.problems(str(g), game) == [], M.problems(str(g), game)
    s = M.summary(str(g))
    assert (s["files"], s["stretches"], s["blocks"], s["runs"], s["banks"]) == (7, 1, 0, 0, 0), s
    import build
    row = build.media_row(str(g))
    assert ">The tape holds 7 files and 1 stretch the kit cannot decode." in row, row

    print(f"ok - c16 media.py: {len(got['items'])} items of a made-up tape of {len(waves):,} waves read as they must, "
          "as a TAP of version 1 and of version 2")
    return 0


if __name__ == "__main__":
    sys.exit(main())
