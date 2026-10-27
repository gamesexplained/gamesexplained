#!/usr/bin/env python3
"""The kit's Z-machine reader, without an interpreter: text, the dictionary's encoding,
objects, the header and every instruction form, in every version.

Stories come from kit/zmachine/zasm.py, so most of these check that what the assembler
writes the reader reads back; the facts that do not rest on the kit's own code are worked
out by hand from the Z-Machine Standards Document 1.1 or taken from Infocom's own story
files. kit/zmachine/test_bocfel.py checks the reader against an interpreter.
"""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import zasm  # noqa: E402
import zcode  # noqa: E402
from story import Story  # noqa: E402

ALL = range(1, 9)


def quote(t):
    """Text as the assembler's source writes it: backslash, quote and new line escaped."""
    return t.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def tiny(v, source="main: .routine 0\n quit\n", **kw):
    asm = zasm.assemble(v, source, **kw)
    return asm, Story(asm.story)


class Text(unittest.TestCase):
    STRINGS = ["hello", "Hello, World!", "0123456789", "MiXeD CaSe", "a.b,c!d?e_f#g'h\"i/j\\k-l:m(n)",
               "two\nlines", "at @ sign", "ä and ß", "  spaces  ", "ABCdefGHI123jkl"]

    def test_round_trip(self):
        for v in ALL:
            for locks in ((False, True) if v <= 2 else (False,)):
                src = "main: .routine 0\n quit\n" + "".join(
                    f's{i}: .string "{quote(t)}"\n' for i, t in enumerate(self.STRINGS))
                asm, st = tiny(v, src, locks=locks)
                for i, t in enumerate(self.STRINGS):
                    with self.subTest(version=v, locks=locks, text=t):
                        self.assertEqual(st.string(asm.labels[f"s{i}"][1]), t)

    def test_version_1_alphabet(self):
        """Version 1: z-character 1 is a new line, and A2 has < where later versions have it."""
        self.assertEqual(zasm.encode_zchars(1, "a\nb"), [6, 1, 7])
        self.assertEqual(zasm.encode_zchars(1, "<"), [3, 27])
        self.assertEqual(zasm.encode_zchars(1, "0"), [3, 7])
        self.assertEqual(zasm.encode_zchars(2, "\n"), [3, 7])
        self.assertEqual(zasm.encode_zchars(3, "\n"), [5, 7])

    def test_shifts(self):
        """Versions 1 and 2 shift relative to the locked alphabet; 3 on, always from A0."""
        self.assertEqual(zasm.encode_zchars(3, "aBc"), [6, 4, 7, 8])
        self.assertEqual(zasm.encode_zchars(2, "aBc"), [6, 2, 7, 8])
        self.assertEqual(zasm.encode_zchars(2, "ABc", locks=True), [4, 6, 7, 3, 8])
        self.assertEqual(zasm.encode_zchars(1, "12", locks=True), [5, 8, 9])

    def test_abbreviations(self):
        for v, n in ((2, 32), (3, 96), (5, 96)):
            abbr = [f"w{i} " for i in range(n)]
            asm, st = tiny(v, 'main: .routine 0\n quit\nt: .string "{a:0}x{a:%d}y"\n' % (n - 1), abbreviations=abbr)
            with self.subTest(version=v):
                self.assertEqual(st.abbreviation(n - 1), f"w{n - 1} ")
                self.assertEqual(st.string(asm.labels["t"][1]), f"w0 xw{n - 1} y")

    def test_custom_alphabet(self):
        """Version 5's alphabet table replaces all three, but A2's escape and new line."""
        alphabet = "zyxwvutsrqponmlkjihgfedcba" + "ZYXWVUTSRQPONMLKJIHGFEDCBA" + "  9876543210.,!?_#'\"/\\-:()"
        asm, st = tiny(5, 'main: .routine 0\n quit\nt: .string "abc XYZ 9"\n', alphabet=alphabet)
        self.assertEqual(st.alphabets[0][0], "z")
        self.assertEqual(st.string(asm.labels["t"][1]), "abc XYZ 9")
        self.assertEqual(st.mem[asm.labels["t"][1]] >> 2 & 31, 6 + 25)     # "a" is the last of A0


class Dictionary(unittest.TestCase):
    def test_by_hand(self):
        """'zork' in version 3: z o r k are 31 20 23 16, then two 5s, the end bit on the last word."""
        st = Story(bytes([3]) + bytes(63))
        self.assertEqual(st.encode("zork"), bytes.fromhex("7E97C0A5"))
        self.assertEqual(st.encode("ZORK"), bytes.fromhex("7E97C0A5"))
        self.assertEqual(st.encode("zorkmids"), st.encode("zorkmi"))
        v4 = Story(bytes([4]) + bytes(63))
        self.assertEqual(len(v4.encode("zork")), 6)
        self.assertNotEqual(v4.encode("zorkmids"), v4.encode("zorkmi"))

    def test_infocom_shift_lock(self):
        """Zork I release 15 (version 2) holds 'pdp10' as 55 35 95 28: the two digits under
        one shift lock (z-character 5), as Infocom's compiler wrote a run of A2 characters."""
        st = Story(bytes([2]) + bytes(63))
        self.assertEqual(st.encode("pdp10"), bytes.fromhex("55359528"))

    def test_lookup(self):
        words = ["north", "n", "lamp", "x-ray", "pdp10", "."]
        for v in ALL:
            asm, st = tiny(v, dictionary=[(w, b"\x01\x02\x03") for w in words])
            d = st.dictionary()
            with self.subTest(version=v):
                self.assertEqual(len(d.entries), len(words))
                self.assertEqual([e[2] for e in d.entries], sorted(e[2] for e in d.entries))
                for w in words:
                    a = st.lookup(w)
                    self.assertNotEqual(a, 0, w)
                    self.assertEqual(st.mem[a + (4 if v <= 3 else 6):][:3], b"\x01\x02\x03")
                self.assertEqual(st.lookup("south"), 0)


