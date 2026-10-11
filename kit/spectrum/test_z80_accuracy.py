#!/usr/bin/env python3
"""Check the Z80 accuracy check's own halves: the manifest, the fetch, and the verdicts.

No emulator and no network: `kit/spectrum/z80_accuracy.py` runs a Spectrum, downloads
two projects and reads a screen over ZRCP, and this tests everything in it that does not
need any of the three. The verdict parsers are run on text the programs really printed
(copied from runs on ZEsarUX 13.0: z80full's own words on 4 October 2026, zexall's on
10 October 2026), the read loop on a script of screens that catch the program's last
line half-written, the unpacking of the z80test release on a zip built here in the
release's own shape, and the manifest on the facts it exists to record: where each
program comes from and under which licence.

    python3 kit/spectrum/test_z80_accuracy.py

Every check below is a plain assert; the script exits non-zero on the first that fails.
"""
import os
import shutil
import sys
import tempfile
import unittest
import zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import z80_accuracy as za    # noqa: E402

# What z80full put on screen, in its own words: the header, a failure with its CRC line,
# a pass, and the last line it prints. The blank lines are made up; these are not.
Z80FULL_TAIL = [
    "001 SCF",
    "001 SCF                   FAILED",
    "CRC:45FC79B5   Expected:D841BD8A",
    "002 CCF                   FAILED",
    "CRC:A206B5E3   Expected:3FBB71DC",
    "003 SCF (NEC)                 OK",
    "100 INIR                  FAILED",
    "Result: 020 of 160 tests failed.",
]

# What zexall put on screen, as the polls first saw it (ZEsarUX 13.0, 10 October 2026):
# `OK` straight after the dots, a failing instruction's name with its CRC line under it,
# and one line torn by a poll made while the ROM scrolled, which is not an instruction.
ZEXALL_TAIL = [
    "Z80all instruction exerciser",
    "<adc,sbc> hl,<bc,de,hl,sp>....OK",
    "bit n,(<ix,iy>+1).............OK",
    "bit n,<b,c,d,e,h,l,(hl),a>....",
    "CRC:358af672 expected:f554d742",
    "ld (nnnn),....................OK",
    "ldi<r> (1)....................OK",
    "ldi<r> (2)....................  ",
    "CRC:5c83e48a expected:44fc622a  ",
    "neg...........................OK",
    "Tests complete",
]


