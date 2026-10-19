#!/usr/bin/env python3
"""The kit's plus4emu server imports without a machine, answers every command it declares, and
every one of them is in the tool's skill.

Imported rather than run, kit/c16/p4emu_server.py reads no arguments and starts nothing, so this
needs neither plus4emu's library nor its ROMs: the server's behaviour is checked against the
machine by `tools.py --platform c16 check-emulator`, which needs the library built and is run by
hand, as CI does not build it.
"""
import os
import re
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SERVER = os.path.join(HERE, "p4emu_server.py")
SKILL = os.path.join(ROOT, "kit", "skills", "c16", "tool-plus4emu", "SKILL.md")
sys.path.insert(0, HERE)
import p4emu_server                                                       # noqa: E402


def dispatched():
    """The commands the server's dispatch() compares a request's `cmd` with, read from its source."""
    with open(SERVER, encoding="utf-8") as f:
        src = f.read()
    body = src[src.index("    def dispatch("):]
    body = body[:body.index("\n    def ", 1)]
    names = set(re.findall(r'cmd == "([a-z-]+)"', body))
    for group in re.findall(r"cmd in \(([^)]*)\)", body):
        names |= set(re.findall(r'"([a-z-]+)"', group))
    return names


def skill_table():
    """The second column of the skill's table of commands, as one string."""
    with open(SKILL, encoding="utf-8") as f:
        text = f.read()
    section = text[text.index("## The commands"):]
    section = section[:section.index("\n## ", 1)]
    return " ".join(ln.split("|")[2] for ln in section.splitlines() if ln.startswith("|") and ln.count("|") > 3)


class Server(unittest.TestCase):
    def test_imports_without_a_machine(self):
        self.assertFalse(p4emu_server.SERVING)
        for c in ("hello", "run", "save", "load", "tape", "disk", "program", "codemap", "sound", "quit"):
            self.assertIn(c, p4emu_server.COMMANDS)

    def test_every_command_is_answered(self):
        missing = [c for c in p4emu_server.COMMANDS if c not in dispatched()]
        self.assertEqual(missing, [], "commands the server declares and dispatch() never answers")
        extra = sorted(dispatched() - set(p4emu_server.COMMANDS))
        self.assertEqual(extra, [], "commands dispatch() answers that COMMANDS leaves out, so a request never reaches them")

    def test_every_command_is_documented(self):
        table = skill_table()
        missing = [c for c in p4emu_server.COMMANDS if f"`{c}`" not in table]
        self.assertEqual(missing, [], "commands the server answers that kit/skills/c16/tool-plus4emu leaves out")


if __name__ == "__main__":
    unittest.main()
