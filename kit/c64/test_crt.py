#!/usr/bin/env python3
"""A cartridge that switches banks: a part for each bank, beside the RAM, counted once.

The fixture is a cartridge of three 8 KB banks: bank 0 holds a stage name that the
code in RAM reads where it is, with the bank switched in; bank 1 is blank; bank 2 is
copied whole into RAM. No game is in it.
"""
import json
from pathlib import Path
import shutil
import struct
import subprocess
import sys
import tempfile
import unittest

KIT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KIT / 'scripts'))
sys.path.insert(0, str(KIT / 'c64'))
import build  # noqa: E402
import crt  # noqa: E402
import parts as P  # noqa: E402
from coverage import tracked_count  # noqa: E402

RESIDENT = {0xC000: [0xA9, 0x00,                # lda #0
                     0x8D, 0x00, 0xDE,          # sta $DE00   bank 0
                     0xAD, 0x10, 0x80,          # lda $8010   the stage name, in bank 0
                     0xAD, 0x10, 0x80,          # lda $8010   the RAM beneath
                     0x60],                     # rts
            0xC010: [0x10, 0x80],               # a pointer to the stage name
            0x8010: [0x07]}                     # a variable in the RAM under the cartridge
NAME = [0x08, 0x05, 0x0C, 0x0C, 0x0F]          # HELLO in screen codes


def cartridge(path):
    bank0 = bytearray(0x2000)
    bank0[0x10:0x15] = bytes(NAME)
    banks = [(0, bytes(bank0)), (1, b'\xFF' * 0x2000), (2, bytes(range(256)) * 32)]
    out = crt.MAGIC + struct.pack('>IHHBB', 0x40, 0x0100, 5, 0, 0) + bytes(6) + b'FIXTURE'.ljust(32, b'\0')
    for n, data in banks:
        out += b'CHIP' + struct.pack('>IHHHH', 16 + len(data), 0, n, 0x8000, len(data)) + data
    path.write_bytes(out)
    return path


def run(*args, ok=True):
    r = subprocess.run([sys.executable, *map(str, args)], capture_output=True, text=True)
    if ok and r.returncode:
        raise AssertionError(f"{' '.join(map(str, args))}\n{r.stdout}{r.stderr}")
    return r


def snapshot(path, image):
    ram = bytearray(65536)
    for a, bs in image.items():
        ram[a:a + len(bs)] = bytes(bs)
    magic = b'VICE Snapshot File'
    path.write_bytes(magic + bytes(209 - len(magic)) + ram)
    return path


def symbols(g, pid, blocks, syms, comments):
    (g / 'parts' / pid / 'symbols.json').write_text(json.dumps({
        'schema': 1, 'platform': 'c64', 'game': 'fixture', 'part': pid,
        'blocks': [{'start': a, 'end': b, 'type': t} for a, b, t in blocks],
        'symbols': [{'address': a, 'name': n, 'kind': 'user', 'type': t} for a, n, t in syms],
        'comments': [{'address': a, 'type': 'line', 'text': t} for a, t in comments]}))


def edit(f, **kv):
    f.write_text(json.dumps(dict(json.loads(f.read_text()), **kv), indent=2))


def fixture(d, rows=True):
    """games/c64/fixture, from the template: a RAM part and a part for each bank, the listings of
    the RAM part and bank 0 built (bank 1 is blank, and bank 2 is all copied into RAM)."""
    g = Path(d) / 'games' / 'c64' / 'fixture'
    shutil.copytree(KIT / 'template', g)
    (g / 'work').mkdir(exist_ok=True)
    edit(g / 'game.json', platform='c64', slug='fixture', title='Fixture', tier='bronze')
    image = cartridge(g / 'work' / 'fixture.crt')
    run(KIT / 'scripts' / 'parts.py', 'add', g, 'resident', '--title', 'Resident')
    run(KIT / 'c64' / 'crt.py', 'parts', g, image, '--over', 'resident')
    part = g / 'parts' / 'bank-02' / 'part.json'
    cov = json.loads(part.read_text())['coverage']
    cov['exclude'].append(['$8000', '$9FFF', 'copied to $8000 by the start-up, and Resident\'s from there'])
    edit(part, coverage=cov)
    if rows:
        edit(g / 'parts' / 'resident' / 'part.json',
             banks=[['$C005', '$C007', 'bank-00', 'reads the stage name with bank 0 switched in'],
                    ['$C010', '$C011', 'bank-00', 'points at the stage name in bank 0']])
    symbols(g, 'resident', [(0xC000, 0xC00B, 'Code'), (0xC010, 0xC011, 'Address'), (0x8010, 0x8010, 'Byte')],
            [(0xC000, 'show_name', 'Subroutine'), (0xC010, 'name_ptr', 'AbsoluteAddress'),
             (0x8010, 'ram_var', 'AbsoluteAddress')],
            [(0xC000, 'Switches bank 0 in and reads the stage name.'), (0xC010, 'Where the name is.'),
             (0x8010, 'A variable under the cartridge.')])
    symbols(g, 'bank-00', [(0x8010, 0x8014, 'Screencode')], [(0x8010, 'stage_name', 'AbsoluteAddress')],
            [(0x8010, 'The stage name, read where it is.')])
    run(KIT / 'scripts' / 'listing.py', g / 'parts' / 'resident', snapshot(g / 'work' / 'play.vsf', RESIDENT))
    run(KIT / 'scripts' / 'listing.py', g / 'parts' / 'bank-00', g / 'parts' / 'bank-00' / 'work' / 'bank.crt')
    return g


