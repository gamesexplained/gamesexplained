#!/usr/bin/env python3
"""A reconstructed Regenerator project must retain both user and auto labels."""
import json
import subprocess
import sys
import tempfile
from pathlib import Path
from project import project, read_file


def main():
    symbols = [
        {'address': 0x1000, 'name': 'entry', 'type': 'Subroutine', 'kind': 'user'},
        {'address': 0x1003, 'name': 'branch_target', 'type': 'Label', 'kind': 'auto'},
        {'address': 0x1003, 'name': 'named_target', 'type': 'Label', 'kind': 'user'},
    ]
    data = {'blocks': [{'start': 0x1000, 'end': 0x1004, 'type': 'Code'}],
            'symbols': symbols + [{'address': 0xd020, 'name': 'BORDER', 'type': 'Label', 'kind': 'system'}], 'comments': []}
    with tempfile.TemporaryDirectory() as folder:
        path = Path(folder) / 'rebuilt.regen2000proj'
        path.write_text(json.dumps(project(data, bytes(65536))))
        _, actual, _ = read_file(path)
    assert sorted(actual, key=lambda x: (x['address'], x['name'])) == sorted(symbols, key=lambda x: (x['address'], x['name'])), actual
    root = Path(__file__).resolve().parents[2]
    with tempfile.TemporaryDirectory() as folder:
        game = Path(folder) / 'game'
        work = game / 'work'
        work.mkdir(parents=True)
        (game / 'game.json').write_text(json.dumps({'slug': 'fixture', 'platform': 'c64'}))
        (game / 'symbols.json').write_text(json.dumps(data))
        head = b'VICE Snapshot File' + b' C64SC\0'
        snapshot = work / 'fixture.vsf'
        snapshot.write_bytes(head + bytes(209 - len(head)) + bytes(65536))
        output = work / 'fixture.regen2000proj'
        for script, args in [('symbols_import.py', [str(game), str(snapshot), str(output)]),
                             ('symbols_export.py', [str(game), '--project', str(output)])]:
            result = subprocess.run([sys.executable, str(root / 'kit' / 'scripts' / script), *args],
                                    capture_output=True, text=True)
            assert result.returncode == 0 and 'not written' not in result.stdout, result.stdout + result.stderr
        exported = json.loads((game / 'symbols.json').read_text())['symbols']
        assert any(x['address'] == 0x1003 and x['name'] == 'branch_target' and x['kind'] == 'auto'
                   for x in exported), exported
    print('OK - reconstructed project preserves user and automatic labels')


if __name__ == '__main__':
    main()
