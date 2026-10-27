#!/usr/bin/env python3
"""The stored value kit/c64/frame.py records beside each write's read back (#559): the store told
from the instruction before the machine's PC, its register or the value INC and DEC make, the
address checked against the register written, and null where the instruction is not a store to
it. Then what capture prints of them. No emulator: `frame.py test` checks the same in VICE."""
import unittest

import frame


class FakeMachine(frame.Machine):
    """The registers after the store, and memory as the processor sees it."""
    def __init__(self, mem, **regs):
        self.mem, self.regs = bytearray(0x10000), {"A": 0, "X": 0, "Y": 0, **regs}
        for a, b in mem.items():
            self.mem[a:a + len(b)] = bytes(b)

    def j(self, tool, args=None):
        assert tool == "vice_registers_get", tool
        return dict(self.regs)

    def read(self, a, n, bank="ram"):
        assert bank == "cpu"
        return bytes(self.mem[a:a + n])


def vic(i):
    return lambda a: 0xD000 <= a <= 0xD3FF and (a & 0x3F) == i


class StoredTests(unittest.TestCase):
    def test_plain_stores(self):
        for code, regs, want in (([0x8D, 0x1A, 0xD0], dict(A=0x01), 0x01),            # STA $D01A
                                 ([0x8E, 0x1A, 0xD0], dict(X=0x81), 0x81),            # STX
                                 ([0x8C, 0x1A, 0xD0], dict(Y=0x0F), 0x0F),            # STY
                                 ([0x9D, 0x00, 0xD0], dict(A=0x81, X=0x1A), 0x81),    # STA $D000,X
                                 ([0x99, 0x10, 0xD0], dict(A=0x05, Y=0x0A), 0x05),    # STA $D010,Y
                                 ([0x8D, 0x5A, 0xD0], dict(A=0x01), 0x01),            # a mirror, $D05A
                                 ([0x8F, 0x1A, 0xD0], dict(A=0xF3, X=0x0F), 0x03)):   # SAX: A and X
            m = FakeMachine({0xC000: code}, PC=0xC003, **regs)
            self.assertEqual(frame.stored(m, vic(0x1A), 0xF0), want, code)

    def test_indirect_stores(self):
        m = FakeMachine({0xC000: [0x91, 0xFB], 0xFB: [0x10, 0xD0]}, PC=0xC002, A=0x18, Y=0x08)
        self.assertEqual(frame.stored(m, vic(0x18), 0x19), 0x18)                       # STA ($FB),Y
        m = FakeMachine({0xC000: [0x81, 0xF0], 0xF4: [0x18, 0xD0]}, PC=0xC002, A=0x1C, X=0x04)
        self.assertEqual(frame.stored(m, vic(0x18), 0x19), 0x1C)                       # STA ($F0,X)

    def test_inc_and_dec_store_what_they_read_changed(self):
        m = FakeMachine({0xC000: [0xEE, 0x20, 0xD0]}, PC=0xC003)
        self.assertEqual(frame.stored(m, vic(0x20), 0xF5), 0xF6)
        self.assertEqual(frame.stored(m, vic(0x20), 0xFF), 0x00)
        self.assertIsNone(frame.stored(m, vic(0x20), None))
        m = FakeMachine({0xC000: [0xCE, 0x20, 0xD0]}, PC=0xC003)
        self.assertEqual(frame.stored(m, vic(0x20), 0xF5), 0xF4)

    def test_unknown_is_null(self):
        cases = (({0xC000: [0x8D, 0x18, 0xD0]}, vic(0x1A)),     # a store to another register
                 ({0xC000: [0x2E, 0x1A, 0xD0]}, vic(0x1A)),     # ROL: carry in unknown
                 ({0xC000: [0xEA, 0xEA, 0xEA]}, vic(0x1A)),     # an interrupt taken after the store
                 ({0xC000: [0x8D, 0x00, 0xDD]}, vic(0x00)))     # CIA 2, not the video chip
        for mem, same in cases:
            self.assertIsNone(frame.stored(FakeMachine(mem, PC=0xC003, A=1), same, 0xF0), mem)

    def test_cia2_port(self):
        same = lambda a: 0xDD00 <= a <= 0xDDFF and (a & 0x0F) == 0      # noqa: E731
        m = FakeMachine({0xC000: [0x8D, 0x10, 0xDD]}, PC=0xC003, A=0x02)  # a mirror, $DD10
        self.assertEqual(frame.stored(m, same, None), 0x02)


class QuoteTests(unittest.TestCase):
    def test_says_what_reads_back_differently_and_what_is_unknown(self):
        F = {"writes": [[115, 20, 0xD018, 0x19, 0x18], [149, 20, 0xD018, 0x1F, 0x1E], [150, 2, 0xD020, 0xF6, None],
                        [200, 9, 0x07F8, 0xC0, 0xC0], [0, 30, 0xD01A, 0xF1, 0x01]]}
        out = frame.quote(F)
        self.assertEqual(len(out), 2, out)
        self.assertIn("3 writes differently", out[0])
        self.assertIn("$D01A = $01 reads $F1, $D018 = $18 reads $19, $D018 = $1E reads $1F", out[0])
        self.assertIn("1 writes have no stored value", out[1])

    def test_a_frame_from_before_the_stored_value(self):
        self.assertEqual(frame.quote({"writes": [[115, 20, 0xD018, 0x19]]}), [])


if __name__ == "__main__":
    unittest.main()
