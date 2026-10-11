#!/usr/bin/env python3
"""Self-check for kit/c64/codemap.py: no emulator needed."""
import json
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from codemap import banked_out_ram, kernal_only, parse_executed, restor_defaults, runs, sizes  # noqa: E402

SAMPLE = """\
(C:$1005) addr: IO  ROM RAM
1000: --- --- r-x (uninitialized exec)
1002: --- --- r-x (uninitialized exec)
1005: --- --- r-x (uninitialized exec)
e5cd: --- r-x --- (uninitialized exec)
(C:$1005) """


class ParseTests(unittest.TestCase):
    def test_parse_executed(self):
        self.assertEqual(parse_executed(SAMPLE), {0x1000, 0x1002, 0x1005, 0xE5CD})

    def test_parse_empty(self):
        self.assertEqual(parse_executed("(C:$1005) addr: IO  ROM RAM\n(C:$1005) "), set())

    def test_runs(self):
        self.assertEqual(runs({0x1000, 0x1001, 0x1002, 0x1005}), [[0x1000, 0x1002], [0x1005, 0x1005]])
        self.assertEqual(runs(set()), [])


class BankingTests(unittest.TestCase):
    """The memmap marks execution ROM or RAM by address, so code run from the RAM under BASIC or
    the KERNAL is marked ROM execute; dump keeps it where the port has that ROM banked out."""
    MARKED = [0x9FFF, 0xA000, 0xA00B, 0xBFFF, 0xC000, 0xD000, 0xE000, 0xFFFF]
    UNDER_BASIC, UNDER_KERNAL = [0xA000, 0xA00B, 0xBFFF], [0xE000, 0xFFFF]

    def test_banking(self):
        for port, ddr, want in (
                (0x37, 0x2F, []),                                   # BASIC and KERNAL in
                (0x36, 0x2F, self.UNDER_BASIC),                     # BASIC out
                (0x35, 0x2F, self.UNDER_BASIC + self.UNDER_KERNAL),  # both out, I/O in
                (0x34, 0x2F, self.UNDER_BASIC + self.UNDER_KERNAL),  # all RAM
                (0x33, 0x2F, []),                                   # character ROM, BASIC, KERNAL
                (0x30, 0x28, []),                                   # bits 0-2 inputs read 1: ROMs in
                (0x35, 0x2D, [])):                                  # bit 1 an input reads 1
            self.assertEqual(banked_out_ram(self.MARKED, port, ddr), want, f"${port:02X}/${ddr:02X}")


class SizeTests(unittest.TestCase):
    """dump sizes each instruction from the RAM as it is at the dump, which the game may have
    rewritten since the instruction ran."""

    def ram(self, at, bs):
        ram = bytearray(0x10000)
        ram[at:at + len(bs)] = bytes(bs)
        return ram

    def test_plain(self):
        ram = self.ram(0x1000, [0xA9, 0x02, 0x8D, 0x20, 0xD0, 0x60])  # LDA #$02; STA $D020; RTS
        self.assertEqual(sizes([0x1000, 0x1002, 0x1005], ram), ({0x1000: 2, 0x1002: 3, 0x1005: 1}, []))

    def test_bit_skip(self):
        """A BIT whose operand another path runs as an instruction: both end at $1002."""
        ram = self.ram(0x1000, [0x2C, 0xA9, 0x02, 0x60])  # BIT $02A9 / LDA #$02; RTS
        self.assertEqual(sizes([0x1000, 0x1001, 0x1003], ram), ({0x1000: 3, 0x1001: 2, 0x1003: 1}, []))

    def test_rewritten(self):
        """IK+: a CLI and an RTS ran at $1069/$106A, then other code was copied over them, and
        each decodes as three bytes. Only the opcodes ran for certain; $106B-$106C never did."""
        ram = self.ram(0x1066, [0x8C, 0x0D, 0xDD, 0x8D, 0x20, 0xD0, 0xEA, 0x20, 0x00, 0x20])
        size, changed = sizes([0x1066, 0x1069, 0x106A, 0x106D], ram)  # STY; STA $D020 / JSR $EAD0; JSR
        self.assertEqual(changed, [0x1069, 0x106A])
        self.assertEqual(size, {0x1066: 3, 0x1069: 1, 0x106A: 1, 0x106D: 3})


