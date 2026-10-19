#!/usr/bin/env python3
"""The kit's Apple2TS server parses, and every command it answers is in the tool's skill.

`node --check` reads kit/apple2/apple2ts_server.mjs and the two files bundled with it without
running them, so this needs Node and not Apple2TS: the server's behaviour is checked against the
machine by `tools.py --platform apple2 check-emulator`, which needs the server built and is run by
hand, as CI does not build it. With KIT_REQUIRE_TOOLS set, a missing Node fails instead of skipping.
"""
import os
import re
import shutil
import subprocess
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SERVER = os.path.join(HERE, "apple2ts_server.mjs")
SOURCES = [SERVER, os.path.join(HERE, "apple2ts_clock.mjs"), os.path.join(HERE, "apple2ts_build.mjs")]
SKILL = os.path.join(ROOT, "kit", "skills", "apple2", "tool-apple2ts", "SKILL.md")


def server_commands():
    """The keys of the server's COMMANDS table, read from its source."""
    with open(SERVER, encoding="utf-8") as f:
        src = f.read()
    body = src[src.index("const COMMANDS = {"):]
    body = body[:body.index("\n};")]
    return re.findall(r'^    "?([a-z][a-z-]*)"?\s*(?::|,)', body, re.M)


def skill_table():
    """The second column of the skill's table of commands, as one string."""
    with open(SKILL, encoding="utf-8") as f:
        text = f.read()
    section = text[text.index("## The commands"):]
    section = section[:section.index("\n## ", 1)]
    return " ".join(ln.split("|")[2] for ln in section.splitlines() if ln.startswith("|") and ln.count("|") > 3)


class Server(unittest.TestCase):
    def test_parses(self):
        node = shutil.which("node")
        if not node:
            if os.environ.get("KIT_REQUIRE_TOOLS"):
                self.fail("no node on the path, and KIT_REQUIRE_TOOLS is set")
            self.skipTest("no node on the path: skipped")
        for path in SOURCES:
            r = subprocess.run([node, "--check", path], capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, f"{os.path.basename(path)}: {r.stderr}")

    def test_every_command_is_documented(self):
        commands = server_commands()
        for c in ("hello", "run", "boot", "release-keys", "set-registers", "codemap", "quit"):
            self.assertIn(c, commands)
        table = skill_table()
        missing = [c for c in commands if f"`{c}`" not in table]
        self.assertEqual(missing, [], "commands the server answers that kit/skills/apple2/tool-apple2ts leaves out")


if __name__ == "__main__":
    unittest.main()
