#!/usr/bin/env python3
"""The status page keeps up with the games: a game made on a kind of computer (game.json's tools.host,
found by a host's match in site/status.json) puts its platform's cell there at "works", so the page lists
it under "Games made here" instead of leaving the kit under Work needed with "No game had been taken
through the kit". The prompts to copy say "an" before a name that sounds like it starts with a vowel."""
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


class StatusPage(unittest.TestCase):
    def test_a_computer_a_game_was_made_on_works(self):
        for g in games():
            host = str((g.get("tools") or {}).get("host") or "")
            if not host:
                continue   # the page lists these by name as not recording their computer
            rows = [h for h in STATUS["hosts"] if re.search(h["match"], host, re.I)]
            self.assertTrue(rows, f'{g["platform"]}/{g["slug"]}: no host in site/status.json matches its tools.host {host!r}; '
                                  "add a row to hosts, or widen a match (kit/INSTALL.md)")
            states = {h["id"]: (h["kits"].get(g["platform"]) or {}).get("state", "untested") for h in rows}
            self.assertIn("works", states.values(),
                          f'{g["platform"]}/{g["slug"]} was made on {host!r}, but its cell in site/status.json is {states}: '
                          "set it to works, and say in its note which game was made there and when")

    def test_the_page_lists_every_game_under_the_computer_it_was_made_on(self):
        gs = games()
        page = build.status_page(gs)
        made = " ".join(re.findall(r'<p class="made">(.*?)</p>', page))
        for g in gs:
            if (g.get("tools") or {}).get("host"):
                self.assertIn(f'href="{g["platform"]}/{g["slug"]}/"', made, f'{g["platform"]}/{g["slug"]}')

    def test_a_or_an_follows_the_sound(self):
        for name, word in (("Apple II", "an"), ("NES / Famicom", "an"), ("MSX", "an"), ("Atari 8-bit", "an"),
                           ("BBC Micro", "a"), ("ZX Spectrum", "a"), ("Commodore 64", "a"), ("VIC-20", "a"),
                           ("Game Boy", "a")):
            self.assertEqual(build.a_or_an(name), word, name)
        self.assertNotRegex(build.status_page([]), r"explain a (Apple|NES)\b")


if __name__ == "__main__":
    unittest.main()