class Verdicts(unittest.TestCase):
    def test_z80test_passing_run(self):
        verdict, summary, named = za.z80test_verdict(
            ["Z80 full test      C 2012 RAXOFT", "000 SELF TEST                 OK",
             "Result: all tests passed."])
        self.assertEqual(verdict, "PASS")
        self.assertEqual(summary, "Result: all tests passed.")
        self.assertEqual(named, [])

    def test_z80test_failing_run_names_what_failed(self):
        verdict, summary, named = za.z80test_verdict(Z80FULL_TAIL)
        self.assertEqual(verdict, "FAIL")
        self.assertIn("20 of 160 tests failed", summary)     # the program's own count
        self.assertEqual(named, ["001 SCF                   FAILED",
                                 "CRC:45FC79B5   Expected:D841BD8A",
                                 "002 CCF                   FAILED",
                                 "CRC:A206B5E3   Expected:3FBB71DC",
                                 "100 INIR                  FAILED"])

    def test_z80test_says_so_when_the_screen_lost_a_failure(self):
        # the screen holds 24 lines and the program prints more, so the lines the polls
        # caught can be fewer than the count the program reported: both are told
        verdict, summary, named = za.z80test_verdict(
            ["001 SCF                   FAILED", "002 CCF                   FAILED",
             "Result: 020 of 160 tests failed."])
        self.assertEqual(verdict, "FAIL")
        self.assertIn("20 of 160 tests failed", summary)
        self.assertIn("kept 2 of the failing lines", summary)
        self.assertEqual(len(named), 2)

    def test_z80test_without_its_last_line_is_unknown(self):
        verdict, summary, named = za.z80test_verdict(["000 SELF TEST                 OK", "001 SCF"])
        self.assertEqual(verdict, "UNKNOWN")
        self.assertIn("did not print its last line", summary)
        self.assertEqual(named, [])

    def test_zexdoc_passing_run(self):
        verdict, summary, named = za.zex_verdict(
            ["Z80doc instruction exerciser", "<adc,sbc> hl,<bc,de,hl,sp>....",
             "<adc,sbc> hl,<bc,de,hl,sp>....OK", "ld (<bc,de>),a................OK",
             "Tests complete"])
        self.assertEqual(verdict, "PASS")
        self.assertEqual(named, [])
        self.assertEqual(summary, "Tests complete, and no instruction printed a CRC line")

    def test_zexall_failing_run_names_each_instruction(self):
        # the instruction is the line before its CRC line; the torn line ending OK is not
        # counted as anything
        verdict, summary, named = za.zex_verdict(ZEXALL_TAIL)
        self.assertEqual(verdict, "FAIL")
        self.assertEqual(summary, "2 instructions printed a CRC line: "
                                  "bit n,<b,c,d,e,h,l,(hl),a>, ldi<r> (2)")
        self.assertEqual(named, ["bit n,<b,c,d,e,h,l,(hl),a>....",
                                 "CRC:358af672 expected:f554d742",
                                 "ldi<r> (2)....................  ",
                                 "CRC:5c83e48a expected:44fc622a  "])

    def test_zexall_crc_line_whose_name_the_polls_missed(self):
        # an instruction fast enough to fail before a poll saw its name: the CRC line
        # still fails the run, and the summary says the name is missing, not a neighbour's
        verdict, summary, named = za.zex_verdict(
            ["bit n,(<ix,iy>+1).............OK", "CRC:358af672 expected:f554d742",
             "Tests complete"])
        self.assertEqual(verdict, "FAIL")
        self.assertIn("1 instructions printed a CRC line: a name the polls did not catch", summary)
        self.assertEqual(named, ["CRC:358af672 expected:f554d742"])

    def test_zexall_without_its_last_line_is_unknown(self):
        # it ends in `jp stop`, so a run that has not printed `Tests complete` has not
        # finished, whatever the screen looks like
        verdict, _, _ = za.zex_verdict(ZEXALL_TAIL[:-1])
        self.assertEqual(verdict, "UNKNOWN")


class TheLastLineRace(unittest.TestCase):
    """A poll can catch the program's own last line while it is still being written.

    Measured on ZEsarUX 13.0, 5 October 2026: z80memptr's `Result: 002 of 160 tests
    failed.` (32 columns) was read at its first 24 columns, and because the loop stopped
    the moment the words `Result:` appeared, the run was reported UNKNOWN for a line the
    program had printed. The loop reads `read()` on its own, so it is driven here through
    a script of screens and needs no emulator.
    """

    def _screen(self, result_line):
        return "\n".join(["159 IM N                      OK", "", result_line, "", ""])

    def _run(self, screens, timeout=30):
        """Drive watch() through `screens`, repeating the last one; no emulator, no network."""
        calls = {"n": 0}

        def read():
            calls["n"] += 1
            self.assertLess(calls["n"], 50, "watch kept polling and never stopped")
            return screens[min(calls["n"] - 1, len(screens) - 1)]

        return za.watch(read, "z80test", timeout=timeout)

    def test_a_last_line_caught_at_24_columns_is_not_the_end_of_the_run(self):
        # the line is 32 columns; an early poll sees only its first 24 and must not stop
        partial = self._screen("Result: 002 of 160 tests")
        whole = self._screen("Result: 002 of 160 tests failed.")
        seen, _, _, ended, _ = self._run([partial, partial, whole])
        self.assertTrue(ended)
        verdict, summary, _ = za.z80test_verdict(seen)
        self.assertEqual(verdict, "FAIL")
        self.assertIn("2 of 160 tests failed", summary)

    def test_a_last_line_that_arrives_in_pieces_is_believed_only_whole(self):
        screens = [self._screen("Result: 002 of 160 te"),
                   self._screen("Result: 002 of 160 tests fail"),
                   self._screen("Result: 002 of 160 tests failed.")]
        seen, _, _, ended, _ = self._run(screens)
        self.assertTrue(ended)
        self.assertEqual(za.z80test_verdict(seen)[0], "FAIL")

    def test_a_run_that_never_prints_its_last_line_times_out(self):
        # a line that stays a fragment for the whole read is what UNKNOWN is for
        fragment = self._screen("Result: 002 of 160 tests")
        seen, _, _, ended, _ = self._run([fragment], timeout=0.05)
        self.assertFalse(ended)
        self.assertEqual(za.z80test_verdict(seen)[0], "UNKNOWN")


