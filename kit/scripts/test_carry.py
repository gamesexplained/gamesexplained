#!/usr/bin/env python3
"""carry.py pairs a copy of code with its source, says where the copy differs, and carries the
names and comments across with their addresses rewritten (#552)."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

KIT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KIT / 'cpu'))
from asm6502 import assemble  # noqa: E402
from m6502 import decode  # noqa: E402

SOURCE = '''
start:  lda #$00
        sta $F0
        jsr draw
        jsr move
        jsr draw
        ldx #$03
loop:   lda table,x
        sta $0400,x
        dex
        bpl loop
        rts
draw:   lda $F0
        clc
        adc #$01
        sta $F0
        rts
move:   lda save
        eor #$FF
        sta save
        rts
table:  .byte $09, $09, $09, $09
save:   .byte $00
'''

# the copy: assembled at another address, zero page $10 lower, a call inserted beside the
# others, another constant in draw, its own colours, and a store kept apart from the read
COPY = '''
start:  lda #$00
        sta $E0
        jsr draw
        jsr light
        jsr move
        jsr draw
        ldx #$03
loop:   lda table,x
        sta $0400,x
        dex
        bpl loop
        rts
draw:   lda $E0
        clc
        adc #$02
        sta $E0
        rts
light:  inc $D020
        rts
move:   lda save
        eor #$FF
        sta mine
        rts
table:  .byte $0B, $0B, $0B, $0B
save:   .byte $00
mine:   .byte $00
'''


def records(code, org, data_from):
    """listing.json's records for the code: an instruction each up to data_from, then bytes."""
    ram, out, a = _ram(code, org), [], org
    while a < org + len(code):
        if a >= data_from:
            out.append({'a': a, 't': 'byte', 'b': [ram[a]]}); a += 1
            continue
        m, mode, n = decode(ram, a)
        out.append({'a': a, 't': 'code', 'b': list(ram[a:a + n]), 'm': m}); a += n
    return out


def _ram(code, org):
    ram = bytearray(65536)
    ram[org:org + len(code)] = code
    return ram


def vsf(path, ram):
    magic = b'VICE Snapshot File'
    path.write_bytes(magic + bytes(209 - len(magic)) + bytes(ram))


def game(d, syms, comments, blocks):
    d.mkdir(parents=True, exist_ok=True)
    (d / 'game.json').write_text(json.dumps({'platform': 'c64', 'slug': d.name}))
    (d / 'symbols.json').write_text(json.dumps({'schema': 1, 'platform': 'c64', 'game': d.name,
                                                'blocks': blocks, 'symbols': syms, 'comments': comments}, indent=1))


def run(*args, ok=True):
    p = subprocess.run([sys.executable, str(KIT / 'scripts' / 'carry.py'), *map(str, args)],
                       capture_output=True, text=True)
    if ok and p.returncode:
        raise AssertionError(p.stdout + p.stderr)
    return p


