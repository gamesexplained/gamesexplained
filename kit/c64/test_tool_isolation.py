"""Pure tests: no live ports, emulators, disassemblers or process signals.

Run: python3 -m unittest discover -s kit/c64 -p test_tool_isolation.py
"""
import base64
import gzip
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch, mock_open

import ports
import stdio_bridge as bridge
import r2000
import vice

# The platform dispatcher can also be named tools; import this launcher explicitly.
spec = importlib.util.spec_from_file_location("c64_launcher", Path(__file__).with_name("tools.py"))
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)


def snapshot(ram, extended=True):
    header = b"VICE Snapshot File\x1a" + b"\0\0" + b"C64".ljust(16, b"\0")
    if extended:
        header += b"VICE Version\x1a" + b"\0" * 8
    def module(name, body):
        return name.ljust(16, b"\0") + b"\0\1" + (22 + len(body)).to_bytes(4, "little") + body
    return header + module(b"IGNORED", b"other module") + module(b"C64MEM", b"\0" * 4 + ram)


class PortTests(unittest.TestCase):
    def test_environment_then_saved_then_legacy_then_defaults(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            self.assertEqual(ports.resolve_ports(root, {}), {"vice": 6510, "r2000": 3000})
            (root / "ports.json").write_text('{"vice": 16510, "r2000": 13000}')
            (root / "vice-port").write_text("16511\n")
            self.assertEqual(ports.resolve_ports(root, {}), {"vice": 16511, "r2000": 13000})
            self.assertEqual(ports.resolve_ports(root, {"KIT_VICE_PORT": "16512"}),
                             {"vice": 16512, "r2000": 13000})

    def test_invalid_override_and_cross_source_collision_fail(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "r2000-port").write_text("13000\n")
            for raw in ("garbage", "", "1023", "65536", "13000"):
                with self.subTest(raw=raw), self.assertRaises(ValueError):
                    ports.resolve_ports(root, {"KIT_VICE_PORT": raw})
            (root / "r2000-port").write_text("garbage")
            with self.assertRaises(ValueError):
                ports.resolve_ports(root, {})

    def test_defaults_only_when_file_missing(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(ports.load_ports(Path(d) / "missing"), {"vice": 6510, "r2000": 3000})

    def test_alternate_and_partial_settings(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "ports.json"
            for config, expected in (({"vice": 16510, "r2000": 13000}, {"vice": 16510, "r2000": 13000}),
                                     ({"vice": 16510}, {"vice": 16510, "r2000": 3000})):
                p.write_text(json.dumps(config))
                self.assertEqual(ports.load_ports(p), expected)

    def test_invalid_settings_never_silently_use_defaults(self):
        values = ["{", "null", "[]", '{"vicee": 16510}', '{"vice": true}',
                  '{"vice": "16510"}', '{"vice": 16510.0}', '{"vice": 1023}',
                  '{"r2000": 65536}', '{"vice": 13000, "r2000": 13000}']
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "ports.json"
            for value in values:
                with self.subTest(value=value):
                    p.write_text(value)
                    with self.assertRaises(ValueError):
                        ports.load_ports(p)

    def test_clients_share_configured_ports(self):
        self.assertEqual(vice.URL, f"http://127.0.0.1:{ports.VICE_PORT}/mcp")
        self.assertEqual(r2000.URL, f"http://127.0.0.1:{ports.R2000_PORT}/mcp")

    def test_invalid_part_port_never_falls_back_to_another_session(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            part = root / "parts" / "level"
            (part / "work").mkdir(parents=True)
            (part / "part.json").write_text("{}")
            saved = part / "work" / "r2000-port"
            with patch.object(ports, "SETTINGS", root / "tools" / "ports.json"), \
                 patch.dict(r2000.os.environ, {}, clear=True):
                for value in ("not a port", "", "0", "65536", "6510"):
                    saved.write_text(value)
                    with self.subTest(value=value), self.assertRaises(ValueError):
                        r2000._port(str(part))
                saved.write_text("3007")
                self.assertEqual(r2000._port(str(part)), 3007)


class ProcessIsolationTests(unittest.TestCase):
    def test_pty_round_trip_preserves_shell_metacharacters(self):
        cmd = ["/clone with spaces/tool", "a'quote", 'a"quote', '$(no-command)', '`no-command`', 'semi;colon', 'line\nbreak']
        with patch.object(launcher.sys, "platform", "linux"), patch.object(launcher.shutil, "which", return_value="/usr/bin/script"):
            wrapped = launcher.launcher.with_pty(cmd, "/clone with spaces/tool.log")
        self.assertEqual(shlex.split(wrapped[3]), cmd)
        self.assertEqual(wrapped[-1], "/clone with spaces/tool.log")

    def test_server_sources_and_clone_boundaries(self):
        root = "/workspace/clone with spaces"
        source = root + "/games/c64/a/work/a snapshot.vsf"
        with patch.object(launcher, "ROOT", root), patch.object(launcher, "R2000_PORT", 13000):
            direct = ["/usr/bin/regenerator2000", "--mcp-server-stdio", source]
            wrapped = ["/usr/bin/python3", root + "/kit/c64/stdio_bridge.py", direct[0], source, "13000"]
            self.assertEqual(launcher.r2000_source(direct), source)
            self.assertEqual(launcher.r2000_source(wrapped), source)
            self.assertIsNone(launcher.r2000_source(["sh", "-c", shlex.join(wrapped)]))
            self.assertIsNone(launcher.r2000_source(wrapped[:-1] + ["3000"]))
            self.assertIsNone(launcher.r2000_source(direct[:-1] + [root + "-other/snapshot.vsf"]))

    def test_quoted_ps_fallback_and_bad_quoting(self):
        argv = ["/usr/bin/regenerator2000", "--mcp-server", "/clone with spaces/a.vsf"]
        with patch("builtins.open", side_effect=OSError):
            self.assertEqual(launcher.process_args(42, shlex.join(argv)), argv)
            self.assertEqual(launcher.process_args(42, "'unterminated"), [])

    def test_linux_argv_keeps_unquoted_spaces(self):
        argv = ["/usr/bin/regenerator2000", "--mcp-server", "/clone with spaces/a.vsf"]
        f = io.BytesIO(b"\0".join(a.encode() for a in argv) + b"\0")
        with patch("builtins.open", return_value=f):
            self.assertEqual(launcher.process_args(42, "ambiguous ps text"), argv)

    def test_running_prefers_listener_over_shell_wrapper(self):
        source = launcher.ROOT + "/games/c64/test/work/a snapshot.vsf"
        argv = ["python3", launcher.ROOT + "/kit/c64/stdio_bridge.py", "/usr/bin/regenerator2000", source, str(launcher.R2000_PORT)]
        owner = shlex.join(argv)
        wrapper = shlex.join(["sh", "-c", owner])
        ps = f"41 00:05 {wrapper}\n42 00:02 {owner}\n"
        with patch.object(launcher, "port_owner", return_value=owner), \
             patch.object(launcher.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, ps)), \
             patch.object(launcher, "process_args", side_effect=lambda pid, command: shlex.split(command)), \
             patch.object(launcher.time, "time", return_value=1000):
            self.assertEqual(launcher.r2000_running(), (source, 997))

    def test_foreign_listener_is_not_a_local_session(self):
        with patch.object(launcher, "port_owner", return_value="/other/clone/regenerator2000 --mcp-server /other/a.vsf"), \
             patch.object(launcher.subprocess, "run") as run:
            self.assertIsNone(launcher.r2000_running())
            run.assert_not_called()

    def test_unknown_listener_protects_all_games(self):
        owner = launcher.ROOT + "/tools/unknown-server"
        with patch.object(launcher, "port_owner", return_value=owner), \
             patch.object(launcher.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, "")):
            self.assertEqual(launcher.r2000_running(), ("", 0))

    def test_instances_keep_part_sessions_separate_from_wrappers_and_other_clones(self):
        root = launcher.ROOT
        one = root + "/games/c64/example/parts/one/work/a snapshot.vsf"
        two = root + "/games/c64/example/parts/two/work/another snapshot.vsf"
        first = shlex.join(["regenerator2000", "--mcp-server", one])
        second = shlex.join(["python3", launcher.BRIDGE, "regenerator2000", two, "3001"])
        wrapper = shlex.join(["sh", "-c", second])
        foreign = shlex.join(["regenerator2000", "--mcp-server", root + "-other/a.vsf"])
        ps = f"41 00:05 {first}\n42 00:02 {second}\n43 00:03 {wrapper}\n44 00:01 {foreign}\n"
        with patch.object(launcher, "R2000_PORT", 13000), \
             patch.object(launcher, "port_owner", side_effect=lambda port: {3000:first, 3001:second}.get(port)), \
             patch.object(launcher.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, ps)), \
             patch.object(launcher, "process_args", side_effect=lambda pid, command: shlex.split(command)), \
             patch.object(launcher, "r2000_running", return_value=None), \
             patch.object(launcher.time, "time", return_value=1000):
            self.assertEqual(launcher.r2000_instances(), [(3000, one, 994), (3001, two, 997)])

    def test_instances_preserve_unknown_listener_guard(self):
        with patch.object(launcher.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, "")), \
             patch.object(launcher, "r2000_running", return_value=("", 0)):
            self.assertEqual(launcher.r2000_instances(), [(launcher.R2000_PORT, "", 0)])

    def test_inactive_default_port_does_not_adopt_another_parts_stdio_child(self):
        with patch.object(launcher, "port_owner", return_value=None), \
             patch.object(launcher, "up", return_value=False), \
             patch.object(launcher.subprocess, "run") as run:
            self.assertIsNone(launcher.r2000_running())
            run.assert_not_called()

    def test_unknown_source_protects_unexported_part_annotations(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            game = root / "games" / "c64" / "example"
            part = game / "parts" / "one"
            (part / "work").mkdir(parents=True)
            (game / "game.json").write_text("{}")
            (part / "part.json").write_text("{}")
            log = part / "work" / "annotations.jsonl"
            log.write_text('{}\n')
            with patch.object(launcher, "ROOT", str(root)):
                self.assertEqual(launcher.unexported("", 0), [(str(part), str(log), None)])

    def test_alternate_port_conflict_never_launches(self):
        with patch.object(launcher, "R2000_PORT", 13000), \
             patch.object(launcher.os.path, "exists", return_value=True), \
             patch.object(launcher, "up", return_value=True) as up, \
             patch.object(launcher, "foreign_detail", return_value="other project") as detail, \
             patch.object(launcher, "start") as start:
            with self.assertRaisesRegex(SystemExit, ":13000"):
                launcher.r2000("unused.vsf")
            up.assert_called_once_with(13000)
            detail.assert_called_once_with(13000)
            start.assert_not_called()

    def test_vice_conflict_checks_only_its_configured_port(self):
        with patch.object(launcher, "VICE_PORT", 16510), \
             patch.object(launcher.os.path, "exists", return_value=True), \
             patch.object(launcher, "missing_libraries", return_value=[]), \
             patch.object(launcher, "foreign_detail", return_value="other project") as detail, \
             patch.object(launcher, "start") as start:
            with self.assertRaisesRegex(SystemExit, ":16510"):
                launcher.vice()
            detail.assert_called_once_with(16510)
            start.assert_not_called()

    def test_alternate_launch_keeps_source_and_settings_in_clone(self):
        source = launcher.ROOT + "/games/c64/example/work/saved state.vsf"
        with patch.object(launcher, "R2000_PORT", 13000), \
             patch.object(launcher.os.path, "exists", return_value=True), \
             patch.object(launcher.os, "makedirs") as mkdir, \
             patch.object(launcher, "up", return_value=False), \
             patch("builtins.open", mock_open()), \
             patch.object(launcher, "start") as start:
            launcher.r2000(source)
        argv = start.call_args.args[0]
        self.assertEqual(argv[1], launcher.ROOT + "/kit/c64/stdio_bridge.py")
        self.assertEqual(argv[-2:], [source, "13000"])
        self.assertEqual(start.call_args.kwargs["port"], 13000)
        env = start.call_args.kwargs["env"]
        for name in ("XDG_CONFIG_HOME", "XDG_CACHE_HOME", "XDG_DATA_HOME"):
            self.assertTrue(env[name].startswith(launcher.TOOLS + "/r2000-home/"))
        self.assertEqual(mkdir.call_count, 5)

    def test_stop_patterns_are_clone_scoped_and_ere_compatible(self):
        root = launcher.ROOT
        own_vice = root + "/tools/vice-mcp/bin/x64sc -mcpserver -mcpserverport 16510"
        own_stdio = "/usr/bin/regenerator2000 --mcp-server-stdio " + root + "/tools/input.regen2000proj"
        own_bridge = "python3 " + root + "/kit/c64/stdio_bridge.py /usr/bin/regenerator2000 " + root + "/input.vsf 13000"
        for kind, command in (("vice", own_vice), ("r2000", own_stdio), ("r2000", own_bridge)):
            pattern = launcher.STOP_PATTERNS[kind]
            self.assertNotIn("(?:", pattern)  # pkill uses ERE, not Python's noncapturing groups
            self.assertIsNotNone(re.search(pattern, command))
            self.assertIsNone(re.search(pattern, command.replace(root, root + "-other")))
        self.assertIsNone(re.search(launcher.STOP_PATTERNS["r2000"], "python3 " + root + "/kit/c64/stdio_bridge.py.other"))


class SeededStartTests(unittest.TestCase):
    """#273: a restarted disassembler comes back with the last export's annotations."""

    def game(self, root, symbols=True):
        game = root / "games" / "c64" / "demo"
        (game / "work").mkdir(parents=True)
        (game / "game.json").write_text(json.dumps({"slug": "demo", "platform": "c64"}))
        if symbols:
            (game / "symbols.json").write_text(json.dumps({
                "blocks": [{"start": 0x8000, "end": 0x8002, "type": "Code"}],
                "symbols": [{"address": 0x8000, "name": "main_loop", "type": "Subroutine", "kind": "user"}],
                "comments": [{"address": 0x8000, "type": "line", "text": "runs once a frame"}]}))
        ram = bytes(range(256)) * 256
        head = b"VICE Snapshot File C64SC\0"                  # kit/c64/snapshot.py reads the RAM at 209
        (game / "work" / "entry.vsf").write_bytes(head + bytes(209 - len(head)) + ram)
        return game, ram

    def test_snapshot_with_an_export_starts_as_its_project(self):
        with tempfile.TemporaryDirectory() as d:
            game, ram = self.game(Path(d))
            with patch("sys.stdout", io.StringIO()) as out:
                path, gdir = launcher.seeded(str(game / "work" / "entry.vsf"))
            self.assertEqual((path, gdir), (str(game / "work" / "demo.regen2000proj"), str(game)))
            self.assertIn("demo.regen2000proj", out.getvalue())
            data = json.loads(Path(path).read_text())
            self.assertEqual(gzip.decompress(base64.b64decode(data["raw_data_base64"])), ram)
            self.assertEqual(data["labels"][str(0x8000)][0]["name"], "main_loop")
            self.assertEqual(data["user_line_comments"][str(0x8000)], "runs once a frame")

    def test_everything_else_starts_as_it_is(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            game, _ = self.game(root, symbols=False)          # the first session: nothing exported yet
            first = str(game / "work" / "entry.vsf")
            self.assertEqual(launcher.seeded(first), (first, str(game)))
            self.assertFalse((game / "work" / "demo.regen2000proj").exists())
            loose = root / "elsewhere.vsf"                     # in no game's folder
            loose.write_bytes((game / "work" / "entry.vsf").read_bytes())
            self.assertEqual(launcher.seeded(str(loose)), (str(loose), None))
            (game / "symbols.json").write_text(json.dumps({"blocks": [], "symbols": [], "comments": []}))
            self.assertEqual(launcher.seeded(first), (first, str(game)))   # an export of nothing
            self.game(root / "other")
            other = root / "other" / "games" / "c64" / "demo" / "work"
            for name in ("demo.regen2000proj", "game.prg"):    # a project or a program starts as it is
                self.assertEqual(launcher.seeded(str(other / name))[0], str(other / name))
            part = other.parent / "parts" / "level"            # the top of a game of several parts
            part.mkdir(parents=True)
            (part / "part.json").write_text("{}")
            self.assertEqual(launcher.seeded(str(other / "entry.vsf"))[0], str(other / "entry.vsf"))
            self.assertFalse((other / "demo.regen2000proj").exists())

    def test_logs_written_after_the_export_are_named(self):
        with tempfile.TemporaryDirectory() as d:
            game, _ = self.game(Path(d))
            old, new = game / "work" / "annotations.jsonl", game / "work" / "annotations-2.jsonl"
            for f in (old, new):
                f.write_text("{}\n")
            exported = (game / "symbols.json").stat().st_mtime
            os.utime(old, (exported - 10, exported - 10))
            os.utime(new, (exported + 10, exported + 10))
            self.assertEqual(launcher.logged_since_export(str(game)), [str(new)])

    def test_start_serves_the_project(self):
        with tempfile.TemporaryDirectory() as d:
            game, _ = self.game(Path(d))
            tools = Path(d) / "tools"
            with patch.object(launcher, "R2000_PORT", 13000), \
                 patch.object(launcher, "TOOLS", str(tools)), \
                 patch.object(launcher, "R2000_PORT_FILE", str(tools / "r2000-port")), \
                 patch.object(launcher, "r2000_exe", return_value="/usr/bin/regenerator2000"), \
                 patch.object(launcher, "up", return_value=False), \
                 patch.object(launcher, "forget_port"), \
                 patch.object(launcher, "start") as start, \
                 patch("sys.stdout", io.StringIO()):
                launcher.r2000(str(game / "work" / "entry.vsf"))
            self.assertEqual(start.call_args.args[0][-2:], [str(game / "work" / "demo.regen2000proj"), "13000"])


class SnapshotTests(unittest.TestCase):
    def test_named_module_and_both_snapshot_headers(self):
        ram = bytes(range(256)) * 256
        for extended in (True, False):
            self.assertEqual(bridge.snapshot_ram(snapshot(ram, extended)), ram)

    def test_short_module_cannot_borrow_following_bytes(self):
        with self.assertRaisesRegex(ValueError, "complete C64MEM"):
            bridge.snapshot_ram(snapshot(b"short") + b"\0" * 65536)

    def test_truncated_module_and_bad_magic(self):
        with self.assertRaisesRegex(ValueError, "module size"):
            bridge.snapshot_ram(snapshot(b"\0" * 65536)[:-1])
        with self.assertRaisesRegex(ValueError, "not a VICE"):
            bridge.snapshot_ram(b"VICE Snapshot File?" + b"\0" * 40)

    def test_conversion_stays_under_tools_and_preserves_ram(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d) / "clone with spaces"
            root.mkdir()
            source = root / "saved game.vsf"
            ram = bytes(range(256)) * 256
            source.write_bytes(snapshot(ram))
            project = bridge.project_path(source, root / "tools")
            self.assertEqual(project.parent, root / "tools")
            data = json.loads(project.read_text())
            self.assertEqual(gzip.decompress(base64.b64decode(data["raw_data_base64"])), ram)
            self.assertEqual(source.read_bytes(), snapshot(ram))

    def test_port_bind_failure_precedes_conversion_and_child(self):
        with patch.object(sys, "argv", ["bridge", "r2000", "input.vsf", "13000"]), \
             patch.object(bridge.signal, "signal"), \
             patch.object(bridge, "ThreadingHTTPServer", side_effect=OSError("occupied")), \
             patch.object(bridge, "Stdio") as backend:
            with self.assertRaisesRegex(OSError, "occupied"):
                bridge.main()
            backend.assert_not_called()


if __name__ == "__main__":
    unittest.main()
