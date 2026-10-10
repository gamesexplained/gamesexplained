#!/usr/bin/env python3
"""The KERNAL's entry points by name, so symbols.json names them the same way every time.

regenerator2000 loads the KERNAL's names when a session starts and keeps
only those its first analysis finds the code using: a call it traces
later gets an automatic label (s_FFD2) in place of the name
(KERNAL_CHROUT, kind "system"). A session started on a snapshot has typed
only what it traced from the snapshot's PC; one started on the project
symbols_import.py writes has every block typed. So the same game exported
different names for the same calls depending on the file the session was
started on (#260). r2000.py reads a session's symbols through
entry_points(): a label of your own stays, and wherever the game refers
to one of these addresses without one, the symbol is the KERNAL's. A
project file holds only labels of your own, so it needs nothing.

When the game banks the KERNAL out and keeps its own code or data at one
of these addresses, the name is wrong for it: give the address a label of
your own (kit/skills/c64/tool-regen2000, "A JSR into ROM").

NAMES is regenerator2000 0.9.20's own table, the names its sessions give:
the KERNAL section of its system-commodore_64.toml (MIT or Apache-2.0),
less the hardware vectors at $FFFA-$FFFF, which the same file lists as
excluded, so a session neither names them nor gives them an automatic label.

Usage: kernal.py      print the table
"""

NAMES = {
    0xE500: "KERNAL_IOBASEj", 0xE505: "KERNAL_SCREENj", 0xE50A: "KERNAL_PLOTj",
    0xEA87: "KERNAL_SCNKEYj", 0xED09: "KERNAL_TALKj", 0xED0C: "KERNAL_LISTENj",
    0xEDB9: "KERNAL_SECONDj", 0xEDC7: "KERNAL_TKSAj", 0xEDDD: "KERNAL_CIOUTj",
    0xEDEF: "KERNAL_UNTLKj", 0xEDFE: "KERNAL_UNLSNj", 0xEE13: "KERNAL_ACPTRj",
    0xF13E: "KERNAL_GETINj", 0xF157: "KERNAL_CHRINj", 0xF1CA: "KERNAL_CHROUTj",
    0xF20E: "KERNAL_CHKINj", 0xF250: "KERNAL_CHKOUTj", 0xF291: "KERNAL_CLOSEj",
    0xF32F: "KERNAL_CLALLj", 0xF333: "KERNAL_CLRCHNj", 0xF34A: "KERNAL_OPENj",
    0xF49E: "KERNAL_LOADj", 0xF5DD: "KERNAL_SAVEj", 0xF69B: "KERNAL_UDTIMj",
    0xF6DD: "KERNAL_RDTIMj", 0xF6E4: "KERNAL_SETTIMj", 0xF6ED: "KERNAL_STOPj",
    0xFCE2: "KERNAL_RESET_VECTOR", 0xFD15: "KERNAL_RESTORj", 0xFD1A: "KERNAL_VECTORj",
    0xFD50: "KERNAL_RAMTASj", 0xFDA3: "KERNAL_IOINITj", 0xFDF9: "KERNAL_SETNAMj",
    0xFE00: "KERNAL_SETLFSj", 0xFE07: "KERNAL_READSTj", 0xFE18: "KERNAL_SETMSGj",
    0xFE21: "KERNAL_SETTMOj", 0xFE25: "KERNAL_MEMTOPj", 0xFE34: "KERNAL_MEMBOTj",
    0xFE43: "KERNAL_NMI_VECTOR", 0xFF48: "KERNAL_IRQ_BRK_VECTOR", 0xFF5B: "KERNAL_CINTj",
    0xFF81: "KERNAL_CINT", 0xFF84: "KERNAL_IOINIT", 0xFF87: "KERNAL_RAMTAS",
    0xFF8A: "KERNAL_RESTOR", 0xFF8D: "KERNAL_VECTOR", 0xFF90: "KERNAL_SETMSG",
    0xFF93: "KERNAL_SECOND", 0xFF96: "KERNAL_TKSA", 0xFF99: "KERNAL_MEMTOP",
    0xFF9C: "KERNAL_MEMBOT", 0xFF9F: "KERNAL_SCNKEY", 0xFFA2: "KERNAL_SETTMO",
    0xFFA5: "KERNAL_ACPTR", 0xFFA8: "KERNAL_CIOUT", 0xFFAB: "KERNAL_UNTLK", 0xFFAE: "KERNAL_UNLSN",
    0xFFB1: "KERNAL_LISTEN", 0xFFB4: "KERNAL_TALK", 0xFFB7: "KERNAL_READST",
    0xFFBA: "KERNAL_SETLFS", 0xFFBD: "KERNAL_SETNAM", 0xFFC0: "KERNAL_OPEN",
    0xFFC3: "KERNAL_CLOSE", 0xFFC6: "KERNAL_CHKIN", 0xFFC9: "KERNAL_CHKOUT",
    0xFFCC: "KERNAL_CLRCHN", 0xFFCF: "KERNAL_CHRIN", 0xFFD2: "KERNAL_CHROUT",
    0xFFD5: "KERNAL_LOAD", 0xFFD8: "KERNAL_SAVE", 0xFFDB: "KERNAL_SETTIM", 0xFFDE: "KERNAL_RDTIM",
    0xFFE1: "KERNAL_STOP", 0xFFE4: "KERNAL_GETIN", 0xFFE7: "KERNAL_CLALL", 0xFFEA: "KERNAL_UDTIM",
    0xFFED: "KERNAL_SCREEN", 0xFFF0: "KERNAL_PLOT", 0xFFF3: "KERNAL_IOBASE",
}


def entry_points(syms):
    """syms with one symbol at each KERNAL entry point the game refers to: the user's labels
    where there are any, else the KERNAL's name, of kind "system", in place of an automatic
    one. Every other symbol is passed through as it is."""
    users = {s["address"] for s in syms if s["address"] in NAMES and s.get("kind", "user") == "user"}
    out, named = [], set()
    for s in syms:
        a = s["address"]
        if a not in NAMES or a in users and s.get("kind", "user") == "user":
            out.append(s)
        elif a not in users and a not in named:
            out.append({"address": a, "name": NAMES[a], "type": "Predefined", "kind": "system"})
            named.add(a)
    return out


if __name__ == "__main__":
    for a, n in sorted(NAMES.items()):
        print(f"${a:04X}  {n}")
