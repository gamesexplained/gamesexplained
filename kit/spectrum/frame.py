#!/usr/bin/env python3
"""The Spectrum's screen, drawn from video memory, checked against the emulator's own picture.

site/lib/spectrum.js draws a Spectrum screen (Spectrum.drawScreen) from the 6912 bytes the
ULA shows: the bitmap at $4000-$57FF in its third-interleaved order, then the attribute
bytes at $5800-$5AFF. A wrong bitmap address, a BRIGHT bit read as one of the ink's, a border
that is not the machine's or the wrong cells flashing would all look like a page rather than
like a fault, and nothing else in the kit checks them against a machine.

So this paints a test screen in the running emulator with a Z80 program of its own: every
one of the 16 colours as ink and as paper, BRIGHT on and off, FLASH on and off (in cells
whose ink and paper differ, and in solid cells where it changes nothing), the bitmap's three
64-line thirds filled differently, and a border that is not the default white. It saves the
emulator's picture of that screen (ZRCP `save-screen`, a .bmp), draws the same video memory
with site/lib/spectrum.js under node, and counts the pixels that differ.

Usage:
  frame.py test [--keep]        the kit's own check: paint the test screen, capture it in
                                both FLASH phases, draw both and compare. It resets the
                                machine: not during a game you mean to keep
  frame.py capture <out.bmp>    paint the test screen and save the emulator's picture of it,
                                with the emulator's own video memory beside it (<out>.scr)
  frame.py compare <shot.bmp> <screen.scr> [--phase 0|1] [--border N] [--border-colour N]
                                draw that video memory and count the pixels that differ from
                                the picture; writes <shot>-diff.png

Needs the emulator for capture and test, started only through the launcher, so that its state
stays in the gitignored `tools/`:

    python3 kit/scripts/tools.py --platform spectrum zesarux

`frame.py test` is run by hand, after any change to site/lib/spectrum.js and after a new
ZEsarUX release: it is not a `test_*.py` file and `kit/scripts/test_kit.py` does not run it,
because the kit's tests also run in CI, no CI machine has an emulator, and a discovered test
that needs one would fail there rather than skip (AGENTS.md, "Working on the kit or the
site"). `kit/spectrum/test_frame.py` is the discovered half instead: the parts of this file
that need no emulator. Needs a JavaScript runtime for the drawing: node, or on macOS the
system's own JavaScriptCore. Every file it writes belongs under the gitignored `tools/` (the
test uses `tools/logs/spectrum-frame/`) or in /tmp: a .scr is the machine's video memory and a
.bmp is its picture, and neither is committed.

The pixels are compared as Spectrum colour numbers, not as RGB. The ULA's voltage levels are
a property of each emulator (ZEsarUX 13.0 renders them 0, #c0 and #ff where the site's own
palette says 0, #d7 and #ff - measured 5 October 2026), and the drawing's palette is a page's
choice, not a fact about the machine. So each of the picture's colours is read as a Spectrum
colour number - one bit a channel, the brightest of the emulator's two levels as BRIGHT - and
compared with the colour number the drawing put at that pixel. A drawing that put the wrong
colour, the wrong brightness or the wrong flash phase anywhere still differs, and the two
palettes are printed side by side rather than silently reconciled.

FLASH is checked without knowing which phase the emulator is in, because a picture does not
say: the test captures twice, with the ULA's FLASH changed between the two (the picture is
different, so it is at its other phase), and checks that each capture matches a different one
of the drawing's two phases. What that pins down absolutely is *which cells* flash - the
pixels the two captures differ at are exactly the pixels the drawing's two phases differ at.
A drawing with FLASH inverted matches the other way round instead, and cannot be told from a
capture taken one phase later: that is a limit of comparing against a screenshot.
"""
import json, os, shutil, struct, subprocess, sys, tempfile, zlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SPECTRUMJS = os.path.join(ROOT, "site", "lib", "spectrum.js")
sys.path.insert(0, HERE)

