#!/usr/bin/env python3
"""The kit's SCUMM decoder (kit/scumm/scode.py) and disk reader (kit/scumm/game.py), on bytes
made here and on the kit's test game (kit/scumm/testgame.py). Needs nothing installed; what ScummVM
runs is checked by test_scummvm.py.

  - every handler, assembled with its parameters as constants and as variables, decodes to itself,
    reads every byte it was given, and gives each parameter back as it was written;
  - instructions whose bytes are fixed here by what ScummVM's handlers read decode to the lengths,
    targets and text worked out by hand, $AB among them: switchCostumeSet reads a byte on the C64
    and the NES only;
  - the test game's disks read back: the index, both rooms, their objects and scripts, and every
    byte of every script is reached by scode.listing.
"""
import os
import shutil
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import scode  # noqa: E402
import testgame  # noqa: E402
from game import Game, HEADER  # noqa: E402
from testgame import Asm, Var  # noqa: E402

SPECIAL = {"actorOps", "doSentence", "verbOps", "setVarRange", "pseudoRoom", "switchCostumeSet", "beginOverride",
           "delay"}


def operands_for(spec, as_vars):
    """Operands for a READS spec: each parameter a constant (k*3+1) or variable k+10."""
    out = []
    for k, r in enumerate(spec.split()):
        if r[0] in "BW" and len(r) == 2:
            out.append(Var(k + 10) if as_vars else (-(k * 3 + 1) if r[0] == "W" else k * 3 + 1))
        elif r in ("V", "R", "RI", "b"):
            out.append(k + 20)
        elif r == "sb":
            out.append(-2)
        elif r == "w":
            out.append(0x1234)
        elif r == "J":
            out.append("end")
        elif r in ("S", "N"):
            out.append("TEXT")
    return out


class Decoder(unittest.TestCase):
    def test_every_handler_round_trip(self):
        for name in sorted(set(scode.OPCODES_V12) - SPECIAL):
            spec = scode.READS[name]
            for as_vars in (False, True):
                with self.subTest(handler=name, variables=as_vars):
                    a = Asm()
                    a.op(name, *operands_for(spec, as_vars))
                    a.label("end")
                    code = a.assemble()
                    ins = scode.decode(code, 0)
                    self.assertEqual(ins.name, name)
                    self.assertEqual(ins.end, len(code), "bytes left over or read past")
                    params = [r for r in spec.split() if r[0] in "BW" and len(r) == 2]
                    self.assertEqual(len(ins.params), len(params))
                    for k, (o, r) in enumerate(zip(ins.params, params)):
                        if as_vars:
                            self.assertEqual((o.kind, o.value), ("var", spec.split().index(r) + 10))
                        else:
                            want = spec.split().index(r)
                            self.assertEqual(o.value, -(want * 3 + 1) if r[0] == "W" else want * 3 + 1)
                    if "J" in spec:
                        self.assertEqual(ins.target, len(code), "the jump's target")

    def test_every_opcode_decodes(self):
        """Each of the 256 opcodes, followed by enough bytes, decodes to the handler the table names."""
        for op in range(256):
            code = bytes([op]) + bytes([1, 1, 1, 0, 1, 0, 0, 0]) + bytes(600)
            ins = scode.decode(code, 0) if scode.OPCODES_V12[op] != "beginOverride" else None
            if ins:
                self.assertEqual(ins.name, scode.OPCODES_V12[op])

    def test_switch_costume_set_ab(self):
        """$AB reads one byte on the C64 and the NES, none elsewhere (script_v2.cpp, o2_switchCostumeSet)."""
        code = bytes([0xAB, 0x05, 0x80])
        self.assertEqual(scode.decode(code, 0, platform="c64").end, 2)
        self.assertEqual(scode.decode(code, 0, platform="nes").end, 2)
        self.assertEqual(scode.decode(code, 0, platform="pc").end, 1)
        listed = scode.listing(code, 0)
        self.assertEqual([i.name for i in listed], ["switchCostumeSet", "breakHere"])

    def test_known_bytes(self):
        cases = [
            # isEqual Var[100], 7: goes on when equal, else 3 bytes on from its end
            (bytes.fromhex("48 64 07 00 03 00"), 6, "unless (Var[100] == 7) goto 0009"),
            # the same, the value from Var[101] (bit $80)
            (bytes.fromhex("c8 64 65 03 00"), 5, "unless (Var[100] == Var[101]) goto 0008"),
            # isGreater: ScummVM's jumpRelative(b > a) goes on when the parameter is the greater
            (bytes.fromhex("78 64 07 00 00 00"), 6, "unless (Var[100] < 7) goto 0006"),
            # delay: three bytes, $FFFFFF less the frames
            (bytes.fromhex("2e fb ff ff"), 4, "delay(4)"),
            # beginOverride, its jump's three bytes skipped
            (bytes.fromhex("58 18 05 00"), 4, "beginOverride (on escape, goto 0009)"),
            # doSentence $FB: the verb alone
            (bytes.fromhex("19 fb"), 2, "doSentence(251)"),
            (bytes.fromhex("19 01 64 00 00 00 01"), 7, "doSentence(run, 1, 100, 0)"),
            # verbOps: delete slot, verb on/off, new verb with a name
            (bytes.fromhex("7a 00 03"), 3, "verbOps(delete, slot 3)"),
            (bytes.fromhex("7a ff 01 01"), 4, "verbOps(verb 1, mode 1)"),
            (bytes.fromhex("7a 02 08 00 03 00 55 53 45 00"), 10,
             'verbOps(new verb 2, x 8, y 0, slot 3, preposition 0, "USE")'),
            # actorOps name: an $FF and a code taken with the byte after it, two more after code 4
            (bytes.fromhex("13 01 00 03 41 ff 04 01 02 42 00"), 11, 'actorOps(1, name, 0, "AB")'),
            # a message: code 4 takes a byte (a variable's number)
            (bytes.fromhex("14 01 48 04 05 69 00"), 7, 'print(1, "H{var 5}i")'),
            # setVarRange in words (bit $80) and in bytes
            (bytes.fromhex("a6 6e 02 d4 fe 90 01"), 7, "Var[110][0..1] = -300, 400"),
            (bytes.fromhex("26 6e 03 01 02 03"), 6, "Var[110][0..2] = 1, 2, 3"),
            # setBitVar, getBitVar: the word first
            (bytes.fromhex("1b c0 12 03 01"), 5, "Bit[4800 + 3] = 1"),
            (bytes.fromhex("31 73 c0 12 03"), 5, "Var[115] = Bit[4800 + 3]"),
            # loadRoomWithEgo: object, room, then two signed bytes
            (bytes.fromhex("24 67 00 02 ff ff"), 6, "loadRoomWithEgo(103, 2, -1, -1)"),
            # pseudoRoom: bytes to a 0
            (bytes.fromhex("cc 01 bc bd 00"), 5, "pseudoRoom(1, 188, 189)"),
            # resourceRoutines that ScummVM does nothing for, and one it does
            (bytes.fromhex("0c 03 50"), 3, "resourceRoutines($50, 3)"),
            (bytes.fromhex("0c 03 51"), 3, "resourceRoutines(load script 3)"),
        ]
        for code, end, text in cases:
            with self.subTest(code=code.hex(" ")):
                ins = scode.decode(code, 0)
                self.assertEqual((ins.end, ins.text), (end, text))

    def test_actor_ops_palette(self):
        """actorOps' palette (2) reads one more byte in version 2 only."""
        code = bytes.fromhex("13 01 06 02 09 80")
        self.assertEqual(scode.decode(code, 0, version=1).end, 4)
        self.assertEqual(scode.decode(code, 0, version=2).end, 5)


