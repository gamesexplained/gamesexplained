#!/usr/bin/env python3
"""kit/c16/kernal_ted.py names the KERNAL's entry points as the kit's system file does, and its
entry_points() gives a session's symbols those names whichever system file the session read.

The system file, kit/c16/system-commodore_plus4.toml, is read here as text: each label and
comment is a quoted address and a quoted string on a line of its own. So this needs neither
regenerator2000 nor a TOML reader.
"""
import os
import re
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kernal_ted                                                         # noqa: E402

TOML = os.path.join(HERE, "system-commodore_plus4.toml")


def lines():
    """The system file without its header's comment lines."""
    with open(TOML, encoding="utf-8") as f:
        return [ln for ln in f.read().splitlines() if not ln.startswith("#")]


def section(name):
    """{address: text} of one section of the system file, [labels.KERNAL] or [comments]."""
    out, inside = {}, False
    for ln in lines():
        if ln.startswith("["):
            inside = ln == f"[{name}]"
            continue
        m = re.match(r'^"([0-9A-F]{4})" = "(.*)"$', ln)
        if inside and m:
            out[int(m.group(1), 16)] = m.group(2)
    return out


def sym(address, name, kind, type_="Predefined"):
    return {"address": address, "name": name, "type": type_, "kind": kind}


class SystemFile(unittest.TestCase):
    def test_the_labels_are_kernal_teds(self):
        self.assertEqual(section("labels.KERNAL"), kernal_ted.NAMES)

    def test_the_misplaced_and_misspelt_names_are_gone(self):
        body = "\n".join(lines())
        for a in kernal_ted.MISPLACED:
            self.assertNotIn(f'"{a:04X}" =', body, f"${a:04X} still has a label or a comment")
        for word in ("8ASIN", "SAYESP", "UNTLR", "CIoUT"):
            self.assertNotIn(word, body)

    def test_each_comment_in_the_table_names_its_routine(self):
        comments = section("comments")
        for a, name in kernal_ted.NAMES.items():
            if a >= 0xFF81:          # the C64-compatible table; the four below it are worded otherwise
                self.assertEqual(comments[a].split()[:2], [f"${a:04X}", name[len("KERNAL_"):]], f"${a:04X}")

    def test_every_ted_register_has_a_comment(self):
        comments = section("comments")
        self.assertEqual([a for a in range(0xFF00, 0xFF20) if a not in comments], [])


class EntryPoints(unittest.TestCase):
    def test_an_automatic_label_becomes_the_kernals_name(self):
        out = kernal_ted.entry_points([sym(0xFFD2, "s_FFD2", "auto", "Subroutine")])
        self.assertEqual(out, [sym(0xFFD2, "KERNAL_BSOUT", "system")])

    def test_your_own_label_wins(self):
        mine = sym(0xFFD2, "print_char", "user", "Subroutine")
        self.assertEqual(kernal_ted.entry_points([mine, sym(0xFFD2, "KERNAL_BSOUT", "system")]), [mine])

    def test_the_built_in_files_names_are_corrected(self):
        out = kernal_ted.entry_points([sym(0xFEC9, "KERNAL_CHOUT", "system"), sym(0xFFCF, "KERNAL_8ASIN", "system")])
        self.assertEqual(out, [sym(0xFFCF, "KERNAL_BASIN", "system")], "the misplaced name dropped, the misspelt one put right")

    def test_one_name_an_address(self):
        out = kernal_ted.entry_points([sym(0xFFE4, "s_FFE4", "auto", "Subroutine"), sym(0xFFE4, "KERNAL_GETIN", "system")])
        self.assertEqual(out, [sym(0xFFE4, "KERNAL_GETIN", "system")])

    def test_other_symbols_pass_through(self):
        others = [sym(0x1000, "start", "user", "Subroutine"), sym(0xFEC9, "a_FEC9", "auto", "AbsoluteAddress")]
        self.assertEqual(kernal_ted.entry_points(others), others)


if __name__ == "__main__":
    unittest.main()
