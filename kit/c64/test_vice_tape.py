"""vice.tape(): the monitor commands it types, the offset sent in decimal (a bare number is read as
hexadecimal, #447), and a failed attach raised. No emulator: codemap.monitor is replaced."""
import os
import unittest
from unittest import mock

import codemap
import vice


class TapeTests(unittest.TestCase):
    def run_tape(self, *args, replies=None, **kw):
        sent = []

        def monitor(cmd, rpc=None, timeout=60):
            sent.append(cmd)
            if cmd == "tapeoffs":
                return "(C:$e5cf) Current tape offset is: 441050\n(C:$e5cf) "
            return (replies or {}).get(cmd, "(C:$e5cf) (C:$e5cf) ")
        with mock.patch.object(codemap, "monitor", monitor):
            return vice.tape(None, *args, **kw), sent

    def test_change_set_and_play(self):
        where, sent = self.run_tape("work/side2.tap", offset=441050)
        self.assertEqual(sent, [f'attach "{os.path.abspath("work/side2.tap")}" 1',
                                "tapeoffs +441050", "tapectrl 1", "tapeoffs"])
        self.assertEqual(where, 441050)

    def test_nothing_but_the_position(self):
        where, sent = self.run_tape(play=False)
        self.assertEqual(sent, ["tapeoffs"])
        self.assertEqual(where, 441050)

    def test_a_failed_attach_raises(self):
        path = os.path.abspath("missing.tap")
        with self.assertRaisesRegex(vice.ViceError, "could not attach"):
            self.run_tape("missing.tap", replies={f'attach "{path}" 1': "(C:$e5cf) Failed.\n(C:$e5cf) "})

    def test_offset_must_be_a_whole_number(self):
        for bad in ("441050", -1, 4.5):
            with self.subTest(offset=bad), self.assertRaises(ValueError):
                self.run_tape(offset=bad)


if __name__ == "__main__":
    unittest.main()
