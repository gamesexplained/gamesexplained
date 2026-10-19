#!/usr/bin/env python3
"""The thanks to the tools' makers: site/credits.json names a tool for every kit, the About page
prints each entry's words with its people in bold and its link, and a status card names its kit's
tools with their makers, emulators first. A kit with no tool, or an entry with no link, fails."""
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

TOOLS = [
    {"name": "Disasm", "by": "Ada", "url": "https://example.org/disasm", "kits": ["c64"], "role": "disassembler",
     "thanks": "**Ada**, for [Disasm], which reads the code."},
    {"name": "Emu", "by": "the Emu team", "url": "https://example.org/emu?a=1&b=2", "kits": ["c64"], "role": "emulator",
     "thanks": "**The Emu team**, for [Emu], the <emulator>."},
    {"name": "Bridge", "by": "Bob", "url": "https://example.org/bridge", "kits": ["c64"], "role": "emulator",
     "thanks": "**Bob**, for [Bridge], which drives Emu."},
    {"name": "Tests", "by": "Cy", "url": "https://example.org/tests", "thanks": "**Cy**, for the [tests]."},
]


class Thanks(unittest.TestCase):
    def credits(self, entries, kits=("c64",)):
        with tempfile.TemporaryDirectory() as d:
            json.dump({"credits": entries}, open(os.path.join(d, "credits.json"), "w"))
            with mock.patch.object(build, "SITE", d), mock.patch.object(build, "kits", lambda: list(kits)):
                return build.credits()

    def test_every_kit_on_main_names_a_tool(self):
        cs = build.credits()
        for k in build.kits():
            self.assertTrue(build.runs_on(cs, k), k)

    def test_about_line_is_the_entry_s_words(self):
        html = build.thanks_html(self.credits(TOOLS))
        self.assertIn('<li><b>Ada</b>, for <a href="https://example.org/disasm">Disasm</a>, which reads the code.</li>', html)
        self.assertIn('<a href="https://example.org/emu?a=1&amp;b=2">Emu</a>, the &lt;emulator&gt;.', html)
        self.assertIn('<b>Cy</b>, for the <a href="https://example.org/tests">tests</a>.', html)
        self.assertLess(html.index("Ada"), html.index("Cy"))   # the file's order

    def test_status_card_names_emulators_first(self):
        cs = self.credits(TOOLS)
        self.assertEqual(build.runs_on(cs, "c64"),
                         '<p class="tools">Runs on <a href="https://example.org/emu?a=1&amp;b=2">Emu</a> by the Emu team, '
                         '<a href="https://example.org/bridge">Bridge</a> by Bob and '
                         '<a href="https://example.org/disasm">Disasm</a> by Ada.</p>')
        self.assertEqual(build.runs_on(cs[:1], "c64"),
                         '<p class="tools">Runs on <a href="https://example.org/disasm">Disasm</a> by Ada.</p>')
        self.assertEqual(build.runs_on(cs, "bbc"), "")

    def test_kit_with_no_tool_fails(self):
        with self.assertRaises(SystemExit) as e:
            self.credits(TOOLS, kits=("c64", "bbc"))
        self.assertIn("bbc", str(e.exception))

    def test_entry_without_a_link_fails(self):
        for broken in ({"thanks": "**Ada**, for Disasm."}, {"url": ""}, {"by": " "}):
            with self.assertRaises(SystemExit):
                self.credits([dict(TOOLS[0], **broken)])


if __name__ == "__main__":
    unittest.main()
