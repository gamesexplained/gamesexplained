#!/usr/bin/env python3
"""The status page keeps up with the games and stays short: a game made on a kind of computer (game.json's
tools.host, found by a host's match in site/status.json) puts its platform's cell there at "works"; each
cell is Works, Limited or Not yet, names two of the games made there and counts the rest; and the
contributors table counts each person's merged pull requests and the games they added, and names the
platforms those are on, leaving out the people status.json names."""
from pathlib import Path
import glob
import json
import os
import re
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

STATUS = json.load(open(os.path.join(build.SITE, "status.json"), encoding="utf-8"))


def games():
    return [json.load(open(p, encoding="utf-8")) for p in sorted(glob.glob(os.path.join(build.ROOT, "games", "*", "*", "game.json")))]


def game(slug, tier="silver", platform="c64"):
    return {"platform": platform, "slug": slug, "title": slug.title(), "tier": tier}


class StatusPage(unittest.TestCase):
    def test_a_computer_a_game_was_made_on_works(self):
        for g in games():
            host = str((g.get("tools") or {}).get("host") or "")
            if not host:
                continue   # the page counts these under no computer
            rows = [h for h in STATUS["hosts"] if re.search(h["match"], host, re.I)]
            self.assertTrue(rows, f'{g["platform"]}/{g["slug"]}: no host in site/status.json matches its tools.host {host!r}; '
                                  "add a row to hosts, or widen a match (kit/INSTALL.md)")
            states = {h["id"]: (h["kits"].get(g["platform"]) or {}).get("state", "untested") for h in rows}
            self.assertIn("works", states.values(),
                          f'{g["platform"]}/{g["slug"]} was made on {host!r}, but its cell in site/status.json is {states}: '
                          "set it to works, and say in its note which game was made there and when")

    def test_a_cell_names_two_games_best_first_and_counts_the_rest(self):
        self.assertEqual(build.and_more([]), "")
        self.assertEqual(build.and_more([game("a")]), '<a href="c64/a/">A</a>')
        self.assertEqual(build.and_more([game("a"), game("b")]), '<a href="c64/a/">A</a> and <a href="c64/b/">B</a>')
        three = [game("a"), game("b"), game("c")]
        self.assertEqual(build.and_more(three), '<a href="c64/a/">A</a>, <a href="c64/b/">B</a> and <a href="c64/c/">C</a>')
        four = [game("a"), game("b"), game("c", "platinum"), game("d")]
        self.assertEqual(build.and_more(four), '<a href="c64/c/">C</a>, <a href="c64/a/">A</a> and 2 more')

    def test_every_cell_is_a_verdict_with_no_notes_or_prompts(self):
        page = build.status_page(games(), [])
        table = re.search(r'<table class="kits">(.*?)</table>', page, re.S).group(1)
        cells = re.findall(r'<td data-host="[^"]*">(.*?)</td>', table)
        self.assertEqual(len(cells), len(build.kits()) * len(STATUS["hosts"]))
        for c in cells:
            self.assertRegex(c, r'^<span class="state (works|limited|untested)">(Works|Limited|Not yet)</span>')
            self.assertLessEqual(c.count("<a "), 3, c)   # three named when there are three, else two and a count
        self.assertNotIn("Clone ", page)
        for h in STATUS["hosts"]:
            for cell in h["kits"].values():
                self.assertNotIn(cell["note"][:40], page)

    def test_contributors_count_pull_requests_games_and_platforms(self):
        changes = [
            {"pr": 1, "who": [["Ada", "ada"]], "added": ["c64/a"]},
            {"pr": 2, "who": [["Ada", "ada"]], "added": ["nes/b"]},
            {"pr": 3, "who": [["Ada", "ada"]], "added": ["c64/gone"]},     # removed from the site since
            {"who": [["Ada", "ada"]]},                                      # pushed to main: no pull request
            {"pr": 4, "who": [["Bo", None]], "added": ["c64/c"]},           # an author GitHub could not name
            {"pr": 5, "who": [["Cy", "cy"]]},
            {"pr": 6, "who": [["Cy", "cy"]]},
            {"pr": 7, "who": [["Aaron Bell", "AIR"], ["Ada", "ada"]]},
            {"pr": 8, "who": [["Dee", "dee"]]},
        ]
        changes.insert(0, {"pr": 9, "who": [["Ada", "ada"]], "added": ["nes/e"]})
        gs = [game("a"), game("b", platform="nes"), game("c"), game("e", platform="nes")]
        self.assertEqual(build.contributor_board(changes, gs, ["air", "dee"]),
                         [("Ada", "ada", 5, 3, ["nes", "c64"]), ("Cy", "cy", 2, 0, []), ("Bo", None, 1, 1, ["c64"])])

    def test_the_page_leaves_out_who_status_json_says(self):
        left = (STATUS.get("contributors") or {}).get("leave_out") or []
        self.assertIn("air", left)
        page = build.status_page([game("a")], [{"pr": 1, "who": [["Aaron Bell", "air"]]},
                                              {"pr": 2, "who": [["Ada", "ada"]], "added": ["c64/a"]}])
        people = re.search(r'<table class="people">(.*?)</table>', page, re.S).group(1)
        self.assertIn('href="https://github.com/ada"', people)
        self.assertIn("<td>Commodore 64</td>", people)   # the platforms by name
        self.assertNotIn("github.com/air", people)


if __name__ == "__main__":
    unittest.main()
