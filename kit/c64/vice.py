#!/usr/bin/env python3
"""VICE MCP client, the emulator counterpart of r2000.py.

Most live verification is a loop: halt the machine, poke a variable, run a
fixed number of passes, read something back. Doing that through one-off tool
calls is slow; doing it in a script is not. Import this and write the test.

Usage:
  vice.py --list                       list the emulator's tools
  vice.py <tool> '<json arguments>'    call one tool

  from vice import connect, call, read_mem, halt_at, release, poke
  rpc = connect()
  cp = halt_at(rpc, "$E12C")           # stop at the top of the game loop
  poke(rpc, 0x0010, [0x00, 0x00])
  joy(rpc, 1, LEFT)                    # hold the stick on the port the game reads
  step_pass(rpc)                       # run to the next hit of cp: one pass
  frames(rpc, 3)                       # or run exactly three frames
  release(rpc, cp)

Which build answers matters (kit/c64/INSTALL.md, "A build from source"):

  * the fixed build stops exactly where a checkpoint, step or pause says,
    vice_ping is truthful, joystick port numbers mean what they say, input
    set while stopped is seen by the next instruction, and vice_frame_advance
    exists. step_pass and frames need it.
  * the v3.11.0 release stops up to a frame late, port 1 reaches control
    port 2, and vice_execution_pause did not always stop the CPU. On it,
    halt_at is still the reliable stop, use stick_arm/stick for a game that
    reads control port 1, and do not trust the PC after a stop.
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


def paused(rpc):
    return json.loads(call(rpc, "vice_ping"))["execution"] == "paused"


def step_pass(rpc, timeout=5.0):
    """Resume a machine stopped at a checkpoint and wait for the next stop.

    With a stopping checkpoint on the top of the game loop this is one pass
    per call, exactly (fixed build). Returns the seconds it took, or None.
    """
    call(rpc, "vice_execution_run", {})
    t0 = time.time()
    while time.time() - t0 < timeout:
        if paused(rpc):
            return time.time() - t0
        time.sleep(0.005)
    return None


def frames(rpc, n=1):
    """Run exactly n frames from a stopped machine and stop again (fixed build only)."""
    return json.loads(call(rpc, "vice_frame_advance", {"frames": n}))


UP, DOWN, LEFT, RIGHT, FIRE = 1, 2, 4, 8, 16
_DIRS = {UP: "up", DOWN: "down", LEFT: "left", RIGHT: "right"}


def joy(rpc, port=1, bits=0):
    """Hold a joystick state on control port 1 or 2 through vice_joystick_set; 0 releases.

    On the fixed build the port number is the hardware port and the value is
    seen by the next instruction. On the v3.11.0 release port 1 reaches
    control port 2, port 2 reaches nothing, and the value lands at a random
    point within the next frame: use stick_arm/stick there for port 1.
    """
    return call(rpc, "vice_joystick_set", {"port": port, "direction": [d for b, d in _DIRS.items() if bits & b],
                                           "fire": bool(bits & FIRE)})


def stick_arm(rpc, ddr=0x1F):
    """Make CIA1 port B drive the control-port-1 lines, so stick() works.

    For the v3.11.0 release, where vice_joystick_set is off by one: port 1
    reaches CIA1 port A ($DC00, control port 2) and port 2 reaches nothing
    (fixed upstream in barryw/vice-mcp#6, and in the fixed build; use joy()
    there). Most C64 games read control port 2, so asking for
    port 1 usually works by accident. A game that reads control port 1 at
    $DC01, as the early Commodore titles do, cannot be driven that way:
    port B is an input and nothing the emulator offers pulls its lines low. Setting DDRB ($DC03) makes those bits
    outputs, and then a plain write to $DC01 is what the game reads. Bits left
    as inputs still read the keyboard columns, so a mask of $1F keeps the three
    top columns (which carry keys some games poll in the same read) working.
    """
    poke(rpc, 0xDC03, [ddr])
    poke(rpc, 0xDC01, [0xFF])


def stick(rpc, bits=0):
    """Hold a joystick state set from UP/DOWN/LEFT/RIGHT/FIRE; 0 releases."""
    poke(rpc, 0xDC01, [0xFF & ~bits])


def stick_release(rpc):
    """Give CIA1 port B back to the keyboard."""
    poke(rpc, 0xDC01, [0xFF])
    poke(rpc, 0xDC03, [0x00])


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
