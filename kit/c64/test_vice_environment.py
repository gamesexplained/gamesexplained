#!/usr/bin/env python3
"""The C64 launcher keeps bundled compatibility libraries private to this clone."""
import os
import sys
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import tools  # noqa: E402
import launcher  # noqa: E402


class ViceEnvironmentTests(unittest.TestCase):
    def test_bundled_library_path_is_clone_local_and_preserves_existing_path(self):
        with tempfile.TemporaryDirectory() as root:
            libdir = os.path.join(root, "vice-libs", "usr", "lib", "x86_64-linux-gnu")
            os.makedirs(libdir)
            with patch.object(tools, "TOOLS", root), patch.object(tools.sys, "platform", "linux"):
                env = tools.vice_environment({"LD_LIBRARY_PATH": "/existing/lib", "KEEP": "yes"})
            self.assertEqual(env["LD_LIBRARY_PATH"], libdir + os.pathsep + "/existing/lib")
            self.assertEqual(env["KEEP"], "yes")

    def test_missing_library_probe_uses_child_environment(self):
        env = {"LD_LIBRARY_PATH": "/clone/tools/vice-libs"}
        result = SimpleNamespace(stdout="libFLAC.so.12 => not found\n")
        with patch.object(launcher.sys, "platform", "linux"), \
             patch.object(launcher.shutil, "which", return_value="/usr/bin/ldd"), \
             patch.object(launcher.subprocess, "run", return_value=result) as run:
            self.assertEqual(launcher.missing_libraries("/clone/tools/vice-mcp/bin/x64sc", env),
                             ["libFLAC.so.12"])
        self.assertEqual(run.call_args.kwargs["env"], env)


if __name__ == "__main__":
    unittest.main()
