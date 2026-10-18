#!/usr/bin/env python3
"""BBC BASIC as it sits in memory: the listing's BASIC text type, for the BBC Micro.

A game written in BBC BASIC is its program, which LOAD or CHAIN puts at PAGE (&1900 on the
kit's machine, with the DFS; kit/skills/bbc/bbc-reference, "A game written in BASIC"). A
block of it typed `BASIC` in symbols.json is listed the way BASIC's own LIST prints it, one
line to an item, so a reader follows the program as its author typed it.

The layout (BASIC II, the ROM jsbeeb ships, "BASIC" (C)1982 Acorn; checked against that ROM's
own LIST by test_basic.py):

  a line       &0D; the line number, high byte first (0-32767, so the high byte is below
               &80); the length of the whole line from its &0D, one byte; the text, tokens
               and all. The &0D that starts each line is the end of the one before.
  the end      &0D then &FF: a high byte of &80 or more is no line number, and LIST stops.
  a token      a byte from &80 up, outside a string: a keyword, BASIC II's table below,
               copied in the ROM's order from its keyword table at &8071-&836C.
  &8D          a line number in the text (after GOTO, GOSUB, RESTORE, THEN, ELSE), three
               bytes after it: the top two bits of each half, packed and EOR &54, then the
               low six bits of the low byte and of the high byte, each with &40 set
               (the decoding is the one LIST uses: test_basic.py holds it to the ROM's).
  a string     from a `"` to the next: no byte inside is a token, and LIST prints each as it
               is, top-bit bytes and all. Mode 7's control codes (128-159) and its graphics
               characters (160-255) are written there in a game that prints pictures.

LIST prints, for each line, its number right-aligned in five columns and then the text with
every token as its keyword, adding no spaces: what the author typed is what is stored. It
expands a token after REM and DATA too (the tokeniser leaves those words' text alone, but a
byte from &80 up there, outside a string, is still listed as a keyword), and it keeps track of
quotes there as well. Here a byte with no printable form, a control code or a top-bit byte,
is shown in braces in the BBC's own notation: {&86}.

  pieces(ram, start, end) -> (texts, starts)
      texts {address: str}: what each byte from `start` to `end` adds to the text of its
      line, so a line cut in two by a label still reads right; starts {address: kind}: where
      each item begins, "routine" for a line (a label on one names the routine that starts
      there in the Source tab's index). `start` must be the &0D of a line, or the program's
      end mark.
  byte_text(byte) -> str
      one byte with no context: a token as its keyword, else as above.
  listed(raw) -> str
      bytes as LIST sent them to the screen, shown the same way: test_basic.py compares the
      two through it.
  variable(read, name) -> value or None
      a variable's value as BASIC holds it while the program runs, found the way BASIC finds
      it (kit/skills/bbc/bbc-reference, "A game written in BASIC"): `read(address, n)` gives
      n bytes of the machine's memory (a jsbeeb client's `m.read`, or a slice of a snapshot's
      RAM). `name` as the program spells it: `l`, `try%`, `in$`, or an array as `c(` or
      `w$(`, which gives (dimensions, values) with the last subscript the fastest. A port of
      a routine is held to the game by reading its variables at the game's waits.

`python3 kit/bbc/basic.py list <snapshot.json.gz>` prints the program in a snapshot, from
PAGE to TOP as BASIC's zero page gives them, each line after its address: the way to read a
game before typing it, and to find a line's address for a label.
"""

