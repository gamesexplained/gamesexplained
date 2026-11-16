#!/usr/bin/env python3
"""Ocean-Imagine types 2 and 3 in the C64's tape reader (kit/c64/tap.py) on a made-up tape.

The tape is written here pulse by pulse as FT Console 2.76's notes describe the two and as Yie Ar
Kung-Fu and Hyper Sports (Imagine, 1985) hold them: a lead-in of 0 bits, a 1, $AA, then blocks of
a flags byte, a page byte and 256 bytes. A type 2 stream ends with a page byte of $00 and $00
after it, a type 3 stream with $02 and $02 (its trailer is $02 bytes). After them come a stream
whose pages are random bytes (no block: its pages are not in runs), one with a gap in the
recording inside it, and one with no $AA, which the "pages" row reads instead (Ocean-Imagine type
1). The real tapes the formats were read from are not in the repository.

Usage: test_tap_ocean_imagine.py
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import tap as T  # noqa: E402

FMT = next(f for f in T.TURBO if f["name"] == "Ocean-Imagine, pages after $AA")
PAGES = next(f for f in T.TURBO if f["name"] == "pages after a 1 bit")
ZERO, ONE = 288, 688                                # the two pulses of the tapes they were read from
GAP = 300000


def page(h):
    return bytes((i * 5 + h * 11) & 255 for i in range(256))


def bits(data):
    return [ONE if v >> b & 1 else ZERO for v in data for b in range(8)]


def stream(pages, end, flag=True, gap_at=None):
    out = [ZERO] * 3000 + [ONE] + (bits(b"\xAA") if flag else [])
    for f, h in pages:
        out += bits(bytes([f, h]) + page(h))
    out += bits(end) + [ZERO] * 300
    if gap_at is not None:
        out[gap_at] = GAP
    return out


def main():
    W = ([GAP] + stream([(0x00, 0xA0), (0x00, 0xA1), (0x88, 0x04), (0x88, 0x05), (0x00, 0x20)], b"\x00\x00\x00") + [GAP]
         + stream([(0x02, 0x30), (0x02, 0x31), (0x82, 0x32), (0x02, 0x33)], b"\x02\x02\x02\x02\x02") + [GAP]
         + stream([(0, 0x5C), (0, 0xE1), (0, 0x13), (0, 0x88), (0, 0x2F)], b"\x00\x00\x00") + [GAP]
         + stream([(0, 0x40), (0, 0x41), (0, 0x42), (0, 0x43)], b"\x00\x00\x00", gap_at=5000) + [GAP]
         + stream([(0, 0x60), (0, 0x61)], b"\x00\x00", flag=False) + [GAP])
    its = T.items(W)
    got = [(b["place"]["type"], b["load"], b["data"]) for b in its if b["label"].startswith("turbo block")]
    oi, pg = "turbo, " + FMT["name"], "turbo, " + PAGES["name"]
    want = [(oi, 0xA000, page(0xA0) + page(0xA1)), (oi, 0x0400, page(0x04) + page(0x05)), (oi, 0x2000, page(0x20)),
            (oi, 0x3000, page(0x30) + page(0x31) + page(0x32) + page(0x33)),
            (pg, 0x6000, page(0x60) + page(0x61))]
    assert got == want, [(t, hex(a), len(d)) for t, a, d in got]
    first = next(b for b in its if b["label"].startswith("turbo block"))
    assert first["raw"][:2] == bytes([0x00, 0xA0]) and first["place"]["pulse"] == 1, (first["raw"][:2], first["place"])
    print(f"ok - c64 tap.py Ocean-Imagine: a type 2 and a type 3 stream read in {len(want) - 1} runs, random pages and "
          "a gap taken for none, and a stream with no $AA left to \"pages\"")


if __name__ == "__main__":
    main()
