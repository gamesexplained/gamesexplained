"""A sprite slot's note, which names its 64th byte, must not explain the data after the slot."""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'kit/scripts'))
import coverage
import ledger

TAIL = re.compile(r"64th byte(?: of sprite slot \$[0-9A-F]{2})?, \$[0-9A-F]{2}, is not part of the picture")
count = 0
for part in (Path(__file__).parent / 'parts').iterdir():
    if not (part / 'symbols.json').exists():
        continue
    blocks, symbols, comments, regions = coverage.load(str(part), False)
    measured = ledger.compute(blocks, symbols, comments, regions)
    for comment in comments:
        if comment['type'] != 'line' or not TAIL.search(comment['text']):
            continue
        address = comment['address']
        if address not in measured['stops']:
            continue     # a slot whose bytes the coverage leaves out
        end = measured['stops'][address][1]
        if comment['text'].startswith('The 64th byte of sprite slot'):
            assert end == address + 1, (part.name, hex(address), hex(end))
        else:
            assert end <= address + 64, (part.name, hex(address), hex(end))
        count += 1
assert count > 1000, count
print(f'OK - {count} sprite slot descriptions stop at the end of their slot')