class KernalTests(unittest.TestCase):
    """A game that banks the KERNAL in to load a file records the KERNAL's code at the same
    addresses as its own code in the RAM under it (#309)."""

    @staticmethod
    def put(mem, at, bs):
        mem[at:at + len(bs)] = bytes(bs)

    def images(self, ram_code):
        ram = bytearray(0x10000)
        self.put(ram, 0xC000, [0x20, 0x00, 0xE0, 0x20, 0x81, 0xFF])   # JSR $E000; JSR $FF81 (the KERNAL's)
        self.put(ram, 0x0314, [0x00, 0xC1])                          # the IRQ vector, hooked to $C100
        for at, bs in ram_code.items():
            self.put(ram, at, bs)
        rom = bytearray(ram[:0xE000]) + bytearray(0x2000)
        self.put(rom, 0xFF81, [0x4C, 0x00, 0xE1])                    # jump table: JMP $E100
        self.put(rom, 0xE100, [0xA9, 0x00, 0x20, 0x00, 0xE2, 0x60])  # LDA #0; JSR $E200; RTS
        self.put(rom, 0xE200, [0x60])
        self.put(rom, 0xFFFA, [0x00, 0xE3] * 3)                      # NMI, RESET, IRQ: $E300
        self.put(rom, 0xE300, [0x6C, 0x14, 0x03])                    # JMP ($0314)
        self.put(rom, 0xFF8A, [0x4C, 0x00, 0xE4])                    # RESTOR
        self.put(rom, 0xE400, [0xA2, 0x10, 0xA0, 0xE4, 0x18, 0x86, 0xC3, 0x84, 0xC4, 0xA0, 0x01,
                               0xB9, 0x14, 0x03])                    # LDX #$10 LDY #$E4 CLC STX STY LDY #1 LDA $0314,Y
        self.put(rom, 0xE410, [0x20, 0xE3])                          # the default IRQ vector: $E320
        self.put(rom, 0xE320, [0x40])                                # RTI
        return rom, ram

    RECORDED = {0xE000, 0xE001, 0xE100, 0xE102, 0xE105, 0xE200, 0xE300, 0xE320, 0xFF81}
    KERNAL = [0xE100, 0xE102, 0xE105, 0xE200, 0xE300, 0xE320, 0xFF81]

    def test_restor(self):
        rom, _ = self.images({})
        self.assertEqual(restor_defaults(rom), {0x0314: 0xE320})
        self.assertEqual(restor_defaults(bytearray(0x10000)), {})

    def test_drops_the_kernal(self):
        """The game's routine at $E000 stays; the KERNAL's code, reached from its jump table, its
        IRQ vector and the default the hooked vector replaced, goes."""
        rom, ram = self.images({0xE000: [0xEA, 0x60]})              # NOP; RTS
        self.assertEqual(kernal_only(rom, ram, self.RECORDED, {0xC000, 0xC003}), (self.KERNAL, []))

    def test_both(self):
        """An address the RAM's code reaches too is kept, and named."""
        rom, ram = self.images({0xE000: [0xEA, 0x4C, 0x02, 0xE1], 0xE102: [0x60]})   # NOP; JMP $E102 / RTS
        dropped, both = kernal_only(rom, ram, self.RECORDED, {0xC000, 0xC003})
        self.assertEqual(both, [0xE102])
        self.assertEqual(dropped, [a for a in self.KERNAL if a != 0xE102])

    def test_own_jump_table(self):
        """A jump into the jump table is the RAM's own only where the RAM holds a JMP there."""
        rom, ram = self.images({0xE000: [0xEA, 0x60], 0xFF81: [0x4C, 0x00, 0xE0]})
        self.assertEqual(kernal_only(rom, ram, self.RECORDED, {0xC000, 0xC003})[1], [0xFF81])


class FormatTests(unittest.TestCase):
    def test_matches_check_listing(self):
        """codemap.json has the keys check_listing.py reads, in its layout."""
        sys.path.insert(0, os.path.join(os.path.dirname(HERE), "scripts"))
        from check_listing import untyped_code  # noqa: E402
        with tempfile.TemporaryDirectory() as gdir:
            cm = {"starts": [0x1000, 0x1005], "code": [[0x1000, 0x1002], [0x1005, 0x1007]],
                  "executed": [0x1000, 0x1005], "ran": [[0x1000, 0x1002], [0x1005, 0x1007]]}
            json.dump(cm, open(os.path.join(gdir, "codemap.json"), "w"))
            # $1000-$1002 typed Code, $1005-$1007 typed as data: ran-as-data is an error
            sym = {"blocks": [{"type": "Code", "start": 0x1000, "end": 0x1002},
                              {"type": "Data", "start": 0x1005, "end": 0x1007}]}
            ran, traced = untyped_code(gdir, sym)
            self.assertEqual(ran, [0x1005, 0x1006, 0x1007])
            self.assertEqual(traced, [])


if __name__ == "__main__":
    unittest.main()
