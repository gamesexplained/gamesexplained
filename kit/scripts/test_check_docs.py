#!/usr/bin/env python3
"""The narration rule reads the agent's words, not the text the game prints (#145), a page's
own class that site.css also styles is caught before the built site collapses it (#143), and a
platform's install notes keep one section per system and one row per build and kind of computer."""
import contextlib
import io
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import check_docs  # noqa: E402


def narrations(line):
    """How many lines of a facts.md holding this one line check_docs.py fails."""
    with tempfile.TemporaryDirectory() as d:
        f = Path(d) / 'facts.md'
        f.write_text(line + '\n', encoding='utf-8')
        with contextlib.redirect_stdout(io.StringIO()):
            return check_docs.scan(str(f), check_docs.NARRATION, 'narration', blank=check_docs.GAME_TEXT)


class GameText(unittest.TestCase):
    def test_quoted_as_the_game_prints_it(self):
        for line in ('The terminal prints "ORIENTATION CORRECTED" after the puzzle.',
                     'The terminal prints ORIENTATION CORRECTED after the puzzle.',
                     'The terminal prints “Orientation corrected” after the puzzle.',
                     'The variable `corrected` holds it.'):
            self.assertEqual(narrations(line), 0, line)

    def test_the_agents_own_words_still_fail(self):
        for line in ('The label was corrected after the trace.',
                     'We corrected the "ROOM" name after the trace.',
                     'A 5.25" disk; the earlier reading was wrong.',
                     'This was wrong: "OK" is printed twice.'):
            self.assertEqual(narrations(line), 1, line)


SITE = """.strip{display:block;height:8px;overflow:hidden}
.mute,.site .mute{color:var(--ink-mute)}
.src .row{display:grid}
.gamebanner.none{opacity:.5}
@media (max-width:900px){.tile{padding:0}}
"""
TEMPLATE = '<style>.cap{font-size:14px}</style><p class="cap">a caption</p>'


def collisions(style, sheet=None):
    """What check_docs.py reports for one page with this <style>, and this linked stylesheet."""
    with tempfile.TemporaryDirectory() as d:
        d = Path(d)
        (d / 'site.css').write_text(SITE, encoding='utf-8')
        (d / 'template.html').write_text(TEMPLATE, encoding='utf-8')
        link = ''
        if sheet is not None:
            (d / 'reference').mkdir()
            (d / 'reference' / 'page.css').write_text(sheet, encoding='utf-8')
            link = '<link rel="stylesheet" href="reference/page.css">'
        (d / 'index.html').write_text(f'{link}<style>{style}</style><div class="strip"></div>', encoding='utf-8')
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            n = check_docs.class_collisions(d / 'site.css', d / 'template.html', [str(d / 'index.html')])
        return n, out.getvalue()


class ClassCollisions(unittest.TestCase):
    def test_a_page_class_the_site_styles_fails(self):
        for style, sheet in (('.strip{display:flex;gap:6px}', None),      # Delta's stage picker
                             ('', 'figure.strip{margin:0}'),             # in the page's own stylesheet
                             ('.list .tile{color:red}', None)):          # a rule inside @media counts
            n, out = collisions(style, sheet)
            self.assertEqual(n, 1, (style, sheet, out))
        self.assertIn('site.css:1', collisions('.strip{display:flex}')[1])

    def test_what_is_not_a_collision(self):
        for style in ('.mute{color:var(--ink-mute)}',    # the site's rule, carried word for word
                      '.row{display:flex}',              # the site styles .row only inside .src
                      '.none{opacity:1}',                # and .none only with .gamebanner
                      '.cap{font-size:15px}',            # the template's vocabulary
                      '.strip-pick{display:flex}',       # a name of the page's own
                      '.strip canvas{width:100%}'):      # .strip used, not styled, by the page
            n, out = collisions(style)
            self.assertEqual(n, 0, (style, out))


HOSTS = [{'id': 'macos-arm64', 'name': 'macOS', 'match': 'macOS.*(Apple silicon|arm64)'},
         {'id': 'linux-x64', 'name': 'Linux', 'match': 'Linux.*x86_64'}]
TABLE = """| Build | Machine | Measured | Checks passed |
|---|---|---|---|
| v3.13.1 release, `v3.13.1-linux-x86_64-gui.zip` | Linux x86_64 | 26 September 2026 | 56 of 57 |
| v3.13.1, from source (`get-vice build`) | Linux x86_64 | 24 September 2026 | 56 of 56 |
| v3.13.1 release, `v3.13.1-macos-arm64-gui.dmg` | macOS arm64 | 28 September 2026 | 56 of 57 |
"""


def notes(text):
    """How many problems check_docs.py finds in a platform's INSTALL.md holding this text."""
    with tempfile.TemporaryDirectory() as d:
        f = Path(d) / 'INSTALL.md'
        f.write_text(text, encoding='utf-8')
        with contextlib.redirect_stdout(io.StringIO()):
            return check_docs.platform_notes([str(f)], HOSTS)


class PlatformNotes(unittest.TestCase):
    def test_one_row_per_build_and_kind(self):
        self.assertEqual(notes(TABLE), 0)       # a release and a source build; two kinds
        for row in ('| v3.13.1 release, GUI | Linux x86_64 (Ubuntu 26.04, desktop) | 6 October 2026 | 57 of 57 |',
                    '| v3.13.1, from source | Linux x86_64, no display | 25 September 2026 | 56 of 56 |',
                    '| v3.13.1 release | Ubuntu 24.04.5 x86_64, desktop | 30 September 2026 | 56 of 57 |'):
            self.assertEqual(notes(TABLE + row + '\n'), 1, row)
        self.assertEqual(notes(TABLE + '| v3.13.2 release | Linux x86_64 | 2 October 2026 | 57 of 57 |\n'), 0)

    def test_one_section_per_system(self):
        self.assertEqual(notes('## macOS — known to work\n\n## Linux\n\n## Untried systems\n'), 0)
        self.assertEqual(notes('## Linux\n\n## Linux — Ubuntu 26.04 desktop, 6 October 2026\n'), 1)


if __name__ == '__main__':
    unittest.main()
