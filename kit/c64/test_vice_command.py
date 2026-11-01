#!/usr/bin/env python3
"""The C64 launcher starts VICE with RAM that powers on the same every time, and with its sound on
and written to /dev/null on every computer, display or none (tools.vice_command, #634)."""
import os
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

    def test_sound_on_into_nowhere(self):
        cmd = tools.vice_command("x64sc")
        self.assertIn("-sound", cmd)
        self.assertEqual(cmd[cmd.index("-sounddev") + 1], "fs")
        self.assertEqual(cmd[cmd.index("-soundarg") + 1], os.devnull)
        # the virtual display adds no sound device of its own, so the two cannot disagree
        with mock.patch.object(tools.shutil, "which", return_value="/usr/bin/xvfb-run"):
            wrapped = tools.virtual_display(cmd, {})
        self.assertEqual(wrapped.count("-sounddev"), 1)


if __name__ == "__main__":
    unittest.main()
