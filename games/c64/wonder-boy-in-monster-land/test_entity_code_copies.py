#!/usr/bin/env python3
"""Check the four relocated entity handlers against their source listing."""
import json
from pathlib import Path

parts = Path(__file__).parent / 'parts'
def records(part):
    return {r['a']: r for r in json.loads((parts / part / 'listing.json').read_text())['records']}

source = records('stage-16')
start, end = 0x8f13, 0x90f1
instructions = [r for a, r in sorted(source.items()) if (0x8ef0 <= a <= 0x8f04 or start <= a <= end) and r.get('t') == 'code']
assert len(instructions) == 212
for part, destination in [('stage-03', 0x99af), ('stage-14', 0xa3bf),
                          ('stage-24', 0x9a12), ('stage-26', 0xa982)]:
    copy = records(part)
    delta = destination - start
    for original in instructions:
        address = original['a'] + delta
        other = copy[address]
        assert other.get('t') == 'code', (part, hex(address))
        expected = original['b'][:]
        if len(expected) == 3:
            operand = expected[1] | expected[2] << 8
            if 0x8ef0 <= operand <= 0x90f9:
                relocated = operand + delta
                expected[1:] = [relocated & 255, relocated >> 8]
        assert other['b'] == expected, (part, hex(address), original['b'], other['b'], expected)
    low = copy[0x8f05 + delta]['b']
    high = copy[0x8f0c + delta]['b']
    assert len(low) == len(high) == 7, part
    targets = [0x8f13, 0x8f4b, 0x8f7c, 0x8faa, 0x9023, 0x904e, 0x907e]
    assert [lo | hi << 8 for lo, hi in zip(low, high)] == [x + delta for x in targets], part
    table = copy[0x90f2 + delta]['b']
    assert table[:8] == [0, 0, 2, 2, 4, 4, 2, 2], (part, table)
print('OK - four entity handler copies match all 212 relocated instructions, dispatch targets and animation offsets')
