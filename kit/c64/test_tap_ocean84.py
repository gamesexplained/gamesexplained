#!/usr/bin/env python3
"""The turbo format of kind "ocean84" in the C64's tape reader (kit/c64/tap.py) on a made-up tape.

The tape is written here pulse by pulse as Ocean's loader of 1984 reads it (the interrupt at $04B9
in Roland's Rat Race's boot file): a lead-in of 0 bits, a 1, $AA (which the loader skips), then
blocks of a header byte and 256 bytes until a header of $04. Its stream is screen pages
($0800-$09FF), colour RAM ($00 and $01, so $D800-$D9FF) and a run at $2000; each run of pages is
a block. After it come a stream whose headers are random bytes that end in $04 (no block: its
pages are not in runs), one with a gap in the recording inside it, one with too short a lead-in,
and one that starts with $AA $55, Novaload Special's mark, none of which is read as this format.
The real tape the format was read from is not in the repository.

Usage: test_tap_ocean84.py
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import tap as T  # noqa: E402

FMT = next(f for f in T.TURBO if f.get("kind") == "ocean84")
ZERO, ONE = 304, 688                                # the two pulses of the tape it was read from
GAP = 300000


def page(h):
    return bytes((i * 13 + h * 7) & 255 for i in range(256))


def bits(data):
    return [ONE if v >> b & 1 else ZERO for v in data for b in range(8)]


def stream(headers, lead=2064, gap_at=None, first=0xAA):
    out = [ZERO] * lead + [ONE] + bits(bytes([first]))
    for h in headers:
        out += bits(bytes([h]) + page(h))
    out += bits(bytes([4])) + [ZERO] * 300
    if gap_at is not None:
        out[gap_at] = GAP
    return out


def main():
    W = ([GAP] + stream([0x08, 0x09, 0x00, 0x01, 0x20, 0x21, 0x22]) + [GAP]
         + stream([0x5C, 0xE1, 0x13, 0x88, 0x2F, 0xB0]) + [GAP]
         + stream([0x30, 0x31, 0x32, 0x33], gap_at=5000) + [GAP]
         + stream([0x40, 0x41, 0x42, 0x43], lead=300) + [GAP]
         + stream([0x50, 0x51, 0x52, 0x53], first=0x55) + [GAP])
    its = T.items(W)
    blocks = [i for i in its if i["place"].get("type") == "turbo, " + FMT["name"]]
    want = [(0x0800, page(0x08) + page(0x09)), (0xD800, page(0x00) + page(0x01)),
            (0x2000, page(0x20) + page(0x21) + page(0x22))]
    assert [(b["load"], b["data"]) for b in blocks] == want, [(hex(b["load"]), len(b["data"])) for b in blocks]
    assert blocks[0]["raw"] == bytes([0x08]) + page(0x08) + bytes([0x09]) + page(0x09)
    assert blocks[0]["place"]["pulse"] == 1, blocks[0]["place"]           # the lead-in's first pulse
    assert all("problem" not in b for b in blocks)
    print(f"ok - c64 tap.py Ocean 1984: {len(blocks)} runs of a made-up stream read as they must, and random "
          "headers, a gap, a short lead-in and $AA $55 taken for none")


if __name__ == "__main__":
    main()