BITMAP, ATTRS = 0x4000, 0x5800      # the two halves of the video memory, in the ULA's order
SCREEN = 0x1B00                     # 6144 bitmap bytes + 768 attribute bytes
BASE = 0x8000                       # where the test program is written
BORDER = 3                          # the border the test screen asks for: magenta, not the default white
MARGIN = 16                         # pixels of border the drawing adds, and so the width of the picture compared
PHASES = (0, 1)                     # the two FLASH states Spectrum.drawScreen takes
FLIP_FRAMES = 40                    # frames to give the emulator's FLASH to change phase (it takes 16 here)
PIXELS, LINES = 256, 192            # the ULA's screen


# --- the test screen --------------------------------------------------------------
def program():
    """The Z80 the test screen needs: interrupts off, a border colour, and nothing else.

    The screen itself is written into memory by the host, so the program has no work to do;
    it exists to own the border and to keep the CPU away from the memory the picture shows.
    """
    return bytes([0xF3,               # di          the ROM's interrupt must not run
                  0x3E, BORDER,       # ld a,<border>  bits 0-2 the border colour, bits 3-4
                  0xD3, 0xFE,         # out ($FE),a the speaker: silent, and only the ULA written
                  0x18, 0xFE])        # jr $        a machine with nothing left to do


def attributes():
    """The 768 attribute bytes: every ink with every paper, BRIGHT and FLASH in both states.

    The first 256 cells are the 64 paper/ink pairs four times over, once for each pair of
    BRIGHT and FLASH states: ink = bits 0-2, paper = bits 3-5, BRIGHT = bit 6, FLASH = bit 7.
    The remaining 512 are solid cells - ink and paper the same colour - so every one of the
    16 colours is an 8x8 block of it, and so that FLASH on a solid cell is exercised too
    (there it must change nothing).
    """
    out = bytearray()
    for n in range(768):
        if n < 256:
            m = n & 63
            ink, paper, bright, flash = m & 7, m >> 3, (n >> 6) & 1, (n >> 7) & 1
        else:
            m = n - 256
            ink = paper = m & 7
            bright, flash = (m >> 3) & 1, (m >> 4) & 1
        out.append(ink | paper << 3 | bright << 6 | flash << 7)
    return bytes(out)


def bitmap():
    """The 6144 bitmap bytes, in the order the ULA reads them: third, line in the cell, line.

    The value mixes the four fields of the byte's address - $4000 + ((y & 0xC0) << 5) +
    ((y & 0x07) << 8) + ((y & 0x38) << 2) + (x >> 3) - so that a drawing which swapped two of
    them, or read the thirds linearly, lands on a different byte and shows it. It is built
    here, from its own address, so the pattern is source and not a binary.
    """
    return bytes((i * 31 + ((i >> 5) & 7) * 17 + ((i >> 8) & 7) * 97 + ((i >> 11) & 3) * 53) & 0xFF
                 for i in range(SCREEN - 768))


def screen_memory():
    """The 6912 bytes of video memory the drawing reads: the bitmap, then the attributes."""
    return bitmap() + attributes()


# --- the emulator -----------------------------------------------------------------
def emulator():
    """A ZRCP connection, or the message that says how to start the emulator."""
    from zesarux import ZesaruxError, connect
    try:
        return connect()
    except ZesaruxError as e:
        raise SystemExit(f"{e}")


def paint(rpc, screen=None):
    """Paint the test screen on the machine and start the program that shows it.

    Resets the machine: whatever was loaded is gone. The screen is written while the machine
    is stopped (a write to a running one does not take), and it runs four frames before
    anyone looks at it, so that a whole frame has been drawn from the memory as written.
    """
    screen = screen_memory() if screen is None else screen
    rpc.bp_clear()                  # a stopping checkpoint left armed ends every run early
    rpc.exit_step()                 # a load or a stop can leave the machine in cpu-step
    rpc.cmd("hard-reset-cpu")
    rpc.enter_step()
    rpc.write_memory(BITMAP, screen)
    rpc.write_memory(BASE, program())
    rpc.set_register("PC", BASE)
    rpc.frames(4)
    return screen


def shot(rpc, path):
    """The emulator's picture of the screen, saved to `path` (.bmp)."""
    rpc.enter_step()
    return rpc.save_screen(path)


