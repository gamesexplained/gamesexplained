#!/usr/bin/env python3
"""Separate-clone transport checks; no installed tools or game image required."""
import base64
import gzip
import io
import json
from pathlib import Path
import queue
import shlex
import tempfile
import threading
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import endpoints
from stdio_bridge import Stdio, project_path
import tools


class EndpointTests(unittest.TestCase):
    def test_ports_default_override_and_rejection(self):
        with tempfile.TemporaryDirectory() as folder:
            config = Path(folder) / "ports.json"
            with patch.object(endpoints, "CONFIG", config):
                self.assertEqual(endpoints.ports(), {"vice": 6510, "r2000": 3000})
                config.write_text('{"r2000":3001}')
                self.assertEqual(endpoints.ports(), {"vice": 6510, "r2000": 3001})
                for bad in [[], {"other": 3001}, {"vice": True}, {"vice": 1023},
                            {"r2000": 65536}, {"vice": "6511"}, {"r2000": 6510}]:
                    with self.subTest(bad=bad):
                        config.write_text(json.dumps(bad))
                        with self.assertRaises(ValueError):
                            endpoints.ports()

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
        with patch.object(tools.sys, "platform", "linux"), patch.object(tools.shutil, "which", return_value="/usr/bin/script"):
            wrapped = tools.with_pty(command, "/tmp/log")
        self.assertEqual(shlex.split(wrapped[3]), command)


if __name__ == "__main__":
    unittest.main()