def records(g, pid):
    return {r['a']: r for r in json.loads((g / 'parts' / pid / 'listing.json').read_text())['records']}


class Cartridge(unittest.TestCase):
    def test_the_image_is_read(self):
        with tempfile.TemporaryDirectory() as d:
            p = cartridge(Path(d) / 't.crt')
            c = crt.info(str(p))
            self.assertEqual((c['type'], c['name'], sorted(c['banks'])), (5, 'FIXTURE', [0, 1, 2]))
            ram = crt.image(str(p), 0)
            self.assertEqual((len(ram), list(ram[0x8010:0x8015]), ram[0xA000]), (0x10000, NAME, 0))
            with self.assertRaises(SystemExit):     # three banks: which one?
                crt.image(str(p))
            one = Path(d) / 'one.crt'
            one.write_bytes(crt.one_bank(str(p), 1))
            self.assertEqual((sorted(crt.info(str(one))['banks']), crt.image(str(one))[0x9FFF]), ([1], 0xFF))
            self.assertEqual((crt.part_id(3, {0: 0, 15: 0}), crt.part_id(3, {0: 0, 127: 0})), ('bank-03', 'bank-003'))
            for bad in (b'not a cartridge', crt.MAGIC + bytes(48)):
                p.write_bytes(bad)
                with self.assertRaises(SystemExit):
                    crt.info(str(p))

    def test_a_snapshot_is_never_read_as_a_bank(self):
        with tempfile.TemporaryDirectory() as d:
            import snapshot
            p = cartridge(Path(d) / 't.crt')
            with self.assertRaises(SystemExit):     # a cartridge of three banks is no snapshot
                snapshot.read(str(p))
            self.assertEqual(list(snapshot.read(str(p), bank=0)[0x8010:0x8015]), NAME)
            with self.assertRaises(SystemExit):     # nor is a snapshot a bank
                snapshot.read(str(snapshot_file(Path(d))), bank=0)

    def test_each_bank_is_a_part_over_the_ram(self):
        with tempfile.TemporaryDirectory() as d:
            g = fixture(d)
            ids = [p['id'] for p in P.parts(str(g))]
            self.assertEqual(ids, ['resident', 'bank-00', 'bank-01', 'bank-02'])
            b0 = json.loads((g / 'parts' / 'bank-00' / 'part.json').read_text())
            self.assertEqual((b0['bank'], b0['over'], b0['ranges']), (0, 'resident', [['$8000', '$9FFF']]))
            b1 = json.loads((g / 'parts' / 'bank-01' / 'part.json').read_text())
            self.assertEqual(b1['coverage']['exclude'], [['$8000', '$9FFF', 'blank: every byte is $FF']])
            self.assertTrue((g / 'parts' / 'bank-00' / 'work' / 'bank.crt').is_file())
            again = run(KIT / 'c64' / 'crt.py', 'parts', g, g / 'work' / 'fixture.crt', '--over', 'resident').stdout
            self.assertIn('already', again)
            r = run(KIT / 'c64' / 'crt.py', 'parts', g, g / 'work' / 'fixture.crt', '--over', 'bank-00', ok=False)
            self.assertNotEqual(r.returncode, 0)

    def test_the_ram_beneath_a_bank_stays_its_parts(self):
        with tempfile.TemporaryDirectory() as d:
            g = fixture(d)
            res = P.load_game(str(g / 'parts' / 'resident'))
            self.assertFalse(any(lo <= 0x8010 <= hi for lo, hi, _ in res['elsewhere']))
            b0 = P.load_game(str(g / 'parts' / 'bank-00'))
            self.assertTrue(any(lo <= 0xC000 <= hi for lo, hi, _ in b0['elsewhere']))
            self.assertEqual(b0['part']['bank'], 0)
            each = {p: tracked_count(str(g / 'parts' / p)) for p in ('resident', 'bank-00')}
            self.assertEqual(each, {'resident': (15, 15), 'bank-00': (5, 5)})
            self.assertEqual(tracked_count(str(g)), (20, 20))
            table = run(KIT / 'scripts' / 'coverage.py', g).stdout
            self.assertIn('blank: every byte is $FF', table)
            self.assertIn('in 4 of 4 parts', table)

    def test_code_that_sees_a_bank_takes_its_names(self):
        with tempfile.TemporaryDirectory() as d:
            g = fixture(d)
            res, b0 = records(g, 'resident'), records(g, 'bank-00')
            self.assertEqual((res[0xC005]['o'], res[0xC005]['pt']), ('stage_name', 'bank-00'))
            self.assertEqual((res[0xC008]['o'], res[0xC008].get('pt')), ('ram_var', None))
            self.assertEqual((res[0xC010]['o'], res[0xC010]['pt']), ('stage_name', 'bank-00'))
            self.assertEqual(res[0x8010]['x'], [0xC008])          # only the read that sees the RAM
            self.assertEqual(b0[0x8010]['d'], 'HELLO')
            self.assertTrue(all(0x8000 <= a <= 0x9FFF for a, r in b0.items() if r.get('b')))
            self.assertIn('OK', run(KIT / 'scripts' / 'check_listing.py', g).stdout)

    def test_a_changed_row_is_a_listing_to_relabel(self):
        with tempfile.TemporaryDirectory() as d:
            g = fixture(d)
            edit(g / 'parts' / 'resident' / 'part.json', banks=[])
            r = run(KIT / 'scripts' / 'check_listing.py', g, ok=False)
            self.assertNotEqual(r.returncode, 0, r.stdout)
            run(KIT / 'scripts' / 'listing.py', g / 'parts' / 'resident', '--relabel')
            self.assertEqual(records(g, 'resident')[0xC005]['o'], 'ram_var')
            self.assertIn('OK', run(KIT / 'scripts' / 'check_listing.py', g).stdout)
            edit(g / 'parts' / 'resident' / 'part.json', banks=[['$C005', '$C007', 'resident', 'not a bank']])
            r = run(KIT / 'scripts' / 'check_listing.py', g, ok=False)
            self.assertIn('"banks" row', r.stdout)

    def test_the_disassembler_starts_on_the_bank(self):
        with tempfile.TemporaryDirectory() as d:
            g = fixture(d)
            import project
            out = project.write(str(g / 'parts' / 'bank-00'), str(g / 'parts' / 'bank-00' / 'work' / 'bank.crt'),
                                str(Path(d) / 'b.regen2000proj'))
            import base64, gzip
            raw = gzip.decompress(base64.b64decode(json.load(open(out))['raw_data_base64']))
            self.assertEqual(list(raw[0x8010:0x8015]), NAME)