class Objects(unittest.TestCase):
    def objects(self, v):
        big = bytes(range(12))
        return [dict(name="first", attrs=[0, 5, 31], child=2, props={18: b"\x00\x07", 4: b"\x09"}),
                dict(name="second", attrs=[] if v <= 3 else [47], parent=1, sibling=3,
                     props={2: b"\x01\x02\x03\x04"} if v <= 3 else {2: big}),
                dict(name="", parent=1)]

    def test_round_trip(self):
        for v in ALL:
            want = self.objects(v)
            asm, st = tiny(v, objects=want)
            with self.subTest(version=v):
                self.assertEqual(st.object_count(), 3)
                for n, o in enumerate(want, 1):
                    got = st.object(n)
                    self.assertEqual(got.name, o["name"])
                    self.assertEqual(got.attrs, set(o.get("attrs", ())))
                    self.assertEqual((got.parent, got.sibling, got.child),
                                     (o.get("parent", 0), o.get("sibling", 0), o.get("child", 0)))
                    self.assertEqual([(num, bytes(data)) for num, _, data in st.properties(n)],
                                     sorted(o.get("props", {}).items(), reverse=True))


class Header(unittest.TestCase):
    def test_header(self):
        for v in ALL:
            asm, st = tiny(v, "main: .routine 2\n add #1 #2 -> sp\n quit\n")
            with self.subTest(version=v):
                self.assertEqual(st.version, v)
                self.assertEqual(st.length(), len(asm.story))
                if v >= 3:
                    self.assertEqual(st.checksum(), st.header["checksum"])
                self.assertEqual(st.start(), asm.instructions[0])
                self.assertEqual(st.instruction(st.start()).name, "add")
                names = [r[0] for r in st.regions()]
                self.assertEqual(names, ["dynamic", "static", "high"])

    def test_unpack(self):
        """Packed addresses: 2P to version 3, 4P in 4 and 5, 4P + 8 * offset in 6 and 7, 8P in 8."""
        self.assertEqual([zcode.unpack(0x100, v) for v in (1, 2, 3, 4, 5, 8)], [0x200] * 3 + [0x400] * 2 + [0x800])
        self.assertEqual(zcode.unpack(0x100, 7, "routine", (0x10, 0x20)), 0x400 + 0x80)
        self.assertEqual(zcode.unpack(0x100, 6, "string", (0x10, 0x20)), 0x400 + 0x100)


class Instructions(unittest.TestCase):
    """Every opcode of every version, assembled and decoded again."""

    def operands(self, count, number, flags, v):
        if "j" in flags:
            return ["there"]
        if "r" in flags:
            n = {"1OP": 1, "2OP": 2}.get(count, 4)
            if (count, number) in zcode.DOUBLE_TYPES:
                n = 8
            return ["sub"] + ["#1", "L01", "#$1234", "G05", "#2", "sp", "#3"][:n - 1]
        if "p" in flags:
            return ["str"]
        if "v" in flags:
            return ["[L02]"] + (["#7"] if count == "2OP" else [])
        if count == "2OP":                 # the long form, and the variable one
            return ["#5", "L01"] if number % 2 else ["#$0102", "L01"]
        n = {"0OP": 0, "1OP": 1}.get(count, 3)
        return ["#$0102", "L01", "#200"][:n]

    def test_every_opcode(self):
        for v in ALL:
            for (count, number), rows in sorted(zcode.OPS.items()):
                o = zcode.op(count, number, v)
                if not o:
                    continue
                name, flags = o
                ops = self.operands(count, number, flags, v)
                line = name + " " + " ".join(ops)
                if "s" in flags:
                    line += " -> G01"
                if "b" in flags:
                    line += " ?there"
                if "t" in flags:
                    line += ' "Text."'
                src = (f"main: .routine 2\nhere: {line}\n quit\nthere: quit\n"
                       f"sub: .routine 8\n rtrue\nstr: .string \"s\"\n")
                with self.subTest(version=v, opcode=name, count=count):
                    asm, st = tiny(v, src)
                    here, there = asm.labels["here"][1], asm.labels["there"][1]
                    ins = st.instruction(here)
                    self.assertEqual((ins.name, ins.count, ins.number), (name, count, number))
                    self.assertEqual(len(ins.operands), len(ops))
                    self.assertEqual(ins.end, there - 1, str(ins))    # quit, one byte, is between
                    if "s" in flags:
                        self.assertEqual(ins.store, 0x11)
                    if "b" in flags:
                        self.assertEqual(ins.branch[1], there)
                    if "t" in flags:
                        self.assertEqual(ins.text, "Text.")
                    if "j" in flags:
                        self.assertEqual(ins.target, there)
                    if "r" in flags:
                        self.assertEqual(st.unpack(ins.operands[0][1]), asm.labels["sub"][1])


if __name__ == "__main__":
    unittest.main()
