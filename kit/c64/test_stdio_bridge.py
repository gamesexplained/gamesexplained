#!/usr/bin/env python3
"""The disassembler on a port of its own: port choice, the stdio bridge, the terminal wrapper. No installed tools or game image required."""
import base64
import gzip
import io
import json
import os
from pathlib import Path
import queue
import shlex
import tempfile
import threading
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from stdio_bridge import Stdio, project_path
import tools  # the C64 launcher, which puts kit/scripts on sys.path
import launcher
import r2000


class BridgeTests(unittest.TestCase):
    def test_port_from_variable_then_file_then_default(self):
        with tempfile.TemporaryDirectory() as folder:
            saved = Path(folder) / "r2000-port"
            with patch.object(tools, "R2000_PORT_FILE", str(saved)), patch.dict(os.environ):
                os.environ.pop("KIT_R2000_PORT", None)
                self.assertEqual(tools.r2000_port(), 3000)
                saved.write_text("3001")
                self.assertEqual(tools.r2000_port(), 3001)
                os.environ["KIT_R2000_PORT"] = "3002"
                self.assertEqual(tools.r2000_port(), 3002)
                saved.write_text("not a port")
                del os.environ["KIT_R2000_PORT"]
                self.assertEqual(tools.r2000_port(), 3000)

    def test_client_and_launcher_agree_on_the_port(self):
        self.assertEqual(r2000.URL, f"http://127.0.0.1:{tools.R2000_PORT}/mcp")

    def test_snapshot_conversion_preserves_ram_and_previous_project(self):
        with tempfile.TemporaryDirectory() as folder:
            snapshot = Path(folder) / "entry.vsf"
            ram = bytes(range(256)) * 256
            snapshot.write_bytes(b"VICE Snapshot File".ljust(209, b"\0") + ram)
            first = project_path(snapshot)
            data = json.loads(first.read_text())
            self.assertEqual(gzip.decompress(base64.b64decode(data["raw_data_base64"])), ram)
            self.assertEqual(data["blocks"][0]["type_"], "Undefined")
            first.write_text("saved annotations")
            second = project_path(snapshot)
            self.assertNotEqual(first, second)
            self.assertEqual(first.read_text(), "saved annotations")
            self.assertEqual(project_path(first), first)

    def test_bad_snapshots_fail(self):
        with tempfile.TemporaryDirectory() as folder:
            snapshot = Path(folder) / "entry.vsf"
            for data in [b"not a snapshot", b"VICE Snapshot File"]:
                snapshot.write_bytes(data)
                with self.assertRaises(ValueError):
                    project_path(snapshot)
            with self.assertRaises(ValueError):
                project_path(Path(folder) / "entry.bin")

    def backend(self):
        backend = Stdio.__new__(Stdio)
        backend.process = SimpleNamespace(stdin=io.StringIO())
        backend.replies = queue.Queue()
        backend.lock = threading.Lock()
        backend.next_id = 0
        return backend

    def test_rpc_ids_ignore_notifications_and_stale_replies(self):
        backend = self.backend()
        backend.replies.put({"jsonrpc": "2.0", "method": "notifications/progress"})
        backend.replies.put({"jsonrpc": "2.0", "id": 0, "result": "stale"})
        backend.replies.put({"jsonrpc": "2.0", "id": 1, "result": "current"})
        request = {"jsonrpc": "2.0", "id": "client-id", "method": "tools/list"}
        reply = backend.call(request)
        self.assertEqual(reply["id"], "client-id")
        self.assertEqual(reply["result"], "current")
        self.assertEqual(json.loads(backend.process.stdin.getvalue())["id"], 1)
        self.assertEqual(request["id"], "client-id")

    def test_notifications_need_no_reply(self):
        backend = self.backend()
        self.assertIsNone(backend.call({"jsonrpc": "2.0", "method": "notifications/initialized"}))
        self.assertNotIn("id", json.loads(backend.process.stdin.getvalue()))

    def test_exit_and_invalid_request_fail(self):
        backend = self.backend()
        with self.assertRaises(ValueError):
            backend.call([])
        backend.replies.put(None)
        with self.assertRaisesRegex(RuntimeError, "exited"):
            backend.call({"id": 1, "method": "tools/list"})

    def test_terminal_wrapper_preserves_shell_characters(self):
        command = ["/a path/bin/tool", "a'b", "$(not-a-command)", "`literal`", "$literal"]
        with patch.object(launcher.sys, "platform", "linux"), patch.object(launcher.shutil, "which", return_value="/usr/bin/script"):
            wrapped = launcher.with_pty(command, "/tmp/log")
        self.assertEqual(shlex.split(wrapped[3]), command)


if __name__ == "__main__":
    unittest.main()
