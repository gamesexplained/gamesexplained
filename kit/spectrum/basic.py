#!/usr/bin/env python3
"""Sinclair BASIC as it sits in memory: the listing's BASIC text type.

A game written partly in BASIC keeps its program at PROG (`$5CCB` on a
48K machine with no microdrive) and the program's variables straight
after it, at VARS. Both are what the tape loaded, so they are the game's
own data, and a block of either typed `BASIC` in symbols.json is listed
the way a reader can follow: each program line as the ROM's `LIST`
prints it, and each variable as the value it holds, an array as its
dimensions and then one row at a time.

The layouts (the 48K ROM's own, as its manual describes them):

  a line       2 bytes line number, high byte first (0-9999, so the
               first byte is below $40); 2 bytes length of the rest,
               low byte first; the text, tokens and all; $0D. A number
               typed in the text is followed by $0E and the five bytes
               of its value, which LIST does not show.
  a variable   one byte whose top three bits give the kind and whose
               low five the letter (a = 1):
                 011  number, one letter              then 5 bytes
                 101  number, longer name             the rest of the name,
                                                      bit 7 on its last letter, then 5 bytes
                 010  string                          2 bytes length, the text
                 100  array of numbers                2 bytes length, 1 byte dimensions,
                 110  array of characters             2 bytes for each dimension, the elements
                 111  FOR control variable            value, limit, step (5 bytes each),
                                                      2 bytes loop line, 1 byte statement
               $80 ends the variables.
  a number     5 bytes: 0, sign byte ($00 or $FF), a 16-bit two's
               complement integer, 0; or a floating-point value, an
               exponent byte (2 to the power exponent-128) and a
               32-bit mantissa whose top bit, always 1, is the sign.

Keyword spacing follows the ROM's own printer (PO-TOKENS at $0C10): a
token from OR ($C5) on that starts with a letter gets a space before it
unless one was just printed, and every token gets a space after it except
RND, INKEY$, PI and those ending in a character below "A" ("<=", ">=",
"<>", "OPEN #", "CLOSE #"). A hidden number that differs from the digits
typed before it is shown in braces after them, and so is any byte that
has no printable form: {0x0E}. A user-defined graphic shows as {UDG-A}.
The conventions are SkoolKit's lister's, which `test_basic.py` holds this
module against.

  pieces(ram, start, end) -> (texts, starts)
      texts {address: str}: what each byte from `start` to `end` adds to
      the text of its item, so an item cut in two by a label still reads
      right; starts {address: kind}: where each item (a line, a variable,
      a row of an array) begins, and what a label there names in the
      Source tab's index: "routine" for a line, "variable" for a number
      or a string, "table" for an array. `start` must be a line or a
      variable.
  byte_text(byte) -> str
      one byte with no context: a token as its keyword, else as above.
"""
import re

TOKENS = ("RND INKEY$ PI FN POINT SCREEN$ ATTR AT TAB VAL$ CODE VAL LEN SIN COS TAN "
          "ASN ACS ATN LN EXP INT SQR SGN ABS PEEK IN USR STR$ CHR$ NOT BIN OR AND "
          "<= >= <> LINE THEN TO STEP DEF_FN CAT FORMAT MOVE ERASE OPEN_# CLOSE_# "
          "MERGE VERIFY BEEP CIRCLE INK PAPER FLASH BRIGHT INVERSE OVER OUT LPRINT "
          "LLIST STOP READ DATA RESTORE NEW BORDER CONTINUE DIM REM FOR GO_TO GO_SUB "
          "INPUT LOAD LIST LET PAUSE NEXT POKE PRINT PLOT RUN SAVE RANDOMIZE IF CLS "
          "DRAW CLEAR RETURN COPY").replace("_", "\x00").split()
TOKENS = {0xA5 + i: t.replace("\x00", " ") for i, t in enumerate(TOKENS)}
assert len(TOKENS) == 0x100 - 0xA5
NUMBER, END = 0x0E, 0x0D
NUMERAL = re.compile(r"[0-9.]+([eE][-+]?[0-9]+)?$")


