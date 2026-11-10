"""A slot's non-pixel byte must not explain the following unknown data."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'kit/scripts'))
import coverage
import ledger

count = 0
for part in (Path(__file__).parent / 'parts').iterdir():
    if not (part / 'symbols.json').exists():
        continue
    blocks, symbols, comments, regions = coverage.load(str(part), False)
    measured = ledger.compute(blocks, symbols, comments, regions)
    for comment in comments:
        if comment['type'] != 'line' or 'contributes no sprite pixels' not in comment['text']:
            continue
        address = comment['address']
        assert measured['stops'][address][1] == address + 1, (part.name, hex(address))
        count += 1
assert count > 1000, count
print(f'OK - {count} sprite slot trailing-byte descriptions each own one byte')
