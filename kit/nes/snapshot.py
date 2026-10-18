#!/usr/bin/env python3
"""Read an NES snapshot into a flat 64 KB image.

The kit's NES snapshot is what the kit's server writes (`save` in kit/nes/jsnes.py):
JSON, gzipped, {"format": "kit-nes-snapshot", "kit": {...}, "state": jsnes's own toJSON()}.
`state.cpu.mem` is jsnes's CPU array, 65,536 numbers, which holds the 2 KB of RAM at
$0000-$07FF, the cartridge's RAM at $6000-$7FFF, and the PRG ROM banks the mapper had
selected at $8000-$FFFF (jsnes copies a bank into it when the mapper switches one in;
jsnes, src/mappers/mapper0.js, loadRomBank).

`read` returns 0x10000 bytes, each address holding the bytes that are its own:

  $0000-$07FF  the 2 KB of RAM
  $0800-$1FFF  zero. These are the RAM's three mirrors, which hold nothing of their own: a
               copy there would read to listing.py as data loaded into an excluded area,
               and jsnes leaves stale bytes in its array there anyway, since it masks
               every access to the first 2 KB
  $2000-$5FFF  zero: the PPU's and the APU's registers and the unused expansion area,
               never the game
  $6000-$7FFF  the cartridge's RAM, or zero on a board with none
  $8000-$FFFF  the PRG ROM as it was mapped when the snapshot was saved

The PPU's memory is not in the image: `ppu(path)` gives it, $0000-$3FFF with the
nametables' mirroring applied, and `oam(path)` the 256 bytes of the sprite table.

`read(path, bank=n)` is refused: a bank the mapper had not selected is not in the snapshot,
and no game on the platform has needed one yet (kit/skills/nes/steps, "snapshot").

  read(path, bank=None) -> bytes, length 0x10000
  ppu(path)             -> bytes, length 0x4000
  oam(path)             -> bytes, length 0x100
  registers(path)       -> {"ctrl", "mask", "scrollX", "scrollY"}: PPUCTRL and PPUMASK as last
                           written, and the scroll the next frame starts from, what
                           site/lib/nes.js's NES.frame takes
  header(path)          -> the registers, the cycle count, the frame count, the cartridge
                           and what else the kit's server recorded (snap["kit"])

Usage:
  snapshot.py <file>            print the cartridge, the registers and the vectors

Its test is kit/nes/test_snapshot.py.
"""
import gzip, json, os, sys

RAM_SIZE = 0x10000
FORMAT = "kit-nes-snapshot"


def load(path):
    """The snapshot as a dict. Exits, saying what it saw, on anything else."""
    try:
        with open(path, "rb") as f:
            raw = f.read()
    except OSError as e:
        sys.exit(f"{path}: {e}")
    if raw[:4] == b"NES\x1a":
        sys.exit(f"{path} is an iNES cartridge image, not a snapshot: put it in the kit's server "
                 "(`cartridge`), run it, and `save` (kit/skills/nes/tool-jsnes)")
    if raw[:2] == b"\x1f\x8b":
        raw = gzip.decompress(raw)
    try:
        snap = json.loads(raw)
    except ValueError:
        sys.exit(f"{path}: not a kit NES snapshot (not gzipped JSON); the kit's server saves one with `save`")
    if not isinstance(snap, dict) or snap.get("format") != FORMAT:
        sys.exit(f"{path}: JSON, but not a kit NES snapshot (format {snap.get('format') if isinstance(snap, dict) else None!r})")
    return snap


def image(snap, bank=None):
    if bank is not None:
        sys.exit("read(path, bank=n): a bank the mapper had not selected is not in an NES snapshot; "
                 "see kit/skills/nes/steps, \"snapshot\"")
    mem = snap["state"]["cpu"]["mem"]
    if len(mem) != RAM_SIZE:
        sys.exit(f"the snapshot's CPU array is {len(mem)} bytes, not 65,536")
    out = bytearray(mem)
    out[0x0800:0x6000] = bytes(0x5800)
    return bytes(out)


def read(path, bank=None):
    return image(load(path), bank)


def ppu(path):
    """The PPU's 16 KB as the PPU sees it: pattern tables, the four nametables through the
    cartridge's mirroring, and the palettes with their mirrors (jsnes, src/ppu/index.js,
    mirroredLoad)."""
    st = load(path)["state"]["ppu"]
    vram, table = st["vramMem"], st["vramMirrorTable"]
    return bytes(vram[table[a]] & 0xFF for a in range(0x4000))


def oam(path):
    return bytes(load(path)["state"]["ppu"]["spriteMem"])


def registers(path):
    """PPUCTRL and PPUMASK rebuilt from jsnes's flags (src/ppu/index.js, updateControlReg1 and
    updateControlReg2), and the scroll from the PPU's temporary address, which jsnes keeps in
    parts (regHT and regFH across, regVT and regFV down, regH and regV the nametable): what
    the game last set with $2005 and $2000, unless a write to $2006 came after it. PPUCTRL's
    nametable bits are those two, as the PPU keeps them."""
    p = load(path)["state"]["ppu"]
    ctrl = ((p["f_nmiOnVblank"] << 7) | (p["f_spriteSize"] << 5) | (p["f_bgPatternTable"] << 4)
            | (p["f_spPatternTable"] << 3) | (p["f_addrInc"] << 2) | (p["regV"] << 1) | p["regH"])
    mask = ((p["f_color"] << 5) | (p["f_spVisibility"] << 4) | (p["f_bgVisibility"] << 3)
            | (p["f_spClipping"] << 2) | (p["f_bgClipping"] << 1) | p["f_dispType"])
    return {"ctrl": ctrl, "mask": mask, "scrollX": p["regHT"] * 8 + p["regFH"], "scrollY": p["regVT"] * 8 + p["regFV"]}


def header(path):
    snap = load(path)
    c = snap["state"]["cpu"]
    p = (c["F_CARRY"] | ((1 if c["F_ZERO"] == 0 else 0) << 1) | (c["F_INTERRUPT"] << 2) | (c["F_DECIMAL"] << 3)
         | (c["F_BRK"] << 4) | (c["F_NOTUSED"] << 5) | (c["F_OVERFLOW"] << 6) | (c["F_SIGN"] << 7))
    return {"pc": (c["REG_PC"] + 1) & 0xFFFF, "a": c["REG_ACC"], "x": c["REG_X"], "y": c["REG_Y"],
            "s": c["REG_SP"] & 0xFF, "p": p, "cycles": c["_cpuCycleBase"], "kit": snap.get("kit", {})}


def main(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    h = header(argv[0])
    img = read(argv[0])
    cart = h["kit"].get("cartridge") or {}
    print(f"cartridge {cart.get('name')}: mapper {cart.get('mapper')}, PRG {cart.get('prg_kb')} KB, "
          f"CHR {cart.get('chr_kb')} KB, {cart.get('mirroring')} mirroring; saved by jsnes {h['kit'].get('jsnes')}")
    print(f"PC ${h['pc']:04X} A ${h['a']:02X} X ${h['x']:02X} Y ${h['y']:02X} S ${h['s']:02X} P ${h['p']:02X}  "
          f"cycle {h['cycles']}, frame {h['kit'].get('frames')}")
    w = lambda a: img[a] | (img[a + 1] << 8)
    print(f"vectors: NMI ${w(0xFFFA):04X}  reset ${w(0xFFFC):04X}  IRQ ${w(0xFFFE):04X}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
