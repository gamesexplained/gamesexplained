#!/usr/bin/env python3
"""What the screen says, as lines of text: for a script that waits on a prompt.

A script that drives a game through its prompts (a copier, a menu, a disk swap) has to know what
the screen says, and a screenshot tells an agent but not a script. This reads it from the video
chip's registers and the memory they point at:

  text mode     the screen codes, through the character ROM's two sets: letters, digits and
                punctuation as themselves, the lower-case set where $D018 picks it, a reversed
                character as the plain one, and each graphic character as GRAPHIC
  bitmap mode   the game's own font, which the caller names: each glyph is looked for in the
                bitmap as the font has it and inverted (EOR $FF). Many disk games draw all their
                text this way, role-playing and adventure games above all. A solid glyph reads as
                a space, since it cannot be told from an inverted one

  from screen import Font, text, wait_text
  lines = text(rpc)                                  # 25 lines, trailing spaces cut
  font = Font(0xC600, first=0x20)                    # glyph c at $C600 + (c - $20) * 8
  lines = text(rpc, font)
  m = wait_text(rpc, r"Insert (master|copy)", font, timeout=60)     # a re.Match

A font is eight bytes a glyph, from address (read through bank, "ram" unless it is a ROM's), and
the character code of its first glyph: first=0x20 for a font in ASCII order from the space. A
font in another order names its glyphs instead, one character each: chars=ROM_UPPER for one laid
out like the character ROM. width is how far apart the game draws two letters, which is not how
wide a letter looks:
  8      each glyph is copied whole into one of the bitmap's cells, as most games do, even when
         its letters are six pixels wide: the cells are read one by one
  1-7    letters packed closer than the cells, at any pixel: the leftmost width pixels of each
         glyph's bytes are looked for at every pixel of every line. A glyph with a pixel right
         of them is refused, since the width is then wrong; a line is placed on the screen's
         row nearest it, and a gap of a letter's width or more reads as spaces
A text-mode game whose character set does not keep the letters at the ROM's screen codes reads
the same way, through its font.

The registers are read once, at the start of each read. A screen split by raster interrupts
into a picture and a text window reads as whichever half they hold at that moment (frame.py
records a whole frame), and a read of a running machine can catch a line half drawn.

Usage:
  screen.py                                 print the running machine's screen
  screen.py --font '$C600' [--width 6] [--first '$20'] [--count 95] [--bank rom]
                                            read it through the game's font
  screen.py --wait 'PATTERN' [--timeout 30] [--font ...]
                                            wait until the screen matches, then print it;
                                            exit 1 if it does not, or if the machine is stopped
"""
import argparse, re, sys, time

from vice import EmulatorDown, ViceError, ask, paused, read_mem

GRAPHIC = "▒"          # a graphic character, or a glyph whose character is not printable

_PUNCT = "[£]↑←" + "".join(map(chr, range(0x20, 0x40)))    # screen codes $1B-$3F
ROM_UPPER = ("@" + "ABCDEFGHIJKLMNOPQRSTUVWXYZ" + _PUNCT + GRAPHIC * 32 + " " + GRAPHIC * 31)
ROM_LOWER = ("@" + "abcdefghijklmnopqrstuvwxyz" + _PUNCT + GRAPHIC + "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
             + GRAPHIC * 5 + " " + GRAPHIC * 31)
# The character ROM's two sets by screen code $00-$7F, checked glyph by glyph against the ROM VICE
# ships (10 October 2026); $80-$FF are the same characters reversed. $60 is blank in both sets.


class Font:
    """A font in the game's memory: eight bytes a glyph, from address."""

    def __init__(self, address, width=8, first=0x20, count=None, bank="ram", chars=None):
        if not 1 <= width <= 8:
            raise ValueError(f"Font: width {width}: a glyph is one byte wide, so 1 to 8 pixels")
        if chars is None:
            count = 0x7F - first if count is None else count
            chars = "".join(chr(c) if 0x20 <= c < 0x7F else GRAPHIC for c in range(first, first + count))
        self.address, self.width, self.bank, self.chars = address, width, bank, chars

    def load(self, rpc):
        """The glyphs' bytes, read now: a game can change its font as it runs."""
        return read_mem(rpc, self.address, 8 * len(self.chars), self.bank)


def video(regs, dd00):
    """Where the video chip reads, from its registers (regs[i] is $D000+i) and CIA 2's port A."""
    d011, d018 = regs[0x11], regs[0x18]
    bank = (3 - (dd00 & 3)) * 0x4000      # an input line reads high, as the video chip sees it
    return {"bank": bank, "screen": bank + (d018 >> 4) * 0x400, "chars": bank + (d018 >> 1 & 7) * 0x800,
            "bitmap": bank + (d018 >> 3 & 1) * 0x2000, "bitmap_mode": bool(d011 & 0x20),
            "ecm": bool(d011 & 0x40)}