def flip(rpc, first, path):
    """Advance frames until the picture differs from `first`'s: the ULA's FLASH changing phase.

    Returns (the new picture, how many frames it took), or (None, the frames tried) when the
    picture never changed - an emulator whose FLASH does not run, or a test screen with no
    FLASH cells in it, and then the two phases cannot both be checked. The BMPs are compared
    as files: save-screen writes the same picture as the same bytes (measured).
    """
    with open(first, "rb") as f:
        was = f.read()
    for n in range(1, FLIP_FRAMES + 1):
        rpc.frames(1)
        shot(rpc, path)
        with open(path, "rb") as f:
            if f.read() != was:
                return path, n
    return None, FLIP_FRAMES


# --- the drawing ------------------------------------------------------------------
JSC = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"
DRIVER = r"""
const node = typeof require === 'function' && typeof process === 'object';
const args = node ? process.argv.slice(2) : arguments;
const read = node ? p => require('fs').readFileSync(p, 'utf8') : p => readFile(p);
const say = node ? t => process.stdout.write(t + '\n') : t => print(t);
if (node) (0, eval)(read(args[0])); else load(args[0]);
const spec = JSON.parse(read(args[1]));

// The little of a browser canvas that Spectrum.drawScreen uses. Every fillRect is recorded
// with the colour number its fillStyle names, so the drawing is checked for *which* of the
// Spectrum's colours it put at each pixel. A fillStyle a canvas would ignore, one that is
// not in Spectrum.PAL, or a rect that is not whole pixels, throws here instead of passing
// quietly: a browser draws a wrong palette as black and says nothing.
function canvas() {
  const rects = [];
  let fill = 0;
  const ctx = {
    imageSmoothingEnabled: true,
    set fillStyle(v) {
      if (!/^#[0-9a-f]{6}$/i.test(v)) throw new Error('a fillStyle a browser canvas would ignore: ' + v);
      const i = Spectrum.PAL.indexOf(v);
      if (i < 0) throw new Error('a fillStyle that is not in Spectrum.PAL: ' + v);
      fill = i;
    },
    get fillStyle() { return Spectrum.PAL[fill]; },
    fillRect(x, y, w, h) {
      for (const v of [x, y, w, h])
        if (!Number.isInteger(v)) throw new Error('a fillRect that is not whole pixels: ' + [x, y, w, h]);
      rects.push([x, y, w, h, fill]);
    },
  };
  return { width: 0, height: 0, style: {}, getContext: () => ctx, rects: rects };
}

const ram = new Uint8Array(0x10000);
for (let i = 0; i < spec.screen.length / 2; i++) ram[0x4000 + i] = parseInt(spec.screen.substr(2 * i, 2), 16);
const c = canvas();
for (const phase of spec.phases) {
  c.rects.length = 0;
  Spectrum.drawScreen(c, ram, { borderColour: spec.borderColour, border: spec.border, phase: phase, s: 1 });
  if (phase === spec.phases[0]) say(JSON.stringify({ palette: Spectrum.PAL, w: c.width, h: c.height }));
  const px = new Uint8Array(c.width * c.height);
  for (const [x, y, w, h, i] of c.rects)                      // a canvas clips a rect that runs
    for (let yy = Math.max(0, y); yy < Math.min(c.height, y + h); yy++)     // off the edge of it
      for (let xx = Math.max(0, x); xx < Math.min(c.width, x + w); xx++) px[yy * c.width + xx] = i;
  let out = '';
  for (let i = 0; i < px.length; i++) out += px[i].toString(16);
  say(out);
}
"""


def _hex(c):
    """The three channel values of a '#rrggbb' colour."""
    return tuple(int(c[i:i + 2], 16) for i in (1, 3, 5))


def _number(rgb):
    """The Spectrum colour number a colour's channels name: bit 0 blue, bit 1 red, bit 2 green."""
    return (1 if rgb[2] else 0) | (2 if rgb[0] else 0) | (4 if rgb[1] else 0)