def char(c):
    """A character code outside a token: the ROM's printable set, else braces."""
    if c == 0x5E:
        return "^"                  # the ROM's up arrow, written as kit/spectrum/z80.py writes it
    if c == 0x60:
        return "£"
    if c == 0x7F:
        return "©"
    if 0x20 <= c <= 0x7E:
        return chr(c)
    if 0x90 <= c <= 0xA4:
        return "{UDG-%s}" % chr(c - 0x4F)
    return "{0x%02X}" % c


def byte_text(c):
    return TOKENS.get(c) or char(c)


def number(b):
    """A five-byte number as Python's int or float."""
    if b[0] == 0:
        v = b[2] | b[3] << 8
        return v - 0x10000 if b[1] else v
    mant = ((b[1] | 0x80) << 24) | (b[2] << 16) | (b[3] << 8) | b[4]
    v = mant * 2.0 ** (b[0] - 160)
    return -v if b[1] & 0x80 else v


def show(v):
    """A number as a reader expects it: no ".0" on a whole one."""
    if isinstance(v, float) and v.is_integer() and abs(v) < 1e15:
        return str(int(v))
    return repr(v) if isinstance(v, int) else f"{v:.10g}"


class _Text:
    """Token spacing across one line or one string's characters."""
    def __init__(self, space_before=False):
        self.lspace = space_before        # True: a token from OR on needs a space before it

    def code(self, c):
        if c >= 0xA5:
            t = TOKENS[c]
            if self.lspace and c >= 0xC5 and t[0] >= "A":
                t = " " + t
            if c < 0xA8 or c == 0xCB or t[-1] in "#=>":   # RND INKEY$ PI, THEN, <= >= <>, OPEN # CLOSE #
                self.lspace = True                          # THEN's own space is the next keyword's
                return t
            self.lspace = False
            return t + " "
        self.lspace = c > 0x20
        return char(c)


def _line(ram, a, texts):
    """One program line at a; returns the address after it."""
    num, n = ram[a] << 8 | ram[a + 1], ram[a + 2] | ram[a + 3] << 8
    end = a + 4 + n
    texts[a] = f"{num} "
    for x in range(a + 1, a + 4):
        texts[x] = ""
    tx, line, p = _Text(), "", a + 4
    while p < end and p < len(ram):
        c = ram[p]
        if c == END and p == end - 1:
            texts[p] = ""; p += 1; continue
        if c == NUMBER and p + 5 < end:
            m = NUMERAL.search(line.rstrip())
            v = number(ram[p + 1:p + 6])
            typed = None
            if m:
                bn = re.search(r"BIN +([01]+)$", line.rstrip())
                try:
                    typed = int(bn.group(1), 2) if bn else float(m.group(0))
                except ValueError:
                    typed = "?"         # digits LIST would show that are no number: show the value
            # no digits before it (a DEF FN parameter's slot): LIST shows nothing either
            ok = typed is None or typed != "?" and (abs(typed) < 1e-9 if v == 0 else abs(1 - typed / v) < 1e-9)
            texts[p] = "" if ok else "{%s}" % show(v)
            for x in range(p + 1, p + 6):
                texts[x] = ""
            line += texts[p]; p += 6; continue
        if 0x10 <= c <= 0x17:               # colour and position controls carry their parameters, in a REM too
            k = 2 if c <= 0x15 else 3
            texts[p] = "{0x" + "".join("%02X" % ram[q] for q in range(p, min(p + k, end))) + "}"
            for x in range(p + 1, min(p + k, end)):
                texts[x] = ""
            line += texts[p]; p += k; continue
        s = tx.code(c)
        texts[p] = s; line += s; p += 1
    return end


def _put(texts, a, n, first):
    """An item of n bytes at a whose whole text sits on its first byte."""
    for x in range(a, a + n):
        texts[x] = ""
    texts[a] = first