class Pages(unittest.TestCase):
    def setUp(self):
        self.shot, build.shot_html = build.shot_html, lambda *a, **k: ""   # the fixture has no title screen

    def tearDown(self):
        build.shot_html = self.shot

    def test_the_banks_are_named_apart_from_the_ram(self):
        with tempfile.TemporaryDirectory() as d:
            g = fixture(d)
            out_root = Path(d) / '_site'
            shutil.copytree(Path(build.SITE) / 'lib', out_root / 'lib')
            (out_root / 'c64').mkdir()
            (out_root / 'index.html').write_text('')
            (out_root / 'c64' / 'index.html').write_text('')
            build.build_game(str(g), str(out_root))
            out = out_root / 'c64' / 'fixture'
            self.assertEqual(sorted(f.name for f in out.glob('source*.html')),
                             ['source-bank-00.html', 'source-resident.html', 'source.html'])
            bank = (out / 'source-bank-00.html').read_text()
            self.assertIn('a cartridge of 3 banks and one part in RAM', bank)
            self.assertIn('Bank 0 is switched in at $8000\u2013$9FFF, over Resident', bank)
            self.assertIn('<optgroup label="Cartridge banks"><option value="source-bank-00.html" selected>', bank)
            self.assertIn('<span class="none" title="blank: every byte is $FF">Bank 1</span>', bank)
            part = json.loads(bank.split('id="part">')[1].split('</script>')[0])
            self.assertEqual((part['bank'], [u['id'] for u in part['under']], part['pages']['bank-00']),
                             (0, ['resident'], 'source-bank-00.html'))
            about = (out / 'about.html').read_text()
            self.assertIn("The cartridge's banks, switched in at $8000\u2013$9FFF one at a time", about)
            self.assertEqual(build.broken_links(str(out_root)), [])


def snapshot_file(d):
    return snapshot(d / 's.vsf', {0xC000: [0x60]})


if __name__ == '__main__':
    unittest.main()