class Manifest(unittest.TestCase):
    def test_every_program_says_where_it_comes_from_and_under_which_licence(self):
        self.assertEqual([p["name"] for p in za.PROGRAMS],
                         ["z80full", "z80doc", "z80flags", "z80memptr", "z80ccf", "zexdoc", "zexall"])
        for program in za.PROGRAMS:
            with self.subTest(program=program["name"]):
                source = za.SOURCES[program["source"]]
                self.assertTrue(source["url"].startswith("http"), source["url"])
                self.assertTrue(source["licence"], program["source"])
                self.assertEqual(program["tap"], program["name"] + ".tap")
                self.assertIn(program["kind"], za.VERDICTS)

    def test_the_fuse_core_tests_are_reported_and_not_run(self):
        self.assertFalse(za.FUSE["runnable"])
        self.assertIn("not the machine under test", za.FUSE["why"])
        self.assertNotIn(za.FUSE["name"], [p["name"] for p in za.PROGRAMS])

    def test_the_scroll_key_is_not_a_break_key(self):
        """The matrix is 8 rows then the joystick, 0 = pressed, and the ROM's `scroll?`
        wait is answered with ENTER. SPACE (row 7) with CAPS SHIFT (row 0) or without it
        broke the program's BASIC loader when it was tried ("D BREAK - CONT repeats"),
        so both of those rows must be released in whatever key this is."""
        rows = [za.SCROLL_KEY[i:i + 2] for i in range(0, 16, 2)]
        self.assertEqual(len(za.SCROLL_KEY), 18)         # 9 bytes
        self.assertEqual(rows[0], "ff")                  # CAPS SHIFT up
        self.assertEqual(rows[7], "ff")                  # SPACE up
        self.assertNotEqual(rows[6], "ff")               # and something is pressed

    def test_nothing_is_written_outside_tools(self):
        self.assertTrue(za.tap_path({"tap": "z80full.tap"}).startswith(za.TOOLS + os.sep))
        with self.assertRaises(ValueError):
            za.under_tools("..", "z80-accuracy")


class Fetching(unittest.TestCase):
    """The unpack half of the fetch, on a zip in the release's own shape."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="z80-accuracy-test")
        self.zip = os.path.join(self.tmp, "z80test-1.2a.zip")
        with zipfile.ZipFile(self.zip, "w") as z:
            for name in ("z80full", "z80doc", "z80docflags", "z80ccfscr"):
                z.writestr(f"z80test-1.2a/{name}.tap", f"{name} in a tape".encode())
        self.dest = os.path.join(self.tmp, "z80-accuracy")

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_the_taps_come_out_of_the_release_at_the_root_the_manifest_names(self):
        za.unpack_zip(self.zip, ["z80full.tap", "z80doc.tap"], self.dest)
        self.assertEqual(sorted(os.listdir(self.dest)), ["z80doc.tap", "z80full.tap"])
        with open(os.path.join(self.dest, "z80doc.tap"), "rb") as fh:
            self.assertEqual(fh.read(), b"z80doc in a tape")

    def test_a_member_that_is_not_in_the_release_is_a_failure_and_not_an_empty_file(self):
        with self.assertRaises(Exception):
            za.unpack_zip(self.zip, ["z80memptr.tap"], self.dest)
        self.assertEqual(os.listdir(self.dest) if os.path.isdir(self.dest) else [], [])

    def test_the_two_sources_ask_for_different_things(self):
        self.assertTrue(za.SOURCES["z80test"]["archive"])          # one zip, five taps
        self.assertFalse(za.SOURCES["zex"]["archive"])             # one .tap each
        inner = za.SOURCES["z80test"]["inner"] % "z80full"
        self.assertEqual(inner, "z80test-1.2a/z80full.tap")


if __name__ == "__main__":
    unittest.main()
