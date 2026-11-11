#!/usr/bin/env python3
"""Compare every instruction and split table in the six relocated handlers."""
import json
import sys
from pathlib import Path
root = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(root / 'kit/cpu'))
from m6502 import decode
parts = Path(__file__).parent / 'parts'
def memory(number):
    records = json.loads((parts / f'stage-{number:02d}' / 'listing.json').read_text())['records']
    ram = bytearray(65536)
    code = set()
    for row in records:
        if row.get('b'):
            ram[row['a']:row['a'] + len(row['b'])] = bytes(row['b'])
        if row.get('t') == 'code':
            code.add(row['a'])
    return ram, code
source, source_code = memory(5)
origin = 0x9424
segments = [(0x9424, 0x9435), (0x943e, 0x9476), (0x9477, 0x956e),
            (0x956f, 0x95b3), (0x95b4, 0x95ea)]
for number, dispatch in [(7, 0x9a7f), (13, 0x9541), (21, 0x952e), (22, 0xa094), (24, 0x9bfb)]:
    target, target_code = memory(number)
    delta = dispatch - origin
    count = 0
    for start, end in segments:
        pc = start
        while pc <= end:
            instruction = decode(source, pc)
            assert instruction is not None and pc in source_code and pc + delta in target_code, (number, hex(pc))
            _, _, length = instruction
            expected = bytearray(source[pc:pc + length])
            if length == 3:
                operand = expected[1] | expected[2] << 8
                if origin <= operand <= 0x95ea:
                    operand += delta
                    expected[1:] = bytes([operand & 255, operand >> 8])
            assert expected == target[pc + delta:pc + delta + length], (number, hex(pc))
            pc += length
            count += 1
        assert pc == end + 1, (number, hex(pc))
    assert count == 191, (number, count)
    for index in range(4):
        expected = (source[0x9436 + index] | source[0x943a + index] << 8) + delta
        actual = target[dispatch + 18 + index] | target[dispatch + 22 + index] << 8
        assert actual == expected, (number, index)
print('OK - 191 instructions and four targets match in each of five relocated copies')
