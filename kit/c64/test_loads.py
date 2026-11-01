#!/usr/bin/env python3
"""loads.py logs every call of the KERNAL's LOAD at $FFD5 with what it was asked to load and the
RAM that changed before the next one (#664). A stand-in for the emulator stops at $FFD5 three
times, with SETNAM's and SETLFS's bytes in place, and each load's file appears in RAM by the
next stop."""
import json
import os
import sys
import tempfile
import unittest

import loads  # noqa: E402


def machine(ram, name, device=8, secondary=1, a=0, x=0, y=0, caller=0xE172):
    """RAM as LOAD finds it: the name at $0200, SETNAM's and SETLFS's bytes, the JSR's return."""
    ram = bytearray(ram)
    ram[0x0200:0x0200 + len(name)] = name
    ram[0xB7], ram[0xBB], ram[0xBC] = len(name), 0x00, 0x02
    ram[0xBA], ram[0xB9] = device, secondary
    sp, ret = 0xF0, caller + 2
    ram[0x1F1], ram[0x1F2] = ret & 0xFF, ret >> 8
    return ram, {"PC": loads.LOAD, "A": a, "X": x, "Y": y, "SP": sp}


class Vice:
    """Stopped before the first of `stops` as the watch starts, stops at each in turn once set
    running, then runs on until paused, where `end` is the RAM."""

    def __init__(self, stops, end):
        self.stops, self.end, self.i, self.running, self.armed = stops, end, -1, False, []

    def arm(self, rpc, a):
        self.armed.append(a)
        return 1

    def release(self, rpc, n):
        self.armed.remove(loads.LOAD)

    def paused(self, rpc):
        return not self.running and self.i < len(self.stops)

    def call(self, rpc, name, args):             # run on from a stop to the next, or past the last
        assert name == "vice_execution_run"
        if not self.running:
            self.i += 1
        self.running = self.i >= len(self.stops)

    def ask(self, rpc, name):
        assert name == "vice_registers_get"
        return self.stops[self.i][1]

    def read_mem(self, rpc, a, size, bank=None):
        assert (a, size, bank) == (0, 0x10000, "ram")
        return bytes(self.stops[self.i][0]) if self.i < len(self.stops) else bytes(self.end)

    def pause(self, rpc):
        self.running = False
        return True


class Loads(unittest.TestCase):
    def test_three_loads_with_their_files(self):
        blank = bytearray(0x10000)
        boot = bytearray(blank); boot[0x0801:0x0853] = b"\x01" * 0x52
        level = bytearray(boot); level[0xC000:0xC12C] = b"\x05" * 300
        tiles = bytearray(level); tiles[0x4000:0x43E8] = b"\x07" * 1000
        tiles[0x0400] = 0x20                                      # the screen, between two loads
        stops = [machine(blank, b"*"), machine(boot, b"LEVEL1"),
                 machine(level, b"TILES", secondary=0, x=0x00, y=0x40, caller=0x0830)]
        v = Vice(stops, tiles)
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, "loads.jsonl")
            sys.stdout, keep = open(os.devnull, "w"), sys.stdout
            try:
                tick = iter(range(10 ** 6))
                lines = loads.watch(None, out, seconds=60, vice=v, clock=lambda: next(tick), sleep=lambda s: None)
            finally:
                sys.stdout.close()
                sys.stdout = keep
            self.assertEqual([json.loads(l) for l in open(out)], lines)
        self.assertEqual([e["name"] for e in lines], ["*", "LEVEL1", "TILES"])
        self.assertEqual([r for r in lines[0]["changed"] if r[0] >= 0x0300], [[0x0801, 0x0852]])
        self.assertEqual([r for r in lines[1]["changed"] if r[0] >= 0x0300], [[0xC000, 0xC12B]])
        self.assertEqual([r for r in lines[2]["changed"] if r[0] >= 0x0300], [[0x0400, 0x0400], [0x4000, 0x43E7]])
        self.assertEqual((lines[2]["secondary"], lines[2]["address"], lines[2]["caller"]), (0, 0x4000, 0x0830))
        self.assertEqual(v.armed, [])                             # the checkpoint is taken away

    def test_name_and_runs(self):
        self.assertEqual(loads.petscii(b"GUN\xa0SHIP"), "GUN{A0}SHIP")
        before, after = bytes(64), bytes([1] + [0] * 10 + [1] + [0] * 40 + [1] + [0] * 11)
        self.assertEqual(loads.changed(before, after, gap=16), [[0, 11], [52, 52]])


if __name__ == "__main__":
    unittest.main()