def rom_chars(v):
    """The offset into the character ROM of the set the video chip shows, or None for one in RAM.

    In video banks 0 and 2 it sees the ROM at $1000-$1FFF of the bank (c64-reference, "RAM the
    VIC cannot see"): $1000 is the upper-case and graphics set, $1800 the lower and upper case."""
    off = v["chars"] - v["bank"]
    return off - 0x1000 if v["bank"] in (0x0000, 0x8000) and 0x1000 <= off < 0x2000 else None


def decode(regs, dd00, read, font=None, glyphs=None):
    """The screen as 25 lines, trailing spaces cut.

    read(address, size) returns memory as the video chip sees it, the character ROM included
    (vic_reader below, or one over a memory image). glyphs is font's bytes (Font.load)."""
    v = video(regs, dd00)
    if font is None:
        if v["bitmap_mode"]:
            raise ValueError("the screen is a bitmap, so its text is in the game's own font: name it "
                             "(Font: its address, width and the code of its first glyph)")
        table = ROM_LOWER if rom_chars(v) == 0x800 else ROM_UPPER
        codes = read(v["screen"], 1000)
        return ["".join(table[((c & 0x3F) if v["ecm"] else c) & 0x7F] for c in codes[r * 40:r * 40 + 40]).rstrip()
                for r in range(25)]
    cells = _cells(v, read)
    if font.width == 8:
        index = _index8(font, glyphs)
        return ["".join(index.get(cells[r * 40 + c], " ") for c in range(40)).rstrip() for r in range(25)]
    return _scan(cells, font, glyphs)


def _cells(v, read):
    """The 1000 cells' eight bytes each, as drawn: the bitmap's, or each screen code's glyph."""
    if v["bitmap_mode"]:
        bm = read(v["bitmap"], 8000)
        return [bm[i * 8:i * 8 + 8] for i in range(1000)]
    codes, chars = read(v["screen"], 1000), read(v["chars"], 0x800)
    mask = 0x3F if v["ecm"] else 0xFF
    return [chars[(c & mask) * 8:(c & mask) * 8 + 8] for c in codes]


def _glyphs(font, glyphs):
    if len(glyphs) < 8 * len(font.chars):
        raise ValueError(f"Font at ${font.address:04X}: {len(font.chars)} glyphs need "
                         f"{8 * len(font.chars)} bytes, given {len(glyphs)}")
    return [(ch, bytes(glyphs[i * 8:i * 8 + 8])) for i, ch in enumerate(font.chars)]


def _index8(font, glyphs):
    """Each glyph's eight bytes, and their inverse, to its character. Where two glyphs are drawn
    alike the first wins, and an inverted one never displaces a plain one. An empty cell and a
    solid one are spaces, the second being an inverted space as often as a solid glyph."""
    index, pairs = {bytes(8): " ", bytes([0xFF] * 8): " "}, _glyphs(font, glyphs)
    for ch, g in pairs:
        index.setdefault(g, ch)
    for ch, g in pairs:
        index.setdefault(bytes(b ^ 0xFF for b in g), ch)
    return index


def _scan(cells, font, glyphs):
    """Glyphs width pixels wide looked for at every pixel of every line of the picture."""
    w, rest = font.width, (1 << (8 - font.width)) - 1
    mask, full = (1 << w) - 1, (1 << 8 * w) - 1
    index, ink = {}, {}
    for ch, g in _glyphs(font, glyphs):
        if any(b & rest for b in g):
            raise ValueError(f"Font at ${font.address:04X}: glyph {ch!r} has a pixel right of its "
                             f"{w} (its bytes {g.hex(' ')}): the font is wider than that")
        k = 0
        for b in g:
            k = k << w | b >> (8 - w)
        if k and k != full:                      # empty and solid are spaces, as in _index8
            index.setdefault(k, ch)
            ink.setdefault(k, 0 if ch == GRAPHIC else bin(k).count("1"))    # a letter over a line
    for k in list(index):
        index.setdefault(k ^ full, index[k])
        ink.setdefault(k ^ full, ink[k])
    rows = [int.from_bytes(bytes(cells[(y >> 3) * 40 + c][y & 7] for c in range(40)), "big")
            for y in range(200)]
    xs = range(321 - w)
    win = [[r >> (320 - w - x) & mask for x in xs] for r in rows]
    found = []                                   # (score, y, [(x, character)])
    for y in range(193):
        keys = [a << 7 * w | b << 6 * w | c << 5 * w | d << 4 * w | e << 3 * w | f << 2 * w | g << w | h
                for a, b, c, d, e, f, g, h in zip(*win[y:y + 8])]
        hits, score, x = [], 0, 0
        while x < len(keys):
            ch = index.get(keys[x])
            if ch is None:
                x += 1
                continue
            hits.append((x, ch))
            score += ink[keys[x]]
            x += w
        if hits:
            found.append((score, y, hits))
    lines, taken = [""] * 25, []
    # The line that explains the most ink wins over its neighbours, which are mostly the same
    # letters a line or two out of step; on a tie ("-" over "_" three lines up), the cell rows.
    for score, y, hits in sorted(found, key=lambda f: (-f[0], f[1] % 8 != 0, f[1])):
        if any(abs(y - t) < 8 for t in taken):
            continue
        taken.append(y)
        out, end = "", 0
        for x, ch in hits:
            out += " " * round((x - end) / w) + ch
            end = x + w
        lines[min(24, (y + 4) >> 3)] = out.rstrip()
    return lines


