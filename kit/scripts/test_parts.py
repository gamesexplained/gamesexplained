#!/usr/bin/env python3
"""A game of several parts: one owner for every byte, from the ledger to the listing.

The fixture is an engine with two levels loaded over it at the same addresses.
"""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

KIT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KIT / 'scripts'))
import parts as P  # noqa: E402
from coverage import tracked_count  # noqa: E402

ENGINE = {0x1000: [0x20, 0x00, 0x40,        # jsr $4000   into whichever level is loaded
                   0xAD, 0x10, 0x10,        # lda $1010
                   0x60],                   # rts
          0x1010: [0x07]}
PARK = {0x4000: [0xA9, 0x01,                # lda #1
                 0x20, 0x03, 0x10,          # jsr $1003   back into the engine
                 0x60],
        0x4010: [0x03, 0x10]}               # a pointer to the engine's routine
STREET = {0x4000: [0xA9, 0x02, 0x60]}


def run(*args, ok=True):
    r = subprocess.run([sys.executable, *map(str, args)], capture_output=True, text=True)
    if ok and r.returncode:
        raise AssertionError(f"{' '.join(map(str, args))}\n{r.stdout}{r.stderr}")
    return r


def snapshot(path, *images):
    ram = bytearray(65536)
    ram[1] = 0x35
    for image in images:
        for a, bs in image.items():
            ram[a:a + len(bs)] = bytes(bs)
    magic = b'VICE Snapshot File'
    path.write_bytes(magic + bytes(209 - len(magic)) + ram)
    return path


def sym(a, name, kind='Subroutine'):
    return {'address': a, 'name': name, 'kind': 'user', 'type': kind}


def line(a, text):
    return {'address': a, 'type': 'line', 'text': text}


def symbols(g, pid, blocks, syms, comments):
    (g / 'parts' / pid / 'symbols.json').write_text(json.dumps({
        'schema': 1, 'platform': 'c64', 'game': 'fixture', 'part': pid,
        'blocks': [{'start': a, 'end': b, 'type': t} for a, b, t in blocks], 'symbols': syms, 'comments': comments}))


def fixture(d):
    """games/c64/fixture with an engine and two levels over it, and every listing built."""
    g = Path(d) / 'fixture'
    g.mkdir()
    (g / 'game.json').write_text(json.dumps({'platform': 'c64', 'slug': 'fixture', 'title': 'Fixture'}))
    run(KIT / 'scripts' / 'parts.py', 'add', g, 'engine', '--title', 'The engine')
    for pid in ('park', 'street'):
        run(KIT / 'scripts' / 'parts.py', 'add', g, pid, '--over', 'engine')
        f = g / 'parts' / pid / 'part.json'
        f.write_text(json.dumps(dict(json.loads(f.read_text()), ranges=[['$4000', '$40FF']])))
    symbols(g, 'engine', [(0x1000, 0x1006, 'Code'), (0x1010, 0x1010, 'Byte')],
            [sym(0x1000, 'engine_main'), sym(0x1003, 'engine_get'), sym(0x1010, 'engine_var', 'AbsoluteAddress')],
            [line(0x1000, 'Calls the level, then reads the variable.'), line(0x1003, 'Reads the variable.'),
             line(0x1010, 'The variable.')])
    symbols(g, 'park', [(0x4000, 0x4005, 'Code'), (0x4010, 0x4011, 'Address')],
            [sym(0x4000, 'park_entry'), sym(0x4010, 'park_vector', 'AbsoluteAddress')],
            [line(0x4000, 'The park: loads 1 and asks the engine.'), line(0x4010, 'Where the park sends the engine.')])
    symbols(g, 'street', [(0x4000, 0x4002, 'Code')], [sym(0x4000, 'street_entry')],
            [line(0x4000, 'The street: loads 2.')])
    park = snapshot(g / 'park.vsf', ENGINE, PARK)
    street = snapshot(g / 'street.vsf', ENGINE, STREET)
    for pid, snap in (('engine', park), ('park', park), ('street', street)):
        run(KIT / 'scripts' / 'listing.py', g / 'parts' / pid, snap)
    return g


def records(g, pid):
    return json.loads((g / 'parts' / pid / 'listing.json').read_text())['records']


