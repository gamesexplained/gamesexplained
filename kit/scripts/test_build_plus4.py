"""A Plus/4 footprint includes high RAM; existing C16 footprints stay 16 KB."""
import json
from pathlib import Path
import tempfile
import unittest
import build

class Plus4Footprint(unittest.TestCase):
    def test_span_and_caption(self):
        self.assertEqual(build.memory_span({'platform':'c16'}), (0,0x4000))
        self.assertEqual(build.memory_span({'platform':'c16','ram_kb':64}), (0,0x10000))
        self.assertIn('Plus/4',build.memory_name({'platform':'c16','ram_kb':64}))
        self.assertIn('Commodore 16',build.memory_name({'platform':'c16'}))
        self.assertEqual(build.memory_span({'platform':'spectrum'}),(0x4000,0x10000))
        self.assertEqual(build.memory_span({'platform':'c16','ram_kb':64},0x20000),(0,0x20000))
    def test_high_code_counted(self):
        listing={'records':[{'a':0x9000,'t':'code','b':[0x60]}], 'index':[]}
        with tempfile.TemporaryDirectory() as d:
            Path(d,'listing.json').write_text(json.dumps(listing))
            small=build.footprint(d,{'platform':'c16'})
            large=build.footprint(d,{'platform':'c16','ram_kb':64,'coverage':{'include':[['$8000','$BFFF','RAM with ROMs out']]}})
        self.assertEqual(small[1]['code'],0)
        self.assertEqual(large[1]['code'],1)
        self.assertEqual(sum(small[1].values()),0x4000)
        self.assertEqual(sum(large[1].values()),0x10000)

if __name__=='__main__':unittest.main()
