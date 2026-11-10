#!/usr/bin/env python3
"""Keep the recorded decompression bounds aligned with each part's ledger."""
import json
from pathlib import Path
root = Path(__file__).parent
report = json.loads((root / 'stream-boundaries.json').read_text())
assert report['schema'] == 1
assert [x['load'] for x in report['loads']] == list(range(2, 32))
patches = {10: 0x9feb, 14: 0x9d4e, 28: 0xa7be, 29: 0xa3cf}
for item in report['loads']:
    n = item['load']
    part = json.loads((root / 'parts' / f'stage-{n:02d}' / 'part.json').read_text())
    expected = sorted([[int(a[1:], 16), int(b[1:], 16)] for a, b in part['ranges']])
    streams = item['streams']
    assert len(streams) == 2 and sorted(s['output'] for s in streams) == expected, n
    assert streams[0]['input_start'] == 0 and streams[0]['input_end'] == streams[1]['input_start'], n
    assert item['consumed'] == streams[1]['input_end'] <= item['input_bytes'], n
    assert all(s['after_patch_differences'] == 0 for s in streams), n
    assert item['side'] == ('A' if n < 20 else 'B'), n
    assert item['decoder_path_counts']['end_markers'] == 2, n
    assert all(value >= 0 for value in item['decoder_path_counts'].values()), n
    assert item['post_load_patch'] == (n in patches), n
    if n in patches:
        assert streams[0]['before_patch_differences'] == 0, n
        assert streams[1]['before_patch_differences'] == 3, n
        assert streams[1]['difference_addresses'] == list(range(patches[n], patches[n] + 3)), n
    else:
        assert all(s['before_patch_differences'] == 0 for s in streams), n
print('OK - 30 recorded stream boundaries and four post-load patches match the part ledgers')
