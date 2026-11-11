#!/usr/bin/env python3
"""A JSR or a JMP to the CPU's own port reads as a number: no emulator needed.

A game that fills in a call as it runs leaves `JSR $0000` in its file. On the C64 and the C16
that address is the CPU's port, which a symbol map names, and the listing showed the line as a
call into the port (`jsr cpu_port_ddr`, #774). kit/cpu/m6502.py now takes the port's addresses
from the machine's cpu.py and gives such an operand as the number the file holds, with no
address, so nothing in the listing counts it as a reference to the port. A machine whose 6502
has no port keeps the name, since code can run at $0000 there.
"""
import importlib.util
import os
import sys
import unittest

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAMES = {0x0000: "cpu_port_ddr", 0x0001: "cpu_port", 0x1000: "start"}
NO_CHIPS = lambda target, at: False   # noqa: E731


def cpu(platform):
    spec = importlib.util.spec_from_file_location(f"{platform}_cpu_port", os.path.join(KIT, platform, "cpu.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def read(mod, bs, a=0x2000):
    ram = bytearray(0x10000)
    ram[a:a + len(bs)] = bytes(bs)
    m, mode, n = mod.decode(ram, a)[:3]
    return (m,) + tuple(mod.operand(a, m, mode, list(ram[a:a + n]), NAMES, {}, NO_CHIPS))


class Port(unittest.TestCase):
    def test_a_call_or_jump_to_the_port_is_a_number(self):
        for platform in ("c64", "c16"):
            mod = cpu(platform)
            for bs, want in (([0x20, 0x00, 0x00], ("jsr", "$0000", None)),
                             ([0x4C, 0x00, 0x00], ("jmp", "$0000", None)),
                             ([0x20, 0x01, 0x00], ("jsr", "$0001", None)),
                             ([0x4C, 0x01, 0x00], ("jmp", "$0001", None))):
                self.assertEqual(read(mod, bs), want, f"{platform} {bs}")

    def test_everything_else_keeps_its_name(self):
        for platform in ("c64", "c16"):
            mod = cpu(platform)
            for bs, want in (([0x20, 0x00, 0x10], ("jsr", "start", 0x1000)),
                             ([0xB9, 0x00, 0x00], ("lda", "cpu_port_ddr,y", 0x0000)),   # a read of the port
                             ([0x85, 0x01], ("sta", "cpu_port", 0x0001)),
                             ([0x6C, 0x00, 0x00], ("jmp", "(cpu_port_ddr)", 0x0000))):   # a vector kept there
                self.assertEqual(read(mod, bs), want, f"{platform} {bs}")

    def test_a_6502_with_no_port_keeps_the_name(self):
        for platform in ("bbc", "nes"):
            self.assertEqual(read(cpu(platform), [0x20, 0x00, 0x00]), ("jsr", "cpu_port_ddr", 0x0000), platform)


if __name__ == "__main__":
    unittest.main()
