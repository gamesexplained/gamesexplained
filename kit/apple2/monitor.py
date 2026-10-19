#!/usr/bin/env python3
"""The Monitor ROM's routines and page 3's vectors by name, so symbols.json names them every time.

regenerator2000 0.9.20's "Apple II" system lists the Monitor's entry points as excluded: a session
gives them neither a name nor an automatic label, and shows a name only in a comment beside the
call. A game's `JSR $FDED` would reach the listing as a bare address. kit/apple2/r2000.py reads a
session through entry_points(), which names each of these addresses the game refers to, of kind
"system", unless the game has a label of its own there. A project file holds only labels of your
own, so it needs nothing.

The names are Apple's (the Apple II Reference Manual and the Apple IIe Technical Reference
Manual): an entry point Apple documents keeps its address in every Apple II ROM, which is why a
game written for the Apple II Plus calls the same addresses on the IIe. Each was checked by
running it in the kit's enhanced IIe (Apple2TS 3.7.0's ROM) and looking at what it did:
`monitor.py --check` does it again, routine by routine, and checks each of the Monitor's page-3
vectors ($03F0-$03FF) by pointing it at a loop and making the ROM go through it (a BRK, a reset,
Applesoft's &, the Monitor's CONTROL-Y, an interrupt from the Mockingboard). DOS 3.3's vectors
($03D0-$03EF) are as Beneath Apple DOS lists them, written there when DOS boots; given a DOS 3.3
disk, the check boots it and reads each one: a JMP, or for LOCFPL and LOCRPL the two loads and
the RTS that hand back a parameter list's address. A game that never boots DOS leaves page 3
free, and the names are wrong for it.

When a game has taken the machine over and keeps its own code or data at one of these addresses
(page 3 is free to a game that does not use DOS), the name is wrong for it: give the address a
label of your own (kit/skills/apple2/tool-regen2000).

Usage:
  monitor.py            print the table
  monitor.py --check [<DOS 3.3 disk>]
                        run each routine on the kit's Apple II and check what it does (needs
                        `tools.py --platform apple2 apple2ts`; it powers the machine on again);
                        with a DOS 3.3 disk, read DOS's vectors after booting it
"""
import os, sys

NAMES = {
    # lo-res graphics
    0xF800: "PLOT", 0xF819: "HLINE", 0xF828: "VLINE", 0xF832: "CLRSCR", 0xF836: "CLRTOP",
    0xF85F: "NXTCOL", 0xF864: "SETCOL", 0xF871: "SCRN",
    # printing numbers and blanks
    0xF941: "PRNTAX", 0xF944: "PRNTX", 0xF948: "PRBLNK", 0xF94A: "PRBL2",
    # the game port, the screen and the window
    0xFB1E: "PREAD", 0xFB2F: "INIT", 0xFB39: "SETTXT", 0xFB40: "SETGR", 0xFB4B: "SETWND",
    0xFB5B: "TABV", 0xFB6F: "SETPWRC", 0xFBC1: "BASCALC", 0xFBDD: "BELL1",
    0xFC10: "BS", 0xFC1A: "UP", 0xFC22: "VTAB", 0xFC24: "VTABZ", 0xFC42: "CLREOP", 0xFC58: "HOME",
    0xFC62: "CR", 0xFC66: "LF", 0xFC70: "SCROLL", 0xFC9C: "CLREOL", 0xFC9E: "CLREOLZ",
    0xFCA8: "WAIT",
    # the keyboard and the screen as a terminal
    0xFD0C: "RDKEY", 0xFD1B: "KEYIN", 0xFD35: "RDCHAR", 0xFD67: "GETLNZ", 0xFD6A: "GETLN",
    0xFD6F: "GETLN1", 0xFD8B: "CROUT1", 0xFD8E: "CROUT", 0xFDDA: "PRBYTE", 0xFDE3: "PRHEX",
    0xFDED: "COUT", 0xFDF0: "COUT1",
    # memory, input and output hooks, the Monitor itself
    0xFE2C: "MOVE", 0xFE80: "SETINV", 0xFE84: "SETNORM", 0xFE89: "SETKBD", 0xFE8B: "INPORT",
    0xFE93: "SETVID", 0xFE95: "OUTPORT", 0xFF2D: "PRERR", 0xFF3A: "BELL", 0xFF3F: "RESTORE",
    0xFF4A: "SAVE", 0xFF58: "IORTS", 0xFF65: "MON", 0xFF69: "MONZ",
    # page 3: the Monitor's vectors
    0x03F0: "BRKV", 0x03F2: "SOFTEV", 0x03F4: "PWREDUP", 0x03F5: "AMPERV", 0x03F8: "USRADR",
    0x03FB: "NMI", 0x03FE: "IRQLOC",
    # page 3: DOS 3.3's vectors, written when DOS boots
    0x03D0: "DOSWARM", 0x03D3: "DOSCOLD", 0x03D6: "FILEMGR", 0x03D9: "RWTS", 0x03DC: "LOCFPL",
    0x03E3: "LOCRPL", 0x03EA: "DOSHOOK",
}
for _a in (0x03F0, 0x03F2, 0x03FE):                 # a pointer's second byte: code that takes the vector over writes both
    NAMES[_a + 1] = NAMES[_a] + "_hi"


