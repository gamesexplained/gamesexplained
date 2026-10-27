#!/usr/bin/env python3
"""The kit's jsnes server parses, and every command it answers is in the tool's skill.

`node --check` reads kit/nes/jsnes_server.mjs without running it, so this needs Node and not
jsnes: the server's behaviour is checked against the machine by `tools.py --platform nes
check-emulator`, which needs a jsnes server and is run by hand, as CI does not start one.
With KIT_REQUIRE_TOOLS set, a missing Node fails instead of skipping.
"""
import os
import re
import shutil
import subprocess
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SERVER = os.path.join(HERE, "jsnes_server.mjs")
SKILL = os.path.join(ROOT, "kit", "skills", "nes", "tool-jsnes", "SKILL.md")


def server_commands():
    """The keys of the server's COMMANDS table, read from its source."""
    src = open(SERVER, encoding="utf-8").read()
    body = src[src.index("const COMMANDS = {"):]
    body = body[:body.index("\n};")]
    return re.findall(r'^    "?([a-z][a-z-]*)"?\s*(?::|,)', body, re.M)


def skill_table():
    """The first column of the skill's table of commands, as one string."""
    text = open(SKILL, encoding="utf-8").read()
    section = text[text.index("## The commands"):]
    section = section[:section.index("\n## ", 1)]
    return " ".join(ln.split("|")[1] for ln in section.splitlines() if ln.startswith("|") and ln.count("|") > 3)


class Server(unittest.TestCase):
    def test_parses(self):
        node = shutil.which("node")
        if not node:
            if os.environ.get("KIT_REQUIRE_TOOLS"):
                self.fail("no node on the path, and KIT_REQUIRE_TOOLS is set")
            self.skipTest("no node on the path: skipped")
        r = subprocess.run([node, "--check", SERVER], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_every_command_is_documented(self):
        commands = server_commands()
        self.assertIn("run", commands)
        self.assertIn("release-buttons", commands)
        table = skill_table()
        missing = [c for c in commands if f"`{c}`" not in table]
        self.assertEqual(missing, [], "commands the server answers that kit/skills/nes/tool-jsnes leaves out")


if __name__ == "__main__":
    unittest.main()
