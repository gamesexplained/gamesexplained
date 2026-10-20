#!/usr/bin/env python3
"""The KERNAL's entry points by name, so symbols.json names them the same way every time.

The Commodore 16 and the Plus/4 run one KERNAL, Commodore's "TED kernal" (318004-05 on PAL
machines, 318005-05 on NTSC), whose jump table at $FF49-$FFF5 a game calls as a C64 game calls
the C64's. regenerator2000 names the table from its system file for the Plus/4, "Commodore
Plus4", and the kit corrects that file (kit/c16/system-commodore_plus4.toml): the built-in one
puts SETLFS, CHOUT and CLRCH at $EF8A, $FEC9 and $FECC, where the ROM has none of them, spells
BASIN, SAVESP and UNTLK as 8ASIN, SAYESP and UNTLR, and leaves the four entries below $FF80
unnamed. A session reads the kit's file where tools.py starts the disassembler with its settings
in tools/ (Linux), and its own built-in file elsewhere (kit/skills/c16/tool-regen2000, "The system
file").

Either way, a session keeps only the names its first analysis finds the code using: a call it
traces later gets an automatic label (s_FFD2) in place of the name, as on the C64 (#260).
r2000.py reads a session's symbols through entry_points(): a label of your own stays; wherever
the game refers to one of these addresses without one, the symbol is the KERNAL's, of kind
"system"; and the built-in file's three misplaced names are left out. So a game exports the
same names whichever file the session read and whichever file it was started on. A project
file holds only labels of your own, so it needs nothing.

When a game on a 64 KB Plus/4 banks the ROM out and keeps its own code or data at one of these
addresses, the name is wrong for it: give the address a label of your own
(kit/skills/c16/tool-regen2000, "The RAM under the ROMs").

NAMES is the KERNAL section of kit/c16/system-commodore_plus4.toml, which kit/c16/test_kernal_ted.py
holds it to. The hardware vectors at $FFFA-$FFFF are not in it: the file lists them as excluded,
so a session neither names them nor gives them an automatic label.

Usage: kernal_ted.py      print the table
"""

NAMES = {
    0xFF49: "KERNAL_DEFKEY", 0xFF4C: "KERNAL_PRINT", 0xFF4F: "KERNAL_PRIMM", 0xFF52: "KERNAL_MONITOR",
    0xFF81: "KERNAL_CINT", 0xFF84: "KERNAL_IOINIT", 0xFF87: "KERNAL_RAMTAS",
    0xFF8A: "KERNAL_RESTOR", 0xFF8D: "KERNAL_VECTOR", 0xFF90: "KERNAL_SETMSG",
    0xFF93: "KERNAL_SECND", 0xFF96: "KERNAL_TKSA", 0xFF99: "KERNAL_MEMTOP",
    0xFF9C: "KERNAL_MEMBOT", 0xFF9F: "KERNAL_SCNKEY", 0xFFA2: "KERNAL_SETTMO",
    0xFFA5: "KERNAL_ACPTR", 0xFFA8: "KERNAL_CIOUT", 0xFFAB: "KERNAL_UNTLK", 0xFFAE: "KERNAL_UNLSN",
    0xFFB1: "KERNAL_LISTN", 0xFFB4: "KERNAL_TALK", 0xFFB7: "KERNAL_READSS",
    0xFFBA: "KERNAL_SETLFS", 0xFFBD: "KERNAL_SETNAM", 0xFFC0: "KERNAL_OPEN",
    0xFFC3: "KERNAL_CLOSE", 0xFFC6: "KERNAL_CHKIN", 0xFFC9: "KERNAL_CHOUT",
    0xFFCC: "KERNAL_CLRCH", 0xFFCF: "KERNAL_BASIN", 0xFFD2: "KERNAL_BSOUT",
    0xFFD5: "KERNAL_LOADSP", 0xFFD8: "KERNAL_SAVESP", 0xFFDB: "KERNAL_SETTIM", 0xFFDE: "KERNAL_RDTIM",
    0xFFE1: "KERNAL_STOP", 0xFFE4: "KERNAL_GETIN", 0xFFE7: "KERNAL_CLALL", 0xFFEA: "KERNAL_UDTIM",
    0xFFED: "KERNAL_SCRORG", 0xFFF0: "KERNAL_PLOT", 0xFFF3: "KERNAL_IOBASE",
}

# where regenerator2000 0.9.20's own Plus/4 file puts three of the names; the ROM has none of them there
MISPLACED = {0xEF8A: "KERNAL_SETLFS", 0xFEC9: "KERNAL_CHOUT", 0xFECC: "KERNAL_CLRCH"}


def entry_points(syms):
    """syms with one symbol at each KERNAL entry point the game refers to: the user's labels
    where there are any, else the KERNAL's name, of kind "system", in place of an automatic one
    or the built-in file's spelling. The built-in file's misplaced names are dropped. Every
    other symbol is passed through as it is."""
    users = {s["address"] for s in syms if s["address"] in NAMES and s.get("kind", "user") == "user"}
    out, named = [], set()
    for s in syms:
        a = s["address"]
        if s.get("kind", "user") == "system" and MISPLACED.get(a) == s["name"]:
            continue
        if a not in NAMES or a in users and s.get("kind", "user") == "user":
            out.append(s)
        elif a not in users and a not in named:
            out.append({"address": a, "name": NAMES[a], "type": "Predefined", "kind": "system"})
            named.add(a)
    return out


if __name__ == "__main__":
    for a, n in sorted(NAMES.items()):
        print(f"${a:04X}  {n}")