def vic_reader(rpc):
    """read(address, size) for decode(): memory as the video chip sees it, from the emulator.

    The RAM, except $1000-$1FFF and $9000-$9FFF, where the chip sees the character ROM."""
    def read(a, n):
        out = b""
        while n > 0:
            rom = (a & 0x7000) == 0x1000         # bits 12-14 = 001: $1000-$1FFF, $9000-$9FFF only
            k = min(n, 0x1000 - (a & 0xFFF))
            out += read_mem(rpc, 0xD000 + (a & 0xFFF), k, "rom") if rom else read_mem(rpc, a, k, "ram")
            a, n = a + k, n - k
        return out
    return read


def text(rpc, font=None):
    """The running machine's screen as 25 lines, trailing spaces cut (see the module's comment)."""
    regs = ask(rpc, "vice_vicii_get_state")["registers"]
    dd00 = read_mem(rpc, 0xDD00, 1, "io")[0]
    return decode(regs, dd00, vic_reader(rpc), font, font.load(rpc) if font else None)


def wait_text(rpc, pattern, font=None, timeout=30.0, every=0.25):
    """Read the screen until pattern (a regular expression, searched in the lines joined by
    newlines) is on it, and return the re.Match.

    Raises TimeoutError after timeout seconds, with the screen as it last read. A machine that is
    stopped cannot change its screen, so finding it stopped raises ViceError at once, naming where
    it is: usually a stopping checkpoint an earlier script left armed (vice.clear_checkpoints)."""
    rx = re.compile(pattern) if isinstance(pattern, str) else pattern
    t0 = time.time()
    while True:
        lines = text(rpc, font)
        m = rx.search("\n".join(lines))
        if m:
            return m
        if paused(rpc):
            pc = ask(rpc, "vice_registers_get")["PC"]
            raise ViceError(f"wait_text: {rx.pattern!r} is not on the screen, and the machine is stopped "
                            f"at ${pc:04X}, so the screen will not change: a stopping checkpoint left "
                            f"armed? (vice.clear_checkpoints)\n{_shown(lines)}")
        if time.time() - t0 > timeout:
            raise TimeoutError(f"wait_text: {rx.pattern!r} not on the screen after {timeout:g} s; "
                               f"it read:\n{_shown(lines)}")
        time.sleep(every)


def _shown(lines):
    return "\n".join(f"  {r:2d} | {l}" for r, l in enumerate(lines) if l.strip()) or "  (nothing)"


def _num(s):
    t = s.strip().lower()
    return int(t[1:], 16) if t.startswith("$") else int(t, 0)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter,
                                usage=argparse.SUPPRESS)
    p.add_argument("--font", type=_num, help="the font's address ($C600, 0xC600 or 50688)")
    p.add_argument("--width", type=int, default=8, help="how far apart two letters are drawn (8)")
    p.add_argument("--first", type=_num, default=0x20, help="the character code of the first glyph ($20)")
    p.add_argument("--count", type=int, help="how many glyphs (to $7E from the first)")
    p.add_argument("--bank", default="ram", help="where the font is read: ram (default) or rom")
    p.add_argument("--wait", metavar="PATTERN", help="wait until the screen matches this regular expression")
    p.add_argument("--timeout", type=float, default=30.0, help="seconds --wait waits (30)")
    a = p.parse_args()
    font = Font(a.font, a.width, a.first, a.count, a.bank) if a.font is not None else None
    try:
        from vice import connect
        rpc = connect()
        if a.wait:
            wait_text(rpc, a.wait, font, a.timeout)
        print("\n".join(text(rpc, font)))
    except (EmulatorDown, ViceError, TimeoutError, ValueError) as e:
        sys.exit(str(e))


if __name__ == "__main__":
    main()
