#!/usr/bin/env python3
"""Which bytes of a C64 game ran as code, from VICE's executed-address record.

VICE's monitor keeps a per-address access map (the memmap): every address the
CPU fetched an instruction from is marked execute, while reads and writes are
marked separately. It is a complete record, not a sample -- the map is always
on, costs nothing measurable, and unlike the cpuhistory ring buffer (8,192
entries, ~28 ms) it covers the whole session. `memmapzap` clears it;
`memmapshow 1` (mask 1 = RAM execute) lists what ran in RAM. What ran in the
ROMs is left out: it is the machine's code, never the game's, and a boot runs a
great deal of it (LOAD and RUN pass through BASIC and the KERNAL). A game that
banks a ROM out runs from the RAM beneath, which the map records.

  codemap.py <game dir> zap     clear the record at the start of a play session
  codemap.py <game dir> dump    read the record and write <game dir>/codemap.json:
                                addresses only, no byte of the game, so it is
                                committed beside symbols.json (#236)

The file has the Spectrum layout (kit/spectrum/codemap.py): `executed` (the
sorted instruction addresses that ran), `ran` (their byte spans as runs),
`starts` and `code` (the same here: there is no static trace yet, so what ran
is the whole map). check_listing.py fails the game while symbols.json types
any of `ran` as data.

Needs `tools.py vice`: the emulator listens for its monitor on 127.0.0.1:6511
(or one above KIT_VICE_PORT; kit/c64/tools.py MONITOR_PORT).
"""
import json
import os
import re
import socket
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from tools import MONITOR_PORT  # noqa: E402
from opcodes import decode, LEN  # noqa: E402
from vice import connect, read_mem  # noqa: E402

EXEC_MASK = 1  # memmap mask bits "ioRWXrwx": x (RAM execute) alone; X (8) is ROM execute


def monitor(cmd, timeout=30):
    """One VICE monitor command; the reply text."""
    s = socket.create_connection(("127.0.0.1", MONITOR_PORT), timeout=10)
    s.settimeout(5)
    time.sleep(0.3)
    try:
        s.recv(8192)
    except OSError:
        pass
    s.sendall(cmd.encode() + b"\n")
    data, first, last = b"", None, None
    s.settimeout(3)
    try:
        while True:
            chunk = s.recv(262144)
            if not chunk:
                break
            if first is None:
                first = time.time()
            data += chunk
            last = time.time()
            if len(data) > 8_000_000 or (last - first) > timeout:
                break
    except OSError:
        pass
    s.close()
    return data.decode("utf-8", "replace")


def parse_executed(text):
    """The instruction addresses from `memmapshow 9` output."""
    addrs = set()
    for line in text.splitlines():
        m = re.match(r"^([0-9a-f]{4}):", line)
        if m:
            addrs.add(int(m.group(1), 16))
    return addrs


def runs(addrs):
    out, prev, start = [], None, None
    for a in sorted(addrs):
        if prev is None or a != prev + 1:
            if prev is not None:
                out.append([start, prev])
            start = a
        prev = a
    if prev is not None:
        out.append([start, prev])
    return out


def zap():
    out = monitor("memmapzap")
    if "ERROR" in out:
        sys.exit(f"memmapzap failed: {out.strip()[:200]}")
    print("execute record cleared")


def dump(gdir):
    try:
        executed = parse_executed(monitor(f"memmapshow {EXEC_MASK}"))
    except OSError as exc:
        sys.exit(f"no monitor on 127.0.0.1:{MONITOR_PORT}: {exc} (run `tools.py vice` first)")
    if not executed:
        sys.exit("the execute record is empty: zap, play, then dump")
    ram = bytes(read_mem(connect(), 0, 0x10000))
    ran = set()
    for a in executed:
        d = decode(ram, a)
        ran.update((a + i) & 0xFFFF for i in range(LEN[d[1]] if d else 1))
    starts = sorted(executed)
    code = runs(ran)
    with open(os.path.join(gdir, "codemap.json"), "w") as f:
        json.dump({"starts": starts, "code": code, "executed": starts, "ran": code}, f)
    print(f"code map: {len(ran)} bytes ran in {len(code)} runs ({len(starts)} instructions)")


if __name__ == "__main__":
    if len(sys.argv) != 3 or sys.argv[2] not in ("zap", "dump"):
        sys.exit("usage: codemap.py <game dir> zap|dump")
    gdir = sys.argv[1]
    if not os.path.isdir(gdir):
        sys.exit(f"no such game dir: {gdir}")
    zap() if sys.argv[2] == "zap" else dump(gdir)
