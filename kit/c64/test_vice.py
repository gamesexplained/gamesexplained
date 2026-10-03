#!/usr/bin/env python3
"""Tests for kit/c64/vice.py, the emulator client, against a stand-in for the vice-mcp server.

    python3 kit/c64/test_vice.py

Runs in CI, with no emulator. The stand-in answers on a free port the way the server does, quirks
included: a read of more than 65,535 bytes is refused, a read on a running machine can fail, key
names are known only in capitals, a reset or an autostart leaves a stopped machine stopped, and a
call can drop the connection. Each test says which helper in vice.py absorbs which of them.
"""
import http.server, json, os, re, shutil, sys, tempfile, threading

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import vice   # noqa: E402

failures = []


def check(name, ok, detail=""):
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  [{detail}]" if detail and not ok else ""))
    if not ok:
        failures.append(name)


def raises(f, kind):
    try:
        f()
    except kind as e:
        return e
    except Exception as e:
        return f"raised {type(e).__name__}: {e}"
    return None


class Fake:
    """The server's state, and every call made to it, with the machine's state at the time."""
    LETTERS = {c: (i // 8, i % 8) for i, c in enumerate("ABCDEFGHIJKLMNOPQRSTUVWXYZ")}
    NAMES = {"SPACE": (7, 4), "RETURN": (0, 1), "F1": (0, 4), "LSHIFT": (1, 7), **LETTERS}

    def __init__(self):
        self.paused = False
        self.mem = bytearray(i * 7 & 0xFF for i in range(0x10000))
        self.keys, self.joys, self.cps, self.log = set(), {}, {}, []
        self.read_fails_running = False

    def err(self, code, message):
        return {"error": {"code": code, "message": message}}

    def tool(self, name, a):
        self.log.append((name, a, self.paused))
        if name == "vice_ping":
            return {"execution": "paused" if self.paused else "running"}
        if name == "vice_execution_pause":
            self.paused = True
            return {"status": "ok"}
        if name == "vice_execution_run":
            self.paused = False
            return {"status": "ok"}
        if name == "vice_frame_advance":
            return {"frames": a.get("frames", 1)} if self.paused else self.err(-32001, "Emulator must be paused")
        if name == "vice_memory_read":
            if not 1 <= a["size"] <= 65535:
                return self.err(-32602, "Size out of range (must be 1-65535)")
            if a.get("bank") not in (None, "default", "cpu", "ram", "rom", "io", "cart"):
                return self.err(-32602, "Unknown bank name (use vice.memory.banks to list available banks)")
            if self.read_fails_running and not self.paused:
                return self.err(-32000, "Timeout: emulator may be paused or unresponsive")
            start = int(a["address"].lstrip("$"), 16)
            return {"data_hex": bytes(self.mem[(start + i) & 0xFFFF] for i in range(a["size"])).hex().upper()}
        if name == "vice_keyboard_matrix":
            if "key" in a:
                if a["key"] not in self.NAMES:
                    return self.err(-32602, "Unknown key name")
                rc = self.NAMES[a["key"]]
            else:
                rc = (a["row"], a["col"])
            (self.keys.add if a.get("pressed", True) else self.keys.discard)(rc)
            return {"status": "ok", "row": rc[0], "col": rc[1]}
        if name == "vice_joystick_set":
            self.joys[a["port"]] = (tuple(a.get("direction", [])), a.get("fire", False))
            return {"status": "ok"}
        if name in ("vice_machine_reset", "vice_autostart", "vice_machine_config_set", "vice_checkpoint_set_ignore_count"):
            return {"status": "ok"}
        if name == "vice_checkpoint_add":
            n = len(self.cps) + 1
            self.cps[n] = a
            return {"status": "ok", "checkpoint_num": n}
        if name == "vice_checkpoint_set_condition":
            if not re.match(r"(A|X|Y|PC|SP) ?==? ?\$?[0-9A-Fa-f]+$", a["condition"]):
                return self.err(-32602, "Invalid condition")
            return {"status": "ok"}
        if name == "vice_checkpoint_delete":
            self.cps.pop(a["checkpoint_num"], None)
            return {"status": "ok"}
        if name == "vice_snapshot_load":
            if not re.fullmatch(r"[A-Za-z0-9_-]+", a["name"]):
                return self.err(-32602, "Invalid name: use only alphanumeric characters, underscores, and hyphens")
            return {"status": "ok", "name": a["name"]}
        return self.err(-32601, "Tool not found")

    def calls(self, *names):
        return [(n, a, p) for n, a, p in self.log if not names or n in names]


def serve(fake):
    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def do_POST(self):
            body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            method, params = body["method"], body.get("params", {})
            if method == "tools/call" and params["name"] == "drop_connection":
                self.close_connection = True          # as a server that crashed: no reply at all
                return
            if "id" not in body:
                self.send_response(202); self.end_headers()
                return
            if method == "tools/call":
                r = fake.tool(params["name"], params.get("arguments", {}))
                reply = r if "error" in r else {"result": {"content": [{"type": "text", "text": json.dumps(r)}]}}
            else:
                reply = {"result": {}}
            out = json.dumps({"jsonrpc": "2.0", "id": body["id"], **reply}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Mcp-Session-Id", "test")
            self.send_header("Content-Length", str(len(out)))
            self.end_headers()
            self.wfile.write(out)

    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}/mcp"


def test_memory(fake, rpc):
    whole = vice.read_mem(rpc, 0, 0x10000)
    sizes = [a["size"] for _, a, _ in fake.calls("vice_memory_read")]
    check("read_mem: a whole 64 KB, in reads the server takes", whole == bytes(fake.mem) and max(sizes) <= 65535, sizes)
    check("read_mem: a read past $FFFF wraps, as the server's do",
          vice.read_mem(rpc, "$C000", 0x10000) == bytes(fake.mem[0xC000:] + fake.mem[:0xC000]))
    check("read_mem: a name can be read in one piece, not in several",
          isinstance(raises(lambda: vice.read_mem(rpc, "score", 0x9000), ValueError), ValueError))

    fake.read_fails_running, fake.log[:] = True, []
    got = vice.read_mem(rpc, 0x0400, 16)
    order = [(n, p) for n, _, p in fake.calls("vice_execution_pause", "vice_memory_read", "vice_execution_run")]
    check("read_mem: refused on a running machine, read again stopped, and the machine set running",
          got == bytes(fake.mem[0x400:0x410]) and not fake.paused
          and order[-3:] == [("vice_execution_pause", False), ("vice_memory_read", True), ("vice_execution_run", True)], order)
    fake.read_fails_running = False

    fake.log[:] = []
    e = raises(lambda: vice.read_mem(rpc, 0x0400, 16, bank="nowhere"), vice.ViceError)
    check("read_mem: a bad argument raises the server's words, and the machine is not stopped for it",
          isinstance(e, vice.ViceError) and "Unknown bank name" in str(e) and not fake.calls("vice_execution_pause"), e)
    fake.paused = True
    e = raises(lambda: vice.read_mem(rpc, 0x0400, 16, bank="nowhere"), vice.ViceError)
    check("read_mem: the same on a stopped machine", isinstance(e, vice.ViceError) and fake.paused, e)
    fake.paused = False


def test_keys(fake, rpc):
    with vice.key(rpc, "u"):
        down = set(fake.keys)
    check("key: a letter in lower case reaches the matrix in capitals, and is released",
          down == {Fake.NAMES["U"]} and not fake.keys, down)
    e = raises(lambda: vice.key_down(rpc, "shift"), vice.ViceError)
    check("key_down: a name the matrix tool does not know raises \"Unknown key name\"",
          isinstance(e, vice.ViceError) and "Unknown key name" in str(e), e)

    def dies():
        with vice.key(rpc, "LSHIFT", (0, 4)):
            raise KeyboardInterrupt
    raises(dies, KeyboardInterrupt)
    check("key: keys held when the body fails are released", not fake.keys, fake.keys)

    def bad_second():
        with vice.key(rpc, "space", "no-such-key"):
            pass
    e = raises(bad_second, vice.ViceError)
    check("key: a bad second key raises, and the first is released", isinstance(e, vice.ViceError) and not fake.keys, e)

    vice.call(rpc, "vice_keyboard_matrix", {"key": "A", "pressed": True})
    vice.call(rpc, "vice_keyboard_matrix", {"row": 7, "col": 7, "pressed": True})
    vice.joy(rpc, 2, vice.LEFT | vice.FIRE)
    vice.release_all(rpc)
    check("release_all: every key up, both sticks centred",
          not fake.keys and fake.joys == {1: ((), False), 2: ((), False)}, (fake.keys, fake.joys))


def test_machine(fake, rpc, tmp):
    fake.paused, fake.log[:] = True, []
    vice.reset(rpc, "hard")
    order = [n for n, _, _ in fake.calls("vice_machine_reset", "vice_execution_run")]
    check("reset: on a stopped machine, the reset and then a run", order == ["vice_machine_reset", "vice_execution_run"]
          and not fake.paused, order)
    fake.log[:] = []
    vice.reset(rpc)
    check("reset: a running machine is not run again", not fake.calls("vice_execution_run"))

    fake.paused, fake.log[:] = True, []
    vice.autostart(rpc, "work/game.d64", 2)
    (_, a, _), = fake.calls("vice_autostart")
    check("autostart: the second file is index 2, the path absolute, and a stopped machine runs after",
          a["index"] == 2 and os.path.isabs(a["path"]) and a["path"].endswith(os.path.join("work", "game.d64"))
          and [n for n, _, _ in fake.calls("vice_autostart", "vice_execution_run")] == ["vice_autostart", "vice_execution_run"]
          and not fake.paused, a)
    fake.log[:] = []
    vice.autostart(rpc, "work/game.d64", "SENTINEL+")
    (_, a, _), = fake.calls("vice_autostart")
    check("autostart: a name goes as program, as given", a.get("program") == "SENTINEL+" and "index" not in a, a)
    check("autostart: position 0 is refused, positions count from 1",
          isinstance(raises(lambda: vice.autostart(rpc, "x.d64", 0), ValueError), ValueError))

    fake.log[:] = []
    vice.warp(rpc, False)
    (_, a, _), = fake.calls("vice_machine_config_set")
    check("warp: WarpMode through the generic call", a == {"resources": {"WarpMode": 0}}, a)

    snaps = os.path.join(tmp, "mcp_snapshots")
    vice._SNAPSHOTS = snaps
    work = os.path.join(tmp, "work")
    os.makedirs(work)
    vsf = os.path.join(work, "play-1.vsf")
    open(vsf, "wb").write(b"VICE Snapshot File 1")
    fake.log[:] = []
    vice.snapshot_load(rpc, vsf)
    vice.snapshot_load(rpc, "play-1")
    names = [a["name"] for _, a, _ in fake.calls("vice_snapshot_load")]
    check("snapshot_load: a path loads by its name, copied into the snapshot folder; a name as it is",
          names == ["play-1", "play-1"] and open(os.path.join(snaps, "play-1.vsf"), "rb").read() == b"VICE Snapshot File 1", names)
    other = os.path.join(tmp, "play-1.vsf")
    open(other, "wb").write(b"VICE Snapshot File 2")
    e = raises(lambda: vice.snapshot_load(rpc, other), vice.ViceError)
    check("snapshot_load: a different file under a name already taken is refused, nothing overwritten",
          isinstance(e, vice.ViceError) and open(os.path.join(snaps, "play-1.vsf"), "rb").read() == b"VICE Snapshot File 1", e)
    fake.log[:] = []
    e = raises(lambda: vice.snapshot_load(rpc, os.path.join(work, "my play.vsf")), vice.ViceError)
    check("snapshot_load: a name the server cannot take is refused before anything is copied",
          isinstance(e, vice.ViceError) and not fake.calls() and not os.path.exists(os.path.join(snaps, "my play.vsf")), e)


def test_arm(fake, rpc):
    fake.paused, fake.log[:] = False, []
    n = vice.arm(rpc, 0xC000, ignore=99)
    seen = [(name, p) for name, _, p in fake.calls("vice_checkpoint_add", "vice_checkpoint_set_ignore_count")]
    check("arm: on a running machine, the checkpoint and its ignore count are set stopped, then it runs",
          seen == [("vice_checkpoint_add", True), ("vice_checkpoint_set_ignore_count", True)] and not fake.paused
          and fake.cps[n]["stop"] and fake.cps[n]["exec"], seen)
    fake.paused, fake.log[:] = True, []
    vice.arm(rpc, 0xC000, condition="PC == $C000")
    check("arm: a stopped machine stays stopped", fake.paused and not fake.calls("vice_execution_run"))
    fake.paused, fake.log[:] = False, []
    e = raises(lambda: vice.arm(rpc, 0xC000, condition="A == $40"), vice.ViceError)
    check("arm: a condition on a register other than PC, which crashes the emulator, is refused unsent",
          isinstance(e, vice.ViceError) and "crash" in str(e) and not fake.calls(), e)
    fake.paused, fake.log[:] = False, []
    before = set(fake.cps)
    e = raises(lambda: vice.arm(rpc, 0xC000, condition="PC > 3"), vice.ViceError)
    check("arm: a condition the server refuses raises, and its checkpoint is deleted, the machine running",
          isinstance(e, vice.ViceError) and set(fake.cps) == before and not fake.paused, e)
    fake.log[:] = []
    n = vice.arm(rpc, 0xD020, store=True, stop=False)
    check("arm: with neither, one call and no stop; a store watchpoint is not exec",
          [x for x, _, _ in fake.calls()] == ["vice_checkpoint_add"] and fake.cps[n]["store"] and not fake.cps[n]["exec"])


def test_connection(rpc):
    e = raises(lambda: vice.call(rpc, "drop_connection"), vice.EmulatorDown)
    check("rpc: a dropped connection raises EmulatorDown, one line naming tools.py status",
          isinstance(e, vice.EmulatorDown) and "closed the connection" in str(e) and "tools.py status" in str(e)
          and "\n" not in str(e), e)
    srv = http.server.HTTPServer(("127.0.0.1", 0), http.server.BaseHTTPRequestHandler)
    url = f"http://127.0.0.1:{srv.server_address[1]}/mcp"
    srv.server_close()                                # the port is free again: nothing listens
    e = raises(lambda: vice.connect(url), vice.EmulatorDown)
    check("connect: nothing listening raises EmulatorDown, an OSError as check_emulator.py expects",
          isinstance(e, OSError) and "not running" in str(e) and "tools.py status" in str(e), e)


if __name__ == "__main__":
    if sys.argv[1:] in (["-h"], ["--help"]):
        print(__doc__)
        sys.exit(0)
    fake = Fake()
    srv, url = serve(fake)
    rpc = vice.connect(url)
    tmp = tempfile.mkdtemp()
    try:
        for test, args in ((test_memory, (fake, rpc)), (test_keys, (fake, rpc)), (test_machine, (fake, rpc, tmp)),
                           (test_arm, (fake, rpc)), (test_connection, (rpc,))):
            try:
                test(*args)
            except Exception as e:                    # the rest of that group did not run
                check(f"{test.__name__} ran to the end", False, f"{type(e).__name__}: {e}")
                fake.read_fails_running, fake.paused = False, False
    finally:
        shutil.rmtree(tmp)
        srv.shutdown()
    print(f"\n{'all passed' if not failures else str(len(failures)) + ' failed'}")
    sys.exit(1 if failures else 0)
