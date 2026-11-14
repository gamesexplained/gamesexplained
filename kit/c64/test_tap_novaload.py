#!/usr/bin/env python3
"""The turbo format of kind "novaload" in the C64's tape reader (kit/c64/tap.py) on a made-up tape.

The tape is written here pulse by pulse as Novaload's loader reads it
(games/c64/mike-reads-computer-pop-quiz/orientation.md, "The loader"): a lead-in of 0 bits, a 1,
$AA, the name's length, the name, six bytes of header, a checksum, then each page with a checksum
after it. Its files are one that ends part-way into a page, one of whole pages (its header counts
one page more, with no bytes in it) and one of a single short page. After them come a file whose
page checksum is wrong (listed to that page, with its problem, and the rest left unread), a stream of the "pages" kind whose first byte
is $AA (its header checksum is wrong, so it is no Novaload file and "pages" reads it), a file with
too short a lead-in (none), one with a gap in the recording inside it and one the tape cuts off
after its header (both listed, with their problems).
The real tape the format was read from is not in the repository.

Usage: test_tap_novaload.py
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import tap as T  # noqa: E402

FMT = next(f for f in T.TURBO if f.get("kind") == "novaload")
PAGES = next(f for f in T.TURBO if f["name"] == "pages after a 1 bit")
ZERO, ONE = 312, 712                                # the two pulses of the tape it was read from
GAP = 300000


def body(n, salt):
    return bytes((i * 11 + salt) & 255 for i in range(n))


def bits(data):
    return [ONE if v >> b & 1 else ZERO for v in data for b in range(8)]


def novaload(name, load, data, lead=2064, spoil=None, gap_at=None, cut=None, tail=50):
    """A file's pulses. spoil: "header" or "page" makes that checksum wrong."""
    end = (load + len(data)) & 0xFFFF
    head = [load & 255, ((load >> 8) - 1) & 255, end & 255, end >> 8, len(data) % 256, len(data) // 256 + 1]
    out, total = bytearray([len(name)]) + name + bytes(head), 0
    def check(kind):
        out.append((sum(out) + (1 if spoil == kind else 0)) & 255)
    check("header")
    for p in range(0, len(data), 256):
        out += data[p:p + 256]
        check("page")
    pulses = [ZERO] * lead + [ONE] + bits(b"\xAA" + bytes(out))
    if gap_at is not None:
        pulses[gap_at] = GAP
    if cut is not None:
        pulses = pulses[:cut]
    return pulses + [ZERO] * tail


def pages_stream(n, data):
    return [280] * 4000 + [648] + bits(bytes([0xAA, n]) + data + bytes([0, 0])) + [280] * 50


def main():
    good = [(b"0", 0x1000, body(600, 1)), (b"3", 0x4200, body(512, 2)), (b"NOVA", 0x4000, body(239, 3))]
    W = [GAP]
    for name, load, data in good:
        W += novaload(name, load, data) + [GAP]
    W += novaload(b"BAD", 0x2000, body(300, 4), spoil="page") + [GAP]
    W += pages_stream(0x60, body(256, 5)) + [GAP]
    W += novaload(b"S", 0x3000, body(100, 6), lead=100) + [GAP]
    W += novaload(b"T", 0x3000, body(700, 7), gap_at=3000) + [GAP]
    W += novaload(b"C", 0x3000, body(700, 8), cut=2064 + 1 + 8 * 200)
    its = T.items(W)
    nova = [i for i in its if i["place"].get("type") == "turbo, " + FMT["name"]]
    names = [i["label"].split('"')[1] for i in nova]
    assert names == ["0", "3", "NOVA", "BAD", "T", "C"], names
    for it, (name, load, data) in zip(nova, good):
        assert (it["load"], it["data"]) == (load, data) and "problem" not in it, (it["label"], hex(it["load"]), it.get("problem"))
        assert it["raw"][:1 + len(name)] == bytes([len(name)]) + name, it["raw"][:8]
    assert nova[0]["place"]["pulse"] == 1, nova[0]["place"]                 # the lead-in's first pulse
    assert "checksum is wrong after 256 bytes" in nova[3]["problem"] and nova[3]["data"] == body(256, 4), nova[3].get("problem")
    assert "gap in the recording" in nova[4]["problem"], nova[4].get("problem")
    pages = [i for i in its if i["place"].get("type") == "turbo, " + PAGES["name"]]
    assert [(p["load"], p["data"]) for p in pages] == [(0x6000, body(256, 5))], [(hex(p["load"]), len(p["data"])) for p in pages]
    assert "the tape ends 0 bytes into it" in nova[5]["problem"], nova[5].get("problem")
    rest = [i["label"] for i in its if "pulses" in i["place"]]
    # unread: what follows the page of "BAD" whose checksum is wrong, and the file with the short lead-in
    # ("BAD": the lead-in and the 1, then $AA, the length, the name, 6 header bytes, a checksum, a page, a checksum)
    after_bad = nova[3]["place"]["pulse"] + 2064 + 1 + 8 * (1 + 1 + 3 + 6 + 1 + 256 + 1)
    assert len(rest) == 2 and rest[0].startswith(f"pulses {after_bad}-"), (rest, after_bad)
    # Novaload Special: $AA $55, then a page byte, 256 bytes and the sum of the two per block, until page $00
    def special(heads, spoil=None):
        out = bytearray([0xAA, 0x55])
        for n, h in enumerate(heads):
            data = body(256, h)
            out += bytes([h]) + data + bytes([(h + sum(data) + (1 if n == spoil else 0)) & 255])
        return [ZERO] * 2064 + [ONE] + bits(bytes(out) + bytes([0, 0])) + [ZERO] * 300
    S = [GAP] + special([0x20, 0x21, 0x22, 0x80, 0x81]) + [GAP] + special([0x30, 0x31, 0x32], spoil=1) + [GAP]
    sp = [i for i in T.items(S) if i["place"].get("type") == "turbo, " + FMT["name"]]
    assert [(b["load"], b["data"], b.get("problem")) for b in sp] == [
        (0x2000, body(256, 0x20) + body(256, 0x21) + body(256, 0x22), None), (0x8000, body(256, 0x80) + body(256, 0x81), None),
        (0x3000, body(256, 0x30) + body(256, 0x31) + body(256, 0x32), "the checksums of 1 of its 3 pages are wrong")], \
        [(hex(b["load"]), len(b["data"]), b.get("problem")) for b in sp]
    assert sp[0]["label"] == "turbo block 1" and sp[0]["raw"][:1] == b"\x20", (sp[0]["label"], sp[0]["raw"][:1])
    print(f"ok - c64 tap.py Novaload: {len(good)} files of a made-up tape read as they must, a wrong page checksum, "
          "a gap and a cut-off file reported, a $AA stream left to \"pages\", and a short lead-in taken for none; "
          "Novaload Special in runs of pages, a wrong checksum reported")


if __name__ == "__main__":
    main()
