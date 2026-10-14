#!/usr/bin/env python3
"""A listing built from the hand-over snapshot itself still names the loaded data no label
reaches: it compared the snapshot only with a different hand-over, so a build from
work/entry.vsf reported nothing (Creatures, about 60 KB in its parts)."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

KIT = Path(__file__).resolve().parents[1]


def build(name):
    """A game with code at $8000 and 256 bytes of data at $9000 that no label reaches, built
    from a snapshot saved as work/<name>."""
    with tempfile.TemporaryDirectory() as d:
        p = Path(d)
        (p / 'work').mkdir()
        (p / 'game.json').write_text(json.dumps({'platform': 'c64', 'slug': 'fixture'}))
        (p / 'symbols.json').write_text(json.dumps({
            'schema': 1, 'platform': 'c64', 'game': 'fixture',
            'blocks': [{'start': 0x8000, 'end': 0x8003, 'type': 'Code'}],
            'symbols': [{'address': 0x8000, 'name': 'entry', 'kind': 'user', 'type': 'Subroutine'}],
            'comments': []}))
        ram = bytearray(65536)
        ram[1] = 0x35
        ram[0x8000:0x8004] = bytes([0xA9, 0x01, 0xEA, 0x60])
        ram[0x9000:0x9100] = bytes((i * 7 + 1) & 0xFF or 1 for i in range(256))
        image = p / 'work' / name
        magic = b'VICE Snapshot File'         # kit/c64/snapshot.py refuses a file without it
        image.write_bytes(magic + bytes(209 - len(magic)) + ram)
        return subprocess.run([sys.executable, KIT / 'scripts' / 'listing.py', p, image],
                              check=True, capture_output=True, text=True).stdout


class HandOver(unittest.TestCase):
    def test_a_build_from_the_hand_over_names_loaded_data(self):
        out = build('entry.vsf')
        self.assertIn('data the ledger does not count (hand-over snapshot):', out, out)
        line = next((ln for ln in out.splitlines() if ln.strip().startswith('$9000-$90FF')), '')
        self.assertIn('loaded with the game', line, out)

    def test_a_play_snapshot_alone_cannot_tell(self):
        self.assertNotIn('$9000-$90FF', build('play.vsf'))


if __name__ == '__main__':
    unittest.main()
