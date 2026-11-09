#!/usr/bin/env python3
"""Check the four relocated entity handlers against their source listing."""
import json
from pathlib import Path

parts = Path(__file__).parent / 'parts'
def records(part):
    return {r['a']: r for r in json.loads((parts / part / 'listing.json').read_text())['records']}

source = records('stage-16')
start, end = 0x8f13, 0x90f1
instructions = [r for a, r in sorted(source.items()) if start <= a <= end and r.get('t') == 'code']
assert len(instructions) == 205
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
    table = copy[0x90f2 + delta]['b']
    assert table[:8] == [0, 0, 2, 2, 4, 4, 2, 2], (part, table)
print('OK - four entity handler copies match all 205 relocated instructions and animation offsets')
