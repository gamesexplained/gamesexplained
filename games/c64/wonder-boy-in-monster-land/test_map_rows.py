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
    rows, stride, width = byte(0x7F4C), byte(0x7F4A), byte(0x7F4B)
    next_data = byte(0x7F41) | byte(0x7F42) << 8
    assert 0x8671 + rows * stride == next_data, f'load {number}: map end'
    for row in range(rows):
        address = byte(0x85CF + row) | byte(0x8620 + row) << 8
        assert address == 0x8671 + row * stride, f'load {number}: row {row}'
    symbols = json.loads((part / 'symbols.json').read_text())
    for row in range(rows):
        address = 0x8671 + row * stride
        block = next(b for b in symbols['blocks'] if b['start'] == address)
        assert block['end'] == address + width - 1 and block['type'] == 'Byte', f'load {number}: row {row} block'
        if width < stride:
            tail = next(b for b in symbols['blocks'] if b['start'] == address + width)
            assert tail['end'] == address + stride - 1 and tail['type'] == 'Undefined', f'load {number}: row {row} remainder'
        comment = next(c['text'] for c in symbols['comments'] if c['address'] == address and c['type'] == 'line')
        assert f'Map row {row + 1} of {rows}: {width} metatile indices' in comment, f'load {number}: row {row} description'
        assert f'first index is ${byte(address):02X} and the last is ${byte(address + width - 1):02X}' in comment, f'load {number}: row {row} endpoints'
print('OK - map rows, dimensions, endpoint descriptions and unclassified remainders agree for loads 2–31')