# BASIC II's keywords by token, from &80 to &FF; &8D (a line number follows) and &CE (unused)
# have none. PTR, PAGE, TIME, LOMEM and HIMEM have two tokens each, one for reading the value
# and one for setting it, and LIST shows both the same way.
KEYWORDS = (
    "AND DIV EOR MOD OR ERROR LINE OFF STEP SPC TAB( ELSE THEN - OPENIN PTR "
    "PAGE TIME LOMEM HIMEM ABS ACS ADVAL ASC ASN ATN BGET COS COUNT DEG ERL ERR "
    "EVAL EXP EXT FALSE FN GET INKEY INSTR( INT LEN LN LOG NOT OPENUP OPENOUT PI "
    "POINT( POS RAD RND SGN SIN SQR TAN TO TRUE USR VAL VPOS CHR$ GET$ INKEY$ "
    "LEFT$( MID$( RIGHT$( STR$ STRING$( EOF AUTO DELETE LOAD LIST NEW OLD RENUMBER SAVE - PTR "
    "PAGE TIME LOMEM HIMEM SOUND BPUT CALL CHAIN CLEAR CLOSE CLG CLS DATA DEF DIM DRAW "
    "END ENDPROC ENVELOPE FOR GOSUB GOTO GCOL IF INPUT LET LOCAL MODE MOVE NEXT ON VDU "
    "PLOT PRINT PROC READ REM REPEAT REPORT RESTORE RETURN RUN STOP COLOUR TRACE UNTIL WIDTH OSCLI"
).split()
assert len(KEYWORDS) == 0x80
TOKENS = {0x80 + i: k for i, k in enumerate(KEYWORDS) if k != "-"}
CR, LINENO, QUOTE = 0x0D, 0x8D, 0x22


def char(c):
    """A byte as LIST's output shows it here: printable ASCII as itself, else in braces."""
    return chr(c) if 0x20 <= c <= 0x7E else "{&%02X}" % c


def byte_text(c):
    return TOKENS.get(c) or char(c)


def listed(raw):
    return "".join(char(c) for c in raw)


def line_number(b1, b2, b3):
    """The line number that the three bytes after an &8D encode."""
    lo = (b2 & 0x3F) | (((b1 ^ 0x54) << 2) & 0xC0)
    hi = (b3 & 0x3F) | (((b1 ^ 0x54) << 4) & 0xC0)
    return lo | hi << 8


def _line(ram, a, texts):
    """One program line, its &0D at a; returns the address of the next line's &0D."""
    num, n = ram[a + 1] << 8 | ram[a + 2], ram[a + 3]
    end = a + n if n >= 4 else a + 4           # a length under 4 cannot be: step past the header
    texts[a] = "%5d" % num
    for x in range(a + 1, a + 4):
        texts[x] = ""
    quoted, p = False, a + 4
    while p < end and p < len(ram):
        c = ram[p]
        if c == QUOTE:
            quoted = not quoted
            texts[p] = '"'; p += 1; continue
        if not quoted and c == LINENO and p + 3 < end:
            texts[p] = str(line_number(ram[p + 1], ram[p + 2], ram[p + 3]))
            for x in range(p + 1, p + 4):
                texts[x] = ""
            p += 4; continue
        texts[p] = char(c) if quoted else byte_text(c)
        p += 1
    return end


def pieces(ram, start, end):
    texts, starts, a = {}, {}, start
    while a <= end:
        if ram[a] != CR:                        # not a line: the walk has lost its place
            texts[a] = byte_text(ram[a])
            a += 1
            continue
        if a + 1 <= end and ram[a + 1] & 0x80:  # &0D &FF: the end of the program
            starts[a] = "routine"
            texts[a] = "(the end of the program)"
            texts[a + 1] = ""
            for x in range(a + 2, end + 1):
                texts[x] = byte_text(ram[x])
            break
        starts[a] = "routine"
        a = _line(ram, a, texts)
    return texts, starts


# ---- the check against BASIC's own LIST, which needs the kit's machine --------------------

PAGE = 0x1900


def encode_number(n):
    """The three bytes that follow an &8D for line n, as BASIC II's tokeniser writes them."""
    lo, hi = n & 0xFF, n >> 8
    return [(((lo & 0xC0) >> 2) | ((hi & 0xC0) >> 4)) ^ 0x54, (lo & 0x3F) | 0x40, (hi & 0x3F) | 0x40]


