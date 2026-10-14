#!/usr/bin/env python3
"""The MOS's entry points and vectors by name, so symbols.json names them every time.

regenerator2000 0.9.20's BBC Micro system file lists the MOS's entry points and vectors as
excluded: a session gives them neither a name nor an automatic label, and shows the name
only in a comment beside the instruction. A game's `JSR $FFEE` would reach the listing as
a bare address. r2000.py reads a session through entry_points(), which names each of these
addresses the game refers to, of kind "system", unless the game has a label of its own
there. A project file holds only labels of your own, so it needs nothing.

The addresses are MOS 1.20's, read from the ROM jsbeeb 2.4.0 ships (public/roms/os.rom):

  * each call from $FFCE up is a JMP through its vector in page 2 ($FFEE is
    JMP ($020E), WRCHV), except OSASCI, OSNEWL and OSWRCR, which are code ending in
    OSWRCH;
  * the calls below jump into the ROM: $FFC8 to $DEC5, where RDCHV points after a reset,
    so it is the non-vectored read, and $FFCB to $E0A4, WRCHV's, the non-vectored write;
    $FFBC to $C4C0, the VDU driver the write routine calls ($E0C5);
  * the 27 vectors at $0200-$0235 are set at reset from the table at $D940, whose length
    is the byte at $FFB6.

The names are those of the 8-Bit Software table of OS calls
(https://8bs.com/mag/32/oscallscommands.txt, read 13 October 2026), which swaps NVRDCH and
NVWRCH: the ROM's way round is used here. What that table leaves out is named as
regenerator2000's system file names it, without its ROM_ and RAM_ prefixes. A vector's
second byte is named too, IRQ1V_hi: code that takes over a vector writes both.

When a game has taken the machine over and keeps its own code or data at one of these
addresses (page 2 is a game's to use once the MOS is out of the way), the name is wrong
for it: give the address a label of your own (kit/skills/bbc/tool-regen2000).

Usage: mos.py      print the table
"""

VECTORS = ("USERV", "BRKV", "IRQ1V", "IRQ2V", "CLIV", "BYTEV", "WORDV", "WRCHV", "RDCHV",
           "FILEV", "ARGSV", "BGETV", "BPUTV", "GBPBV", "FINDV", "FSCV", "EVNTV", "UPTV",
           "NETV", "VDUV", "KEYV", "INSV", "REMV", "CNPV", "IND1V", "IND2V", "IND3V")

NAMES = {
    0xFFB6: "VECTAB",       # the length of the reset table of vectors, then its address
    0xFFB9: "OSRDRM", 0xFFBC: "OSVDU", 0xFFBF: "OSEVEN", 0xFFC2: "GSINIT", 0xFFC5: "GSREAD",
    0xFFC8: "NVRDCH", 0xFFCB: "NVWRCH", 0xFFCE: "OSFIND", 0xFFD1: "OSGBPB", 0xFFD4: "OSBPUT",
    0xFFD7: "OSBGET", 0xFFDA: "OSARGS", 0xFFDD: "OSFILE", 0xFFE0: "OSRDCH", 0xFFE3: "OSASCI",
    0xFFE7: "OSNEWL", 0xFFEC: "OSWRCR", 0xFFEE: "OSWRCH", 0xFFF1: "OSWORD", 0xFFF4: "OSBYTE",
    0xFFF7: "OSCLI",
    0xFFFA: "NMIV", 0xFFFC: "RESETV", 0xFFFE: "IRQV",          # the 6502's own vectors, in ROM
}
for _i, _n in enumerate(VECTORS):
    NAMES[0x0200 + 2 * _i] = _n
    NAMES[0x0201 + 2 * _i] = f"{_n}_hi"
    NAMES[0x0D9F + 3 * _i] = f"X{_n}"     # the extended vectors a paged ROM points a vector through


def entry_points(syms, referred):
    """syms with one symbol at each MOS address in `referred` (the addresses the game refers
    to): the user's label where there is one, else the MOS's name, of kind "system", in place
    of an automatic or a platform one. Every other symbol is passed through as it is."""
    users = {s["address"] for s in syms if s["address"] in NAMES and s.get("kind", "user") == "user"}
    out = [s for s in syms if s["address"] not in NAMES or s["address"] in users and s.get("kind", "user") == "user"]
    seen = {s["address"] for s in syms}
    for a in sorted(a for a in set(referred) | seen if a in NAMES and a not in users):
        out.append({"address": a, "name": NAMES[a], "type": "Predefined", "kind": "system"})
    return out


if __name__ == "__main__":
    for a, n in sorted(NAMES.items()):
        print(f"${a:04X}  {n}")
