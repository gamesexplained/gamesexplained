#!/usr/bin/env python3
"""Import a contributor's Ghidra text export into symbols.json.

Usage: import_ghidra.py GAME LISTING [--space NAME] [--verify-ram RAW]

The default address space is the physical image. Select game overlays explicitly;
machine-ROM overlays are refused. Unknown bytes remain gaps. Build listing.json
separately with kit/scripts/listing.py and the captured snapshot.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from ledger import compute
from listing import OPS, LEN, io_meaning
from symbols_export import regions

ROW = re.compile(r'^(?:(\w+)::)?([0-9a-f]{4})\s+([0-9a-f]+|\?\?)\s+(\S+)(.*)$')
LABEL = re.compile(r'^([A-Za-z_][\w:]*)\s*:\s*(?:;.*)?$')


def parse(path, space=''):
    rows, names, prose = [], [], []
    occupied = set()
    for line in Path(path).read_text().splitlines():
        m = ROW.match(line)
        if m:
            namespace, address, raw, op, operand = m.groups()
            address = int(address, 16)
            if (namespace or '') != space or raw == '??':
                names, prose = [], []
                continue
            data = bytes.fromhex(raw)
            addresses = set(range(address, address + len(data)))
            if not data or max(addresses) > 65535 or occupied & addresses:
                raise ValueError(f'Overlapping or invalid bytes at ${address:04X}')
            occupied |= addresses
            code = (data[0] in OPS and OPS[data[0]][0].upper() == op.upper()
                    and LEN[OPS[data[0]][1]] == len(data))
            typ = 'Code' if code else 'Word' if op == 'word' else 'Byte'
            text = '\n'.join(prose).strip()
            if ';' in operand:
                operand, side = operand.split(';', 1)
            else:
                side = ''
            rows.append({'a': address, 'b': list(data), 'type': typ, 'm': op.lower(),
                         'o': operand.strip(), 'names': list(dict.fromkeys(n.replace('::', '_') for n in names)),
                         'c': text, 's': side.strip()})
            names, prose = [], []
        elif LABEL.match(line):
            names.append(LABEL.match(line)[1])
        elif line.startswith('                ;'):
            text = line.split(';', 1)[1].strip()
            if text and not text.startswith(('XREF', '*', '=')):
                prose.append(text)
    if not rows:
        raise ValueError('No initialized rows in the selected address space')
    return sorted(rows, key=lambda r: r['a'])


def convert(rows, game, source):
    chips = io_meaning(game)
    calls = {r['b'][1] + 256 * r['b'][2] for r in rows
             if r['type'] == 'Code' and r['b'][0] == 0x20}
    blocks, symbols, comments = [], [], []
    for r in rows:
        a, typ, end = r['a'], r['type'], r['a'] + len(r['b']) - 1
        if blocks and blocks[-1]['end'] + 1 == a and blocks[-1]['type'] == typ:
            blocks[-1]['end'] = end
        else:
            blocks.append({'start': a, 'end': end, 'type': typ})
        if r['c']:
            comments.append({'address': a, 'type': 'line', 'text': r['c']})
        if r['s']:
            comments.append({'address': a, 'type': 'side', 'text': r['s']})
        if r['names'] or r['c']:
            symbols.append({'address': a, 'name': r['names'][0] if r['names'] else f'annotation_{a:04x}',
                            'kind': 'user', 'type': 'Subroutine' if typ == 'Code' and a in calls else
                            'UserDefined' if typ != 'Code' or r['c'] else 'BranchTarget'})
    sym = {'schema': 1, 'platform': game['platform'], 'game': game['slug'], 'build': game['build'],
           'source': source, 'regions': regions(game), 'blocks': blocks, 'symbols': symbols, 'comments': comments}
    encoded = json.dumps(sym, indent=1) + '\n'
    names = {s['address']: s['name'] for s in symbols}
    records, references = [], {}
    end = 0
    for r in rows:
        a, data = r['a'], r['b']
        if a > end:
            records.append({'a': end, 't': 'gap', 'n': a - end})
        # Long arrays are split for the Source UI; their labels/comments stay at the entry.
        width = len(data) if r['type'] == 'Code' else 16
        for off in range(0, len(data), width):
            bs = data[off:off + width]
            record = {'a': a + off, 't': 'code' if r['type'] == 'Code' else 'byte', 'b': bs}
            if not off:
                if a in names:
                    record['l'] = names[a]
                if r['c']:
                    record['c'] = r['c']
                side = r['s']
                if len(r['names']) > 1:
                    side += ('; ' if side else '') + 'Source aliases: ' + ', '.join(r['names'][1:])
                if side:
                    record['s'] = side
            if r['type'] == 'Code':
                record['m'] = r['m']
                record['o'] = r['o']
                mode = OPS[bs[0]][1]
                target = None
                if mode == 'rel':
                    target = (a + 2 + (bs[1] if bs[1] < 128 else bs[1] - 256)) & 65535
                elif mode in ('zp', 'zpx', 'zpy', 'izx', 'izy'):
                    target = bs[1]
                elif mode in ('abs', 'abx', 'aby', 'ind'):
                    target = bs[1] + 256 * bs[2]
                # A source-qualified ROM or I/O target is a different occupant.
                external = any(x in r['o'].upper() for x in ('KERNAL_', 'KERNAL::', 'BASIC_ROM', 'CHAR_ROM', 'IO::', 'IO_VISIBLE::', 'IO_AND_ROM:'))
                goes = mode == 'rel' or (r['m'] in ('jsr', 'jmp') and mode == 'abs')
                if target is not None and not external and (goes or not chips(target, a)):
                    record['oa'] = target
                    references.setdefault(target, []).append(a)
            records.append(record)
        end = a + len(data)
    if end < 65536:
        records.append({'a': end, 't': 'gap', 'n': 65536 - end})
    for r in records:
        if r['a'] in references:
            r['x'] = references[r['a']]
    ledger = compute(blocks, symbols, comments, sym['regions'])
    spans = {}
    for _, start in ledger['owner'].values():
        spans[start] = spans.get(start, 0) + 1
    index = [{'a': s['address'], 'n': s['name'],
              'k': 'routine' if ledger['code'][s['address']] and s['type'] in ('UserDefined', 'Subroutine') else
                   'branch' if ledger['code'][s['address']] else 'table',
              'len': spans.get(s['address'], 1), 'c': s['address'] in ledger['commented']} for s in symbols]
    listing = {'schema': 1, 'platform': game['platform'], 'game': game['slug'], 'title': game['title'],
               'build': game['build'], 'symbols_sha256': hashlib.sha256(encoded.encode()).hexdigest(),
               'index': index, 'records': records}
    return encoded, listing


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('game', type=Path)
    p.add_argument('listing', type=Path)
    p.add_argument('--space', default='')
    p.add_argument('--verify-ram', type=Path)
    args = p.parse_args()
    if 'ROM' in args.space.upper():
        p.error('Whole machine-ROM overlays are never published')
    rows = parse(args.listing, args.space)
    if args.verify_ram:
        ram = args.verify_ram.read_bytes()
        if len(ram) != 65536:
            p.error('--verify-ram requires exactly 65536 bytes')
        for r in rows:
            if bytes(r['b']) != ram[r['a']:r['a'] + len(r['b'])]:
                p.error(f'RAM mismatch at ${r["a"]:04X}')
    game = json.loads((args.game / 'game.json').read_text())
    source = 'Contributor Ghidra export: ' + args.listing.name
    if args.space:
        source += ', space ' + args.space
    encoded, listing = convert(rows, game, source)
    (args.game / 'symbols.json').write_text(encoded)
    print(f'Imported {sum(len(r["b"]) for r in rows)} initialized bytes, '
          f'{sum(r["type"] == "Code" for r in rows)} instructions, '
          f'{len(listing["index"])} symbols into symbols.json; '
          'build listing.json from the captured snapshot with kit/scripts/listing.py')


if __name__ == '__main__':
    main()
