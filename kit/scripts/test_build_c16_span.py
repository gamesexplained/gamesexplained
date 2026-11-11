"""Keep a Plus/4 game's authored upper RAM visible on the memory diagram."""
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build


class C16Span(unittest.TestCase):
    def footprint(self, address, data):
        with tempfile.TemporaryDirectory() as directory:
            Path(directory, "listing.json").write_text(json.dumps({
                "records": [{"a": address, "b": data, "t": "byte"}], "index": []
            }))
            return build.footprint(directory, {
                "platform": "c16", "coverage": {"include": [["$4000", "$CFFF", "upper RAM"]]}
            })

    def test_stock_c16_keeps_its_16_kb_diagram(self):
        self.assertEqual(self.footprint(0x2000, [1])[3], (0, 0x4000))

    def test_plus4_upper_ram_appears_in_the_diagram(self):
        runs, totals, _, span = self.footprint(0xA800, [1, 2])
        self.assertEqual(span, (0, 0x10000))
        self.assertTrue(any(a <= 0xA800 < a + n and kind == "tables" for a, n, kind, _ in runs))
        self.assertEqual(totals["tables"], 2)

    def test_a_record_crossing_16_kb_also_needs_the_larger_diagram(self):
        self.assertEqual(self.footprint(0x3FFF, [1, 2])[3], (0, 0x10000))


if __name__ == "__main__":
    unittest.main()
