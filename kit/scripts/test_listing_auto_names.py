#!/usr/bin/env python3
"""A block that carries a line comment is listed in the Source tab's index as a routine, under
its name, so listing.py names the ones that keep the disassembler's own (Squirm, 48 of them).
A name on an instruction's operand byte, which the code changes as it runs, is not a routine,
so the note leaves it out (Licence to Kill, 462 of them, #983)."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

KIT = Path(__file__).resolve().parents[1]


def build(name, kind, operand=None):
    """A routine at $8000 with a block at $8002 that carries a line comment, named `name`, and
    with `operand`, an automatic name and a line comment on the operand byte at $8001."""
    extra = ([{'address': 0x8001, 'name': operand, 'kind': 'auto', 'type': 'UserDefined'}]
             if operand else [])
    said = [{'address': 0x8001, 'type': 'line', 'text': 'The count, changed by the code.'}] if operand else []
    with tempfile.TemporaryDirectory() as d:
        p = Path(d)
        (p / 'game.json').write_text(json.dumps({'platform': 'c64', 'slug': 'fixture'}))
        (p / 'symbols.json').write_text(json.dumps({
            'schema': 1, 'platform': 'c64', 'game': 'fixture',
            'blocks': [{'start': 0x8000, 'end': 0x8005, 'type': 'Code'}],
            'symbols': [{'address': 0x8000, 'name': 'entry', 'kind': 'user', 'type': 'Subroutine'},
                        {'address': 0x8002, 'name': name, 'kind': kind, 'type': 'Branch'}] + extra,
            'comments': [{'address': 0x8000, 'type': 'line', 'text': 'The entry.'},
                         {'address': 0x8002, 'type': 'line', 'text': 'The loop.'}] + said}))
        ram = bytearray(65536)
        ram[1] = 0x35
        ram[0x8000:0x8006] = bytes([0xA2, 0x05, 0xCA, 0xD0, 0xFD, 0x60])   # LDX #5; DEX; BNE; RTS
        image = p / 'capture.vsf'
        magic = b'VICE Snapshot File'         # kit/c64/snapshot.py refuses a file without it
        image.write_bytes(magic + bytes(209 - len(magic)) + ram)
        return subprocess.run([sys.executable, KIT / 'scripts' / 'listing.py', p, image],
                              check=True, capture_output=True, text=True).stdout


class AutoNames(unittest.TestCase):
    def test_an_automatic_name_is_named(self):
        out = build('b_8002', 'auto')
        line = next((ln for ln in out.splitlines() if "disassembler's own name" in ln), '')
        self.assertIn('1 routine(s)', line, out)
        self.assertIn('b_8002', line, out)

    def test_a_given_name_is_not(self):
        self.assertNotIn("disassembler's own name", build('count_down', 'user'))

    def test_an_operand_byte_is_not(self):
        out = build('b_8002', 'auto', operand='a_8001')
        line = next((ln for ln in out.splitlines() if "disassembler's own name" in ln), '')
        self.assertIn('1 routine(s)', line, out)
        self.assertNotIn('a_8001', line, out)
        self.assertNotIn("disassembler's own name", build('count_down', 'user', operand='a_8001'))


if __name__ == '__main__':
    unittest.main()
