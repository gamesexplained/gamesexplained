#!/usr/bin/env python3
"""Audit committed data against private Wizard inputs. No game bytes are emitted.

Usage: python3 games/c64/wizard/validation/audit_data.py [private-work-directory]
Requires entry.vsf, game.prg, bldr.prg, ml.prg, chrw.prg, sprw.prg and l00t.prg..l39t.prg.
This proves byte identity and enumerated data claims, not gameplay interpretations.
"""
import base64
import hashlib
import json
import re
import sys
from pathlib import Path

GAME = Path(__file__).resolve().parents[1]
ROOT = GAME.parents[2]
WORK = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else GAME / 'work'
sys.path.insert(0, str(ROOT / 'kit/c64'))
from opcodes import decode


def snapshot_ram(path):
    data = path.read_bytes()
    assert data[:19] == b'VICE Snapshot File\x1a', 'Not a VICE snapshot'
    offset = 58 if data[37:50] == b'VICE Version\x1a' else 37
    while offset + 22 <= len(data):
        size = int.from_bytes(data[offset + 18:offset + 22], 'little')
        assert size >= 22 and offset + size <= len(data), 'Malformed snapshot module'
        if data[offset:offset + 16].rstrip(b'\0') == b'C64MEM':
            assert size >= 22 + 4 + 65536
            return data[offset + 26:offset + 26 + 65536]
        offset += size
    raise AssertionError('Missing C64MEM module')


def inline(source, name):
    match = re.search(r'\bconst ' + re.escape(name) + r'=(.*);$', source, re.M)
    assert match, f'Missing inline data: {name}'
    return json.loads(match[1])


def program(name):
    raw = (WORK / (name + '.prg')).read_bytes()
    return int.from_bytes(raw[:2], 'little'), raw[2:]


def packed_data(raw, start, address, count):
    """Read BLDR's literal DATA records, including their stored numeric value."""
    records = []
    for _ in range(count):
        header = raw[address - start]
        address += 1
        length = header & 63
        value = raw[address - start:address - start + length].decode('ascii')
        address += length
        if header & 192:
            assert header & 192 in (64, 128), 'Unexpected DATA number format'
            size = 1 if header & 64 else 2
            number = int.from_bytes(raw[address - start:address - start + size],
                                    'little', signed=size == 2)
            assert int(value) == number, 'DATA text and numeric payload disagree'
            value = number
            address += size
        records.append(value)
    return records, address


