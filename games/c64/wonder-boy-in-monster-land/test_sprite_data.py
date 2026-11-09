#!/usr/bin/env python3
"""Check the observed sprite viewer against the second-load listing."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
html = (ROOT / 'graphics.html').read_text()
match = re.search(r'<script id="sprite-data" type="application/json">(.*?)</script>', html, re.S)
assert match, 'sprite data is present'
data = json.loads(match.group(1))
listing = json.loads((ROOT / 'parts/stage-02/listing.json').read_text())
memory = {}
for record in listing['records']:
    for offset, byte in enumerate(record.get('b', [])):
        memory[record['a'] + offset] = byte
assert [frame['slot'] for frame in data['frames']] == [0xC7, 0xC9]
for frame in data['frames']:
    address = 0xC000 + frame['slot'] * 64
    assert frame['hires'] == [memory[address + i] for i in range(63)]
    assert frame['multicolour'] == [memory[address + 64 + i] for i in range(63)]
assert (data['hiresColour'], data['spriteColour'], data['shared1'], data['shared2'], data['videoFrames']) == (0, 1, 2, 5, 6)
print('OK - observed sprite layers match the second-load listing')