def palette_check(palette):
    """Refuse a drawing palette whose 16 colours are not the machine's, in the machine's order.

    The levels are the page's own (see the module docstring), so what is checked is the
    structure: colour i's channels are the bits of i, and colour i + 8 is colour i brighter.
    A palette with red and green swapped, or with BRIGHT darker than normal, is a wrong
    picture whatever the levels are, and would otherwise show up only where a page's own
    palette happened to be wrong in the same way.
    """
    if len(palette) != 16:
        raise SystemExit(f"the drawing's palette has {len(palette)} colours, not the ULA's 16")
    for i, c in enumerate(palette):
        rgb = _hex(c)
        if _number(rgb) != i & 7:
            raise SystemExit(f"Spectrum.PAL[{i}] is {c}: its channels are not Spectrum colour {i & 7}")
        if i >= 8 and any((b == 0) != (v == 0) or v < b for b, v in zip(_hex(palette[i & 7]), rgb)):
            raise SystemExit(f"Spectrum.PAL[{i}] is {c}, which is not Spectrum.PAL[{i & 7}] = "
                             f"{palette[i & 7]} at its brighter level")


def js():
    """The JavaScript runtime to draw with: node, or on macOS the system's own JavaScriptCore."""
    node = shutil.which("node")
    if node:
        return [node]
    if os.path.exists(JSC):
        return [JSC]
    raise SystemExit("drawing a screen needs a JavaScript runtime: node, or on macOS the system's JavaScriptCore")


def draw(screen, phases=PHASES, border=MARGIN, border_colour=BORDER):
    """Draw video memory with site/lib/spectrum.js, and return what the canvas was told to show.

    Returns (the drawing's palette and canvas size, {phase: the colour number of every pixel,
    row by row}). Raises SystemExit with the runtime's own words when the drawing fails.
    """
    runtime = js()
    spec = {"screen": bytes(screen).hex(), "phases": list(phases),
            "border": border, "borderColour": border_colour}
    driver = spec_file = None
    try:
        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
            f.write(DRIVER); driver = f.name
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            json.dump(spec, f); spec_file = f.name
        cmd = runtime + [driver] + (["--"] if runtime[0] == JSC else []) + [SPECTRUMJS, spec_file]
        r = subprocess.run(cmd, capture_output=True, text=True)
    finally:
        for p in (driver, spec_file):
            if p:
                os.unlink(p)
    lines = r.stdout.splitlines()
    if r.returncode or len(lines) < 1 + len(phases):
        raise SystemExit(f"the drawing failed:\n{r.stderr or r.stdout}")
    meta = json.loads(lines[0])
    palette_check(meta["palette"])
    out = {}
    for phase, line in zip(phases, lines[1:]):
        out[phase] = bytes(int(c, 16) for c in line)
    if len(out[list(phases)[0]]) != meta["w"] * meta["h"]:
        raise SystemExit(f"the drawing wrote {len(out[list(phases)[0]])} pixels into a "
                         f"{meta['w']}x{meta['h']} canvas")
    return meta, out


# --- reading a picture and comparing it -------------------------------------------
def read_bmp(path):
    """(width, height, rows of (r, g, b)) from the 24-bit .bmp ZRCP's save-screen writes."""
    with open(path, "rb") as f:
        data = f.read()
    if len(data) < 54:
        raise SystemExit(f"{path}: too short to be a .bmp")
    sig, _, _, _, off = struct.unpack("<2sIHHI", data[:14])
    hsize, w, h, planes, bpp, comp = struct.unpack_from("<IiiHHI", data, 14)
    if sig != b"BM" or hsize != 40 or planes != 1 or bpp != 24 or comp != 0:
        raise SystemExit(f"{path}: not a 24-bit uncompressed Windows .bmp ({sig!r}, {bpp} bits a pixel, "
                         f"compression {comp})")
    if h <= 0:
        raise SystemExit(f"{path}: a .bmp stored top-down, which save-screen does not write")
    stride = (w * 3 + 3) // 4 * 4
    if len(data) < off + stride * h:
        raise SystemExit(f"{path}: {len(data)} bytes, too few for a {w}x{h} picture")
    rows = []
    for y in range(h):                                  # the rows are stored bottom-up, three bytes a
        row = data[off + (h - 1 - y) * stride:][:w * 3]  # pixel in blue, green, red order
        rows.append([tuple(row[x * 3:x * 3 + 3][::-1]) for x in range(w)])
    return w, h, rows


