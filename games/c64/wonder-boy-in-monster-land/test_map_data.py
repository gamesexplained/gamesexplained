#!/usr/bin/env python3
"""Check the map widget's extracted data against the committed listings."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
html = (ROOT / 'levels.html').read_text()
match = re.search(r'<script id="map-data" type="application/json">(.*?)</script>', html, re.S)
assert match, 'map data is present'
maps = json.loads(match.group(1))
assert len(maps) == 31
for number, data in enumerate(maps, 1):
    records = json.loads((ROOT / 'parts' / f'stage-{number:02d}' / 'listing.json').read_text())['records']
    memory = {}
    for record in records:
        for offset, byte in enumerate(record.get('b', [])):
            memory[record['a'] + offset] = byte
    def byte(address):
        assert address in memory, f'load {number}: missing ${address:04X}'
        return memory[address]
    width, height, stride = byte(0x7F4B), byte(0x7F4C), byte(0x7F4A)
    assert (data['id'], data['width'], data['height'], data['stride']) == (number, width, height, stride)
    expected_tiles = [byte(0x8671 + row * stride + col) for row in range(height) for col in range(width)]
    assert data['tiles'] == expected_tiles, f'load {number}: map bytes'
    for tile in set(expected_tiles):
        quad = [byte(0x81CF + i * 256 + tile) for i in range(4)]
        assert data['quads'][str(tile)] == quad, f'load {number}: tile {tile}'
        for char in quad:
            source = byte(0x7F41) | byte(0x7F42) << 8
            glyph = [byte(source + char * 8 + row) for row in range(8)]
            assert data['glyphs'][str(char)] == glyph, f'load {number}: glyph {char}'
            assert data['colours'][str(char)] == byte(0x7FCF + char) & 15, f'load {number}: colour {char}'
print('OK - map cells, tile tables, glyphs and colours match all 31 listings')