class Carry(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        root = Path(cls.tmp.name)
        cls.src_code, cls.L = assemble(SOURCE, org=0x8000)
        cls.dst_code, cls.D = assemble(COPY, org=0x9100)
        L, D = cls.L, cls.D
        cls.src, cls.dst = root / 'level-1', root / 'level-2'
        user = lambda a, n, t='Subroutine': {'address': a, 'name': n, 'type': t, 'kind': 'user'}
        game(cls.src, [user(L['start'], 'level_start'), user(L['draw'], 'draw_bar'),
                       user(L['move'], 'flip_save'), user(L['table'], 'bar_colours', 'UserDefined'),
                       user(L['save'], 'save_flag', 'UserDefined'), user(0xF0, 'bar_x', 'ZeroPageAbsoluteAddress')],
             [{'address': L['start'], 'type': 'line',
               'text': 'Starts the level: clears bar_x ($F0), draws the bar (draw_bar, $%04X), flips save_flag '
                       'and draws again, then copies the four bar_colours to the screen at $0400.' % L['draw']},
              {'address': L['draw'], 'type': 'line', 'text': 'Moves the bar one place right: adds 1 to $F0.'},
              {'address': L['move'], 'type': 'line', 'text': 'Flips every bit of save_flag and stores it back.'},
              {'address': L['loop'], 'type': 'line', 'text': 'Copies the colours; the high score is at $C000.'},
              {'address': L['table'], 'type': 'line', 'text': 'The bar\'s colours: brown ($09) for all four.'},
              {'address': 0xF0, 'type': 'line', 'text': 'The bar\'s place, 0 at the left.'}],
             [{'start': 0x8000, 'end': L['table'] - 1, 'type': 'Code'},
              {'start': L['table'], 'end': L['save'], 'type': 'Byte'}])
        (cls.src / 'listing.json').write_text(json.dumps({'records': records(cls.src_code, 0x8000, L['table'])}))
        game(cls.dst, [], [], [{'start': 0x9100, 'end': D['table'] - 1, 'type': 'Code'}])
        cls.snap = root / 'level-2.vsf'
        ram = _ram(cls.dst_code, 0x9100)
        ram[0xC000] = 0xAA                  # the copy's image holds something else where the source's comment points
        vsf(cls.snap, ram)
        cls.end_s = 0x8000 + len(cls.src_code) - 1
        cls.end_d = 0x9100 + len(cls.dst_code) - 1
        cls.out = run('pair', cls.src, f'8000-{cls.end_s:04X}', cls.dst, f'9100-{cls.end_d:04X}',
                      '--snapshot', cls.snap).stdout
        files = list((cls.dst / 'work' / 'carry').glob('*.json'))
        assert len(files) == 1, files
        cls.pairing = files[0]
        cls.R = json.loads(files[0].read_text())

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def twin(self, a):
        return dict(map(tuple, self.R['pairs'])).get(a)

    def kinds(self, kind):
        return [f for f in self.R['findings'] if f['kind'] == kind]

    def comment(self, src_addr):
        return next(c for c in self.R['comments'] if c['from'] == src_addr)

    def test_inserted_call_does_not_pull_its_neighbours_early(self):
        # the second call is move's, in both: the inserted call to light pairs with nothing
        self.assertEqual(self.twin(self.L['start'] + 7), self.D['start'] + 10, self.out)
        added = self.kinds('added')
        self.assertEqual([f['copy'] for f in added], [self.D['start'] + 7, self.D['light']], self.out)
        self.assertEqual(self.kinds('goes elsewhere'), [])

    def test_constant_and_kept_apart_operand_are_flagged(self):
        imm = self.kinds('immediate')
        self.assertEqual([(f['source'], f['copy']) for f in imm], [(self.L['draw'] + 3, self.D['draw'] + 3)])
        op = self.kinds('operand')
        self.assertEqual(len(op), 1, self.out)
        self.assertIn(f"${self.D['mine']:04X}", op[0]['text'])

    def test_zero_page_moved_and_rewritten_where_the_code_uses_it(self):
        self.assertIn('-$10', self.out)
        self.assertEqual(self.comment(self.L['draw'])['text'], 'Moves the bar one place right: adds 1 to $E0.')
        # the variable's own label and comment go to the copy's address
        names = {s['name']: s['address'] for s in self.R['symbols']}
        self.assertEqual(names['bar_x'], 0xE0)

    def test_addresses_rewritten_and_comments_flagged(self):
        c = self.comment(self.L['start'])
        self.assertIn(f"${self.D['draw']:04X}", c['text'])
        self.assertIn('$0400', c['text'])              # outside both copies: kept
        self.assertTrue(c.get('reread'), 'the start routine calls light in the copy')
        self.assertTrue(self.comment(self.L['draw']).get('reread'))
        self.assertTrue(self.comment(self.L['move']).get('reread'))
        table = self.comment(self.L['table'])
        self.assertEqual(table['address'], self.D['table'])
        self.assertIn('$09', table['reread'][0])

    def test_address_outside_the_pairing_is_noted_where_the_copy_differs(self):
        self.assertIn('names $C000, outside the code paired', '; '.join(self.comment(self.L['loop']).get('notes', [])))
        # $0400 holds the same bytes in both images: kept without a note
        self.assertNotIn('$0400', '; '.join(self.comment(self.L['start']).get('notes', [])))

    def test_apply_keeps_hand_edits_and_carries_corrections_again(self):
        run('apply', self.pairing)
        S = json.loads((self.dst / 'symbols.json').read_text())
        at = {c['address']: c['text'] for c in S['comments']}
        self.assertEqual(at[self.D['draw']], 'Moves the bar one place right: adds 1 to $E0.')
        self.assertIn({'address': self.D['draw'], 'name': 'draw_bar', 'type': 'Subroutine', 'kind': 'user'},
                      S['symbols'])
        # the copy's reader corrects one comment by hand; the source's author corrects another
        for c in S['comments']:
            if c['address'] == self.D['draw']:
                c['text'] = 'Moves the bar two places right: adds 2 to $E0.'
        (self.dst / 'symbols.json').write_text(json.dumps(S, indent=1))
        T = json.loads((self.src / 'symbols.json').read_text())
        for c in T['comments']:
            if c['address'] == self.L['move']:
                c['text'] = 'Flips every bit of save_flag.'
        (self.src / 'symbols.json').write_text(json.dumps(T, indent=1))
        run('pair', self.src, f'8000-{self.end_s:04X}', self.dst, f'9100-{self.end_d:04X}', '--snapshot', self.snap)
        out = run('apply', self.pairing).stdout
        S = json.loads((self.dst / 'symbols.json').read_text())
        at = {c['address']: c['text'] for c in S['comments']}
        self.assertEqual(at[self.D['draw']], 'Moves the bar two places right: adds 2 to $E0.', out)
        self.assertEqual(at[self.D['move']], 'Flips every bit of save_flag.', out)
        self.assertIn('kept 1', out)

    def test_find_locates_the_copy(self):
        out = run('find', self.src, f'8000-{self.end_s:04X}', self.snap).stdout
        self.assertRegex(out, r"\$91[0-9A-F]{2}-\$91[0-9A-F]{2}: \d+% .*zero page moved by -\$10", out)

    def test_same_folder_needs_new_names(self):
        p = run('pair', self.src, '8000-8009', self.src, '8000-8009', ok=False)
        self.assertNotEqual(p.returncode, 0)
        self.assertIn('--name', p.stderr)


# a handler that ends in a jump, so the RTI after it is reached by nothing; the copy leaves the
# jump out, and runs into the RTI
HANDLER = '''
start:  pha
        lda #$01
        sta $D019
        pla
        jmp done
spare:  rti
done:   lda #$00
        sta $D020
        rts
'''
HANDLER_COPY = '''
start:  pha
        lda #$01
        sta $D019
        pla
spare:  rti
done:   lda #$00
        sta $D020
        rts
'''


class RunsIn(unittest.TestCase):
    def pair(self, rti_is_code):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            code, L = assemble(HANDLER, org=0x8000)
            copy, D = assemble(HANDLER_COPY, org=0x9000)
            src, dst = root / 'main', root / 'training'
            game(src, [], [{'address': L['spare'], 'type': 'line', 'text': 'An RTI nothing reaches.'},
                           {'address': L['done'], 'type': 'line', 'text': 'Clears the border.'}],
                 [{'start': 0x8000, 'end': 0x8000 + len(code) - 1, 'type': 'Code'}])
            recs = records(code, 0x8000, 0x8000 + len(code))
            if not rti_is_code:             # the source's listing holds the unreached RTI as a byte
                recs = [dict(r, t='byte') if r['a'] == L['spare'] else r for r in recs]
            (src / 'listing.json').write_text(json.dumps({'records': recs}))
            game(dst, [], [], [{'start': 0x9000, 'end': 0x9000 + len(copy) - 1, 'type': 'Code'}])
            snap = root / 'training.vsf'
            vsf(snap, _ram(copy, 0x9000))
            run('pair', src, f'8000-{0x8000 + len(code) - 1:04X}', dst, f'9000-{0x9000 + len(copy) - 1:04X}',
                '--snapshot', snap)
            R = json.loads(next((dst / 'work' / 'carry').glob('*.json')).read_text())
        return R, L, D, {c['from']: c for c in R['comments']}

    def test_code_the_copy_runs_into_is_flagged(self):
        R, L, D, at = self.pair(rti_is_code=True)
        runs = [f for f in R['findings'] if f['kind'] == 'runs in']
        self.assertEqual([(f['source'], f['copy']) for f in runs], [(L['spare'], D['spare'])], R['findings'])
        self.assertIn('runs into it in the copy only', ' '.join(at[L['spare']].get('reread', [])))
        # done follows the RTI in both: no note
        self.assertFalse(any('runs' in w for w in at[L['done']].get('reread', [])))

    def test_bytes_the_copy_runs_into_are_flagged(self):
        R, L, D, at = self.pair(rti_is_code=False)
        self.assertEqual(at[L['spare']]['address'], D['spare'])
        self.assertIn(f"runs on into ${D['spare']:04X}", ' '.join(at[L['spare']].get('reread', [])))


if __name__ == '__main__':
    unittest.main()