def entry_points(syms, referred):
    """syms with one symbol at each Monitor or page-3 address in `referred` (the addresses the game
    refers to): the user's label where there is one, else the Monitor's name, of kind "system", in
    place of an automatic or a platform one. Every other symbol is passed through as it is."""
    users = {s["address"] for s in syms if s["address"] in NAMES and s.get("kind", "user") == "user"}
    out = [s for s in syms if s["address"] not in NAMES or s["address"] in users and s.get("kind", "user") == "user"]
    seen = {s["address"] for s in syms}
    for a in sorted(a for a in set(referred) | seen if a in NAMES and a not in users):
        out.append({"address": a, "name": NAMES[a], "type": "Predefined", "kind": "system"})
    return out


# ---- the check: each routine run on the kit's Apple II ----------------------------------------
STUB = 0x0300          # JSR routine / JMP * : page 3's free space, below DOS's vectors
CH, CV, BASL, INVFLG, COLOR, H2, V2 = 0x24, 0x25, 0x28, 0x32, 0x30, 0x2C, 0x2D
CSWL, KSWL, A1, A2, A4 = 0x36, 0x38, 0x3C, 0x3E, 0x42


def text_base(row):
    return 0x400 + (row & 7) * 0x80 + (row >> 3) * 0x28


def check():
    """Run the routines and compare what they did with what Apple documents. Returns the failures."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from apple2ts import connect
    m = connect()
    bad = []

    def ok(name, cond, what):
        print(f"{'PASS' if cond else 'FAIL'}  {name:8} ${next(a for a, n in NAMES.items() if n == name):04X}  {what}")
        if not cond:
            bad.append(name)

    def call(name, **regs):
        """JSR the routine with these registers; returns the run's reply."""
        a = next(x for x, n in NAMES.items() if n == name)
        m.write(STUB, bytes([0x20, a & 0xFF, a >> 8, 0x4C, (STUB + 3) & 0xFF, (STUB + 3) >> 8]), space="main")
        m.set_registers(pc=STUB, **regs)
        return m.until(STUB + 3, max_cycles=2_000_000)

    def zp(addr, n=1):
        b = m.read(addr, n, space="main")
        return b[0] if n == 1 else b[0] | b[1] << 8

    def row(r):
        """Text line r as 40 characters (the server leaves trailing blanks off)."""
        return m.text()["lines"][r].ljust(40)

    def poke(addr, data):
        m.write(addr, bytes(data), space="main")

    for d in (1, 2):
        m.disk(drive=d, eject=True)
    m.release_keys()
    m.boot(seconds=1)
    m.reset(hard=False)                  # CONTROL-RESET: BASIC, the Monitor's zero page and hooks set up
    m.run(seconds=0.3)

    poke(0x400, [0xD8] * 0x400)          # the text page full of X
    call("HOME")
    lines = m.text()["lines"]
    ok("HOME", all(not ln.strip() for ln in lines) and zp(CH) == 0 and zp(CV) == 0,
       "clears the window and puts the cursor at its top left")
    call("COUT", a=0xC1)
    call("COUT1", a=0xC2)
    ok("COUT", row(0).startswith("AB") and zp(CH) == 2, "prints through the output hook, then COUT1 to the screen: AB")
    ok("COUT1", row(0)[1] == "B", "prints to the screen")
    call("PRBYTE", a=0x5A)
    call("PRHEX", a=0x0C)
    ok("PRBYTE", row(0)[2:4] == "5A", "prints a byte in hex")
    ok("PRHEX", row(0)[4] == "C", "prints the low four bits in hex")
    call("PRNTAX", a=0x12, x=0x34)
    ok("PRNTAX", row(0)[5:9] == "1234", "prints A then X in hex")
    call("PRNTX", x=0xEF)
    ok("PRNTX", row(0)[9:11] == "EF", "prints X in hex")
    ch = zp(CH)
    call("PRBLNK")
    c1 = zp(CH)
    call("PRBL2", x=5)
    ok("PRBLNK", c1 - ch == 3, "prints three blanks")
    ok("PRBL2", zp(CH) - c1 == 5, "prints X blanks")
    call("CROUT")
    ok("CROUT", zp(CV) == 1 and zp(CH) == 0, "a carriage return: the next line")
    poke(text_base(1), [0xDA] * 40)
    poke(CH, [3])
    call("CROUT1")
    ok("CROUT1", row(1) == "ZZZ" + " " * 37 and zp(CV) == 2, "clears the rest of the line, then a carriage return")
    poke(text_base(2), [0xDA] * 40)
    poke(CH, [10])
    call("CLREOL")
    ok("CLREOL", row(2) == "Z" * 10 + " " * 30, "clears from the cursor to the end of the line")
    poke(BASL, [text_base(2) & 0xFF, text_base(2) >> 8])
    call("CLREOLZ", y=5)
    ok("CLREOLZ", row(2) == "Z" * 5 + " " * 35, "clears from Y to the end of the line at BASL")
    for r in range(3, 24):
        poke(text_base(r), [0xDA] * 40)
    poke(CV, [20]); poke(CH, [7])
    call("VTAB")
    call("CLREOP")
    lines = [ln.ljust(40) for ln in m.text()["lines"]]
    ok("CLREOP", lines[19] == "Z" * 40 and lines[20] == "Z" * 7 + " " * 33 and not "".join(lines[21:]).strip(),
       "clears from the cursor to the end of the window")
    poke(CV, [10])
    call("VTAB")
    ok("VTAB", zp(BASL, 2) == text_base(10), "BASL from CV: the address of the cursor's line")
    poke(CV, [11])
    call("VTABZ", a=11)
    ok("VTABZ", zp(BASL, 2) == text_base(11), "BASL for the line in A")
    call("BASCALC", a=5)
    ok("BASCALC", zp(BASL, 2) == text_base(5), "the address of text line A")
    call("TABV", a=17)
    ok("TABV", zp(CV) == 17 and zp(BASL, 2) == text_base(17), "moves the cursor to line A")
    poke(CH, [9])
    call("BS")
    ok("BS", zp(CH) == 8, "back one column")
    call("UP")
    ok("UP", zp(CV) == 16, "up one line")
    call("LF")
    ok("LF", zp(CV) == 17, "down one line")
    call("CR")
    ok("CR", zp(CV) == 18 and zp(CH) == 0, "a carriage return")
    call("HOME")
    poke(text_base(1), [0xC1] * 40)
    call("SCROLL")
    ok("SCROLL", row(0) == "A" * 40 and not row(1).strip(), "scrolls the window up a line")
    call("SETINV")
    inv = zp(INVFLG)
    call("SETNORM")
    ok("SETINV", inv == 0x3F, "inverse text from here on (INVFLG $3F)")
    ok("SETNORM", zp(INVFLG) == 0xFF, "normal text from here on (INVFLG $FF)")

    m.key("Q")
    r = call("RDKEY")
    ka = r["registers"]["a"]
    m.key("Q", down=False)
    m.run(cycles=20000)
    ok("RDKEY", ka == 0xD1, f"waits for a key through the input hook and returns it with bit 7 set: ${ka:02X}")
    m.key("R")
    r = call("KEYIN")
    m.key("R", down=False)
    m.run(cycles=20000)
    ok("KEYIN", r["registers"]["a"] == 0xD2, "reads the keyboard")
    m.key("S")
    r = call("RDCHAR")
    m.key("S", down=False)
    m.run(cycles=20000)
    ok("RDCHAR", r["registers"]["a"] == 0xD3, "RDKEY, with the escape codes handled")
    for name, prompt in (("GETLN", 0xDE), ("GETLNZ", 0xDE), ("GETLN1", 0xDE)):
        call("HOME")
        poke(0x33, [prompt])
        a = next(x for x, n in NAMES.items() if n == name)
        poke(STUB, [0x20, a & 0xFF, a >> 8, 0x4C, (STUB + 3) & 0xFF, (STUB + 3) >> 8])
        m.set_registers(pc=STUB)
        m.type("HI\n")
        r = m.until(STUB + 3, max_cycles=2_000_000)
        got = m.read(0x200, 3, space="main")
        shown = m.text()["lines"]
        prompted = any(ln.startswith("^HI") for ln in shown)
        want_prompt = name != "GETLN1"
        ok(name, got == bytes([0xC8, 0xC9, 0x8D]) and r["registers"]["x"] == 2 and prompted == want_prompt,
           "reads a line into $0200, X its length" + (", after the prompt in $33" if want_prompt else ", with no prompt")
           + (" and a carriage return first" if name == "GETLNZ" else ""))

    r1 = call("WAIT", a=10)
    r2 = call("WAIT", a=20)
    # 1/2(26 + 27A + 5A^2) cycles by Apple's book (it says microseconds, a cycle's length near enough),
    # counted from the JSR to the instruction after it
    want = [(26 + 27 * a + 5 * a * a) / 2 for a in (10, 20)]
    ok("WAIT", all(abs(r["ran"] - w) <= 1 for r, w in zip((r1, r2), want)),
       f"a delay of half (26 + 27A + 5A^2) cycles: {r1['ran']} and {r2['ran']} cycles for 10 and 20, "
       f"{want[0]:.0f} and {want[1]:.0f} expected")

    m.sound("start")
    call("BELL1")
    b1 = m.sound("stop")["clicks"]
    m.sound("start")
    call("BELL")
    b2 = m.sound("stop")["clicks"]
    ok("BELL1", b1 >= 100, f"beeps the speaker: {b1} clicks")
    ok("BELL", b2 >= 100, f"prints CONTROL-G, which beeps: {b2} clicks")
    m.sound("start")
    call("PRERR")
    b3 = m.sound("stop")["clicks"]
    ok("PRERR", "ERR" in "".join(m.text()["lines"]) and b3 >= 100, "prints ERR and beeps")

    m.joystick(paddles=[90])
    m.frames(1)
    r = call("PREAD", x=0)
    m.joystick(paddles=[None])
    ok("PREAD", abs(r["registers"]["y"] - 90) <= 3, f"reads paddle X into Y: {r['registers']['y']} for 90")

    call("SETGR")
    sw = m.chips()["switches"]
    ok("SETGR", not sw["text"] and sw["mixed"] and not sw["hires"], "lo-res graphics with four lines of text below")
    call("SETCOL", a=0x0D)
    ok("SETCOL", zp(COLOR) == 0xDD, "the lo-res colour, in both halves of COLOR")
    call("CLRSCR")
    clear = m.read(0x400, 0x400, space="main")
    poke(0x400, [0] * 0x400)
    call("SETCOL", a=0x0D)
    call("PLOT", a=4, y=3)                                   # x 3, y 4: the low half of the byte for line 2
    plot = m.read(text_base(2) + 3, 1, space="main")[0]
    ok("PLOT", plot == 0x0D, "a lo-res block at (Y, A)")
    r = call("SCRN", a=4, y=3)
    ok("SCRN", r["registers"]["a"] == 0x0D, "the colour of the block at (Y, A)")
    poke(H2, [12])
    call("HLINE", a=7, y=5)                                  # y 7: the high halves of line 3
    hl = m.read(text_base(3) + 5, 8, space="main")
    ok("HLINE", all(b >> 4 == 0x0D for b in hl), "a row of blocks from Y to H2 on line A")
    poke(V2, [9])
    call("VLINE", a=6, y=20)
    vl = [m.read(text_base(r) + 20, 1, space="main")[0] for r in (3, 4)]
    ok("VLINE", vl == [0xDD, 0xDD], "a column of blocks from A to V2 at Y")
    ok("CLRSCR", set(clear[0:0x28]) == {0} and set(clear[0x380:0x3A8]) == {0},
       "clears the lo-res screen")
    poke(0x400, [0xFF] * 0x400)
    call("CLRTOP")
    after = m.read(0x400, 0x400, space="main")
    at = lambda r: after[text_base(r) - 0x400:text_base(r) - 0x400 + 40]    # noqa: E731
    ok("CLRTOP", at(19) == bytes(40) and at(20) == b"\xff" * 40, "clears the top 40 rows of blocks only")
    poke(COLOR, [0x11])
    call("NXTCOL")
    ok("NXTCOL", zp(COLOR) == 0x44, "the next colour: COLOR + 3")
    call("SETTXT")
    sw = m.chips()["switches"]
    ok("SETTXT", sw["text"], "back to text")

    poke(0x20, [5, 20, 3, 10])
    call("SETWND", a=20)
    win = m.read(0x20, 4, space="main")
    ok("SETWND", list(win) == [0, 40, 20, 24], "a window the screen's width, from line A down")
    call("SETGR")
    poke(0x20, [5, 20, 3, 10])
    call("INIT")
    win = m.read(0x20, 4, space="main")
    ok("INIT", list(win) == [0, 40, 0, 24] and m.chips()["switches"]["text"], "text, and the whole screen as the window")

    poke(0x6000, range(16))
    poke(A1, [0x00, 0x60, 0x0F, 0x60]); poke(A4, [0x00, 0x61])
    call("MOVE", y=0)
    ok("MOVE", m.read(0x6100, 16, space="main") == bytes(range(16)), "copies A1-A2 to A4")
    call("SAVE", a=0x11, x=0x22, y=0x33)
    saved = m.read(0x45, 3, space="main")
    poke(0x45, [0x44, 0x55, 0x66])
    r = call("RESTORE")
    ok("SAVE", saved == bytes([0x11, 0x22, 0x33]), "A, X, Y, P and S into $45-$49")
    ok("RESTORE", (r["registers"]["a"], r["registers"]["x"], r["registers"]["y"]) == (0x44, 0x55, 0x66),
       "A, X, Y and P from $45-$48")
    call("SETKBD")
    call("SETVID")
    ok("SETKBD", zp(KSWL, 2) == 0xFD1B, "the input hook to KEYIN")
    ok("SETVID", zp(CSWL, 2) == 0xFDF0, "the output hook to COUT1")
    call("INPORT", a=6)
    call("OUTPORT", a=4)
    ok("INPORT", zp(KSWL, 2) == 0xC600, "the input hook to slot A's card")
    ok("OUTPORT", zp(CSWL, 2) == 0xC400, "the output hook to slot A's card")
    call("SETKBD")
    call("SETVID")
    ok("IORTS", m.read(0xFF58, 1, space="rom")[0] == 0x60, "an RTS, which a card calls to find its slot")
    call("SETPWRC")
    ok("SETPWRC", zp(0x3F4) == zp(0x3F3) ^ 0xA5, "PWREDUP from SOFTEV's high byte, EOR $A5")
    call("HOME")
    m.set_registers(pc=next(a for a, n in NAMES.items() if n == "MON"))
    m.run(seconds=0.2)
    shown = m.text()["lines"]
    ok("MON", any(ln.startswith("*") for ln in shown), "the Monitor's * prompt")
    m.reset(hard=False)
    m.run(seconds=0.3)
    call("HOME")
    m.set_registers(pc=next(a for a, n in NAMES.items() if n == "MONZ"))
    m.run(seconds=0.2)
    ok("MONZ", any(ln.startswith("*") for ln in m.text()["lines"]), "the Monitor's * prompt")

    # page 3's vectors, each by what reaches it: the code at HERE runs when the ROM goes through it
    here = 0x0380

    def reaches(name, setup, then):
        m.reset(hard=True)
        m.run(seconds=0.5)
        m.reset(hard=False)
        m.run(seconds=0.3)
        poke(here, [0x4C, here & 0xFF, here >> 8])          # JMP *, so the machine waits there
        setup()
        r = then()
        ok(name, r["reason"] == "until" and r["pc"] == here, f"the ROM goes through it: {r['reason']} at ${r['pc']:04X}")

    def via_pointer(addr):
        return lambda: poke(addr, [here & 0xFF, here >> 8])

    def via_jmp(addr):
        return lambda: poke(addr, [0x4C, here & 0xFF, here >> 8])

    def run_code(code):
        def go():
            poke(STUB, code)
            m.set_registers(pc=STUB)
            return m.until(here, max_cycles=2_000_000)
        return go

    def typed(text):
        def go():
            m.type(text)
            return m.until(here, max_cycles=2_000_000)
        return go

    reaches("BRKV", via_pointer(0x3F0), run_code([0x00, 0x00]))            # BRK
    reaches("SOFTEV", lambda: (via_pointer(0x3F2)(), call("SETPWRC")),
            lambda: (m.reset(hard=False), m.until(here, max_cycles=2_000_000))[1])
    reaches("PWREDUP", lambda: (via_pointer(0x3F2)(), poke(0x3F4, [(here >> 8) ^ 0xA5])),
            lambda: (m.reset(hard=False), m.until(here, max_cycles=2_000_000))[1])
    reaches("AMPERV", via_jmp(0x3F5), typed("&\n"))                          # Applesoft's & statement
    reaches("USRADR", via_jmp(0x3F8), typed("CALL -151\n\x19\n"))           # the Monitor's CONTROL-Y
    reaches("IRQLOC", via_pointer(0x3FE), run_code([
        0x8D, 0x06, 0xC0,               # sta $C006: the slots' ROM space, where the Mockingboard answers
        0xA9, 0x40, 0x8D, 0x0B, 0xC4,   # lda #$40 / sta $C40B: timer 1 free-running
        0xA9, 0x00, 0x8D, 0x04, 0xC4,   # timer 1 from $1000
        0xA9, 0x10, 0x8D, 0x05, 0xC4,
        0xA9, 0xC0, 0x8D, 0x0E, 0xC4,   # its interrupt on
        0x58,                           # cli
        0x4C, 0x18, 0x03]))             # jmp to itself
    nmi = m.read(0xFFFA, 2, space="rom")
    ok("NMI", nmi[0] | nmi[1] << 8 == 0x3FB, f"the 6502's NMI vector points at it: ${nmi[1]:02X}{nmi[0]:02X}")
    m.reset(hard=True)
    m.close()
    return bad