def crop(picture, border=MARGIN):
    """Where the drawn canvas sits in the emulator's picture, and the size it must be.

    The drawing puts `border` pixels of border round the 256x192 screen. The emulator's
    picture has more - ZEsarUX 13.0 writes 352x304, 48 pixels each side and 56 above and
    below - and both centre the screen, so the canvas is the picture cropped to the canvas's
    size. With the default 16, the emulator's own border, 16 pixels of it on each side, is
    compared as well as the screen.
    """
    w, h = picture
    cw, ch = PIXELS + 2 * border, LINES + 2 * border
    if cw > w or ch > h:
        raise SystemExit(f"the emulator's picture is {w}x{h}, too small for a {cw}x{ch} canvas: "
                         f"is save-screen writing the border at all?")
    return (w - cw) // 2, (h - ch) // 2, cw, ch


def colour_numbers(rows):
    """The Spectrum colour number each of a picture's RGB values stands for, and its two levels.

    The ULA's levels are the emulator's own, so the numbers are read out of the picture: a
    channel at the brighter of the picture's two non-zero levels is BRIGHT (a Spectrum colour
    number's bit 3), one at the other is that channel at its normal level. The bits are the
    machine's order (kit/skills/spectrum/zx-spectrum-reference): bit 0 blue, bit 1 red, bit 2
    green. Anything other than two non-zero levels is refused rather than guessed at.
    """
    levels = sorted({v for row in rows for rgb in row for v in rgb})
    nonzero = [v for v in levels if v]
    if len(nonzero) != 2:
        raise SystemExit(f"the picture's colours use {len(nonzero)} non-zero levels {levels}: reading a "
                         "colour as a Spectrum number needs two, normal and bright")
    normal, bright = nonzero
    numbers = {}
    for row in rows:
        for rgb in row:
            rgb = tuple(rgb)
            if rgb not in numbers:
                numbers[rgb] = _number(rgb) | (8 if max(rgb) == bright else 0)
    if len(set(numbers.values())) != len(numbers):
        raise SystemExit("two of the picture's colours read as the same Spectrum number: its levels are "
                         f"{levels}, which is not a normal level and a bright one")
    return numbers, (normal, bright)


def differ(rows, numbers, x0, y0, w, h, drawn):
    """[(x, y)] for every pixel of the drawing whose colour number the picture disagrees with."""
    return [(x, y) for y in range(h) for x in range(w)
            if numbers[tuple(rows[y0 + y][x0 + x])] != drawn[y * w + x]]


