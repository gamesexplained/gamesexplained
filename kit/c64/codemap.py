#!/usr/bin/env python3
"""Which bytes of a C64 game ran as code, from VICE's executed-address record.

VICE's monitor keeps a per-address access map (the memmap): every address the
CPU fetched an instruction from is marked execute, while reads and writes are
marked separately. It is a record, not a sample: the map costs nothing
measurable, and unlike the cpuhistory ring buffer (8,192 entries, ~28 ms) it
covers the session, but a snapshot load or a stop through the MCP server
ends it (vice-mcp v3.13.2), so zap after the load and drive the game without
stopping it (kit/skills/c64/tool-vice-mcp, "Recording what ran"). `memmapzap`
clears it; `memmapshow 1` (mask 1 = RAM execute) lists what ran in RAM.

What ran in the ROMs is the machine's code, never the game's, and a boot runs
a great deal of it (LOAD and RUN pass through BASIC and the KERNAL), so ROM
execution is left out. But the memmap's ROM and RAM marks follow the address,
not the banking: code a game runs from the RAM under BASIC or the KERNAL, with
the ROM banked out, is marked ROM execute (`memmapshow 8`). On 9 October 2026
Spy vs Spy, at $01 = $35, showed none of its $A000-$BFFF code under mask 1.
`dump` counts the ROM-marked instructions in the ranges the processor port
has banked out ($A000-$BFFF unless bits 0 and 1 are both set, $E000-$FFFF
unless bit 1 is) and says so; `dump --under-rom` keeps them. Zap for that
only once the game has banked the ROM out: the KERNAL's interrupt handler,
run during a game's start-up, is marked the same way.

  codemap.py <game dir> zap     clear the record at the start of a play session
  codemap.py <game dir> dump [--under-rom]
                                read the record and write <game dir>/codemap.json:
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
ROM_EXEC_MASK = 8  # X: what the memmap marks ROM execute, by address


def banked_out_ram(addresses, port, ddr):
    """The ROM-marked addresses that are RAM under the processor port's banking: an input line
    of the port reads 1 (kit/skills/c64/c64-reference, "Banking via $01")."""
    bits = (port | ~ddr) & 7
    basic_out, kernal_out = (bits & 3) != 3, not bits & 2
    return sorted(a for a in addresses
                  if (basic_out and 0xA000 <= a <= 0xBFFF) or (kernal_out and a >= 0xE000))


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


def dump(gdir, under_rom=False):
    try:
        executed = parse_executed(monitor(f"memmapshow {EXEC_MASK}"))
        rom_marked = parse_executed(monitor(f"memmapshow {ROM_EXEC_MASK}"))
    except OSError as exc:
        sys.exit(f"no monitor on 127.0.0.1:{MONITOR_PORT}: {exc} (run `tools.py vice` first)")
    rpc = connect()
    ddr, port = read_mem(rpc, 0, 2)
    under = banked_out_ram(rom_marked, port, ddr)
    if under and under_rom:
        executed = sorted(set(executed) | set(under))
        print(f"kept {len(under)} instructions marked ROM execute in RAM the port (${port:02X}) has a ROM "
              "banked out of (--under-rom)")
    elif under:
        print(f"note: {len(under)} instructions marked ROM execute lie in RAM the port (${port:02X}) has a ROM "
              f"banked out of, from ${under[0]:04X}; they are left out. If the game runs code there, zap once "
              "it has banked the ROM out, play, and dump with --under-rom")
    if not executed:
        sys.exit("the execute record is empty: zap, play, then dump")
    ram = bytes(read_mem(rpc, 0, 0x10000))
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
    args = sys.argv[1:]
    under_rom = "--under-rom" in args
    args = [a for a in args if a != "--under-rom"]
    if len(args) != 2 or args[1] not in ("zap", "dump") or (under_rom and args[1] != "dump"):
        sys.exit("usage: codemap.py <game dir> zap|dump [--under-rom]")
    gdir = args[0]
    if not os.path.isdir(gdir):
        sys.exit(f"no such game dir: {gdir}")
    zap() if args[1] == "zap" else dump(gdir, under_rom)
