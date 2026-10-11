#!/usr/bin/env python3
"""The disassembler on a port of its own: port choice, the stdio bridge, the terminal wrapper. No installed tools or game image required."""
import base64
import gzip
import io
import json
import os
from pathlib import Path
import queue
import sys
import shlex
import tempfile
import threading
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

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
                with self.assertRaises(ValueError):
                    tools.r2000_port()

    def test_client_and_launcher_agree_on_the_port(self):
        self.assertEqual(r2000.URL, f"http://127.0.0.1:{tools.R2000_PORT}/mcp")

    def test_a_part_has_a_port_of_its_own(self):
        # kit/scripts/parts.py: each part of a game can have a disassembler running, and a script
        # given a part's folder reaches that part's, never another's
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ):
            os.environ.pop("KIT_R2000_PORT", None)
            park, street = Path(folder) / "parts" / "park", Path(folder) / "parts" / "street"
            for part in (park, street):
                (part / "work").mkdir(parents=True)
                (part / "part.json").write_text("{}")
            snap = str(park / "work" / "play.vsf")
            self.assertEqual(tools.part_dir(snap), str(park))
            self.assertIsNone(tools.part_dir(str(Path(folder) / "play.vsf")))
            busy = {3000}
            with patch.object(tools, "up", lambda port: port in busy), patch.object(tools, "r2000_instances", lambda: []):
                self.assertEqual(tools.part_port(str(park)), 3001)          # the first free one
                (park / "work" / "r2000-port").write_text("3004")
                self.assertEqual(tools.part_port(str(park)), 3004)          # the one it had, while that is free
                busy.add(3004)
                self.assertEqual(tools.part_port(str(park)), 3001)          # taken by something else since
            with patch.object(tools, "up", lambda port: port in busy), \
                    patch.object(tools, "r2000_instances", lambda: [(3004, snap, 0)]):
                self.assertEqual(tools.part_port(str(park)), 3004)          # still its own, running
            # the client: the part's port from its folder; a part with none is refused, not sent elsewhere
            self.assertEqual(r2000._port(str(park)), 3004)
            with self.assertRaises(SystemExit) as refused:
                r2000._port(str(street))
            self.assertIn("--from", str(refused.exception))
            os.environ["KIT_R2000_PORT"] = "3009"
            self.assertEqual(r2000._port(str(street)), 3009)

    def test_snapshot_conversion_preserves_ram_and_previous_project(self):
        with tempfile.TemporaryDirectory() as folder:
            snapshot = Path(folder) / "entry.vsf"
            ram = bytes(range(256)) * 256
            header = b"VICE Snapshot File\x1a" + b"\0\0" + b"C64".ljust(16, b"\0")
            module = b"C64MEM".ljust(16, b"\0") + b"\0\1" + (26 + len(ram)).to_bytes(4, "little")
            snapshot.write_bytes(header + module + b"\0" * 4 + ram)
            first = project_path(snapshot, folder)
            data = json.loads(first.read_text())
            self.assertEqual(gzip.decompress(base64.b64decode(data["raw_data_base64"])), ram)
            self.assertEqual(data["blocks"][0]["type_"], "Undefined")
            first.write_text("saved annotations")
            second = project_path(snapshot, folder)
            self.assertNotEqual(first, second)
            self.assertEqual(first.read_text(), "saved annotations")
            self.assertEqual(project_path(first), first)

    def test_bad_snapshots_fail(self):
        with tempfile.TemporaryDirectory() as folder:
            snapshot = Path(folder) / "entry.vsf"
            for data in [b"not a snapshot", b"VICE Snapshot File"]:
                snapshot.write_bytes(data)
                with self.assertRaises(ValueError):
                    project_path(snapshot, folder)
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

    def test_timeout_or_eof_refuses_later_calls_without_writing(self):
        for reply in ["timeout", None]:
            backend = self.backend()
            if reply is None:
                backend.replies.put(None)
            with self.assertRaises((RuntimeError, TimeoutError)):
                backend.call({"id": 1, "method": "tools/list"}, timeout=0.01)
            before = backend.process.stdin.getvalue()
            with self.assertRaisesRegex(RuntimeError, "unavailable"):
                backend.call({"id": 1, "method": "tools/list"})
            self.assertEqual(before, backend.process.stdin.getvalue())

    def test_future_reply_id_fails_closed(self):
        backend = self.backend()
        backend.replies.put({"id": 99, "result": {}})
        with self.assertRaisesRegex(ValueError, "ID mismatch"):
            backend.call({"id": 1, "method": "tools/list"})
        self.assertTrue(backend.broken)

    def test_broken_pipe_refuses_subsequent_writes(self):
        backend = self.backend()
        backend.process.stdin = Mock()
        backend.process.stdin.flush.side_effect = BrokenPipeError("closed")
        with self.assertRaises(BrokenPipeError):
            backend.call({"method": "notifications/initialized"})
        with self.assertRaisesRegex(RuntimeError, "unavailable"):
            backend.call({"id": 1, "method": "tools/list"})
        self.assertEqual(backend.process.stdin.write.call_count, 1)

    def test_line_reader_handles_notifications_partial_chunks_and_eof(self):
        backend = self.backend()
        # TextIOWrapper.readline joins stream chunks until a complete JSON line.
        backend.process.stdout = io.TextIOWrapper(io.BytesIO(
            b'{"method":"notifications/progress"}\n{"id":1,"result":true}\n'))
        backend.read()
        self.assertEqual(backend.call({"id": "original", "method": "tools/list"}),
                         {"id": "original", "result": True})
        with self.assertRaisesRegex(RuntimeError, "exited"):
            backend.call({"id": "next", "method": "tools/list"})

    def test_terminal_wrapper_preserves_shell_characters(self):
        command = ["/a path/bin/tool", "a'b", "$(not-a-command)", "`literal`", "$literal"]
        with patch.object(launcher.sys, "platform", "linux"), patch.object(launcher.shutil, "which", return_value="/usr/bin/script"):
            wrapped = launcher.with_pty(command, "/tmp/log")
        self.assertEqual(shlex.split(wrapped[3]), command)


if __name__ == "__main__":
    unittest.main()
