#!/usr/bin/env python3
"""Check the recorded map dimensions against every load's listing bytes."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
for number in range(2, 32):
    part = ROOT / 'parts' / f'stage-{number:02d}'
    listing = json.loads((part / 'listing.json').read_text())
    memory = {}
    for record in listing['records']:
        for offset, byte in enumerate(record.get('b', [])):
            memory[record['a'] + offset] = byte
    def byte(address):
        assert address in memory, f'load {number}: missing ${address:04X}'
        return memory[address]
    rows, stride = byte(0x7F4C), byte(0x7F4A)
    next_data = byte(0x7F41) | byte(0x7F42) << 8
    assert 0x8671 + rows * stride == next_data, f'load {number}: map end'
    for row in range(rows):
        address = byte(0x85CF + row) | byte(0x8620 + row) << 8
        assert address == 0x8671 + row * stride, f'load {number}: row {row}'
    symbols = json.loads((part / 'symbols.json').read_text())
    row_block = next(b for b in symbols['blocks'] if b['start'] == 0x8671)
    assert row_block['end'] == 0x8671 + stride - 1, f'load {number}: first-row block'
    comment = next(c['text'] for c in symbols['comments'] if c['address'] == 0x8671 and c['type'] == 'line')
    assert f'First of {rows} map rows' in comment and f'row stride of {stride} bytes' in comment, f'load {number}: first-row comment'
print('OK - map row pointers, dimensions and descriptions agree for loads 2–31')
