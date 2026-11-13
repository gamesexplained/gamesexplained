#!/usr/bin/env python3
"""Adjacent split-address tables must keep their targets after a native save."""
import json
import tempfile
from pathlib import Path
from project import project, read_file


def main():
    tables = [[0x2040, 0x3151], [0x4262, 0x5373],
              [0x6484, 0x7595, 0x86A6, 0x97B7]]
    ram = bytearray(65536)
    blocks = []
    cursor = 0x1000
    for targets in tables:
        encoded = bytes(a & 255 for a in targets) + bytes(a >> 8 for a in targets)
        ram[cursor:cursor + len(encoded)] = encoded
        blocks.append({'start': cursor, 'end': cursor + len(encoded) - 1,
                       'type': 'Lo/Hi Address'})
        cursor += len(encoded)
    body = project({'blocks': blocks, 'symbols': [], 'comments': []}, ram)
    assert body['splitters'] == [0x1004, 0x1008], body['splitters']

    # A native save stores one physical block plus its logical splitters.
    body['blocks'] = [{'start': 0x1000, 'end': 0x100F,
                       'type_': 'LoHiAddress', 'collapsed': False}]
    with tempfile.TemporaryDirectory() as folder:
        path = Path(folder) / 'native.regen2000proj'
        path.write_text(json.dumps(body))
        restored, _, _ = read_file(path)
    assert restored == blocks, restored
    decoded = []
    for b in restored:
        half = (b['end'] - b['start'] + 1) // 2
        decoded.append([ram[b['start'] + i] + 256 * ram[b['start'] + half + i]
                        for i in range(half)])
    assert decoded == tables, decoded
    print('OK - adjacent split-address tables retain their native-save targets')


if __name__ == '__main__':
    main()
