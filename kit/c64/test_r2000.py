#!/usr/bin/env python3
"""r2000.py asks the disassembler who refers to each address in batches, and keeps the answers;
and applies a file of annotations or an audit's corrections in batches, logging the calls that
succeed (#306, #333, #386)."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('c64_r2000', Path(__file__).with_name('r2000.py'))
r2000 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r2000)


def text(value):
    return {'content': [{'type': 'text', 'text': json.dumps(value)}]}


class CrossReferences(unittest.TestCase):
    def test_asked_in_batches(self):
        sizes = []

        def make_client(gdir=None):
            def rpc(method, params=None, notif=False):
                self.assertEqual(params['name'], 'r2000_batch_execute')
                ask = params['arguments']['calls']
                sizes.append(len(ask))
                return {'result': text([{'status': 'error', 'error': {'code': -32602}} if c['arguments']['address'] == 5
                                        else {'status': 'success', 'result': text([c['arguments']['address'] + 1])}
                                        for c in ask])}
            return rpc
        keep, r2000.make_client = r2000.make_client, make_client
        try:
            out = r2000.cross_references(range(450), 'games/c64/fixture/parts/park')
        finally:
            r2000.make_client = keep
        self.assertEqual(sizes, [200, 200, 50])
        self.assertEqual(out[0], [1])
        self.assertEqual(out[449], [450])
        self.assertNotIn(5, out)                 # no answer: nothing is known to refer to it
        self.assertEqual(len(out), 449)


ANNOTATIONS = """# the title screen
$C000 init_screen : clears the screen; sets the border to black
$c010 wait_frame
$C020 : waits for the raster: line $FF
$C100-$C1FF byte