def main():
    ram = snapshot_ram(WORK / 'entry.vsf')
    listing = json.loads((GAME / 'listing.json').read_text())
    assert listing['symbols_sha256'] == hashlib.sha256((GAME / 'symbols.json').read_bytes()).hexdigest()
    seen = set()
    instructions = 0
    for record in listing['records']:
        if 'b' not in record:
            continue
        address, raw = record['a'], bytes(record['b'])
        assert ram[address:address + len(raw)] == raw, f'Listing bytes at ${address:04X}'
        assert not seen.intersection(range(address, address + len(raw))), 'Overlapping listing records'
        seen.update(range(address, address + len(raw)))
        if record['t'] == 'code':
            mnemonic, _, decoded = decode(ram, address)
            assert mnemonic.lower() == record['m'].lower() and bytes(decoded) == raw, f'Decode at ${address:04X}'
            instructions += 1
    expected = set()
    for low, high in [(0x0801, 0x4A89), (0x5800, 0x9F70), (0xC800, 0xD000), (0xE000, 0x10000)]:
        expected.update(range(low, high))
    assert seen == expected and len(seen) == 45560, 'Resident coverage extent'
    for name, address, length in [('game', 0x0801, 17032), ('chrw', 0xC800, 2048)]:
        start, raw = program(name)
        assert start == address and len(raw) == length and ram[address:address + len(raw)] == raw, name
    start, machine_code = program('ml')
    assert start == 0x5800 and len(machine_code) == 18288
    changed = [start + i for i, value in enumerate(machine_code) if ram[start + i] != value]
    expected_changes = [0x58FF, 0x6C07, 0x6C08, 0x6C09, 0x6C13, 0x6C14, *range(0x7000, 0x7080), 0x99F0]
    assert changed == expected_changes, 'M.L. loader mutations; see audit.md for scope'
    assert ram[0x58FF] == ram[0x99F0] == 0xFA
    start, sprites = program('sprw')
    assert start == 0x4000 and len(sprites) == 8192
    assert [i for i, value in enumerate(sprites) if ram[0xE000 + i] != value] == [0x1FFA, 0x1FFB]
    assert ram[0xFFFA:0xFFFC] == bytes([0x43, 0xFE])
    bldr_start, bldr = program('bldr')
    assert bldr_start == 0x0801 and len(bldr) == 19212
    assert bldr[0x0826-bldr_start:0x27F2-bldr_start] == ram[0x0826:0x27F2]
    index = (GAME / 'index.html').read_text()
    atlas = (GAME / 'levels.html').read_text()
    spells = inline(index, 'SPELLS')
    assert len(spells) == 12
    for number, spell in enumerate(spells):
        address = 0x8D73 + number * 13
        assert spell[0].casefold() == ram[address:address + 13].decode('ascii').strip().casefold()
    actor_names, end = packed_data(bldr, bldr_start, 0x296A, 21)
    assert end == 0x2A07
    actors = inline(index, 'ACTORS')
    assert [name.casefold() for name, _ in actors] == [name.casefold() for name in actor_names]
    defaults = inline(index, 'ACTOR_DEFAULTS')
    assert len(defaults) == 21 and defaults[0] is None
    for field, address, expected_end in [('animation', 0x2A07, 0x2A43),
                                         ('shape', 0x2A43, 0x2A98),
                                         ('color', 0x2A98, 0x2ADF)]:
        values, end = packed_data(bldr, bldr_start, address, 20)
        assert end == expected_end, f'Default {field} table extent'
        assert values == [actor[field] for actor in defaults[1:]], f'Default {field}'
    maps = inline(index, 'MAPS')
    assert maps == inline(atlas, 'MAPS') and len(maps) == 40
    for page in [index, atlas]:
        assert base64.b64decode(inline(page, 'FONT')) == ram[0xC800:0xD000]
    active = []
    actor_slots = 0
    for number, level in enumerate(maps):
        start, raw = program(f'l{number:02}t')
        assert start == 0xC300 and len(raw) == 1136
        assert level['n'] == number
        assert level['map'][:840] == list(raw[0x100:0x448]), f'Terrain {number}'
        assert level['start'] == [raw[30] + (256 if raw[0x52] & 128 else 0), raw[31]]
        assert level['charges'] == raw[29] - 48 and level['timer'] == raw[0x50]
        assert level['spell'] == spells[raw[28]][0]
        assert raw[0x6F] == 3, f'Saved collision-exempt color {number}'
        assert len(level['actors']) == 6, f'Actor slot count {number}'
        for slot, actor in enumerate(level['actors']):
            actor_slots += 1
            for field, offset in [('type', 0x70), ('color', 0x10), ('shape', 0x60), ('animation', 0x68)]:
                assert actor[field] == raw[offset + slot], f'{number}:{slot}:{field}'
            assert actor['x'] == raw[slot] + (256 if raw[0x52] & (1 << slot) else 0)
            assert actor['y'] == raw[6 + slot]
        if raw[0x76] != 0x60:
            active.append(number)
    assert len(active) == 20, 'Nontrivial callback entries'
    artwork = inline(index, 'ACTOR_SPRITES')
    assert len(artwork) == 58
    for shape, encoded in artwork.items():
        address = 0xE000 + int(shape) * 64
        assert base64.b64decode(encoded) == ram[address:address + 63], f'Sprite {shape}'
    inverse = sum(all(ram[0xC800 + i*8 + j] ^ ram[0xCC00 + i*8 + j] == 255 for j in range(8)) for i in range(128))
    assert inverse == 101
    for name in ['wiki-title.png', 'wiki-level20.png']:
        assert not (GAME / 'reference' / name).exists(), 'Unused external reference would be published'
    print(json.dumps({'listing_bytes': len(seen), 'decoded_instructions': instructions,
                      'ml_changed_bytes': len(changed), 'levels': len(maps),
                      'actor_slots': actor_slots, 'nontrivial_callbacks': active,
                      'spell_names': len(spells), 'actor_names': len(actors),
                      'actor_defaults': len(defaults) - 1,
                      'sprite_shapes': len(artwork), 'inverse_glyphs': inverse, 'passed': True}, indent=2))


if __name__ == '__main__':
    main()
