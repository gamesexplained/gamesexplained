#!/usr/bin/env python3
"""Import a custom Ghidra CompleteListingWriter export into symbols.json.

Usage: import_ghidra.py GAME LISTING [--space NAME] [--verify-ram RAW]

Accepted producer: ghidra-mcp-next's legacy export_full_listing format,
reproduced by ghidra_export/ExportGhidraListing.java on Ghidra 12.1.4.
The pinned source, settings and generated fixture are in ghidra_export/README.md.
Stock Ghidra ASCII exports are unsupported. Labels must be flush-left on their
own lines; comments/XREFs use sixteen-space indentation and bytes are contiguous.

The default address space is the physical image. Select game overlays explicitly;
machine-ROM overlays are refused. Uninitialized bytes remain gaps. Build listing.json
separately with kit/scripts/listing.py and the captured snapshot.
"""
import argparse
import json
from pathlib import Path
import re
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from listing import OPS, LEN
from symbols_export import regions

ROW = re.compile(r'^(?:(\w+)::)?([0-9a-f]{4})\s+([0-9a-f]+|\?\?)\s+(\S+)(.*)$')
LABEL = re.compile(r'^([A-Za-z_][\w:]*)\s*:\s*(?:;.*)?$')


def parse(path, space=''):
    rows, names, prose, fields = [], [], [], []
    occupied = set()
    header, last = False, None
    dropped_names = dropped_comments = 0
    for line in Path(path).read_text().splitlines():
        m = ROW.match(line)
        if m:
            namespace, address, raw, op, operand = m.groups()
            address = int(address, 16)
            if (namespace or '') == space and raw == '??':
                dropped_names += len(names) + len(fields)
                dropped_comments += bool(prose) or ';' in operand
            if (namespace or '') != space or raw == '??':
                names, prose, fields = [], [], []
                header, last = False, None
                continue
            data = bytes.fromhex(raw)
            addresses = set(range(address, address + len(data)))
            if not data or max(addresses) > 65535 or occupied & addresses:
                raise ValueError(f'Overlapping or invalid bytes at ${address:04X}')
            occupied |= addresses
            code = (data[0] in OPS and OPS[data[0]][0].upper() == op.upper()
                    and LEN[OPS[data[0]][1]] == len(data))
            typ = 'Code' if code else 'Word' if op == 'word' else 'Undefined' if op == '??' else 'Byte'
            text = '\n'.join(prose).strip()
            if ';' in operand:
                operand, side = operand.split(';', 1)
            else:
                side = ''
            rows.append({'a': address, 'b': list(data), 'type': typ, 'm': op.lower(),
                         'o': operand.strip(), 'names': list(dict.fromkeys(n.replace('::', '_') for n in names)),
                         'c': text, 's': side.strip(), 'fields': list(fields)})
            names, prose, fields = [], [], []
            header, last = False, rows[-1]
        elif LABEL.match(line):
            offcut = re.search(r';\s*offcut at ([0-9a-f]{4})', line)
            if offcut:
                fields.append({'address': int(offcut[1], 16), 'name': LABEL.match(line)[1].replace('::', '_')})
            else:
                names.append(LABEL.match(line)[1])
        elif line.startswith('                ;'):
            text = line.split(';', 1)[1].strip()
            if text.startswith(('*', '=')):
                header = True
            elif text and not text.startswith('XREF'):
                if last is not None and not header and not names and not fields:
                    last['c'] = '\n'.join(filter(None, (last['c'], text)))
                else:
                    prose.append(text)
    if dropped_names or dropped_comments:
        print(f'Warning: uninitialized rows omitted {dropped_names} labels and '
              f'{dropped_comments} comments; preserve those annotations separately.', file=sys.stderr)
    if not rows:
        raise ValueError('No initialized rows in the selected address space')
    return sorted(rows, key=lambda r: r['a'])


def convert(rows, game, source):
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
        for field in r.get('fields', []):
            symbols.append({'address': field['address'], 'name': field['name'],
                            'kind': 'user', 'type': 'Field'})
        if r['names'] or r['c']:
            symbols.append({'address': a, 'name': r['names'][0] if r['names'] else f'annotation_{a:04x}',
                            'kind': 'user', 'type': 'Subroutine' if typ == 'Code' and a in calls else
                            'UserDefined' if typ != 'Code' or r['c'] else 'Branch'})
    sym = {'schema': 1, 'platform': game['platform'], 'game': game['slug'], 'build': game['build'],
           'source': source, 'regions': regions(game), 'blocks': blocks, 'symbols': symbols, 'comments': comments}
    return json.dumps(sym, indent=1) + '\n'


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
    encoded = convert(rows, game, source)
    (args.game / 'symbols.json').write_text(encoded)
    print(f'Imported {sum(len(r["b"]) for r in rows)} initialized bytes, '
          f'{sum(r["type"] == "Code" for r in rows)} instructions, '
          f'{len(json.loads(encoded)["symbols"])} symbols into symbols.json; '
          'build listing.json from the captured snapshot with kit/scripts/listing.py')


if __name__ == '__main__':
    main()
