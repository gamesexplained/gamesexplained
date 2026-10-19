#!/usr/bin/env python3
"""The machine's icon on a game's card: every kit has one in site/icons/platforms/, drawn in Lucide's
grammar (24 units, a 2-unit stroke in the text's colour) so the set reads as one; the card links it to
the platform's page under the machine's name; a page of one platform's games leaves it out, and so
does a platform with no icon."""
from pathlib import Path
import re
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

ICONS = Path(build.SITE) / "icons" / "platforms"
GAME = {"platform": "spectrum", "slug": "fixture", "title": "Fixture", "tier": "silver"}


class PlatformIcons(unittest.TestCase):
    def test_every_kit_has_an_icon(self):
        for plat in build.kits():
            self.assertTrue((ICONS / f"{plat}.svg").is_file(), f"site/icons/platforms/{plat}.svg (kit/PLATFORMS.md)")

    def test_each_icon_is_drawn_like_the_others(self):
        for p in sorted(ICONS.glob("*.svg")):
            svg = p.read_text()
            head = re.match(r"<svg\b([^>]*)>", svg).group(1)
            for attr in ('viewBox="0 0 24 24"', 'fill="none"', 'stroke="currentColor"', 'stroke-width="2"',
                         'stroke-linecap="round"', 'stroke-linejoin="round"'):
                self.assertIn(attr, head, p.name)
            self.assertEqual(set(re.findall(r'(?:fill|stroke)="([^"]*)"', svg)) - {"none", "currentColor"}, set(),
                             f"{p.name}: a colour of its own would not follow the card's ink")
            self.assertNotRegex(svg, r"<(script|style|image|use|foreignObject)\b|href=", p.name)

    def test_the_card_links_the_icon_to_the_platform(self):
        shot, build.shot_html = build.shot_html, lambda *a, **k: ""   # the fixture has no title screen
        try:
            card = build.tile_html(GAME, "", "", "")
            bare = build.tile_html(GAME, "../", "", "", badge=False)
        finally:
            build.shot_html = shot
        m = re.search(r'<a class="plat" href="spectrum/" title="ZX Spectrum" aria-label="ZX Spectrum"><svg ([^>]*)>(.*?)</svg></a>', card)
        self.assertTrue(m, card)
        self.assertIn('aria-hidden="true"', m.group(1))
        self.assertIn('<rect x="2" y="6.5"', m.group(2))
        self.assertNotIn('class="plat"', bare)

    def test_a_platform_with_no_icon_has_none_on_its_card(self):
        self.assertEqual(build.platform_icon("nosuchmachine"), "")
        shot, build.shot_html = build.shot_html, lambda *a, **k: ""
        try:
            card = build.tile_html(dict(GAME, platform="nosuchmachine"), "", "", "")
        finally:
            build.shot_html = shot
        self.assertNotIn('class="plat"', card)


if __name__ == "__main__":
    unittest.main()
