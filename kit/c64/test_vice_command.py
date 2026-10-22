#!/usr/bin/env python3
"""The C64 launcher starts VICE with RAM that powers on the same every time (tools.vice_command)."""
import unittest

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


if __name__ == "__main__":
    unittest.main()