def sample():
    """A program that uses every token, line numbers in the text, strings, REM and DATA: the
    lines as (number, body bytes)."""
    toks = sorted(TOKENS)
    t = lambda s: [ord(c) for c in s]
    return [
        (0, t("A=1:") + [0xF4] + t(" first")),                                     # REM
        (10, [x for k in toks[:63] for x in (k, 0x3A)]),                           # every token,
        (20, [x for k in toks[63:] for x in (k, 0x3A)]),                           # in two lines
        (30, [0xE5, LINENO] + encode_number(10) + t(":") + [0xE4, LINENO] + encode_number(32767)
         + t(":") + [0xF7, LINENO] + encode_number(0) + t(":") + [0xE5, LINENO] + encode_number(1000)
         + t(":") + [0xE5, LINENO] + encode_number(256) + t(":") + [0xE5, LINENO] + encode_number(4863)),
        (40, [0xF1] + t('"a') + [0x80, 0x8D, 0x96, 0xFF, 0x07] + t('b"') + [0x82] + t('"c"')),   # PRINT
        (50, [0xF4] + t(" x") + [0x80] + t(' "y') + [0x84] + t('" ') + [0x82]),     # REM, quote, tokens
        (60, [0xDC] + t("1,") + [0x80] + t(',"z",') + [0xE5]),                      # DATA
        (32767, [0xE7] + t("A") + [0x8C, LINENO] + encode_number(30) + [0x8B, LINENO] + encode_number(40)),
    ]


def assemble(lines, base=PAGE):
    out = []
    for num, body in lines:
        out += [CR, num >> 8, num & 0xFF, len(body) + 4] + body
    return out + [CR, 0xFF]


def located(ram, start, end):
    """[(text, address, kind)] for each item from start to end."""
    texts, starts = pieces(ram, start, end)
    order = sorted(starts)
    return [("".join(texts.get(x, "") for x in range(s, (order[i + 1] if i + 1 < len(order) else end + 1))),
             s, starts[s]) for i, s in enumerate(order)]


def _real(v):
    """A five-byte real: an exponent biased by &80, then the mantissa high byte first with its
    top bit replaced by the sign; an exponent of 0 is 0."""
    if v[0] == 0:
        return 0.0
    mant = int.from_bytes(bytes(v[1:5]), "big")
    sign = -1 if mant & 0x80000000 else 1
    return sign * ((mant | 0x80000000) / 2 ** 32) * 2 ** (v[0] - 0x80)


