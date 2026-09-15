#!/usr/bin/env python3
"""VICE MCP client, the emulator counterpart of r2000.py.

Most live verification is a loop: halt the machine, poke a variable, run a
fixed number of passes, read something back. Doing that through one-off tool
calls is slow; doing it in a script is not. Import this and write the test.

Usage:
  vice.py --list                       list the emulator's tools
  vice.py <tool> '<json arguments>'    call one tool

  from vice import connect, call, read_mem, halt_at, resume, poke
  rpc = connect()
  cp = halt_at(rpc, "$E12C")           # the ONLY reliable way to stop the CPU
  poke(rpc, 0x0010, [0x00, 0x00])
  release(rpc, cp)

Two behaviours this wraps because they cost a day if you meet them cold:

  * vice_execution_pause reports success without stopping the CPU. A
    checkpoint with stop=true does stop it. halt_at uses one.
  * after a checkpoint stops the machine, vice_registers_get returns a
    program counter that is not the checkpoint address. Do not test where
    you stopped with the PC; use the checkpoint's hit count.
"""
import json, sys, time, urllib.request

URL = "http://127.0.0.1:6510/mcp"


def connect(url=URL):
    session = [None]
    _id = [0]

    def rpc(method, params=None, notif=False):
        body = {"jsonrpc": "2.0", "method": method}
        if not notif:
            _id[0] += 1
            body["id"] = _id[0]
        if params is not None:
            body["params"] = params
        headers = {"Content-Type": "application/json",
                   "Accept": "application/json, text/event-stream"}
        if session[0]:
            headers["Mcp-Session-Id"] = session[0]
        req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers)
        r = urllib.request.urlopen(req, timeout=120)
        if not session[0]:
            session[0] = dict(r.getheaders()).get("mcp-session-id")
        txt = r.read().decode()
        if notif:
            return None
        lines = [l[len("data:"):].strip() for l in txt.splitlines()
                 if l.startswith("data:") and len(l.strip()) > 5]
        if lines:                       # server-sent events
            return json.loads(lines[-1])
        txt = txt.strip()               # or a plain JSON body
        return json.loads(txt) if txt else None

    rpc("initialize", {"protocolVersion": "2024-11-05", "capabilities": {},
                       "clientInfo": {"name": "kit", "version": "0"}})
    rpc("notifications/initialized", notif=True)
    return rpc


def call(rpc, name, arguments=None):
    res = rpc("tools/call", {"name": name, "arguments": arguments or {}})
    try:
        return res["result"]["content"][0]["text"]
    except Exception:
        return json.dumps(res, indent=2)


def addr(a):
    return a if isinstance(a, str) else f"${a:04X}"


def read_mem(rpc, a, size, bank=None):
    args = {"address": addr(a), "size": size, "encoding": "hex"}
    if bank:
        args["bank"] = bank
    return bytes.fromhex(json.loads(call(rpc, "vice_memory_read", args))["data_hex"])


def poke(rpc, a, data):
    return call(rpc, "vice_memory_write", {"address": addr(a), "data": list(data)})


def halt_at(rpc, a, settle=0.5):
    """Stop the CPU at an address and return the checkpoint number."""
    n = json.loads(call(rpc, "vice_checkpoint_add",
                        {"start": addr(a), "exec": True, "stop": True}))["checkpoint_num"]
    call(rpc, "vice_execution_run", {})
    time.sleep(settle)
    return n


def release(rpc, n, run=True):
    call(rpc, "vice_checkpoint_delete", {"checkpoint_num": n})
    if run:
        call(rpc, "vice_execution_run", {})


def clear_checkpoints(rpc):
    for c in json.loads(call(rpc, "vice_checkpoint_list", {}))["checkpoints"]:
        call(rpc, "vice_checkpoint_delete", {"checkpoint_num": c["checkpoint_num"]})


def hit_counts(rpc):
    return {c["start"]: c["hit_count"]
            for c in json.loads(call(rpc, "vice_checkpoint_list", {}))["checkpoints"]}


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    rpc = connect()
    if argv[0] == "--list":
        for t in rpc("tools/list", {})["result"]["tools"]:
            print(f"{t['name']}: {t.get('description','')[:100]}")
        return
    print(call(rpc, argv[0], json.loads(argv[1]) if len(argv) > 1 else {}))


if __name__ == "__main__":
    main()