class Parts(unittest.TestCase):
    def test_every_byte_has_one_owner(self):
        with tempfile.TemporaryDirectory() as d:
            g = fixture(d)
            each = {p: tracked_count(str(g / 'parts' / p)) for p in ('engine', 'park', 'street')}
            self.assertEqual(each, {'engine': (8, 8), 'park': (8, 8), 'street': (3, 3)})
            self.assertEqual(tracked_count(str(g)), (19, 19))
            # a map that still holds the other part's addresses counts none of them
            symbols(g, 'engine', [(0x1000, 0x1006, 'Code'), (0x1010, 0x1010, 'Byte'), (0x4000, 0x4005, 'Code')],
                    [sym(0x1000, 'engine_main'), sym(0x1003, 'engine_get'), sym(0x1010, 'engine_var', 'AbsoluteAddress'),
                     sym(0x4000, 'level_entry')],
                    [line(0x1000, 'a'), line(0x1003, 'b'), line(0x1010, 'c'), line(0x4000, 'd')])
            symbols(g, 'park', [(0x1000, 0x1006, 'Code'), (0x4000, 0x4005, 'Code'), (0x4010, 0x4011, 'Address')],
                    [sym(0x1000, 'engine_main'), sym(0x4000, 'park_entry'), sym(0x4010, 'park_vector', 'AbsoluteAddress')],
                    [line(0x1000, 'a'), line(0x4000, 'b'), line(0x4010, 'c')])
            self.assertEqual(tracked_count(str(g)), (19, 19))

        with tempfile.TemporaryDirectory() as d:     # a part not started is in the count of parts, not of bytes
            g = fixture(d)
            run(KIT / 'scripts' / 'parts.py', 'add', g, 'sewers', '--over', 'engine')
            out = run(KIT / 'scripts' / 'coverage.py', g).stdout
            self.assertIn('not started', out)
            self.assertIn('in 3 of 4 parts', out)
            self.assertIn('OK', run(KIT / 'scripts' / 'check_listing.py', g).stdout)   # listed, with nothing known of it

    def test_a_part_lists_only_what_it_owns_and_names_what_it_calls(self):
        with tempfile.TemporaryDirectory() as d:
            g = fixture(d)
            self.assertTrue(all(0x4000 <= r['a'] <= 0x40FF for r in records(g, 'park') if r.get('b')))
            self.assertFalse(any(0x4000 <= r['a'] <= 0x40FF for r in records(g, 'engine') if r.get('b')))
            by = {r['a']: r for r in records(g, 'park')}
            self.assertEqual(by[0x4002]['o'], 'engine_get')        # an operand that points beneath
            self.assertEqual(by[0x4010]['o'], 'engine_get')        # and a pointer that does
            self.assertNotIn('l', by.get(0x1003, {}))              # but the name labels no row of this part
            self.assertIn('OK', run(KIT / 'scripts' / 'check_listing.py', g).stdout)

    def test_a_name_changed_beneath_is_a_listing_to_relabel(self):
        with tempfile.TemporaryDirectory() as d:
            g = fixture(d)
            f = g / 'parts' / 'engine' / 'symbols.json'
            f.write_text(f.read_text().replace('engine_get', 'engine_read'))
            run(KIT / 'scripts' / 'listing.py', g / 'parts' / 'engine', g / 'park.vsf')
            r = run(KIT / 'scripts' / 'check_listing.py', g, ok=False)
            self.assertEqual(r.returncode, 1)
            self.assertIn('--relabel', r.stdout)
            self.assertIn('parts/park', r.stdout)
            self.assertNotIn('parts/street:', r.stdout)            # it names nothing of the engine's
            run(KIT / 'scripts' / 'listing.py', g / 'parts' / 'park', '--relabel')
            by = {r['a']: r for r in records(g, 'park')}
            self.assertEqual((by[0x4002]['o'], by[0x4010]['o']), ('engine_read', 'engine_read'))
            self.assertIn('OK', run(KIT / 'scripts' / 'check_listing.py', g).stdout)

    def test_a_snapshot_without_the_part_beneath_is_reported(self):
        with tempfile.TemporaryDirectory() as d:
            g = fixture(d)
            other = dict(ENGINE)
            other[0x1000] = [0x20, 0x00, 0x40, 0xAD, 0x11, 0x10, 0x60]
            out = run(KIT / 'scripts' / 'listing.py', g / 'parts' / 'street', snapshot(g / 'odd.vsf', other, STREET)).stdout
            self.assertIn('1 of the 7 code bytes of engine', out)
            self.assertIn('$1004', out)
            self.assertNotIn('code bytes of engine', run(KIT / 'scripts' / 'listing.py', g / 'parts' / 'street',
                                                          g / 'street.vsf').stdout)

    def test_a_session_gives_each_part_its_share(self):
        with tempfile.TemporaryDirectory() as d:
            g = fixture(d)
            before = {p: json.loads((g / 'parts' / p / 'symbols.json').read_text()) for p in ('engine', 'park')}
            proj = g / 'park.regen2000proj'
            out = run(KIT / 'scripts' / 'symbols_import.py', g / 'parts' / 'park', g / 'park.vsf', proj).stdout
            self.assertIn('5 labelled addresses', out)             # the park's two and the engine's three
            for pid in ('park', 'engine'):                         # one session, exported once for each part
                out = run(KIT / 'scripts' / 'symbols_export.py', g / 'parts' / pid, '--project', proj).stdout
                self.assertNotIn('no other part', out)
                after = json.loads((g / 'parts' / pid / 'symbols.json').read_text())
                self.assertEqual({s['name'] for s in after['symbols'] if s['kind'] == 'user'},
                                 {s['name'] for s in before[pid]['symbols']})
                self.assertEqual(after['comments'], before[pid]['comments'])
                self.assertEqual(after['part'], pid)
            # a label the session gave an address the part does not own, and no part has: said, not dropped silently
            p = json.loads(proj.read_text())
            p['labels']['4112'] = [{'name': 'engine_other', 'label_type': 'AbsoluteAddress', 'kind': 'User'}]
            proj.write_text(json.dumps(p))
            out = run(KIT / 'scripts' / 'symbols_export.py', g / 'parts' / 'park', '--project', proj).stdout
            self.assertIn('engine_other', out)
            self.assertIn('no other part', out)

    def test_clip_cuts_a_block_at_the_edge(self):
        blocks, syms, comments, left = P.clip(
            [{'start': 0x3FF0, 'end': 0x410F, 'type': 'Byte'}],
            [sym(0x3FF0, 'low'), sym(0x4000, 'in'), dict(sym(0x4100, 'auto'), kind='auto')],
            [line(0x4001, 'x')], [[0x4000, 0x40FF, 'a level']])
        self.assertEqual([(b['start'], b['end']) for b in blocks], [(0x3FF0, 0x3FFF), (0x4100, 0x410F)])
        self.assertEqual([s['name'] for s in syms], ['low', 'auto'])
        self.assertEqual(comments, [])
        self.assertEqual([x.get('name') or x['text'] for x in left], ['in', 'x'])

    def test_a_chain_of_three(self):
        with tempfile.TemporaryDirectory() as d:
            g = fixture(d)
            run(KIT / 'scripts' / 'parts.py', 'add', g, 'room', '--over', 'park')
            f = g / 'parts' / 'room' / 'part.json'
            f.write_text(json.dumps(dict(json.loads(f.read_text()), ranges=[['$4010', '$4011']])))
            ps = P.parts(str(g))
            by = {p['id']: p for p in ps}
            self.assertEqual([q['id'] for q in P.under(ps, by['room'])], ['park', 'engine'])
            self.assertEqual({q['id'] for q in P.above(ps, by['engine'])}, {'park', 'street', 'room'})
            self.assertEqual(tracked_count(str(g / 'parts' / 'park')), (6, 6))    # the room took the pointer
            names = P.names_under(str(g / 'parts' / 'room'))
            self.assertEqual((names[0x4000], names[0x1003]), ('park_entry', 'engine_get'))

    def test_the_layout_is_checked(self):
        with tempfile.TemporaryDirectory() as d:
            g = fixture(d)
            (g / 'parts' / 'stray').mkdir()
            f = g / 'parts' / 'street' / 'part.json'
            f.write_text(json.dumps({k: v for k, v in json.loads(f.read_text()).items() if k != 'ranges'}))
            out = run(KIT / 'scripts' / 'check_listing.py', g, ok=False).stdout
            self.assertIn('parts/stray has no part.json', out)
            self.assertIn('part street lies over engine but its part.json has no "ranges"', out)

    def test_a_part_says_what_it_is(self):
        # no file lists the parts: adding one writes its own folder and nothing else
        with tempfile.TemporaryDirectory() as d:
            g = fixture(d)
            before = (g / 'game.json').read_bytes()
            run(KIT / 'scripts' / 'parts.py', 'add', g, 'sewers', '--title', 'The sewers', '--over', 'engine')
            self.assertEqual((g / 'game.json').read_bytes(), before)
            self.assertEqual([(p['id'], p['order'], p['over']) for p in P.parts(str(g))],
                             [('engine', 1, None), ('park', 2, 'engine'), ('street', 3, 'engine'), ('sewers', 4, 'engine')])
            f = g / 'parts' / 'sewers' / 'part.json'
            own = json.loads(f.read_text())
            self.assertEqual(own['title'], 'The sewers')
            f.write_text(json.dumps(dict(own, order=2)))               # moved, by its own number
            self.assertEqual([p['id'] for p in P.parts(str(g))], ['engine', 'park', 'sewers', 'street'])
            out = run(KIT / 'scripts' / 'check_listing.py', g, ok=False).stdout
            self.assertIn('parts park and sewers have the same "order" (2)', out)
            f.write_text(json.dumps(dict(own, order=1.5)))
            self.assertIn('OK', run(KIT / 'scripts' / 'check_listing.py', g).stdout)
            # the list an earlier layout kept in game.json is said to be in the wrong place
            (g / 'game.json').write_text(json.dumps(dict(json.loads(before), parts=[{'id': 'engine'}])))
            self.assertIn('the parts are their folders', run(KIT / 'scripts' / 'check_listing.py', g, ok=False).stdout)

    def test_adopt_makes_the_first_load_a_part(self):
        with tempfile.TemporaryDirectory() as d:
            g = Path(d) / 'one'
            g.mkdir()
            settings = {'platform': 'c64', 'slug': 'one', 'title': 'One', 'video': {'screen': '$0400', 'charset': ''},
                        'coverage': {'exclude': [['$2000', '$20FF', 'a buffer']], 'extra': [], 'include': []}}
            (g / 'game.json').write_text(json.dumps(settings, indent=2) + '\n')
            (g / 'symbols.json').write_text(json.dumps({
                'schema': 1, 'platform': 'c64', 'game': 'one', 'blocks': [{'start': 0x1000, 'end': 0x1006, 'type': 'Code'}],
                'symbols': [sym(0x1000, 'main')], 'comments': [line(0x1000, 'All of it.')]}))
            (g / 'facts.md').write_text('# One\n\n- `$1000` is the start.\n')
            run(KIT / 'scripts' / 'listing.py', g, snapshot(g / 'one.vsf', ENGINE))
            before = tracked_count(str(g))
            self.assertIn('--adopt', run(KIT / 'scripts' / 'parts.py', 'add', g, 'level-2', ok=False).stderr)
            run(KIT / 'scripts' / 'parts.py', 'add', g, 'level-1', '--title', 'Level 1', '--adopt')
            self.assertEqual((g / 'game.json').read_text(),              # the settings moved, nothing else touched
                             json.dumps({'platform': 'c64', 'slug': 'one', 'title': 'One'}, indent=2) + '\n')
            own = json.loads((g / 'parts' / 'level-1' / 'part.json').read_text())
            self.assertEqual((own['title'], own['order'], own['video']['screen']), ('Level 1', 1, '$0400'))
            self.assertEqual(own['coverage']['exclude'], [['$2000', '$20FF', 'a buffer']])
            self.assertIn('$1000', (g / 'parts' / 'level-1' / 'facts.md').read_text())
            self.assertFalse((g / 'symbols.json').exists())
            self.assertEqual(tracked_count(str(g)), before)
            self.assertIn('OK - 1 listing', run(KIT / 'scripts' / 'check_listing.py', g).stdout)   # no rebuild needed

    def test_adopt_leaves_a_hand_laid_out_game_json_alone(self):
        with tempfile.TemporaryDirectory() as d:
            g = Path(d) / 'one'
            g.mkdir()
            by_hand = '{"platform": "c64", "slug": "one", "title": "One",\n "video": {"screen": "$0400", "charset": ""}}\n'
            (g / 'game.json').write_text(by_hand)
            (g / 'symbols.json').write_text(json.dumps({
                'schema': 1, 'platform': 'c64', 'game': 'one', 'blocks': [{'start': 0x1000, 'end': 0x1006, 'type': 'Code'}],
                'symbols': [sym(0x1000, 'main')], 'comments': [line(0x1000, 'All of it.')]}))
            run(KIT / 'scripts' / 'listing.py', g, snapshot(g / 'one.vsf', ENGINE))
            out = run(KIT / 'scripts' / 'parts.py', 'add', g, 'level-1', '--adopt').stdout
            self.assertEqual((g / 'game.json').read_text(), by_hand)
            self.assertIn('take video out of', out)
            self.assertEqual(json.loads((g / 'parts' / 'level-1' / 'part.json').read_text())['video']['screen'], '$0400')
            self.assertIn('game.json has video, which nothing reads', run(KIT / 'scripts' / 'check_listing.py', g, ok=False).stdout)


if __name__ == '__main__':
    unittest.main(warnings='ignore')   # the scripts open files the way the kit does, unclosed
