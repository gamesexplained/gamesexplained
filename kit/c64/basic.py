#!/usr/bin/env python3
"""Commodore BASIC V2 as it sits in memory: the C64 listing's BASIC text type.

A game written partly in BASIC keeps its program where the KERNAL's LOAD
put it, from TXTTAB (`$2B`-`$2C`, `$0801` unless the game moves it). It is
what the disk loaded, so it is the game's own code, and a block of it typed
`BASIC` in symbols.json is listed the way a reader can follow: each
program line as the ROM's `LIST` prints it, one item to a line. The
variables after it (VARTAB on) change as the program runs and are not
listed.

The layout (the ROM's own):

  a line      2 bytes the address of the next line, low byte first; 2 bytes
              the line number, low byte first; the text, keywords as one-byte
              tokens ($80-$CB, and $FF for pi); $00.
  the end     a next-line address of $0000.

`LIST` expands a byte of $80 or more as its keyword everywhere but inside
quotes, in a REM and a DATA too, and prints the rest as it stands, with no
spaces of its own. The keywords and the code between them are written in
capitals, as LIST shows them in the character set the machine starts in. A
character inside quotes or after REM or DATA is written as petcat (VICE's
lister) writes it: an unshifted letter ($41-$5A) small and a shifted one
($C1-$DA, $61-$7A) a capital, as they show in the lower-case character set,
which is the one a program that prints text in both cases uses; a control
code by petcat's name for it ({clr}, {down}, {rvs on}, {wht}...); a graphics
character as {$xx}. A byte with no keyword outside quotes ($CC-$FE) is
{$xx} too.

  pieces(ram, start, end) -> (texts, starts)
      texts {address: str}: what each byte from `start` to `end` adds to
      the text of its line, so a line cut in two by a label still reads
      right; starts {address: "routine"}: where each line begins. `start`
      must be the start of a line.
  byte_text(byte) -> str
      one byte with no context: a token as its keyword, else as above.
  lines(ram, start) -> [(address, number, text)]
      the program from `start` to its end, for a script that reads it.
"""

TOKENS = ("END FOR NEXT DATA INPUT# INPUT DIM READ LET GOTO RUN IF RESTORE GOSUB RETURN REM STOP ON "
          "WAIT LOAD SAVE VERIFY DEF POKE PRINT# PRINT CONT LIST CLR CMD SYS OPEN CLOSE GET NEW TAB( TO "
          "FN SPC( THEN NOT STEP + - * / ^ AND OR > = < SGN INT ABS USR FRE POS SQR RND LOG EXP COS SIN "
          "TAN ATN PEEK LEN STR$ VAL ASC CHR$ LEFT$ RIGHT$ MID$ GO").split()
TOKENS = {0x80 + i: t for i, t in enumerate(TOKENS)}
TOKENS[0xFF] = "π"
assert max(TOKENS) == 0xFF and TOKENS[0xCB] == "GO"
REM, DATA, QUOTE = 0x8F, 0x83, 0x22

CONTROL = {0x03: "stop", 0x05: "wht", 0x07: "bell", 0x08: "dish", 0x09: "ensh", 0x0A: "lf", 0x0D: "return",
           0x0E: "swlc", 0x11: "down", 0x12: "rvs on", 0x13: "home", 0x14: "del", 0x1C: "red", 0x1D: "rght",
           0x1E: "grn", 0x1F: "blu", 0x81: "orng", 0x85: "f1", 0x86: "f3", 0x87: "f5", 0x88: "f7", 0x89: "f2",
           0x8A: "f4", 0x8B: "f6", 0x8C: "f8", 0x8D: "sret", 0x8E: "swuc", 0x90: "blk", 0x91: "up",
           0x92: "rvs off", 0x93: "clr", 0x94: "inst", 0x95: "brn", 0x96: "lred", 0x97: "gry1", 0x98: "gry2",
           0x99: "lgrn", 0x9A: "lblu", 0x9B: "gry3", 0x9C: "pur", 0x9D: "left", 0x9E: "yel", 0x9F: "cyn"}


def char(c):
    """A byte inside quotes, a REM or a DATA, as petcat writes it."""
    if c in CONTROL:
        return "{%s}" % CONTROL[c]
    if 0x41 <= c <= 0x5A:
        return chr(c).lower()
    if 0xC1 <= c <= 0xDA or 0x61 <= c <= 0x7A:
        return chr((c & 0x1F) + 0x40)
    if c == 0x5C:
        return "£"
    if c == 0x5E:
        return "↑"
    if c == 0x5F:
        return "←"
    if 0x20 <= c <= 0x5B or c == 0x5D:
        return chr(c)
    return "{$%02x}" % c


def byte_text(c):
    return TOKENS.get(c) or (chr(c) if 0x20 <= c <= 0x5D else char(c))


def _line(ram, a, texts):
    """One program line at a; returns the address of the next, or None at the end."""
    link = ram[a] | ram[a + 1] << 8
    if link == 0:
        texts[a] = "(end of the program)"
        texts[a + 1] = ""
        return None
    texts[a] = "%d " % (ram[a + 2] | ram[a + 3] << 8)
    texts[a + 1] = texts[a + 2] = texts[a + 3] = ""
    p, quoted, literal = a + 4, False, False
    while p < len(ram) and ram[p]:
        c = ram[p]
        if c == QUOTE:
            quoted = not quoted
            texts[p] = '"'
        elif quoted or literal or c < 0x80:
            texts[p] = char(c) if quoted or literal else chr(c) if 0x20 <= c < 0x80 else char(c)
        else:
            texts[p] = TOKENS.get(c) or "{$%02x}" % c
            literal = literal or c == REM
        if c == DATA and not quoted:
            literal = True
        elif c == 0x3A and not quoted and literal and ram[a + 4:p].count(REM) == 0:
            literal = False                     # a DATA statement ends at a colon; a REM at the line's end
        p += 1
    if p < len(ram):
        texts[p] = ""
    return p + 1


def pieces(ram, start, end):
    texts, starts, a = {}, {}, start
    while a is not None and a <= end:
        starts[a] = "routine"
        nxt = _line(ram, a, texts)
        if nxt is None:
            a += 2
            break
        a = nxt
    if a is not None:
        for x in range(a, end + 1):
            texts.setdefault(x, "{$%02x}" % ram[x])
    return texts, starts


def lines(ram, start):
    texts, starts = pieces(ram, start, len(ram) - 1)
    out, order = [], sorted(starts)
    for i, a in enumerate(order):
        b = order[i + 1] if i + 1 < len(order) else a + 2
        if ram[a] | ram[a + 1] << 8 == 0:
            break
        out.append((a, ram[a + 2] | ram[a + 3] << 8, "".join(texts.get(x, "") for x in range(a, b))
                    .split(" ", 1)[1]))
    return out


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print(__doc__ + "\nUsage: basic.py <snapshot.vsf | 64 KB RAM dump> [start, default TXTTAB]")
        sys.exit(0)
    path = sys.argv[1]
    if path.lower().endswith(".vsf"):
        sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
        from snapshot import read
        ram = read(path)
    else:
        ram = open(path, "rb").read()
    start = int(sys.argv[2].lstrip("$"), 16) if len(sys.argv) > 2 else ram[0x2B] | ram[0x2C] << 8
    for a, n, t in lines(ram, start):
        print(f"${a:04X} {n} {t}")
