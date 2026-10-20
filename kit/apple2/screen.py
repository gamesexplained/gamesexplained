#!/usr/bin/env python3
"""Draw the Apple II's screen as a PNG, from video memory and the soft switches.

The kit's server draws nothing (kit/apple2/apple2ts_server.mjs), so a screenshot is drawn here:
from a live machine (`screenshot` in kit/apple2/apple2ts.py, which reads the pages and `chips`)
or from a snapshot (`python3 kit/apple2/screen.py <snapshot> <out.png>`). The picture is
560 x 384: each of the 280 x 192 pixels of the hi-res screen is two by two, and text, lo-res
and the 80-column and double hi-res modes fill the same frame.

What it draws, and how close it is (kit/skills/apple2/apple2-reference has the memory layout):

  text      40 or 80 columns, page 1 or 2; inverse as inverse, flashing as inverse (the phase
            the eye sees half the time), MouseText as an outlined box. The letters are the kit's
            own 5 x 7 dot shapes, close to the IIe's but not its character ROM, which is Apple's
            and never committed
  lo-res    40 x 48 blocks in the sixteen colours
  hi-res    the usual approximation of NTSC colour: a dot lit alone takes its column's colour
            (violet or green, or blue or orange when the byte's high bit is set), two lit dots
            side by side are white, and a dark dot between two lit ones of the same colour takes
            their colour. Real fringes are subtler; a game's own art is judged from the bytes
  double hi-res and double lo-res: drawn in monochrome, 560 dots a line
  mixed     the last four text rows over the graphics

The picture is the screen as memory and the switches stand at the moment it is drawn, not as
the beam drew it: a game that changes modes partway down the screen shows one mode here.

  render(main, aux, switches) -> (width, height, rows of RGB bytes)
  screenshot(machine, path, mode=None) -> {"path", "mode", "width", "height"}
  from_snapshot(snapshot_path, path, mode=None) -> the same
  text_lines(main, aux, switches) -> the text page as 24 lines of text

`switches` is a dict with the server's names (80store, 80col, altchar, text, mixed, page2,
hires, dhires), as `chips()["switches"]` gives them; `mode` forces one of "text", "lores",
"hires", "dhires" whatever the switches say. On the II Plus (`"iiplus": True` in it, which a
screenshot of a II Plus and its snapshot set) the text has no lower case: $E0-$FF show the signs
of $A0-$BF, and $60-$7F flash those of $20-$3F, as its video ROM draws them.
"""
import os, struct, sys, zlib

W, H = 560, 384

