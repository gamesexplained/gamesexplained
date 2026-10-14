#!/usr/bin/env python3
"""Read a BBC Micro snapshot into a flat 64 KB image.

The kit's BBC snapshot is jsbeeb's own format, which the kit's server writes
(`save` in kit/bbc/jsbeeb.py) and jsbeeb's page reads: JSON, gzipped, whose
`state` holds the machine. Its byte arrays are objects
{"__typedArray": true, "type": "Uint8Array", "data": base64}, with
"encoding": "deflate" when the bytes are zlib-compressed first (jsbeeb does that
from 1 KB up). `state.ram` is jsbeeb's whole RAM area, 128 KB: the Model B's
32 KB at the start, then on a Master its private and shadow RAM.

`read` returns 0x10000 bytes as the program saw them:

  $0000-$7FFF  the 32 KB of main RAM
  $8000-$BFFF  the sideways bank that was paged in (ROMSEL), when it is RAM: the kit's
               server saves the RAM banks in `state.swRamBanks`. A ROM bank (BASIC, a
               filing system) is zero here, as is a RAM bank in a file saved by jsbeeb's
               own page, which leaves the banks out
  $C000-$FFFF  zero: the MOS ROM and the I/O pages, never the game

`read(path, bank=n)` returns sideways RAM bank n at $8000-$BFFF and zero elsewhere,
for a part of a game that is one sideways bank (kit/scripts/parts.py).

B-em and beebjit states (BEMSNAP) and BeebEm's (UEF) are refused, naming the format:
the kit's server loads both, and `save` then writes this one.

  read(path, bank=None) -> bytes, length 0x10000
  header(path)          -> the model, the registers, ROMSEL, the cycle count and
                           what the kit's server recorded (snap["kit"])

Usage:
  snapshot.py <file>            print the model, the registers and the first bytes

Its test is kit/bbc/test_snapshot.py.
"""
import base64, gzip, json, os, sys, zlib

RAM_SIZE = 0x10000
MAIN_RAM = 0x8000           # the Model B's RAM: $0000-$7FFF
BANK = 0x4000               # a sideways bank, at $8000-$BFFF
FORMAT = "jsbeeb-snapshot"


def _bytes(v):
    """A jsbeeb typed array, as bytes."""
    if not (isinstance(v, dict) and v.get("__typedArray")):
        raise ValueError("not a jsbeeb typed array")
    if v.get("type") != "Uint8Array":
        raise ValueError(f"a {v.get('type')}, not a Uint8Array")
    b = base64.b64decode(v["data"])
    enc = v.get("encoding")
    if enc == "deflate":
        return zlib.decompress(b)
    if enc is not None:
        raise ValueError(f"encoding {enc!r}")
    return b


def load(path):
    """The snapshot as a dict. Exits, saying what it saw, on anything else."""
    if not os.path.isfile(path):
        sys.exit(f"{path}: no such snapshot")
    blob = open(path, "rb").read()
    if blob.startswith(b"BEMSNAP"):
        sys.exit(f"{path}: a B-em or beebjit state ({blob[:8].decode('latin-1')!r}), not the kit's snapshot. "
                 "Load it in the kit's server and save it again: kit/skills/bbc/tool-jsbeeb, \"Snapshots\"")
    if blob.startswith(b"UEF File!"):
        sys.exit(f"{path}: a UEF file (a BeebEm state, or a tape), not the kit's snapshot. A BeebEm "
                 "state loads in the kit's server and saves as one: kit/skills/bbc/tool-jsbeeb, \"Snapshots\"")
    if blob[:2] == b"\x1f\x8b":
        try:
            blob = gzip.decompress(blob)
        except (OSError, EOFError, zlib.error) as e:
            sys.exit(f"{path}: gzip data that does not decompress ({e})")
    try:
        snap = json.loads(blob)
    except (ValueError, UnicodeDecodeError):
        sys.exit(f"{path}: not a jsbeeb snapshot (neither gzipped JSON nor JSON; {len(blob)} bytes). "
                 "The BBC Micro's snapshot is jsbeeb's: kit/skills/bbc/tool-jsbeeb, \"Snapshots\"")
    if not isinstance(snap, dict) or snap.get("format") != FORMAT:
        sys.exit(f"{path}: JSON, but its format is {snap.get('format') if isinstance(snap, dict) else None!r}, "
                 f"not {FORMAT!r}")
    return snap


def _ram(snap, path):
    try:
        ram = _bytes(snap["state"]["ram"])
    except (KeyError, TypeError, ValueError, zlib.error) as e:
        sys.exit(f"{path}: a jsbeeb snapshot whose state.ram cannot be read ({e})")
    if len(ram) < MAIN_RAM:
        sys.exit(f"{path}: state.ram is {len(ram)} bytes, less than the 32 KB of main RAM")
    return ram


def _banks(snap, path):
    """The sideways RAM banks the file holds, {number: 16 KB}."""
    out = {}
    for k, v in ((snap.get("state") or {}).get("swRamBanks") or {}).items():
        try:
            out[int(k)] = _bytes(v)[:BANK]
        except (ValueError, zlib.error) as e:
            sys.exit(f"{path}: sideways RAM bank {k} cannot be read ({e})")
    return out


def read(path, bank=None):
    """The 64 KB image described above."""
    snap = load(path)
    image = bytearray(RAM_SIZE)
    banks = _banks(snap, path)
    if bank is not None:
        if bank not in banks:
            sys.exit(f"{path}: no sideways RAM bank {bank} in this file (it holds "
                     f"{', '.join(map(str, sorted(banks))) or 'none'})")
        image[0x8000:0xC000] = banks[bank]
        return bytes(image)
    image[0:MAIN_RAM] = _ram(snap, path)[0:MAIN_RAM]
    paged = (snap["state"].get("romsel") or 0) & 15
    if paged in banks:
        image[0x8000:0xC000] = banks[paged]
    return bytes(image)


def header(path):
    snap = load(path)
    s = snap.get("state") or {}
    return {"model": snap.get("model"), "version": snap.get("version"),
            "pc": s.get("pc"), "a": s.get("a"), "x": s.get("x"), "y": s.get("y"), "s": s.get("s"),
            "p": s.get("p"), "romsel": s.get("romsel"), "acccon": s.get("acccon"),
            "cycles": s.get("currentCycles"), "seconds": s.get("cycleSeconds"),
            "sideways_ram": sorted(int(k) for k in (s.get("swRamBanks") or {})),
            "kit": snap.get("kit")}


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    h = header(argv[0])
    ram = read(argv[0])
    print(f"{argv[0]}: {h['model']}, PC &{h['pc']:04X} A &{h['a']:02X} X &{h['x']:02X} Y &{h['y']:02X} "
          f"S &{h['s']:02X} P &{h['p']:02X}, ROMSEL &{h['romsel']:02X}, sideways RAM saved: "
          f"{', '.join(map(str, h['sideways_ram'])) or 'none'}")
    print(f"first 16 bytes: {ram[:16].hex(' ')}")


if __name__ == "__main__":
    main()
