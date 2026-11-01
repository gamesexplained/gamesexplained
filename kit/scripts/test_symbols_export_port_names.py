#!/usr/bin/env python3
"""symbols_export.py renames a user label "start" at an address the platform names as its own,
such as the C64's $0000, the processor's port: a listing that reads `sta start` there tells the
reader nothing true (#643). Elsewhere, and on a machine with no such address, start stays."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from symbols_export import port_names   # noqa: E402


def sym(address, name, kind="user"):
    return {"address": address, "name": name, "type": "UserDefined", "kind": kind}


class PortNames(unittest.TestCase):
    def test_start_on_the_c64_port_is_renamed(self):
        syms = [sym(0x0000, "start"), sym(0x0801, "start_game")]
        self.assertEqual(port_names("c64", syms), [(0x0000, "cpu_port_ddr")])
        self.assertEqual([s["name"] for s in syms], ["cpu_port_ddr", "start_game"])

    def test_c16_port_too(self):
        syms = [sym(0x0000, "start")]
        self.assertEqual(port_names("c16", syms), [(0x0000, "cpu_port_ddr")])

    def test_other_names_places_and_machines_stay(self):
        syms = [sym(0x0000, "port_ddr"), sym(0x1000, "start"), sym(0x0001, "start", kind="auto")]
        self.assertEqual(port_names("c64", syms), [])
        spectrum = [sym(0x0000, "start")]          # the Spectrum's ROM begins there: start is true
        self.assertEqual(port_names("spectrum", spectrum), [])
        self.assertEqual(spectrum[0]["name"], "start")


if __name__ == "__main__":
    unittest.main()
