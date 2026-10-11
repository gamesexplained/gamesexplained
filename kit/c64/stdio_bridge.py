#!/usr/bin/env python3
"""Serve regenerator2000's stdio MCP on a loopback port for a separate clone.

The native HTTP server in 0.9.20 fixes port 3000. The stdio server accepts
projects only; convert a fresh VICE snapshot to an unannotated project in
this clone's ignored tools directory. Existing projects are opened unchanged.
Started only by `kit/scripts/tools.py r2000 <file>`.
"""
import base64
import gzip
import json
from pathlib import Path
import queue
import signal
import subprocess
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer



def snapshot_ram(raw):
    """Extract C64 RAM within its declared module, never into a following one."""
    if len(raw) < 37 or not raw.startswith(b"VICE Snapshot File\x1a"):
        raise ValueError("not a VICE snapshot")
    pos = 58 if raw[37:50] == b"VICE Version\x1a" else 37
    while pos + 22 <= len(raw):
        name = raw[pos:pos + 16].split(b"\0")[0]
        size = int.from_bytes(raw[pos + 18:pos + 22], "little")
        if size < 22 or pos + size > len(raw):
            raise ValueError("invalid snapshot module size")
        if name == b"C64MEM":
            if size < 26 + 65536:
                raise ValueError("snapshot lacks a complete C64MEM RAM image")
            return raw[pos + 26:pos + 26 + 65536]
        pos += size
    raise ValueError("snapshot lacks a complete C64MEM RAM image")

def project_path(path, output_dir=None):
    path = Path(path).resolve()
    if path.suffix == ".regen2000proj":
        return path
    if path.suffix != ".vsf":
        raise ValueError("The separate-port server requires a .vsf or .regen2000proj")
    ram = snapshot_ram(path.read_bytes())
    project = {
        "version": 1, "origin": 0,
        "raw_data_base64": base64.b64encode(gzip.compress(ram, mtime=0)).decode(),
        "blocks": [{"start": 0, "end": 65535, "type_": "Undefined", "collapsed": False}],
        "labels": {}, "user_line_comments": {}, "user_side_comments": {},
    }
    # A previous session may have saved annotations in its converted project.
    # Give each fresh snapshot session its own file; never overwrite that work.
    output_dir = Path(output_dir) if output_dir is not None else Path(__file__).resolve().parents[2] / "tools"
    output_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", prefix=path.stem + ".stdio.",
                                     suffix=".regen2000proj", dir=output_dir,
                                     delete=False) as output:
        json.dump(project, output)
        target = Path(output.name)
    return target


class Stdio:
    def __init__(self, executable, path):
        self.process = subprocess.Popen(
            [executable, "--mcp-server-stdio", str(project_path(path))],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1,
        )
        self.replies = queue.Queue()
        self.lock = threading.Lock()
        self.next_id = 0
        self.broken = False
        threading.Thread(target=self.read, daemon=True).start()

    def read(self):
        try:
            for line in self.process.stdout:
                self.replies.put(json.loads(line))
        finally:
            self.replies.put(None)

    def call(self, request, timeout=90):
        if not isinstance(request, dict) or not isinstance(request.get("method"), str):
            raise ValueError("Expected one JSON-RPC request object")
        with self.lock:
            if getattr(self, "broken", False):
                raise RuntimeError("Disassembler stream is unavailable; restart the bridge")
            original_id = request.get("id")
            self.next_id += 1
            forwarded = dict(request)
            if "id" in forwarded:
                forwarded["id"] = self.next_id
            deadline = time.monotonic() + timeout
            try:
                self.process.stdin.write(json.dumps(forwarded) + "\n")
                self.process.stdin.flush()
                if "id" not in request:
                    return None
                while True:
                    remaining = deadline - time.monotonic()
                    if remaining <= 0:
                        raise TimeoutError("Disassembler response timed out")
                    try:
                        reply = self.replies.get(timeout=remaining)
                    except queue.Empty as error:
                        raise TimeoutError("Disassembler response timed out") from error
                    if reply is None:
                        raise RuntimeError("Disassembler exited")
                    if not isinstance(reply, dict):
                        raise ValueError("Invalid disassembler response")
                    response_id = reply.get("id")
                    if response_id == self.next_id:
                        reply["id"] = original_id
                        return reply
                    if response_id is not None and (type(response_id) is not int or response_id > self.next_id):
                        raise ValueError("Disassembler response ID mismatch")
                    # Notifications, null acknowledgements and older internal IDs
                    # cannot be mistaken for this call's unique internal ID.
            except (OSError, ValueError, RuntimeError):
                self.broken = True
                raise

    def close(self):
        self.process.terminate()
        try:
            self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait()


def main():
    executable, path, port = sys.argv[1:]
    backend = None

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            if self.path != "/mcp":
                self.send_error(404)
                return
            request = {}
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if not 0 < size <= 8 * 1024 * 1024:
                    raise ValueError("Invalid request size")
                request = json.loads(self.rfile.read(size))
                reply = backend.call(request)
            except Exception as error:
                reply = {"jsonrpc": "2.0", "id": request.get("id") if isinstance(request, dict) else None,
                         "error": {"code": -32603, "message": str(error)}}
            body = json.dumps(reply).encode() if reply is not None else b""
            self.send_response(200 if body else 202)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass

    def stop(*_):
        raise SystemExit(0)

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        # Bind before converting the snapshot or starting a child process.
        with ThreadingHTTPServer(("127.0.0.1", int(port)), Handler) as server:
            backend = Stdio(executable, path)
            server.serve_forever()
    finally:
        if backend is not None:
            backend.close()


if __name__ == "__main__":
    main()
