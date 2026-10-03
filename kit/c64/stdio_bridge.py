#!/usr/bin/env python3
"""Serve regenerator2000's stdio MCP on a loopback port for a separate clone.

The native HTTP server in 0.9.20 fixes port 3000. The stdio server accepts
projects only; convert a fresh VICE snapshot to an unannotated project in
the same ignored work directory. Existing projects are opened unchanged.
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
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


def project_path(path):
    path = Path(path).resolve()
    if path.suffix == ".regen2000proj":
        return path
    if path.suffix != ".vsf":
        raise ValueError("The separate-port server requires a .vsf or .regen2000proj")
    data = path.read_bytes()
    if not data.startswith(b"VICE Snapshot File"):
        raise ValueError("Not a VICE snapshot")
    # Same RAM image and project schema as symbols_import.py.
    ram = data[209:209 + 65536]
    if len(ram) != 65536:
        raise ValueError("Snapshot RAM is incomplete")
    project = {
        "version": 1, "origin": 0,
        "raw_data_base64": base64.b64encode(gzip.compress(ram, mtime=0)).decode(),
        "blocks": [{"start": 0, "end": 65535, "type_": "Undefined", "collapsed": False}],
        "labels": {}, "user_line_comments": {}, "user_side_comments": {},
    }
    # A previous session may have saved annotations in its converted project.
    # Give each fresh snapshot session its own file; never overwrite that work.
    with tempfile.NamedTemporaryFile(mode="w", prefix=path.stem + ".stdio.",
                                     suffix=".regen2000proj", dir=path.parent,
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
        threading.Thread(target=self.read, daemon=True).start()

    def read(self):
        try:
            for line in self.process.stdout:
                self.replies.put(json.loads(line))
        finally:
            self.replies.put(None)

    def call(self, request):
        if not isinstance(request, dict):
            raise ValueError("Expected one JSON-RPC request object")
        with self.lock:
            original_id = request.get("id")
            self.next_id += 1
            forwarded = dict(request)
            if "id" in forwarded:
                forwarded["id"] = self.next_id
            self.process.stdin.write(json.dumps(forwarded) + "\n")
            self.process.stdin.flush()
            if "id" not in request:
                return None
            while True:
                reply = self.replies.get(timeout=90)
                if reply is None:
                    raise RuntimeError("Disassembler exited")
                if reply.get("id") == self.next_id:
                    reply["id"] = original_id
                    return reply

    def close(self):
        self.process.terminate()
        try:
            self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait()


def main():
    executable, path, port = sys.argv[1:]
    backend = Stdio(executable, path)

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
        with ThreadingHTTPServer(("127.0.0.1", int(port)), Handler) as server:
            server.serve_forever()
    finally:
        backend.close()


if __name__ == "__main__":
    main()
