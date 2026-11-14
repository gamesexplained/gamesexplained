#!/usr/bin/env python3
"""The turbo format of kind "pages" in the C64's tape reader (kit/c64/tap.py) on a made-up tape.

The tape is written here pulse by pulse: a lead-in of 0 bits, a 1, then pages of a flags byte,
the page's number and 256 bytes, ending with a page numbered 0, as the loader read in
games/c64/short-circuit/orientation.md ("The loader") takes them. Its pages are a run of two
($1000-$11FF), one page loaded twice ($A000, with other bytes the second time) and a run that
ends at the top of memory ($FF00). After it come a stream with too short a lead-in, one the tape
cuts off before its page 0, and one with a gap in the recording inside it, none of which is a block.
Each block's address, bytes, raw bytes and place are checked. The real tape the format was
read from is not in the repository.

Usage: test_tap_pages.py
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import tap as T  # noqa: E402

FMT = next(f for f in T.TURBO if f.get("kind") == "pages")
ZERO, ONE = 280, 648                                # the two pulses of the tape it was read from
GAP = 300000


def page(n, salt):
    return bytes((i * 7 + n * 3 + salt) & 255 for i in range(256))


def bits(data):
    return [ONE if v >> b & 1 else ZERO for v in data for b in range(8)]


def stream(pages, lead=4000, end=True, gap_at=None, tail=50):
    out = [ZERO] * lead + [ONE]
    for flags, n, data in pages:
        out += bits(bytes([flags, n]) + data)
    if end:
        out += bits(bytes([0, 0]))
    if gap_at is not None:
        out[gap_at] = GAP
    return out + [ZERO] * tail


def main():
    good = [(0x00, 0x10, page(0x10, 1)), (0x00, 0x11, page(0x11, 1)), (0x80, 0xA0, page(0xA0, 2)),
            (0x22, 0xFF, page(0xFF, 3)), (0xA0, 0xA0, page(0xA0, 4))]
    W = ([GAP] + stream(good) + [GAP]
         + stream([(0, 0x20, page(0x20, 5))], lead=100) + [GAP]
         + stream([(0, 0x30, page(0x30, 6))], end=False, tail=0) + [GAP]
         + stream([(0, 0x40, page(0x40, 7))], gap_at=4500) + [GAP])
    its = T.items(W)
    blocks = [i for i in its if i["label"].startswith("turbo block")]
    want = [(0x1000, page(0x10, 1) + page(0x11, 1)), (0xA000, page(0xA0, 2)), (0xFF00, page(0xFF, 3)),
            (0xA000, page(0xA0, 4))]
    assert [(b["load"], b["data"]) for b in blocks] == want, [(hex(b["load"]), len(b["data"])) for b in blocks]
    assert blocks[0]["raw"] == bytes([0, 0x10]) + page(0x10, 1) + bytes([0, 0x11]) + page(0x11, 1)
    assert blocks[2]["raw"][:2] == bytes([0x22, 0xFF]) and blocks[3]["raw"][:2] == bytes([0xA0, 0xA0])
    assert all(b["place"]["type"] == "turbo, " + FMT["name"] and "problem" not in b for b in blocks), blocks[0]["place"]
    assert blocks[0]["place"]["pulse"] == 1, blocks[0]["place"]           # the lead-in's first pulse
    pulses = [b["place"]["pulse"] for b in blocks]
    assert pulses == sorted(pulses) and len(set(pulses)) == 4, pulses
    rest = [i["label"] for i in its if not i["label"].startswith("turbo block")]
    assert rest and all(x.startswith("pulses ") for x in rest), rest     # the three that are no blocks, left unread
    print(f"ok - c64 tap.py pages: {len(blocks)} blocks of a made-up stream read as they must, "
          "and a short lead-in, a missing page 0 and a gap taken for none")


if __name__ == "__main__":
    main()