def check_dos(disk):
    """DOS 3.3's page-3 vectors, read after booting a DOS 3.3 disk: each a JMP, but LOCFPL and LOCRPL,
    which load A and Y with a parameter list's address, its high byte and its low."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from apple2ts import connect
    m = connect()
    m.disk(disk, drive=1)
    m.boot(seconds=12)
    bad = []
    for a, n in sorted(NAMES.items()):
        if not 0x03D0 <= a < 0x03F0:
            continue
        ins = m.disassemble(a, count=3)
        text = " / ".join(i["text"] for i in ins)
        good = ins[0]["text"].startswith("JMP") if n not in ("LOCFPL", "LOCRPL") else \
            ins[0]["text"].startswith("LDA") and ins[1]["text"].startswith("LDY") and ins[2]["text"].startswith("RTS")
        print(f"{'PASS' if good else 'FAIL'}  {n:8} ${a:04X}  {text}")
        if not good:
            bad.append(n)
    m.disk(drive=1, eject=True)
    m.reset(hard=True)
    m.close()
    return bad


if __name__ == "__main__":
    if "--check" in sys.argv:
        args = [a for a in sys.argv[1:] if a != "--check"]
        failed = check() + (check_dos(args[0]) if args else [])
        print(f"\n{'nothing failed' if not failed else 'failed: ' + ' '.join(failed)}"
              + ("" if args else "; give a DOS 3.3 disk to check DOS's vectors as well"))
        sys.exit(1 if failed else 0)
    if len(sys.argv) > 1:
        print(__doc__)
        sys.exit(0)
    for a, n in sorted(NAMES.items()):
        print(f"${a:04X}  {n}")
