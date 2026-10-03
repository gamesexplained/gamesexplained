"""An imported map must not turn omitted runtime buffers into instructions."""
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

def load(name):
    """kit/c64/<name>.py by path: regenerator2000's writer and the .vsf reader live here."""
    spec = importlib.util.spec_from_file_location(
        "kit_c64_" + name, Path(__file__).resolve().with_name(name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


project_blocks = load("project").project_blocks
snapshot_module = load("snapshot")
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "kit/scripts"))
import ledger


class ProjectBlocksTests(unittest.TestCase):
    def test_partial_map_keeps_code_and_words_and_fills_runtime_gaps(self):
        blocks = project_blocks([
            {"start": 0x1020, "end": 0x1021, "type": "Word"},
            {"start": 0x1000, "end": 0x1005, "type": "Code"},
        ])
        self.assertEqual([(b["start"], b["end"], b["type_"]) for b in blocks], [
            (0, 0x0FFF, "Undefined"),
            (0x1000, 0x1005, "Code"),
            (0x1006, 0x101F, "Undefined"),
            (0x1020, 0x1021, "DataWord"),
            (0x1022, 0xFFFF, "Undefined"),
        ])

    def test_complete_map_is_preserved(self):
        blocks = project_blocks([
            {"start": 0, "end": 0xFFFF, "type": "Byte"},
        ])
        self.assertEqual(len(blocks), 1)
        self.assertEqual(blocks[0]["type_"], "DataByte")

    def test_existing_game_coverage_survives_import_export(self):
        # This game's renamed variables in undefined RAM gained 142 tracked
        # bytes when gaps were filled as DataByte instead of Undefined.
        game = ROOT / "games/c64/jupiter-lander"
        before = json.loads((game / "symbols.json").read_text())
        with tempfile.TemporaryDirectory() as folder:
            work = Path(folder)
            for name in ("game.json", "symbols.json"):
                (work / name).write_bytes((game / name).read_bytes())
            symbols = json.loads((work / "symbols.json").read_text())
            symbols["blocks"] = [b for b in symbols["blocks"] if b["type"] != "Undefined"]
            (work / "symbols.json").write_text(json.dumps(symbols))
            snapshot = work / "synthetic.vsf"
            magic = snapshot_module.MAGIC          # the reader refuses a file without it
            snapshot.write_bytes(magic + bytes(snapshot_module.VSF_RAM_OFFSET - len(magic) + 0x10000))
            project = work / "roundtrip.regen2000proj"
            for script, args in (
                ("symbols_import.py", [work, snapshot, project]),
                ("symbols_export.py", [work, "--project", project]),
            ):
                subprocess.run([sys.executable, str(ROOT / "kit/scripts" / script),
                                *map(str, args)], check=True, capture_output=True)
            after = json.loads((work / "symbols.json").read_text())
        def measure(symbols):
            return ledger.compute(*(symbols[key] for key in
                                    ("blocks", "symbols", "comments", "regions")))
        old, new = measure(before), measure(after)
        for key in ("state", "code", "owner", "commented", "dups"):
            self.assertEqual(old[key], new[key], key)

    def test_overlapping_map_is_rejected(self):
        with self.assertRaises(ValueError):
            project_blocks([
                {"start": 0, "end": 10, "type": "Code"},
                {"start": 10, "end": 20, "type": "Byte"},
            ])


if __name__ == "__main__":
    unittest.main()
