#!/usr/bin/env python3
"""symbols.json names the Monitor's routines and page 3's vectors the game uses, whatever the
session called them.

regenerator2000's Apple II system lists the Monitor's entry points as excluded, so a session gives
them no label; kit/apple2/r2000.py reads them through monitor.entry_points(). The addresses pinned
below are Apple's, as `monitor.py --check` ran them on the kit's enhanced IIe.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from monitor import NAMES, entry_points                                   # noqa: E402


def auto(a):
    return {"address": a, "name": f"a_{a:04X}", "type": "AbsoluteAddress", "kind": "auto"}


def system(a):
    return {"address": a, "name": NAMES[a], "type": "Predefined", "kind": "system"}


START = {"address": 0x6000, "name": "start", "type": "UserDefined", "kind": "user"}


class Names(unittest.TestCase):
    def test_routines(self):
        for a, n in ((0xFDED, "COUT"), (0xFDF0, "COUT1"), (0xFD0C, "RDKEY"), (0xFD1B, "KEYIN"),
                     (0xFD6A, "GETLN"), (0xFC58, "HOME"), (0xFC9C, "CLREOL"), (0xFC22, "VTAB"),
                     (0xFB5B, "TABV"), (0xFF3A, "BELL"), (0xFCA8, "WAIT"), (0xFB1E, "PREAD"),
                     (0xFDDA, "PRBYTE"), (0xFDE3, "PRHEX"), (0xFD8E, "CROUT"), (0xFB2F, "INIT"),
                     (0xFB39, "SETTXT"), (0xFB40, "SETGR"), (0xFE84, "SETNORM"), (0xFE80, "SETINV"),
                     (0xF800, "PLOT"), (0xF819, "HLINE"), (0xF828, "VLINE"), (0xF871, "SCRN"),
                     (0xF864, "SETCOL"), (0xFF69, "MONZ"), (0xFE2C, "MOVE")):
            self.assertEqual(NAMES[a], n)

    def test_vectors(self):
        for a, n in ((0x03F0, "BRKV"), (0x03F1, "BRKV_hi"), (0x03F2, "SOFTEV"), (0x03F3, "SOFTEV_hi"),
                     (0x03F4, "PWREDUP"), (0x03F5, "AMPERV"), (0x03F8, "USRADR"), (0x03FB, "NMI"),
                     (0x03FE, "IRQLOC"), (0x03FF, "IRQLOC_hi"), (0x03D0, "DOSWARM"), (0x03D3, "DOSCOLD"),
                     (0x03D6, "FILEMGR"), (0x03D9, "RWTS"), (0x03DC, "LOCFPL"), (0x03E3, "LOCRPL"),
                     (0x03EA, "DOSHOOK")):
            self.assertEqual(NAMES[a], n)

    def test_no_name_in_the_io_page_or_the_cards_rom(self):
        self.assertFalse([a for a in NAMES if 0xC000 <= a <= 0xCFFF])


class EntryPoints(unittest.TestCase):
    def test_referred_address_gets_its_name(self):
        out = entry_points([START], [0xFDED, 0x03FE])
        self.assertIn(system(0xFDED), out)
        self.assertIn(system(0x03FE), out)

    def test_automatic_symbol_is_replaced(self):
        out = entry_points([START, auto(0x03FF)], [])
        self.assertEqual([s for s in out if s["address"] == 0x03FF], [system(0x03FF)])

    def test_label_of_your_own_wins(self):
        mine = {"address": 0x03F2, "name": "reset_hook", "type": "UserDefined", "kind": "user"}
        out = entry_points([START, mine], [0x03F2])
        self.assertEqual([s for s in out if s["address"] == 0x03F2], [mine])

    def test_other_symbols_pass_through(self):
        other = auto(0x3000)
        out = entry_points([START, other], [0xFC58])
        self.assertIn(START, out)
        self.assertIn(other, out)
        self.assertEqual(len(out), 3)


if __name__ == "__main__":
    unittest.main()
