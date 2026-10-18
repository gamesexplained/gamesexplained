#!/usr/bin/env python3
"""Check the site's NES picture, site/lib/nes.js, against jsnes, pixel by pixel; and draw a
snapshot's picture with it.

`test` puts the emulator check's own cartridge in (kit/nes/check_emulator.py), then for each
case fills the PPU's memory with a pattern of its own: random tiles in both pattern tables,
random tile numbers and attributes in the nametables, a random palette, and 64 random sprites
in the page the cartridge's NMI sends to the sprite table each frame, so that some lines have
more than eight. Each case sets PPUCTRL and PPUMASK and the scroll its own way (the pattern
tables, the nametable at the top left, 8 by 16 sprites, the left 8 pixels clipped), runs two
frames, saves jsnes's picture (`screenshot`), draws the same memory with NES.frame under node,
and compares the two at every pixel inside the edges. It also saves a snapshot and checks that
kit/nes/snapshot.py's registers() reads back the PPUCTRL, PPUMASK and scroll the case set.

Four things jsnes 2.1.0 draws differently from the console, each found by this check failing
on 18 October 2026, are left out of the comparison. The last three were read in jsnes's source
(src/ppu/index.js); the first was only measured:

  * the top lines, which it leaves without background: line 0 in every case, and lines 0 to 2
    with a vertical scroll of 37. The comparison starts at line 8;
  * the right edge with a horizontal scroll: it draws 32 tiles a line, starting the fine
    scroll's pixels to the left, so the last few pixels of the line are never drawn
    (renderBgScanline). The comparison stops at column 247;
  * an 8 by 16 sprite from the $1000 pattern table, an odd tile number, which it draws from
    the tile before the right one: it takes `(tile & $FE) - 1 + 256` where the console takes
    `(tile & $FE) + 256` (renderSpritesPartially). The 8 by 16 case uses even tile numbers;
  * the left 8 pixels when PPUMASK clips either layer there: it paints them black, both layers
    gone, where the console shows the backdrop, and the sprites too when only the background
    is clipped (endFrame). The clipped case is compared from column 8.

nes.js draws all four as the console does (kit/skills/nes/nes-reference, "The PPU"), so on
those a page and jsnes's screenshot disagree (kit/skills/nes/tool-jsnes, "Traps").

It changes the machine it is given, so give it one of its own:

  python3 kit/scripts/tools.py --platform nes jsnes --port 6856
  KIT_JSNES_PORT=6856 python3 kit/nes/frame.py test
  python3 kit/scripts/tools.py --platform nes stop --port 6856

The parts that need no emulator are kit/nes/test_frame.py, which CI runs.

Usage:
  frame.py test [--keep]                 --keep leaves the pictures in tools/logs/nes-frame/
  frame.py draw <snapshot> <out.png> [--ctrl N] [--mask N] [--scroll X Y]
      the snapshot's PPU memory and sprite table as nes.js draws them, with PPUCTRL,
      PPUMASK and the scroll the snapshot holds (kit/nes/snapshot.py, registers); each
      option replaces one. A game that changes the scroll part way down the screen is
      drawn as if it had not
"""
import json, os, random, struct, subprocess, sys, zlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
LIB = os.path.join(ROOT, "site", "lib", "nes.js")
OUT = os.path.join(ROOT, "tools", "logs", "nes-frame")

RENDER = r"""
const fs = require('fs');
require(process.argv[1]);
const a = JSON.parse(fs.readFileSync(0, 'utf8'));
const px = NES.frame(Uint8Array.from(a.ppu), Uint8Array.from(a.oam), a.opts);
process.stdout.write(JSON.stringify({pixels: Array.from(px), rgb: NES.RGB}));
"""


def render(ppu, oam, opts):
    """(colour numbers, the 64 colours as RGB) from NES.frame, under node."""
    r = subprocess.run(["node", "-e", RENDER, LIB], input=json.dumps({"ppu": list(ppu), "oam": list(oam), "opts": opts}),
                       capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"node failed:\n{r.stderr}")
    got = json.loads(r.stdout)
    return got["pixels"], [tuple(c) for c in got["rgb"]]


def png_rgb(path):
    """(width, height, [(r, g, b) for each pixel]) from an 8-bit RGB PNG whose rows are
    unfiltered, as the kit's server writes them."""
    with open(path, "rb") as f:
        data = f.read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        sys.exit(f"{path}: not a PNG")
    at, idat, w, h = 8, b"", None, None
    while at < len(data):
        n, kind = struct.unpack(">I4s", data[at:at + 8])
        body = data[at + 8:at + 8 + n]
        if kind == b"IHDR":
            w, h, depth, colour = struct.unpack(">IIBB", body[:10])
            if (depth, colour) != (8, 2):
                sys.exit(f"{path}: {depth}-bit, colour type {colour}; expected 8-bit RGB")
        elif kind == b"IDAT":
            idat += body
        at += 12 + n
    raw, stride, px = zlib.decompress(idat), w * 3 + 1, []
    for y in range(h):
        row = raw[y * stride:(y + 1) * stride]
        if row[0] != 0:
            sys.exit(f"{path}: row {y} is filtered (type {row[0]}); the kit's server writes none")
        px += [tuple(row[1 + x * 3:4 + x * 3]) for x in range(w)]
    return w, h, px