def _chars(ram, a, n, texts):
    """n characters of a string or a row of a character array, from a."""
    tx = _Text(True)
    for x in range(a, a + n):
        texts[x] = tx.code(ram[x])


def _variable(ram, a, texts, starts):
    """One variable at a, and each row of an array as an item of its own;
    returns the address after it."""
    c = ram[a]
    kind, letter = c >> 5, chr((c & 0x1F) + 0x60)
    starts[a] = "variable" if kind in (2, 3, 5, 7) else "table"
    if kind == 3:                                   # number, one letter
        _put(texts, a, 6, f"{letter}={show(number(ram[a + 1:a + 6]))}")
        return a + 6
    if kind == 5:                                   # number, longer name
        q, name = a + 1, letter
        while q < len(ram):
            name += chr(ram[q] & 0x7F).lower()
            q += 1
            if ram[q - 1] & 0x80:
                break
        _put(texts, a, q + 5 - a, f"{name}={show(number(ram[q:q + 5]))}")
        return q + 5
    if kind == 7:                                   # FOR control variable
        v, lim, step = (show(number(ram[q:q + 5])) for q in (a + 1, a + 6, a + 11))
        _put(texts, a, 19, f"{letter}={v} (FOR {letter}: limit {lim}, step {step}, "
                           f"loops to line {ram[a + 16] | ram[a + 17] << 8} statement {ram[a + 18]})")
        return a + 19
    ln = ram[a + 1] | ram[a + 2] << 8
    end = a + 3 + ln
    if kind == 2:                                   # string
        _put(texts, a, 3, f'{letter}$="' + ('"' if not ln else ""))
        _chars(ram, a + 3, ln, texts)
        if ln:
            texts[end - 1] += '"'
        return end
    if kind in (4, 6):                              # arrays: the dimensions, then a row at a time
        nd = ram[a + 3]
        dims = [ram[a + 4 + 2 * i] | ram[a + 5 + 2 * i] << 8 for i in range(nd)]
        data = a + 4 + 2 * nd
        name = letter + ("$" if kind == 6 else "")
        _put(texts, a, data - a, f"DIM {name}({','.join(map(str, dims))})")
        if kind == 4 and nd == 1:                   # a list of numbers: one item each
            for i, p in enumerate(range(data, end - 4, 5)):
                starts[p] = "table"
                _put(texts, p, 5, f"{name}({i + 1})={show(number(ram[p:p + 5]))}")
            return end
        row = dims[-1] * (5 if kind == 4 else 1)
        idx, p = [1] * (nd - 1), data
        while p < end and row:
            n = min(row, end - p)
            starts[p] = "table"
            label = name + ("(" + ",".join(map(str, idx)) + ")" if idx else "")
            if kind == 6:
                _chars(ram, p, n, texts)
                texts[p] = f'{label}="' + texts[p]
                texts[p + n - 1] += '"'
            else:
                label = label[:-1] + f",1 TO {dims[-1]})"
                _put(texts, p, n, f"{label}=" + ", ".join(show(number(ram[q:q + 5]))
                                                          for q in range(p, p + n - 4, 5)))
            p += n
            k = len(idx) - 1
            while k >= 0:
                idx[k] += 1
                if idx[k] <= dims[k]:
                    break
                idx[k] = 1
                k -= 1
        return end
    texts[a] = char(c)                               # not a variable: the walk has lost its place
    return a + 1


def pieces(ram, start, end):
    texts, starts, a = {}, {}, start
    while a <= end:
        c = ram[a]
        if c < 0x40:                                # a program line
            starts[a] = "routine"
            a = _line(ram, a, texts)
        elif c == 0x80:                             # the end of the variables
            starts[a] = "variable"
            texts[a] = "(end of the variables)"
            a += 1
            for x in range(a, end + 1):
                texts[x] = byte_text(ram[x])
            break
        else:
            a = _variable(ram, a, texts, starts)
    return texts, starts
