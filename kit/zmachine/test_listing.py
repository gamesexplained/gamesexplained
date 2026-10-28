#!/usr/bin/env python3
"""A story lists as a snapshot does: kit/zmachine/map.py types it, kit/scripts/listing.py lists
it, and the listing rebuilds from its own bytes.

For versions 1-5, 7 and 8, the test assembles the story test_bocfel.py plays, makes it the
story part of a game folder in a scratch directory, and checks:

  - map.py finds every routine and string the assembler wrote, and nothing else in high memory;
  - the listing shows every instruction the assembler wrote, at its address, by its name, with
    each routine's header as .routine, and every string as text, decoded as story.py decodes it;
  - the listing rebuilds from its own bytes (listing.py --rebuild), and check_listing.py passes;
  - a label, a comment and a block the run wrote survive map.py's next pass.

It needs no tool.
"""
import json
import os
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(HERE, "..", "scripts")
sys.path.insert(0, HERE)
import test_bocfel  # noqa: E402
from story import Story  # noqa: E402


def run(script, *args):
    return subprocess.run([sys.executable, script, *map(str, args)], capture_output=True, text=True)


class Listing(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.tmp.cleanup()

    def folder(self, v, asm):
        """A game folder whose one part is the story."""
        g = os.path.join(self.tmp.name, f"v{v}")
        part = os.path.join(g, "parts", "story")
        os.makedirs(os.path.join(part, "work"))
        with open(os.path.join(g, "game.json"), "w") as f:
            json.dump({"platform": "apple2", "slug": "fixture", "title": "Fixture", "build": "disk"}, f)
        with open(os.path.join(part, "part.json"), "w") as f:
            json.dump({"title": "The story", "order": 1, "kind": "virtual", "machine": "zmachine",
                       "size": len(asm.story)}, f)
        path = os.path.join(part, "work", f"story.z{v}")
        with open(path, "wb") as f:
            f.write(asm.story)
        return part, path

    def mapped(self, part, path):
        out = run(os.path.join(HERE, "map.py"), part, path)
        self.assertEqual(out.returncode, 0, out.stdout + out.stderr)
        return json.load(open(os.path.join(part, "symbols.json")))

    def listed(self, part, path):
        out = run(os.path.join(SCRIPTS, "listing.py"), part, path)
        self.assertEqual(out.returncode, 0, out.stdout + out.stderr)
        return json.load(open(os.path.join(part, "listing.json")))

    def test_versions(self):
        for v in test_bocfel.VERSIONS:
            with self.subTest(version=v):
                self.version(v)

    def version(self, v):
        asm = test_bocfel.build(v)
        story = Story(asm.story)
        part, path = self.folder(v, asm)
        sym = self.mapped(part, path)
        high = story.header["high"]
        routines = {a for k, a in asm.labels.values() if k == "routine"}
        strings = {a for k, a in asm.labels.values() if k == "string"}
        found = {x["address"] for x in sym["symbols"] if x["type"] == "Subroutine"}
        self.assertEqual(sorted(routines - found), [], "routines map.py missed")
        self.assertEqual(sorted(a for a in found - routines if a >= high), [], "routines that are not")
        texts = {b["start"] for b in sym["blocks"] if b["type"] == "ZText" and b["start"] >= high}
        named = {x["address"] for x in sym["symbols"] if x["address"] in strings}
        self.assertEqual(sorted(strings - named), [], "strings map.py missed")
        L = self.listed(part, path)
        self.assertEqual((L["machine"], L["size"], L["width"]), ("zmachine", len(asm.story), 5))
        recs = {r["a"]: r for r in L["records"]}
        wrong = [f"{a:05X}" for a in asm.instructions
                 if recs.get(a, {}).get("t") != "code" or recs[a]["m"] != story.instruction(a).name]
        self.assertEqual(wrong, [], "instructions the listing shows otherwise")
        heads = [f"{a:05X}" for a in routines if recs.get(a, {}).get("m") != ".routine"]
        self.assertEqual(heads, [], "routine headers the listing shows otherwise")
        for a in strings:
            self.assertEqual(recs[a]["t"], "text", f"string at {a:05X}")
            self.assertEqual(recs[a]["d"], story.string(a), f"string at {a:05X}")
        self.assertTrue(texts <= set(recs), "text blocks with no record")
        out = run(os.path.join(SCRIPTS, "listing.py"), part, "--rebuild")
        self.assertEqual(out.returncode, 0, out.stdout + out.stderr)
        out = run(os.path.join(SCRIPTS, "check_listing.py"), part)
        self.assertEqual(out.returncode, 0, out.stdout + out.stderr)

    def test_the_runs_own_work_survives_a_new_map(self):
        asm = test_bocfel.build(3)
        part, path = self.folder(3, asm)
        sym = self.mapped(part, path)
        add3 = asm.labels["add3"][1]
        tbl = asm.labels["tbl"][1]
        sym["symbols"] = [x for x in sym["symbols"] if x["address"] != add3]
        sym["symbols"].append({"address": add3, "name": "add_three", "kind": "user", "type": "Subroutine"})
        sym["comments"].append({"address": add3, "type": "line", "text": "Adds its three arguments."})
        sym["blocks"].append({"start": tbl, "end": tbl + 15, "type": "Word Address"})
        with open(os.path.join(part, "symbols.json"), "w") as f:
            json.dump(sym, f)
        again = self.mapped(part, path)
        names = {x["address"]: x["name"] for x in again["symbols"]}
        self.assertEqual(names[add3], "add_three")
        self.assertIn({"address": add3, "type": "line", "text": "Adds its three arguments."}, again["comments"])
        self.assertIn({"start": tbl, "end": tbl + 15, "type": "Word Address"}, again["blocks"])
        L = self.listed(part, path)
        call = [r for r in L["records"] if r.get("t") == "code" and "add_three" in (r.get("o") or "")]
        self.assertTrue(call, "no call shows the run's name for the routine")


if __name__ == "__main__":
    unittest.main()
