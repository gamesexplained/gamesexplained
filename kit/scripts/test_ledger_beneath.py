#!/usr/bin/env python3
"""In RAM beneath the chips that a game counts, an automatic symbol a register access minted
starts no span (#869). STA $D803 writes colour RAM, and the disassembler names $D803 in the
RAM beneath: when that RAM held sprite images, each such name cut the image's description, and
a run had to comment 17 colour RAM cells among a sprite's pixels to reach 100 %. A user label,
a commented symbol and a symbol inside code there still start one, and so does every automatic
symbol on a machine that declares no chips over RAM."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ledger import compute   # noqa: E402
from symbols_export import regions   # noqa: E402


def block(start, end, kind):
    return {"start": start, "end": end, "type": kind}


def sym(address, name, kind="AbsoluteAddress", made="auto"):
    return {"address": address, "name": name, "type": kind, "kind": made}


def line(address, text):
    return {"address": address, "type": "line", "text": text}


# a C64 game that keeps sprite images at $D7C0-$D83F, under the I/O area, and gives them back
GAME = {"platform": "c64", "coverage": {"include": [["$D7C0", "$D83F", "sprite images"]]}}
IMAGES = [block(0xD7C0, 0xD83F, "Byte")]
LABELS = [sym(0xD7C0, "sprite_5f", "UserDefined", "user"), sym(0xD800, "sprite_60", "UserDefined", "user")]
NOTES = [line(0xD7C0, "Sprite image $5F."), line(0xD800, "Sprite image $60.")]


class Beneath(unittest.TestCase):
    def test_regions_name_the_ram_the_game_counts_beneath_the_chips(self):
        self.assertEqual(regions(GAME)["beneath"], [[0xD7C0, 0xD83F]])
        self.assertNotIn("beneath", regions({"platform": "c64"}))        # all of it excluded
        self.assertNotIn("beneath", regions({"platform": "c16",          # RAM under ROMs: no chips
                                             "coverage": {"include": [["$9000", "$9FFF", "tables"]]}}))

    def test_a_register_access_cuts_no_description(self):
        colour = [sym(0xD803, "a_D803"), sym(0xD804, "a_D804"), sym(0xD82B, "f_D82B", "Field")]
        L = compute(IMAGES, LABELS + colour, NOTES, regions(GAME))
        self.assertEqual(L["quiet"], {0xD803, 0xD804, 0xD82B})
        self.assertEqual(list(L["state"][0xD7C0:0xD840]), [2] * 0x80)
        self.assertEqual(L["owner"][0xD82B], ("sprite_60", 0xD800))
        # the same symbols on a machine with no chips over that RAM are boundaries, as before
        plain = {k: v for k, v in regions(GAME).items() if k != "beneath"}
        L = compute(IMAGES, LABELS + colour, NOTES, plain)
        self.assertEqual(L["quiet"], set())
        self.assertEqual(L["state"][0xD803], 1)

    def test_a_label_a_comment_or_code_still_starts_a_span(self):
        syms = LABELS + [sym(0xD810, "a_D810"), sym(0xD810, "row_two", "UserDefined", "user"),
                         sym(0xD820, "a_D820"), sym(0xD830, "a_D830")]
        notes = NOTES + [line(0xD820, "The third row, which the game rewrites.")]
        blocks = [block(0xD7C0, 0xD82F, "Byte"), block(0xD830, 0xD83F, "Code")]
        L = compute(blocks, syms, notes, regions(GAME))
        self.assertEqual(L["quiet"], set())
        self.assertEqual(L["owner"][0xD811][1], 0xD810)
        self.assertEqual(L["owner"][0xD821][1], 0xD820)
        self.assertEqual(L["owner"][0xD831][1], 0xD830)


if __name__ == "__main__":
    unittest.main()
