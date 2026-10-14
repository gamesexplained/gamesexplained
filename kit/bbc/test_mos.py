#!/usr/bin/env python3
"""symbols.json names the MOS's calls and vectors the game uses, whatever the session called them.

regenerator2000's BBC Micro system file excludes these addresses, so a session gives them no
label; kit/bbc/r2000.py reads them through mos.entry_points(). The addresses pinned below are
MOS 1.20's, as kit/bbc/mos.py read them from the ROM.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mos import NAMES, VECTORS, entry_points                              # noqa: E402


def auto(a):
    return {"address": a, "name": f"a_{a:04X}", "type": "AbsoluteAddress", "kind": "auto"}


def system(a):
    return {"address": a, "name": NAMES[a], "type": "Predefined", "kind": "system"}


START = {"address": 0x2000, "name": "start", "type": "UserDefined", "kind": "user"}


class Names(unittest.TestCase):
    def test_calls(self):
        for a, n in ((0xFFEE, "OSWRCH"), (0xFFE3, "OSASCI"), (0xFFE7, "OSNEWL"), (0xFFE0, "OSRDCH"),
                     (0xFFF1, "OSWORD"), (0xFFF4, "OSBYTE"), (0xFFF7, "OSCLI"), (0xFFDD, "OSFILE"),
                     (0xFFC8, "NVRDCH"), (0xFFCB, "NVWRCH")):
            self.assertEqual(NAMES[a], n)

    def test_vectors(self):
        self.assertEqual(len(VECTORS), 27)
        for a, n in ((0x0200, "USERV"), (0x0202, "BRKV"), (0x0204, "IRQ1V"), (0x0206, "IRQ2V"),
                     (0x020E, "WRCHV"), (0x0210, "RDCHV"), (0x0220, "EVNTV"), (0x0228, "KEYV"),
                     (0x0234, "IND3V"), (0x0205, "IRQ1V_hi"), (0x0D9F, "XUSERV"), (0x0DED, "XIND3V")):
            self.assertEqual(NAMES[a], n)
        self.assertNotIn(0x0236, NAMES, "the vectors end at &0235")


class EntryPoints(unittest.TestCase):
    def test_referred_address_gets_its_name(self):
        out = entry_points([START], [0xFFEE, 0x0204])
        self.assertIn(system(0xFFEE), out)
        self.assertIn(system(0x0204), out)

    def test_automatic_symbol_is_replaced(self):
        out = entry_points([START, auto(0x0221)], [])
        self.assertEqual([s for s in out if s["address"] == 0x0221], [system(0x0221)])

    def test_label_of_your_own_wins(self):
        mine = {"address": 0x0220, "name": "frame_hook", "type": "UserDefined", "kind": "user"}
        out = entry_points([START, mine], [0x0220])
        self.assertEqual([s for s in out if s["address"] == 0x0220], [mine])

    def test_other_symbols_pass_through(self):
        other = auto(0x3000)
        out = entry_points([START, other], [0xFFF4])
        self.assertIn(START, out)
        self.assertIn(other, out)
        self.assertEqual(len(out), 3)


if __name__ == "__main__":
    unittest.main()
