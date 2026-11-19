#!/usr/bin/env python3
"""Writes reference/fire-trap-data.js: the game's own data that the pages draw and play, taken from
listing.json (the bytes the Source tab shows). test_page_data.py rebuilds it and compares.
Usage: python3 reference/build_data.py [--check]"""
import base64, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(HERE)

def image():
    mem = bytearray(65536)
    for r in json.load(open(os.path.join(GAME, 'listing.json')))['records']:
        if r.get('b'):
            mem[r['a']:r['a'] + len(r['b'])] = bytes(r['b'])
    return mem

def b64(mem, a, n):
    return base64.b64encode(bytes(mem[a:a + n])).decode()

def build():
    m = image()
    d = {
        'maps': [b64(m, a, 800) for a in (0x8E00, 0x9120, 0x9440, 0x9760)],
        'blocks': [b64(m, 0xE000, 73 * 32), b64(m, 0xE920, 73 * 32)],
        'chars': [b64(m, 0xA6E0, 2048), b64(m, 0xAEE0, 2048)],
        'colours': [m[0xC0BC + 2 * i] for i in range(4)],
        'sprites': b64(m, 0x6000, 0x2000),
        'music': b64(m, 0x8000, 0xE00),
    }
    return ('// Fire Trap data for the pages: the game\'s own bytes, from the listing (build_data.py).\n'
            'window.FT = ' + json.dumps(d, separators=(',', ':')) + ';\n'
            'if (typeof module !== "undefined") module.exports = window.FT;\n')

if __name__ == '__main__':
    out = os.path.join(HERE, 'fire-trap-data.js')
    text = build()
    if '--check' in sys.argv:
        sys.exit(0 if open(out).read() == text else 'fire-trap-data.js is out of date')
    open(out, 'w').write(text)
    print(len(text), 'bytes')