def write_png(path, w, h, rgb):
    raw = b"".join(b"\x00" + bytes(v for p in rgb[y * w:(y + 1) * w] for v in p) for y in range(h))
    chunk = lambda k, d: struct.pack(">I", len(d)) + k + d + struct.pack(">I", zlib.crc32(k + d) & 0xFFFFFFFF)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def write_diff(path, w, h, rows, x0, y0, bad):
    """The picture with the pixels that differ picked out in red, and those matching dimmed."""
    bad = set(bad)
    write_png(path, w, h, [(255, 0, 64) if (x, y) in bad else tuple(v // 3 for v in rows[y0 + y][x0 + x])
                           for y in range(h) for x in range(w)])


def palette(meta):
    """The drawing's palette, named as it is in site/lib/spectrum.js."""
    return ", ".join(f"{i} {c}" for i, c in enumerate(meta["palette"]))


def compare(shot_path, screen, phase=0, border=MARGIN, border_colour=BORDER, quiet=False):
    """Draw `screen` and count the pixels that differ from the emulator's picture of it.

    Returns the number that differ, and writes <shot>-diff.png when any of them do. `screen`
    is the 6912 bytes of video memory ($4000-$5AFF), which is how ZRCP's save-screen writes a
    .scr, so `frame.py compare shot.bmp shot.scr` is the whole of it.
    """
    meta, drawn = draw(screen, (phase,), border, border_colour)
    w, h, rows = read_bmp(shot_path)
    x0, y0, cw, ch = crop((w, h), border)
    numbers, levels = colour_numbers(rows)
    bad = differ(rows, numbers, x0, y0, cw, ch, drawn[phase])
    if bad:
        write_diff(os.path.splitext(shot_path)[0] + "-diff.png", cw, ch, rows, x0, y0, bad)
    if not quiet:
        print(f"the emulator's picture is {w}x{h}; the drawing is {cw}x{ch} and sits at ({x0},{y0}), "
              f"so {border} pixels of the picture's own border are compared with it")
        print(f"the emulator's colours, by Spectrum number: "
              + ", ".join(f"{n} {rgb}" for rgb, n in sorted(numbers.items(), key=lambda kv: kv[1]))
              + f" (two non-zero levels, {levels[0]} and {levels[1]}; BRIGHT black is black, so no colour "
                "reads as 8)")
        print(f"the drawing's palette: {palette(meta)} (its levels are "
              f"{sorted({v for c in meta['palette'] for v in _hex(c)})})")
        print(f"{len(bad)} of {cw * ch} pixels differ from the drawing's FLASH phase {phase}"
              + (f" ({os.path.splitext(shot_path)[0]}-diff.png: differing pixels red)" if bad else ""))
    return len(bad)


# --- the kit's own check ----------------------------------------------------------
def test(keep=False):
    """Paint the test screen, capture it in both FLASH phases, draw it and compare. True if it passes."""
    from zesarux import ZesaruxError
    out = os.path.join(ROOT, "tools", "logs", "spectrum-frame")
    os.makedirs(out, exist_ok=True)
    first = os.path.join(out, "a.bmp")
    second = os.path.join(out, "b.bmp")
    scr = os.path.join(out, "a.scr")
    try:
        rpc = emulator()
        screen = paint(rpc, screen_memory())
        shot(rpc, first)
        rpc.save_screen(scr)                      # .scr: the video memory itself, 6912 bytes, no header
        shown = None
        with open(scr, "rb") as f:
            shown = f.read()
        if shown != screen:
            print(f"FAIL: the video memory the emulator saved ({len(shown)} bytes) is not the {len(screen)} "
                  "bytes the test wrote")
            return False
        attrs = attributes()
        print(f"painted the test screen: {len(screen)} bytes at $4000-$5AFF, the bitmap then the 768 "
              f"attributes ({sum(1 for a in attrs if a >> 7)} cells with FLASH set), and the program at "
              f"${BASE:04X} set the border to colour {BORDER} (magenta, not the default white)")
        changed, frames = flip(rpc, first, second)
        if changed is None:
            print(f"FAIL: the emulator's picture did not change in {frames} frames, so FLASH is not running "
                  "there and the two phases cannot both be checked")
            return False
        print(f"the picture changed {frames} frames later: that is the ULA's FLASH, so the two captures are "
              "in its two phases")
    except ZesaruxError as e:
        print(f"FAIL: the emulator: {e}")
        return False
    finally:
        try:
            rpc.close()
        except Exception:
            pass

    with open(scr, "rb") as f:
        meta, drawn = draw(f.read())
    if drawn[0] == drawn[1]:
        print("FAIL: the drawing's two FLASH phases are identical: the test screen's FLASH cells are not "
              "reaching Spectrum.drawScreen's `phase`")
        return False
    first_w, first_h, first_rows = read_bmp(first)
    _, _, second_rows = read_bmp(second)
    x0, y0, w, h = crop((first_w, first_h))
    numbers, levels = colour_numbers(first_rows)
    diff, bad = {}, {}
    for name, rows in (("first", first_rows), ("after", second_rows)):
        for phase in PHASES:
            bad[name, phase] = differ(rows, numbers, x0, y0, w, h, drawn[phase])
            diff[name, phase] = len(bad[name, phase])
    print(f"the emulator's picture is {first_w}x{first_h}; the drawing is {meta['w']}x{meta['h']} in "
          f"{len(PHASES)} FLASH phases, and {w}x{h} pixels of it sit at ({x0},{y0})")
    print(f"the emulator's colours: its two non-zero levels are {levels[0]} and {levels[1]}")
    print(f"the drawing's palette: {palette(meta)}")
    # Which cells FLASH reaches is a separate question from which phase it is in, and the phase
    # of a picture is not observable (see the module docstring): every pixel the emulator's two
    # captures differ at must be one the drawing's two phases differ at, and no others.
    flashed = {(x, y) for y in range(h) for x in range(w) if drawn[0][y * w + x] != drawn[1][y * w + x]}
    moved = {(x, y) for y in range(h) for x in range(w)
             if first_rows[y0 + y][x0 + x] != second_rows[y0 + y][x0 + x]}
    print(f"the FLASH itself: the two captures differ at {len(moved)} pixels, the drawing's two phases at "
          f"{len(flashed)}" + (" - the same pixels" if flashed == moved else
                               f" - {len(flashed ^ moved)} of them not in both"))
    print("  the emulator's picture        FLASH phase 0   FLASH phase 1")
    print(f"  captured first                {diff['first', 0]:>13}   {diff['first', 1]:>13}   (pixels that differ)")
    print(f"  {frames} frames later{'':<13} {diff['after', 0]:>13}   {diff['after', 1]:>13}")
    met = [phase for phase in PHASES if diff["first", phase] == 0 and diff["after", 1 - phase] == 0]
    if not met or flashed != moved:
        for key, pixels in bad.items():
            if pixels:
                write_diff(os.path.join(out, f"{key[0]}-phase{key[1]}-diff.png"), w, h, first_rows if key[0] == "first" else second_rows,
                           x0, y0, pixels)
        print(f"FAIL: no FLASH phase fits both captures, so the drawing is not this picture; the pixels "
              f"each way in the table above are red in {out}/<capture>-phase<n>-diff.png")
        return False
    print(f"PASS: site/lib/spectrum.js matches the emulator's picture of the test screen at every one of "
          f"{w * h} pixels, with the first capture in FLASH phase {met[0]} and the second in phase {1 - met[0]}")
    print("      (which phase the emulator happened to be in at the capture is not visible in a picture, so "
          "the two are told apart by matching, not read off: a drawing with FLASH inverted is one that "
          "matched the other way round)")
    if not keep:
        for name in ("a.bmp", "b.bmp", "a.scr"):
            os.remove(os.path.join(out, name))
    return True


def main(argv):
    """The command line: one of `test`, `capture`, `compare`."""
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    what, args, flags, i = argv[0], [], {}, 1
    while i < len(argv):                             # --phase=1 and --phase 1 both mean one thing
        a = argv[i]
        if a == "--keep":
            flags[a] = "1"
        elif a.startswith("--"):
            name, eq, value = a.partition("=")
            if not eq:
                i += 1
                if i == len(argv):
                    raise SystemExit(f"{name} wants a value: --phase=1, --border=16, --border-colour=3")
                value = argv[i]
            flags[name] = value
        else:
            args.append(a)
        i += 1
    if what == "test":
        return 0 if test(keep="--keep" in flags) else 1
    if what == "capture":
        if len(args) != 1:
            raise SystemExit("capture takes one path: the .bmp to write (its .scr goes beside it)")
        rpc = emulator()
        paint(rpc, screen_memory())
        shot(rpc, args[0])
        scr = os.path.splitext(args[0])[0] + ".scr"
        rpc.save_screen(scr)                  # the video memory itself: 6912 bytes, no header
        rpc.close()
        with open(scr, "rb") as f:
            meta, _ = draw(f.read())
        print(f"wrote {args[0]}, the emulator's picture of the test screen, and {scr}, its video memory "
              f"({os.path.getsize(scr)} bytes: the bitmap then the attributes)")
        print(f"the drawing of it is {meta['w']}x{meta['h']}, {MARGIN} pixels of border each side; "
              f"palette: {palette(meta)}")
        return 0
    if what == "compare":
        if len(args) != 2:
            raise SystemExit("compare takes two paths: the .bmp picture and the video memory (.scr)")
        with open(args[1], "rb") as f:
            screen = f.read()
        return 1 if compare(args[0], screen,
                            phase=int(flags.get("--phase", 0)),
                            border=int(flags.get("--border", MARGIN)),
                            border_colour=int(flags.get("--border-colour", BORDER))) else 0
    print(__doc__)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
