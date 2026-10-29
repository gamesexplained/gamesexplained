#!/usr/bin/env python3
"""A story lists as a snapshot does: kit/zmachine/map.py types it, kit/scripts/listing.py lists
it, and the listing rebuilds from its own bytes.

For versions 1-5, 7 and 8, the test assembles the story test_bocfel.py plays, makes it the
story part of a game folder in a scratch directory, and checks:

  - map.py finds every routine and string the assembler wrote, and nothing else in high memory;
  - the listing shows every instruction the assembler wrote, at its address, by its name, with
    each routine's header as .routine, and every string as text, decoded as story.py decodes it;
  - the listing rebuilds from its own bytes (listing.py --rebuild), and check_listing.py passes;
  - a label, a comment and a block the run wrote survive map.py's next pass;
  - a file that runs on past the story's end, as a version 1 or 2 story's can, is laid out only
    up to the exclusion in the part's coverage that says where the story ends;
  - below high memory, the ledger finds bare only the global variables, which are the run's to
    describe: every table map.py describes is explained to its last byte, the dictionary too
    when the run has named its head.

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
sys.path.insert(0, SCRIPTS)
import ledger  # noqa: E402
import test_bocfel  # noqa: E402
from story import Story  # noqa: E402


def run(script, *args):
    return subprocess.run([sys.executable, script, *map(str, args)], capture_output=True, text=True)


class Listing(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.tmp.cleanup()

    def folder(self, v, asm, tail=b"", exclude=()):
        """A game folder whose one part is the story, with tail after it in the file."""
        g = os.path.join(self.tmp.name, f"v{v}")
        part = os.path.join(g, "parts", "story")
        os.makedirs(os.path.join(part, "work"))
        with open(os.path.join(g, "game.json"), "w") as f:
            json.dump({"platform": "apple2", "slug": "fixture", "title": "Fixture", "build": "disk"}, f)
        with open(os.path.join(part, "part.json"), "w") as f:
            json.dump({"title": "The story", "order": 1, "kind": "virtual", "machine": "zmachine",
                       "size": len(asm.story) + len(tail),
                       "coverage": {"exclude": [list(e) for e in exclude]}}, f)
        path = os.path.join(part, "work", f"story.z{v}")
        with open(path, "wb") as f:
            f.write(asm.story + tail)
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

    def test_a_story_ends_where_its_part_says(self):
        for v in (1, 2):
            with self.subTest(version=v):
                asm = test_bocfel.build(v)
                n = len(asm.story)
                high = Story(asm.story).header["high"]
                tail = bytes(12) + asm.story[high:]        # padding, then text that reads as strings
                part, path = self.folder(v, asm, tail, [(f"${n:05X}", f"${n + len(tail) - 1:05X}",
                                                         "past the story's end")])
                sym = self.mapped(part, path)
                past = [x for x in sym["symbols"] + sym["blocks"] if x.get("address", x.get("start")) >= n]
                self.assertEqual(past, [], "map.py's work past the story's end")
                self.listed(part, path)

    def bare(self, sym, story):
        """The bare runs below high memory, as (start, length, owner)."""
        L = ledger.compute(sym["blocks"], sym["symbols"], sym["comments"], {"size": len(story.mem)})
        out, a = [], 0
        while a < story.header["high"]:
            b = a
            while b < story.header["high"] and L["state"][b] == 1:
                b += 1
            if b > a:
                out.append((a, b - a, L["owner"].get(a, (None,))[0]))
            a = b + 1
        return out

    def test_the_templates_explain_their_tables(self):
        for v in test_bocfel.VERSIONS:
            with self.subTest(version=v):
                asm = test_bocfel.build(v)
                story = Story(asm.story)
                part, path = self.folder(v, asm)
                sym = self.mapped(part, path)
                g = story.header["globals"]
                self.assertEqual([(a, n) for a, n, who in self.bare(sym, story) if who != "globals"], [],
                                 "bytes map.py describes that the ledger finds bare")
                da = story.header["dictionary"]
                sym["symbols"] = [x for x in sym["symbols"] if x["address"] != da]
                sym["symbols"].append({"address": da, "name": "dictionary_head", "kind": "user", "type": "Field"})
                sym["comments"].append({"address": da, "type": "line", "text": "The run's own words for the head."})
                with open(os.path.join(part, "symbols.json"), "w") as f:
                    json.dump(sym, f)
                again = self.mapped(part, path)
                self.assertEqual([(a, n) for a, n, who in self.bare(again, story) if a != g], [],
                                 "the dictionary once the run has named its head")


if __name__ == "__main__":
    unittest.main()