def write_png(path, w, h, rgb):
    raw = b"".join(b"\0" + b"".join(bytes(rgb[y * w + x]) for x in range(w)) for y in range(h))
    chunk = lambda kind, body: struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body))
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


TOP, RIGHT = 8, 247         # the part of the picture jsnes draws as the console does (above)

CASES = [  # name, PPUCTRL (bit 7, the NMI, always on), PPUMASK, scroll
    ("plain", 0x80, 0x1E, 0),
    ("tables swapped, nametable 1, scrolled", 0x80 | 0x10 | 0x08 | 0x01, 0x1E, 37),
    ("8 by 16 sprites, nametable 2", 0x80 | 0x20 | 0x02, 0x1E, 0),
    ("left 8 pixels clipped, nametable 3, scrolled", 0x80 | 0x03, 0x18, 200),
]


def test(keep=False):
    sys.path.insert(0, HERE)
    import check_emulator as ce
    import snapshot
    from jsnes import connect
    m = connect()
    ce.setup(m)
    os.makedirs(OUT, exist_ok=True)
    rnd, bad = random.Random(6502), 0
    scroll_operand = ce.LABELS["nmidone"] + 1           # nmidone: lda #0, then two stores to $2005
    for n, (name, ctrl, mask, scroll) in enumerate(CASES):
        m.write(0x0000, bytes(rnd.randrange(256) for _ in range(0x2000)), space="ppu")
        m.write(0x2000, bytes(rnd.randrange(256) for _ in range(0x1000)), space="ppu")
        pal = [rnd.randrange(64) for _ in range(32)]
        pal[0] = pal[16] = 0x21                           # a backdrop that is not black; $3F10 is $3F00
        m.write(0x3F00, bytes(pal), space="ppu")
        sprites = bytearray(rnd.randrange(256) for _ in range(256))
        for i in range(12):                               # sprites 0 to 11 all on line 100: four too many
            sprites[i * 4] = 99
        if ctrl & 0x20:                                   # jsnes draws an odd tile's 8 by 16 sprite wrongly
            for i in range(64):
                sprites[i * 4 + 1] &= 0xFE
        m.write(0x0200, bytes(sprites))
        m.write(scroll_operand, bytes([scroll]), rom=True)
        m.write(0x2000, bytes([ctrl]), io=True)
        m.write(0x2001, bytes([mask]), io=True)
        m.frames(2)
        shot = os.path.join(OUT, f"case{n}.png")
        m.call("screenshot", path=shot)
        ppu, oam = m.read(0, 0x4000, space="ppu"), m.read(0, 256, space="oam")
        want = {"ctrl": ctrl, "mask": mask, "scrollX": scroll, "scrollY": scroll}
        m.save(shot.replace(".png", ".json.gz"))
        regs = snapshot.registers(shot.replace(".png", ".json.gz"))
        if regs != want:
            print(f"FAIL  {name}: the snapshot's registers read back as {regs}, not {want}")
            bad += 1
        pixels, rgb = render(ppu, oam, want)
        w, h, theirs = png_rgb(shot)
        ours = [rgb[c] for c in pixels]
        left = 8 if (mask & 0x06) != 0x06 else 0      # jsnes blacks out a clipped left edge
        inside = [i for i in range(w * h) if i // w >= TOP and left <= i % w <= RIGHT]
        diff = [i for i in inside if ours[i] != theirs[i]]
        print(f"{'PASS' if not diff else 'FAIL'}  {name}: {len(inside) - len(diff)} of {len(inside)} pixels the same"
              + (f"; first at x {diff[0] % w}, y {diff[0] // w}: jsnes {theirs[diff[0]]}, nes.js {ours[diff[0]]}" if diff else ""))
        if diff or keep:
            write_png(shot.replace(".png", "-nesjs.png"), w, h, ours)
        bad += bool(diff)
    m.write(scroll_operand, b"\0", rom=True)
    if not keep and not bad:
        for f in os.listdir(OUT):
            os.remove(os.path.join(OUT, f))
    print(f"\n{len(CASES) - bad} of {len(CASES)} cases the same as jsnes's picture" +
          ("" if not bad else f"; the pictures are in {os.path.relpath(OUT, ROOT)}"))
    return 1 if bad else 0


def draw(argv):
    sys.path.insert(0, HERE)
    import snapshot
    snap, out = argv[0], argv[1]
    regs = snapshot.registers(snap)
    for flag, key in (("--ctrl", "ctrl"), ("--mask", "mask")):
        if flag in argv:
            regs[key] = int(argv[argv.index(flag) + 1], 0)
    if "--scroll" in argv:
        i = argv.index("--scroll")
        regs["scrollX"], regs["scrollY"] = int(argv[i + 1], 0), int(argv[i + 2], 0)
    pixels, rgb = render(snapshot.ppu(snap), snapshot.oam(snap), regs)
    write_png(out, 256, 240, [rgb[c] for c in pixels])
    print(f"wrote {out}: 256 by 240, in jsnes's palette; PPUCTRL ${regs['ctrl']:02X}, PPUMASK ${regs['mask']:02X}, "
          f"scroll {regs['scrollX']}, {regs['scrollY']}")
    return 0


def main(argv):
    if argv and argv[0] == "test":
        return test("--keep" in argv)
    if len(argv) >= 3 and argv[0] == "draw":
        return draw(argv[1:])
    print(__doc__)
    return 0 if argv[:1] in ([], ["-h"], ["--help"]) else 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