# The kit's letters: 7 rows of 5 dots, the top row first, the leftmost dot the highest bit.
FONT = {
    " ": (0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00), "!": (0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04),
    '"': (0x0A, 0x0A, 0x0A, 0x00, 0x00, 0x00, 0x00), "#": (0x0A, 0x0A, 0x1F, 0x0A, 0x1F, 0x0A, 0x0A),
    "$": (0x04, 0x0F, 0x14, 0x0E, 0x05, 0x1E, 0x04), "%": (0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03),
    "&": (0x08, 0x14, 0x14, 0x08, 0x15, 0x12, 0x0D), "'": (0x04, 0x04, 0x08, 0x00, 0x00, 0x00, 0x00),
    "(": (0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02), ")": (0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08),
    "*": (0x04, 0x15, 0x0E, 0x04, 0x0E, 0x15, 0x04), "+": (0x00, 0x04, 0x04, 0x1F, 0x04, 0x04, 0x00),
    ",": (0x00, 0x00, 0x00, 0x00, 0x04, 0x04, 0x08), "-": (0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00),
    ".": (0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04), "/": (0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x00),
    "0": (0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E), "1": (0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E),
    "2": (0x0E, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1F), "3": (0x1F, 0x01, 0x02, 0x06, 0x01, 0x11, 0x0E),
    "4": (0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02), "5": (0x1F, 0x10, 0x1E, 0x01, 0x01, 0x11, 0x0E),
    "6": (0x07, 0x08, 0x10, 0x1E, 0x11, 0x11, 0x0E), "7": (0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08),
    "8": (0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E), "9": (0x0E, 0x11, 0x11, 0x0F, 0x01, 0x02, 0x1C),
    ":": (0x00, 0x00, 0x04, 0x00, 0x04, 0x00, 0x00), ";": (0x00, 0x00, 0x04, 0x00, 0x04, 0x04, 0x08),
    "<": (0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02), "=": (0x00, 0x00, 0x1F, 0x00, 0x1F, 0x00, 0x00),
    ">": (0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08), "?": (0x0E, 0x11, 0x02, 0x04, 0x04, 0x00, 0x04),
    "@": (0x0E, 0x11, 0x15, 0x17, 0x16, 0x10, 0x0F), "A": (0x04, 0x0A, 0x11, 0x11, 0x1F, 0x11, 0x11),
    "B": (0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E), "C": (0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E),
    "D": (0x1E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1E), "E": (0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F),
    "F": (0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10), "G": (0x0F, 0x10, 0x10, 0x13, 0x11, 0x11, 0x0F),
    "H": (0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11), "I": (0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E),
    "J": (0x01, 0x01, 0x01, 0x01, 0x01, 0x11, 0x0E), "K": (0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11),
    "L": (0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F), "M": (0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11),
    "N": (0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11), "O": (0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E),
    "P": (0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10), "Q": (0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D),
    "R": (0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11), "S": (0x0E, 0x11, 0x10, 0x0E, 0x01, 0x11, 0x0E),
    "T": (0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04), "U": (0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E),
    "V": (0x11, 0x11, 0x11, 0x11, 0x11, 0x0A, 0x04), "W": (0x11, 0x11, 0x11, 0x15, 0x15, 0x1B, 0x11),
    "X": (0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11), "Y": (0x11, 0x11, 0x0A, 0x04, 0x04, 0x04, 0x04),
    "Z": (0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F), "[": (0x1F, 0x18, 0x18, 0x18, 0x18, 0x18, 0x1F),
    "\\": (0x00, 0x10, 0x08, 0x04, 0x02, 0x01, 0x00), "]": (0x1F, 0x03, 0x03, 0x03, 0x03, 0x03, 0x1F),
    "^": (0x00, 0x00, 0x04, 0x0A, 0x11, 0x00, 0x00), "_": (0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1F),
    "`": (0x08, 0x04, 0x02, 0x00, 0x00, 0x00, 0x00), "a": (0x00, 0x00, 0x0E, 0x01, 0x0F, 0x11, 0x0F),
    "b": (0x10, 0x10, 0x1E, 0x11, 0x11, 0x11, 0x1E), "c": (0x00, 0x00, 0x0F, 0x10, 0x10, 0x10, 0x0F),
    "d": (0x01, 0x01, 0x0F, 0x11, 0x11, 0x11, 0x0F), "e": (0x00, 0x00, 0x0E, 0x11, 0x1F, 0x10, 0x0F),
    "f": (0x06, 0x09, 0x08, 0x1C, 0x08, 0x08, 0x08), "g": (0x00, 0x0F, 0x11, 0x11, 0x0F, 0x01, 0x0E),
    "h": (0x10, 0x10, 0x1E, 0x11, 0x11, 0x11, 0x11), "i": (0x04, 0x00, 0x0C, 0x04, 0x04, 0x04, 0x0E),
    "j": (0x02, 0x00, 0x06, 0x02, 0x02, 0x12, 0x0C), "k": (0x10, 0x10, 0x11, 0x12, 0x1C, 0x12, 0x11),
    "l": (0x0C, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E), "m": (0x00, 0x00, 0x1B, 0x15, 0x15, 0x15, 0x11),
    "n": (0x00, 0x00, 0x1E, 0x11, 0x11, 0x11, 0x11), "o": (0x00, 0x00, 0x0E, 0x11, 0x11, 0x11, 0x0E),
    "p": (0x00, 0x00, 0x1E, 0x11, 0x1E, 0x10, 0x10), "q": (0x00, 0x00, 0x0F, 0x11, 0x0F, 0x01, 0x01),
    "r": (0x00, 0x00, 0x17, 0x18, 0x10, 0x10, 0x10), "s": (0x00, 0x00, 0x0F, 0x10, 0x0E, 0x01, 0x1E),
    "t": (0x08, 0x08, 0x1C, 0x08, 0x08, 0x09, 0x06), "u": (0x00, 0x00, 0x11, 0x11, 0x11, 0x13, 0x0D),
    "v": (0x00, 0x00, 0x11, 0x11, 0x11, 0x0A, 0x04), "w": (0x00, 0x00, 0x11, 0x11, 0x15, 0x15, 0x0A),
    "x": (0x00, 0x00, 0x11, 0x0A, 0x04, 0x0A, 0x11), "y": (0x00, 0x00, 0x11, 0x11, 0x0F, 0x01, 0x0E),
    "z": (0x00, 0x00, 0x1F, 0x02, 0x04, 0x08, 0x1F), "{": (0x02, 0x04, 0x04, 0x08, 0x04, 0x04, 0x02),
    "|": (0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04), "}": (0x08, 0x04, 0x04, 0x02, 0x04, 0x04, 0x08),
    "~": (0x00, 0x00, 0x08, 0x15, 0x02, 0x00, 0x00), "\x7f": (0x15, 0x0A, 0x15, 0x0A, 0x15, 0x0A, 0x15),
}
BOX = (0x1F, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1F)      # a MouseText glyph, which the kit does not draw

