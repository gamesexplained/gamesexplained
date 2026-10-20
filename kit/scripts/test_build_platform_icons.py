#!/usr/bin/env python3
"""The machine's logo on a game's card: every kit has one in site/icons/platforms/, in one colour (the
text's) on a 24-unit square, saying where it comes from; the card links it to the platform's page under
the machine's name; a page of one platform's games leaves it out, and so does a platform with no logo."""
from pathlib import Path
import re
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

ICONS = Path(build.SITE) / "icons" / "platforms"
GAME = {"platform": "spectrum", "slug": "fixture", "title": "Fixture", "tier": "silver"}


class PlatformIcons(unittest.TestCase):
    def test_every_kit_has_a_logo(self):
        for plat in build.kits():
            self.assertTrue((ICONS / f"{plat}.svg").is_file(), f"site/icons/platforms/{plat}.svg (kit/PLATFORMS.md)")

    def test_each_logo_is_one_colour_on_24_units_and_names_its_source(self):
        for p in sorted(ICONS.glob("*.svg")):
            svg = p.read_text()
            self.assertRegex(svg, r"^<!-- [^\n]+ -->\n<svg\b", f"{p.name}: a comment above the <svg> says where it comes from")
            self.assertIn('viewBox="0 0 24 24"', re.search(r"<svg\b([^>]*)>", svg).group(1), p.name)
            self.assertEqual(set(re.findall(r'(?:fill|stroke)="([^"]*)"', svg)) - {"none", "currentColor"}, set(),
                             f"{p.name}: a colour of its own would not follow the card's ink")
            self.assertNotRegex(svg, r"<(script|style|image|use|foreignObject)\b|href=", p.name)

    def test_the_card_links_the_logo_to_the_platform(self):
        shot, build.shot_html = build.shot_html, lambda *a, **k: ""   # the fixture has no title screen
        try:
            card = build.tile_html(GAME, "", "", "")
            bare = build.tile_html(GAME, "../", "", "", badge=False)
        finally:
            build.shot_html = shot
        m = re.search(r'<a class="plat" href="spectrum/" title="ZX Spectrum" aria-label="ZX Spectrum"><svg ([^>]*)>(.*?)</svg></a>', card)
        self.assertTrue(m, card)
        self.assertEqual(m.group(1), 'viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"')
        self.assertTrue(m.group(2).startswith("<path d="), m.group(2))
        self.assertNotIn("<!--", card)
        self.assertNotIn('class="plat"', bare)

    def test_a_platform_with_no_logo_has_none_on_its_card(self):
        self.assertEqual(build.platform_icon("nosuchmachine"), "")
        shot, build.shot_html = build.shot_html, lambda *a, **k: ""
        try:
            card = build.tile_html(dict(GAME, platform="nosuchmachine"), "", "", "")
        finally:
            build.shot_html = shot
        self.assertNotIn('class="plat"', card)


if __name__ == "__main__":
    unittest.main()
