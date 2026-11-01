#!/usr/bin/env python3
"""The C64 launcher starts VICE with RAM that powers on the same every time, with its sound through
the computer's speakers on a desktop, and written to /dev/null on Linux with no display and under
WSL, whose sound stalled the emulator (tools.vice_command, #634)."""
import os
import sys
import unittest
from unittest import mock

import tools  # noqa: E402


class ViceCommandTests(unittest.TestCase):
    def test_power_on_ram_has_no_random_bits(self):
        cmd = tools.vice_command("/clone/tools/vice-mcp/bin/x64sc")
        self.assertEqual(cmd[0], "/clone/tools/vice-mcp/bin/x64sc")
        i = cmd.index("-raminitrandomchance")
        self.assertEqual(cmd[i + 1], "0")

    def test_servers_on_the_clone_ports(self):
        cmd = tools.vice_command("x64sc")
        self.assertEqual(cmd[cmd.index("-mcpserverport") + 1], str(tools.VICE_PORT))
        self.assertEqual(cmd[cmd.index("-remotemonitoraddress") + 1], f"127.0.0.1:{tools.MONITOR_PORT}")

    def sound(self, env, platform="linux", release="6.8.0-generic"):
        with mock.patch.object(tools.sys, "platform", platform), \
                mock.patch.object(tools.os, "uname", return_value=mock.Mock(release=release)):
            cmd = tools.vice_command("x64sc", env)
        return cmd[cmd.index("-sounddev"):] if "-sounddev" in cmd else []

    def test_desktop_sound_through_the_speakers(self):
        self.assertEqual(self.sound({"DISPLAY": ":0"}), [])
        self.assertEqual(self.sound({}, platform="darwin"), [])

    def test_no_display_and_wsl_sound_into_nowhere(self):
        nowhere = ["-sounddev", "fs", "-soundarg", os.devnull]
        self.assertEqual(self.sound({}), nowhere)
        self.assertEqual(self.sound({"DISPLAY": ":0", "WSL_DISTRO_NAME": "Ubuntu"}), nowhere)
        self.assertEqual(self.sound({"DISPLAY": ":0"}, release="6.6.87.2-microsoft-standard-WSL2"), nowhere)
        # the virtual display adds no sound device of its own, so the two cannot disagree
        with mock.patch.object(tools.shutil, "which", return_value="/usr/bin/xvfb-run"):
            wrapped = tools.virtual_display(tools.vice_command("x64sc", {}), {})
        self.assertEqual(wrapped.count("-sounddev"), 1 if sys.platform.startswith("linux") else 0)

if __name__ == "__main__":
    unittest.main()