# The sixteen colours of lo-res, and of hi-res's six (black, white and four of these), as RGB.
COLOURS = [(0, 0, 0), (227, 30, 96), (96, 78, 189), (255, 68, 253), (0, 163, 96), (156, 156, 156),
           (20, 207, 253), (208, 195, 255), (96, 114, 3), (255, 106, 60), (156, 156, 156), (255, 160, 208),
           (20, 245, 60), (208, 221, 141), (114, 255, 208), (255, 255, 255)]
BLACK, WHITE = COLOURS[0], COLOURS[15]
VIOLET, GREEN, BLUE, ORANGE = COLOURS[3], COLOURS[12], COLOURS[6], COLOURS[9]
FG = (255, 255, 255)

# The server's names for the switches, and Apple2TS's names for them in a snapshot.
APPLE2TS_NAMES = {"80store": "STORE80", "80col": "COLUMN80", "altchar": "ALTCHARSET", "text": "TEXT",
                  "mixed": "MIXED", "page2": "PAGE2", "hires": "HIRES", "dhires": "DHIRES"}


def text_base(row):
    """The address of a text row's first byte on page 1 (lo-res uses the same rows)."""
    return 0x400 + 0x80 * (row % 8) + 0x28 * (row // 8)


def hires_base(y):
    """The address of a hi-res line's first byte on page 1."""
    return 0x2000 + 0x400 * (y % 8) + 0x80 * ((y // 8) % 8) + 0x28 * (y // 64)


def glyph(b, altchar, iiplus=False):
    """(the 7 rows of dots, inverse) for a byte on the text page, as the IIe's video shows it, or
    the II Plus's, which has no lower case."""
    if iiplus:
        altchar = False
        if b >= 0xE0:
            b -= 0x40
    if b >= 0x80:
        c, inverse = b & 0x7F, False
        if c < 0x20:
            c += 0x40                              # $80-$9F: the capitals again
    elif b < 0x40:
        c, inverse = (b & 0x3F), True
        if c < 0x20:
            c += 0x40
    elif altchar:
        if b < 0x60:
            return BOX, False                      # MouseText
        c, inverse = b, True                       # inverse lower case
    else:
        c, inverse = b & 0x3F, True                # flashing, drawn inverse
        if c < 0x20:
            c += 0x40
    return FONT.get(chr(c), BOX), inverse


def letter(b, altchar, iiplus=False):
    """A byte on the text page as a letter (MouseText as a space); the II Plus has no lower case."""
    if iiplus:
        altchar = False
        if b >= 0xE0:
            b -= 0x40
    if altchar and 0x40 <= b < 0x60:
        return " "
    c = b & 0x7F
    if b < 0x80 and not (altchar and b >= 0x60):
        c = b & 0x3F
    if c < 0x20:
        c += 0x40
    return " " if c == 0x7F else chr(c)


def _page(sw):
    """Which page shows: 2 when PAGE2 is on and 80STORE does not make it pick aux memory instead."""
    return 2 if sw.get("page2") and not sw.get("80store") else 1


def text_lines(main, aux, sw):
    off = 0x400 * (_page(sw) - 1)
    out = []
    for row in range(24):
        a = text_base(row) + off
        s = ""
        for c in range(40):
            if sw.get("80col"):
                s += letter(aux[a + c], sw.get("altchar"))
            s += letter(main[a + c], sw.get("altchar"), sw.get("iiplus"))
        out.append(s.rstrip())
    return out


def _text_rows(pix, main, aux, sw, rows):
    off = 0x400 * (_page(sw) - 1)
    col80 = bool(sw.get("80col"))
    cw = 7 if col80 else 14                        # a cell's width on the 560-dot line
    for row in rows:
        a = text_base(row) + off
        cells = []
        for c in range(40):
            if col80:
                cells.append(aux[a + c])
            cells.append(main[a + c])
        for i, b in enumerate(cells):
            dots, inverse = glyph(b, sw.get("altchar"), sw.get("iiplus"))
            x0 = i * cw
            for line in range(8):
                bits = dots[line] if line < 7 else 0
                y = (row * 8 + line) * 2
                for d in range(7):
                    on = 0 < d < 6 and bits & (0x10 >> (d - 1))
                    colour = FG if bool(on) != inverse else BLACK
                    for dx in range(cw // 7):
                        x = x0 + d * (cw // 7) + dx
                        pix[y][x] = pix[y + 1][x] = colour


def _lores_rows(pix, main, aux, sw, rows):
    off = 0x400 * (_page(sw) - 1)
    double = bool(sw.get("80col") and sw.get("dhires"))
    for row in rows:
        a = text_base(row) + off
        for c in range(40):
            for half in (0, 1):
                if double:
                    for k, mem in enumerate((aux, main)):
                        v = (mem[a + c] >> (4 * half)) & 15
                        colour = WHITE if v else BLACK          # double lo-res: monochrome, as double hi-res
                        for y in range(row * 16 + half * 8, row * 16 + half * 8 + 8):
                            for x in range(c * 14 + k * 7, c * 14 + k * 7 + 7):
                                pix[y][x] = colour
                    continue
                colour = COLOURS[(main[a + c] >> (4 * half)) & 15]
                for y in range(row * 16 + half * 8, row * 16 + half * 8 + 8):
                    for x in range(c * 14, c * 14 + 14):
                        pix[y][x] = colour


def _hires_rows(pix, main, aux, sw, lines):
    off = 0x2000 * (_page(sw) - 1)
    double = bool(sw.get("80col") and sw.get("dhires"))
    for yy in lines:
        a = hires_base(yy) + off
        if double:
            dots = []
            for c in range(40):
                for mem in (aux, main):
                    b = mem[a + c]
                    dots += [(b >> k) & 1 for k in range(7)]
            for x, on in enumerate(dots):
                pix[2 * yy][x] = pix[2 * yy + 1][x] = WHITE if on else BLACK
            continue
        dots, high = [], []
        for c in range(40):
            b = main[a + c]
            for k in range(7):
                dots.append((b >> k) & 1)
                high.append(b >> 7)
        for x in range(280):
            left = dots[x - 1] if x else 0
            right = dots[x + 1] if x < 279 else 0
            if dots[x]:
                colour = WHITE if (left or right) else _hue(x, high[x])
            elif left and right:
                colour = _hue(x - 1, high[x - 1])
            else:
                colour = BLACK
            for dx in (0, 1):
                pix[2 * yy][2 * x + dx] = pix[2 * yy + 1][2 * x + dx] = colour


def _hue(x, high):
    if high:
        return BLUE if x % 2 == 0 else ORANGE
    return VIOLET if x % 2 == 0 else GREEN


def mode_of(sw):
    if sw.get("text"):
        return "text"
    if sw.get("hires"):
        return "dhires" if sw.get("80col") and sw.get("dhires") else "hires"
    return "lores"


def render(main, aux, sw, mode=None):
    """(width, height, rows): the screen as 560 x 384 RGB."""
    pix = [[BLACK] * W for _ in range(H)]
    mode = mode or mode_of(sw)
    graphics_rows = range(24) if mode == "text" else range(20 if sw.get("mixed") else 24)
    if mode == "text":
        _text_rows(pix, main, aux, sw, range(24))
    elif mode == "lores":
        _lores_rows(pix, main, aux, sw, graphics_rows)
    else:
        _hires_rows(pix, main, aux, sw, range(graphics_rows.stop * 8))
    if mode != "text" and sw.get("mixed"):
        _text_rows(pix, main, aux, sw, range(20, 24))
    return W, H, pix


def png(path, width, height, pix):
    raw = b"".join(b"\x00" + bytes(v for p in row for v in p) for row in pix)

    def chunk(kind, data):
        c = kind + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
    body = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "wb") as f:
        f.write(body)


def screenshot(machine, path, mode=None):
    """The live machine's screen: the text, lo-res and hi-res pages of both 64Ks, and the switches."""
    chips = machine.chips()
    sw = dict(chips["switches"])
    sw["iiplus"] = chips["model"].startswith("Apple II Plus")   # no aux memory, no lower case
    main = bytearray(0x6000)
    aux = bytearray(0x6000)
    main[0x400:0xC00] = machine.read(0x400, 0x800, space="main")
    if not sw["iiplus"]:
        aux[0x400:0xC00] = machine.read(0x400, 0x800, space="aux")
    m = mode or mode_of(sw)
    if m in ("hires", "dhires"):
        main[0x2000:0x6000] = machine.read(0x2000, 0x4000, space="main")
        if not sw["iiplus"]:
            aux[0x2000:0x6000] = machine.read(0x2000, 0x4000, space="aux")
    w, h, pix = render(main, aux, sw, mode)
    png(path, w, h, pix)
    return {"path": os.path.abspath(path), "mode": m, "width": w, "height": h}


def snapshot_switches(path):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import snapshot
    snap = snapshot.load(path)
    names = snap["state"]["state6502"].get("softSwitches") or {}
    sw = {k: bool(names.get(v)) for k, v in APPLE2TS_NAMES.items()}
    sw["iiplus"] = snapshot.model(snap) == "iiplus"
    mem = snapshot.memory(snap, path)
    return mem["main"], mem["aux"], sw


def from_snapshot(snap_path, path, mode=None):
    main, aux, sw = snapshot_switches(snap_path)
    w, h, pix = render(main, aux, sw, mode)
    png(path, w, h, pix)
    return {"path": os.path.abspath(path), "mode": mode or mode_of(sw), "width": w, "height": h}


def main():
    a = sys.argv[1:]
    if len(a) < 2 or a[0] in ("-h", "--help"):
        print(__doc__)
        print("usage: screen.py <snapshot> <out.png> [text|lores|hires|dhires]")
        return
    r = from_snapshot(a[0], a[1], a[2] if len(a) > 2 else None)
    print(f"{r['path']}: {r['mode']}, {r['width']} x {r['height']}")
    if r["mode"] == "text":
        main_, aux_, sw = snapshot_switches(a[0])
        print("\n".join(text_lines(main_, aux_, sw)))


if __name__ == "__main__":
    main()