def variable(read, name):
    """The value of the variable `name` (see the module's header), or None when there is none."""
    word = lambda a: (lambda b: b[0] | b[1] << 8)(read(a, 2))
    kind = "$" if name.rstrip("(").endswith("$") else "%" if name.rstrip("(").endswith("%") else ""
    if kind == "%" and len(name) == 2 and "@" <= name[0] <= "Z":
        return int.from_bytes(bytes(read(0x400 + 4 * (ord(name[0]) - 0x40), 4)), "little", signed=True)
    rest = name[1:].encode()
    a = word(0x480 + 2 * (ord(name[0]) - 0x40))
    while a:
        b = read(a, 2 + len(rest) + 1)
        if bytes(b[2:2 + len(rest)]) == rest and b[2 + len(rest)] == 0:
            v = a + 3 + len(rest)
            one = lambda at: (int.from_bytes(bytes(read(at, 4)), "little", signed=True) if kind == "%"
                              else _string(read, at) if kind == "$" else _real(read(at, 5)))
            if not name.endswith("("):
                return one(v)
            n = read(v, 1)[0]
            dims = [word(v + 1 + 2 * i) for i in range(n // 2)]
            size = {"%": 4, "$": 4, "": 5}[kind]
            count = 1
            for d in dims:
                count *= d
            return [d - 1 for d in dims], [one(v + n + size * i) for i in range(count)]
        a = word(a)
    return None


def _string(read, at):
    """A string's four bytes: its address, the space given it, its length."""
    b = read(at, 4)
    return bytes(read(b[0] | b[1] << 8, b[3])).decode("latin-1") if b[3] else ""


def items(ram, start, end):
    """[(text, kind)] for each item from start to end."""
    return [(t, k) for t, _, k in located(ram, start, end)]


def basic_list(m, frames=600):
    """What BASIC's LIST sends to the screen for the program in memory, one string a line."""
    m.output()
    m.type("LIST\n")
    raw = []
    for _ in range(frames):
        m.frames(5)
        raw += m.output()["codes"]
        if raw[-3:] == [10, 13, 0x3E]:                   # the prompt again
            break
    lines, cur = [], []
    for c in raw:
        if c == 10:
            continue
        if c == 13:
            lines.append(cur); cur = []
        else:
            cur.append(c)
    return [listed(x) for x in lines[1:]]                 # the first is the typed LIST


def rom_keywords(path):
    """{token: keyword} from the BASIC ROM's own keyword table: from &8071, each keyword, its
    token and a flags byte, to HIMEM's second token, &D3, the table's last entry."""
    r = open(path, "rb").read()
    i, toks = 0x71, {}
    while True:
        j = i
        while 0x20 <= r[j] < 0x80:
            j += 1
        toks.setdefault(r[j], r[i:j].decode())
        if r[j] == 0xD3:
            return toks
        i = j + 2


def test(argv):
    import os, sys
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(os.path.dirname(here))
    port = int(argv[argv.index("--port") + 1]) if "--port" in argv else 6848
    sys.path.insert(0, here)
    from jsbeeb import connect
    rom = os.path.join(root, "tools", "bbc", "node_modules", "jsbeeb", "public", "roms", "BASIC.ROM")
    theirs = rom_keywords(rom)
    assert theirs == TOKENS, sorted(set(theirs.items()) ^ set(TOKENS.items()))
    print(f"ok - the {len(TOKENS)} keywords are BASIC.ROM's, token for token")
    m = connect(port=port)
    m.boot()
    prog = assemble(sample())
    m.write(PAGE, bytes(prog))
    ours = [t for t, k in items(bytearray(PAGE) + bytearray(prog) + bytearray(0x10000 - PAGE - len(prog)),
                                    PAGE, PAGE + len(prog) - 1) if not t.startswith("(the end")]
    got = basic_list(m)
    bad = [(a, b) for a, b in zip(got, ours) if a != b]
    assert len(got) == len(ours) and not bad, (len(got), len(ours), bad[:2])
    print(f"ok - {len(ours)} lines of a program that holds every token read as BASIC's LIST prints them")
    for snap in [a for a in argv if a.endswith(".json.gz")]:
        m.load(snap)
        ram = m.read(0, 0x8000)
        top = ram[0x12] | ram[0x13] << 8
        start = ram[0x18] << 8
        ours = [t for t, k in items(bytearray(ram) + bytearray(0x8000), start, top - 1) if not t.startswith("(the end")]
        got = basic_list(m, frames=6000)
        bad = [(i, a, b) for i, (a, b) in enumerate(zip(got, ours)) if a != b]
        assert len(got) == len(ours) and not bad, (len(got), len(ours), bad[:2])
        print(f"ok - {snap}: all {len(ours)} lines from PAGE &{start:04X} to TOP &{top:04X} read as LIST prints them")
    m.boot()
    m.until(0xE581, max_cycles=50_000_000)
    m.type('A%=-7:B=7.5:C$="AB":try%=300:DIM D(3):D(2)=-5:DIM E$(2,1):E$(1,0)="X":E$(2,1)="YZ"\n')
    m.until(0xE581, max_cycles=50_000_000)
    got = [variable(m.read, n) for n in ("A%", "B", "C$", "try%", "D(", "E$(")]
    assert got == [-7, 7.5, "AB", 300, ([3], [0.0, 0.0, -5.0, 0.0]), ([2, 1], ["", "", "X", "", "", "YZ"])], got
    print("ok - variable() reads integers, reals, strings and arrays as BASIC made them")


def list_snapshot(path):
    import os, sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import snapshot
    ram = snapshot.read(path)
    top = ram[0x12] | ram[0x13] << 8
    for text, a, _ in located(ram, ram[0x18] << 8, top - 1):
        print("&%04X %s" % (a, text))


if __name__ == "__main__":
    import sys
    if sys.argv[1:2] == ["test"]:
        test(sys.argv[2:])
    elif sys.argv[1:2] == ["list"] and len(sys.argv) == 3:
        list_snapshot(sys.argv[2])
    else:
        print(__doc__)
