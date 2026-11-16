#!/usr/bin/env python3
"""copy_lint.py finds the sentences on a game's pages that break a house-style rule a pattern can
catch, in the text a reader sees: each rule fires on its own example and stays quiet on the
nearest fair sentence; the game's own words, quotations, code and scripts are left alone; a
heading is checked whole; length is not a rule; and the script exits 0 on findings unless it is
run with --strict."""
from pathlib import Path
import io
import sys
import tempfile
import unittest
from contextlib import redirect_stdout

sys.path.insert(0, str(Path(__file__).resolve().parent))
import copy_lint  # noqa: E402


def rules(html):
    return [rule.split(" ")[0] for _, rule, _ in copy_lint.lint_text(html)]


class Rules(unittest.TestCase):
    def fires(self, rule, sentence):
        self.assertIn(rule, rules(f"<p>{sentence}</p>"), sentence)

    def quiet(self, sentence):
        self.assertEqual(rules(f"<p>{sentence}</p>"), [], sentence)

    def test_dash(self):
        self.fires("dash", "The gauge lies—by one pixel.")
        self.fires("dash", "The gauge lies – by one pixel.")
        self.fires("dash", "The gauge lies - by one pixel.")
        self.quiet("Scores from 400 – 1499 earn a bonus.")
        self.quiet("The timer starts at (28 - level) x 2.")
        self.quiet("A one-way door opens.")

    def test_announcer(self):
        self.fires("announcer", "Here's the odd part.")
        self.fires("announcer", "It turns out the gauge reads high.")
        self.fires("announcer", "Let's fly!")
        self.fires("announcer", "The interesting thing is that the gauge reads high.")
        self.quiet("The gauge reads high.")

    def test_imperative(self):
        self.fires("imperative", "Notice how the gauge drops.")
        self.fires("imperative", "Listen to the last note of the tune.")
        self.fires("imperative", "Imagine a room with no doors.")
        self.quiet("REMEMBER NIGHTMARE adds two points.")
        self.quiet("Remember's file holds the map.")
        self.quiet("Press fire to start.")

    def test_contrast(self):
        self.fires("contrast", "It's not a screenshot, it's a reconstruction.")
        self.fires("contrast", "A scenario is not just a map.")
        self.fires("contrast", "The tune is more than just a loop.")
        self.fires("contrast", "The game not only scrolls but also wraps.")
        self.quiet("It's not on the map, but this is the room.")
        self.quiet("The ship has not just landed.")

    def test_no_x(self):
        self.fires("no-x", "No gate leads to the tenth system.")
        self.fires("no-x", "The code checks it, but no player is told.")
        self.fires("no-x", "It is an exit which is found by no player.")
        self.fires("no-x", "Flags 0, 1 and 3 are read by nothing.")
        self.fires("no-x", "The tunes are in the table, and nothing ever starts them.")
        self.fires("no-x", "Pictures 81 to 99 belong to no room.")
        self.quiet("There is no gate to the tenth system.")
        self.quiet("The ship no longer moves.")
        self.quiet("The disk shows no picture at all.")
        self.quiet("The game has three tunes and no music during play.")
        self.quiet("Nothing happens when fire is held.")
        self.quiet("By no means is it slow.")

    def test_hype(self):
        self.fires("hype", "The renderer is elegant.")
        self.quiet("The renderer draws each row once.")

    def test_length_is_not_a_rule(self):
        self.quiet(" ".join(["word"] * 60) + ".")

    def test_sentences_are_split(self):
        found = rules("<p>The gauge is clever. It reads high. Here's the odd part.</p>")
        self.assertEqual(found, ["hype", "announcer"])
        self.assertEqual(copy_lint.sentences("The bar fills. [code] counts down."),
                         ["The bar fills.", "[code] counts down."])

    def test_abbreviations_do_not_split(self):
        self.assertEqual(copy_lint.sentences("Each bonus, e.g. the shield, lasts. The end."),
                         ["Each bonus, e.g. the shield, lasts.", "The end."])


class Skipped(unittest.TestCase):
    def test_scripts_styles_and_code_blocks(self):
        html = ("<script>let s = 'Here's the thing — elegant';</script><style>p{}</style>"
                "<pre>Here's the thing — elegant</pre>")
        self.assertEqual(rules(html), [])

    def test_the_games_own_words(self):
        self.assertEqual(rules("<blockquote>Here's the thing — elegant.</blockquote>"), [])
        self.assertEqual(rules("<p>The sign says <q>Here's the thing — elegant.</q></p>"), [])
        self.assertEqual(rules('<p data-copy-lint="off">Here\'s the thing — elegant.</p>'), [])
        self.assertEqual(rules("<p>The screen reads “Here's the thing — elegant.”</p>"), [])
        self.assertEqual(rules('<p>The screen reads "a clever trick".</p>'), [])
        self.assertEqual(rules("<p>REMEMBER NO WAY - DOWN</p>"), [])
        self.assertEqual(rules("<p>Are you clever ?</p>"), [])

    def test_inline_code_is_a_placeholder(self):
        _, _, s = copy_lint.lint_text("<p>Set <code>$D020 - 1</code> — then wait.</p>")[0]
        self.assertEqual(s, "Set [code] — then wait.")

    def test_headings_are_checked_whole(self):
        self.assertEqual(rules("<h2>Secret: the gauge lies. By one pixel — up</h2>"), ["dash"])
        self.assertEqual(rules("<h2>Secret: no gate leads to the tenth system</h2>"), ["no-x"])

    def test_layouts_are_not_pages(self):
        with tempfile.TemporaryDirectory() as tmp:
            for name in ("index.html", "about-layout.html"):
                (Path(tmp) / name).write_text("<p>Here's the thing.</p>")
            self.assertEqual([f.name for f in copy_lint.pages(Path(tmp), None)], ["index.html"])


class Exit(unittest.TestCase):
    def run_on(self, text, *flags):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "index.html").write_text(text)
            out = io.StringIO()
            with redirect_stdout(out):
                code = copy_lint.main([tmp, *flags])
            return code, out.getvalue()

    def test_findings_exit_zero_unless_strict(self):
        self.assertEqual(self.run_on("<p>It's elegant.</p>")[0], 0)
        code, out = self.run_on("<p>It's elegant.</p>", "--strict")
        self.assertEqual(code, 1)
        self.assertIn("index.html:1  hype  It's elegant.", out)
        self.assertIn("hype 1; 1 in all", out)

    def test_clean_page(self):
        code, out = self.run_on("<p>The gauge reads high.</p>", "--strict")
        self.assertEqual(code, 0)
        self.assertIn("nothing found", out)


if __name__ == "__main__":
    unittest.main()