class TestGame(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.work = tempfile.mkdtemp(prefix="scumm-testgame-")
        testgame.write(cls.work)
        cls.game = Game(cls.work)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.work, ignore_errors=True)

    def test_index(self):
        g = self.game
        self.assertEqual((g.id, g.version, g.platform), ("zak", 1, "c64"))
        self.assertEqual(sorted(n for n, (r, o) in enumerate(g.index["script"]) if r),
                         sorted(testgame.GLOBAL_SCRIPTS))
        self.assertEqual([n for n in range(1, g.n_rooms) if g.has_room(n)], [1, 2])

    def test_rooms_and_objects(self):
        g = self.game
        for room in (1, 2):
            want = {o: row for o, row in testgame.OBJECTS_AT.items() if row[0] == room}
            got = {o.number: o for o in g.objects(room)}
            self.assertEqual(sorted(got), sorted(want))
            for n, o in got.items():
                self.assertEqual(o.name, want[n][6])
                self.assertEqual(sorted(o.verbs), sorted(testgame.verb_scripts(n)))
                self.assertEqual(o.klass, want[n][5])
        b, start, end = g.code("i", testgame.KEY)
        self.assertEqual((b[4] | b[5] << 8, start), (testgame.KEY, 0))

    def test_every_byte_decodes(self):
        """Each script's listing reaches every byte of its code: nothing is skipped or read twice."""
        g = self.game
        for where, num, room, b, start, entries in g.scripts():
            _, s, e = g.code(where, num, room)
            listed = scode.listing(b, min(entries.values()), e, g.version, g.platform, entries=list(entries.values()))
            with self.subTest(where=where, number=num, room=room):
                self.assertTrue(listed, "nothing decoded")
                covered = sum(i.length for i in listed)
                first = min(entries.values())
                self.assertEqual(covered, e - first, "bytes not reached")
                for x, y in zip(listed, listed[1:]):
                    self.assertEqual(x.end, y.at, f"a gap or an overlap at {x.end:04X}")

    def test_assembled_scripts_match(self):
        """The global scripts on the disks are the bytes testgame assembled."""
        for n, make in testgame.GLOBAL_SCRIPTS.items():
            self.assertEqual(self.game.script(n)[HEADER:], make().assemble())


if __name__ == "__main__":
    unittest.main()