$C200-$C2FF lo_hi_address
"""


class Apply(unittest.TestCase):
    def test_each_form_of_line(self):
        calls, problems = r2000.parse_annotations(ANNOTATIONS)
        self.assertEqual(problems, [])
        self.assertEqual([n for n, _ in calls], [2, 2, 3, 4, 5, 7])
        self.assertEqual(calls[0][1], {'name': 'r2000_set_label_name', 'arguments': {'address': 0xC000, 'name': 'init_screen'}})
        self.assertEqual(calls[1][1]['arguments'],
                         {'address': 0xC000, 'type': 'line', 'comment': 'clears the screen; sets the border to black'})
        self.assertEqual(calls[3][1]['arguments']['comment'], 'waits for the raster: line $FF')   # a colon inside
        self.assertEqual(calls[4][1], {'name': 'r2000_set_data_type',
                                       'arguments': {'start_address': 0xC100, 'end_address': 0xC1FF, 'data_type': 'byte'}})

    def test_what_does_not_parse(self):
        _, problems = r2000.parse_annotations('$C000 clears the screen\n$C100-$C1FF Byte\n$C2FF-$C200 byte\nC000 x\n')
        self.assertEqual([n for n, _ in problems], [1, 2, 3, 4])

    def test_a_type_without_a_range(self):
        # `$C100 byte` once named a label "byte" in the Gauntlet run, and the next such line failed
        _, problems = r2000.parse_annotations('$C100 byte\n$C101 Word\n$C102 byte_count : a label of its own\n')
        self.assertEqual([n for n, _ in problems], [1, 2])

    def test_only_what_succeeds_is_logged(self):
        sent = []

        def make_client(gdir=None):
            def rpc(method, params=None, notif=False):
                ask = params['arguments']['calls']
                sent.append(len(ask))
                return {'result': text([{'status': 'error', 'error': {'message': 'Unknown data_type'}}
                                        if c['name'] == 'r2000_set_data_type' and c['arguments']['start_address'] == 0xC200
                                        else {'status': 'success', 'result': text('ok')} for c in ask])}
            return rpc
        with tempfile.TemporaryDirectory() as d:
            Path(d, 'game.json').write_text('{}', encoding='utf-8')
            f = Path(d, 'work', 'notes.txt')
            os.makedirs(f.parent)
            f.write_text(ANNOTATIONS, encoding='utf-8')
            keep, r2000.make_client = r2000.make_client, make_client
            out = io.StringIO()
            try:
                with contextlib.redirect_stdout(out):
                    bad = r2000.apply(str(f), d, 'agent1.jsonl', batch=4)
            finally:
                r2000.make_client = keep
            logged = [json.loads(ln) for ln in Path(d, 'work', 'agent1.jsonl').read_text().splitlines()]
        self.assertEqual(sent, [4, 2])
        self.assertEqual(bad, 1)
        self.assertEqual(len(logged), 5)
        self.assertNotIn(0xC200, [e['arguments'].get('start_address') for e in logged])
        self.assertIn('notes.txt:7: r2000_set_data_type failed', out.getvalue())

    def test_a_bad_line_sends_nothing(self):
        with tempfile.NamedTemporaryFile('w', suffix='.txt', delete=False) as f:
            f.write('$C000 init : ok\n$C100-$C1FF Byte\n')
        keep, r2000.make_client = r2000.make_client, lambda gdir=None: self.fail('sent')
        try:
            with contextlib.redirect_stdout(io.StringIO()), self.assertRaises(SystemExit):
                r2000.apply(f.name)
        finally:
            r2000.make_client = keep
            os.unlink(f.name)

    def test_one_label_at_two_addresses_sends_nothing(self):
        # #333: regenerator2000 refuses the second inside the batch and applies the rest
        calls, problems = r2000.parse_annotations('$C000 draw : one\n$C010 draw\n$C000 draw : again\n')
        self.assertEqual(problems, [])
        self.assertEqual(r2000.same_label_twice(calls), [(2, 'draw is already given to $C000 at 1')])
        with tempfile.NamedTemporaryFile('w', suffix='.txt', delete=False) as f:
            f.write('$C000 draw\n$C010 draw\n')
        keep, r2000.make_client = r2000.make_client, lambda gdir=None: self.fail('sent')
        try:
            with contextlib.redirect_stdout(io.StringIO()) as out, self.assertRaises(SystemExit):
                r2000.apply(f.name)
        finally:
            r2000.make_client = keep
            os.unlink(f.name)
        self.assertIn(':2: draw is already given to $C000 at 1', out.getvalue())


class Corrections(unittest.TestCase):
    """An audit's corrections, a JSON list of {address, comment, label, type} (#386)."""
    TYPES = {0xC000: {'line'}, 0xC003: {'side'}, 0xC006: {'line', 'side'}}

    def test_each_entry_and_its_comment_type(self):
        calls, problems = r2000.parse_fixes([
            {'address': '$C000', 'comment': 'clears the screen', 'label': 'clear_screen'},
            {'address': 0xC003, 'comment': 'the border'},          # a side comment stays one
            {'address': 0xC006, 'comment': 'both kinds', 'type': 'line'},
            {'address': 0xC009, 'comment': 'new'},                 # no comment yet: a line comment
            {'address': 0xC00C, 'label': 'loop'}], self.TYPES)
        self.assertEqual(problems, [])
        self.assertEqual([n for n, _ in calls], [1, 1, 2, 3, 4, 5])
        self.assertEqual(calls[0][1], {'name': 'r2000_set_label_name', 'arguments': {'address': 0xC000, 'name': 'clear_screen'}})
        self.assertEqual([c['arguments'].get('type') for _, c in calls[1:5]], ['line', 'side', 'line', 'line'])

    def test_what_is_refused(self):
        _, problems = r2000.parse_fixes([
            {'address': 0xC006, 'comment': 'which kind?'}, {'comment': 'no address'}, {'address': 0x10000, 'label': 'x'},
            {'address': 0xC000}, {'address': 0xC000, 'label': '1st'}, {'address': 0xC000, 'comment': 'x', 'type': 'block'}],
            self.TYPES)
        self.assertEqual([n for n, _ in problems], [1, 2, 3, 4, 5, 6])
        self.assertIn('a line and a side comment', problems[0][1])
        self.assertEqual(r2000.parse_fixes({'address': 1}), ([], [(0, 'not a JSON list of {address, comment, label, type}')]))

    def test_applied_from_a_json_file_with_the_games_types(self):
        sent = []

        def make_client(gdir=None):
            def rpc(method, params=None, notif=False):
                sent.extend(c['arguments'] for c in params['arguments']['calls'])
                return {'result': text([{'status': 'success', 'result': text('ok')} for _ in params['arguments']['calls']])}
            return rpc
        with tempfile.TemporaryDirectory() as d:
            Path(d, 'game.json').write_text('{}', encoding='utf-8')
            Path(d, 'symbols.json').write_text(json.dumps({'comments': [{'address': 0xC003, 'type': 'side', 'text': 'old'}]}),
                                               encoding='utf-8')
            f = Path(d, 'work', 'fixes.json')
            os.makedirs(f.parent)
            f.write_text(json.dumps([{'address': '$C003', 'comment': 'new'}, {'address': 49152, 'label': 'start'}]), encoding='utf-8')
            keep, r2000.make_client = r2000.make_client, make_client
            try:
                with contextlib.redirect_stdout(io.StringIO()):
                    bad = r2000.apply(str(f), d)
            finally:
                r2000.make_client = keep
            logged = Path(d, 'work', 'annotations.jsonl').read_text().splitlines()
        self.assertEqual(bad, 0)
        self.assertEqual(sent, [{'address': 0xC003, 'type': 'side', 'comment': 'new'}, {'address': 0xC000, 'name': 'start'}])
        self.assertEqual(len(logged), 2)


if __name__ == '__main__':
    unittest.main()
