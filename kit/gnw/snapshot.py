#!/usr/bin/env python3
"""Read a Game & Watch snapshot into a flat 64 KB image.

The kit's Game & Watch snapshot is what its server writes (`save` in kit/gnw/gnw.py): JSON,
gzipped, {"format": "kit-gnw-snapshot", "chip": "SM5A", "rom": {"hex": ...}, "state": ...},
where "state" is kit/gnw/sm5a.js's save(), the whole machine. It holds the ROM, so it is a
binary: it stays in work/ (check_binaries.py refuses it anywhere else).

`read` returns 0x10000 bytes:

  $0000-$073F  the ROM in the order the chip runs it, page by page (kit/cpu/sm5a.py, "logical"
               addresses): what the listing walks
  $0740-$0FFF  zero: pages $1D-$1F repeat page $1C, and hold nothing of their own
  $1000-$107F  the data memory, one 4-bit cell a byte, cell n at $1000 + n with the mirrors
               resolved (gnw-reference, "The data memory")
  the rest     zero

  read(path, bank=None) -> bytes, length 0x10000
  rom(path)             -> the 1,856 bytes of the ROM in the ROM's own order
  state(path)           -> the machine's state, as the server saved it

    python3 kit/gnw/snapshot.py <snapshot>    prints the registers and the data memory
"""
import gzip, json, os, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cpu"))
from sm5a import reorder, RAM_BASE, RAM_CELLS   # noqa: E402

SIZE = 0x10000


def cell(a):
    a &= 0x7F
    row, col = a >> 4, a & 0xF
    return min(row, 4) << 4 | min(col, 12)


def load(path):
    with open(path, "rb") as f:
        blob = f.read()
    if blob[:2] == b"\x1f\x8b":
        blob = gzip.decompress(blob)
    try:
        snap = json.loads(blob)
    except ValueError:
        sys.exit(f"{path}: not the kit's Game & Watch snapshot (kit/skills/gnw/tool-gnw-server, \"Snapshots\")")
    if not isinstance(snap, dict) or snap.get("format") != "kit-gnw-snapshot":
        sys.exit(f"{path}: not the kit's Game & Watch snapshot: save one with the server's `save`")
    return snap


def rom(path):
    return bytes.fromhex(load(path)["rom"]["hex"])


def state(path):
    return load(path)["state"]


def read(path, bank=None):
    if bank is not None:
        sys.exit("a Game & Watch has no banks: read(path) alone")
    snap = load(path)
    img = bytearray(SIZE)
    r = reorder(bytes.fromhex(snap["rom"]["hex"]))
    img[0:len(r)] = r
    ram = snap["state"]["ram"]
    for a in range(RAM_CELLS):
        img[RAM_BASE + a] = ram[cell(a)] & 0xF
    return bytes(img)


def main(argv):
    if len(argv) != 1 or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0 if argv and argv[0] in ("-h", "--help") else 2
    s = state(argv[0])
    print("pc %d:%X:%02X  A %X  B %X%X  C %d  CB %d  stack $%03X  div $%04X  cycles %d" % (
        s["pc"] >> 10, s["pc"] >> 6 & 15, s["pc"] & 63, s["acc"], s["bm"], s["bl"], s["c"], s["cb"], s["stack"], s["div"], s["cycles"]))
    img = read(argv[0])
    for row in range(5):
        print("row %d: %s" % (row, " ".join("%X" % img[RAM_BASE + row * 16 + c] for c in range(13))))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
