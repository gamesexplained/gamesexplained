#!/usr/bin/env python3
"""Which bytes of a C64 game ran as code, from VICE's executed-address record.

VICE's monitor keeps a per-address access map (the memmap): every address the
CPU fetched an instruction from is marked execute, while reads and writes are
marked separately. It is a record, not a sample: the map costs nothing
measurable, and unlike the cpuhistory ring buffer (8,192 entries, ~28 ms) it
covers the session (kit/skills/c64/tool-vice-mcp, "Recording what ran").
`memmapzap` clears it; `memmapshow 1` (mask 1 = RAM execute) lists what ran in
RAM. Both work on a running or a stopped machine, after a snapshot load or a
pause: a stopped machine runs for the command and is stopped again after
(monitor(), #304).

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

The record holds instruction addresses only, so `dump` sizes each instruction
by decoding the RAM as it is at the dump. Code the game rewrote after running
it is sized from bytes that never ran. Where that leaves two instructions
overlapping without ending together, `dump` counts only their opcodes and
names the addresses; a rewritten instruction that overlaps no other is not
caught (IK+, #276).

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
from vice import call, connect, pause, paused, read_mem  # noqa: E402

EXEC_MASK = 1  # memmap mask bits "ioRWXrwx": x (RAM execute) alone; X (8) is ROM execute
ROM_EXEC_MASK = 8  # X: what the memmap marks ROM execute, by address


def banked_out_ram(addresses, port, ddr):
    """The ROM-marked addresses that are RAM under the processor port's banking: an input line
    of the port reads 1 (kit/skills/c64/c64-reference, "Banking via $01")."""
    bits = (port | ~ddr) & 7
    basic_out, kernal_out = (bits & 3) != 3, not bits & 2
    return sorted(a for a in addresses
                  if (basic_out and 0xA000 <= a <= 0xBFFF) or (kernal_out and a >= 0xE000))


PROMPT = re.compile(rb"\(C:\$[0-9a-f]{4}\) $")


def _until(rpc, running, timeout=5.0):
    """Wait for the machine to run (or stop); False if it did not within timeout seconds. The
    server reports a machine inside VICE's monitor as paused."""
    t0 = time.time()
    while paused(rpc) == running:
        if time.time() - t0 > timeout:
            return False
        time.sleep(0.01)
    return True


def monitor(cmd, rpc=None, timeout=60):
    """One VICE monitor command; the reply text, the monitor's prompts included.

    How the v3.13.2 emulator serves its remote monitor (read in its source, and measured on
    Linux, 10 October 2026), and what went wrong for this script before (#304):
    - Only while the machine runs: the monitor polls for a connection once a frame, and not while
      the MCP server holds the machine stopped (pause(), a checkpoint, a frame advance). A
      connection made then waits unanswered.
    - A connection the client has closed by the time it is answered wedges the monitor: VICE
      writes its prompt into the closed socket on every frame (thousands of "Broken pipe" lines in
      tools/logs/vice.log), never closes it, and answers no other connection until it restarts.
    - vice_execution_run, which resumes the machine, also tells the monitor to leave, open or not.
      The next session then ends after its first command, with no prompt after the reply.
    - An MCP call that arrives while the monitor is open runs inside it; a snapshot load there
      crashed the emulator.
    - A stopping checkpoint that the machine reaches before the monitor answers holds it there,
      and the command waits until the checkpoint is gone.
    - A checkpoint that does not stop the machine prints a line to the open connection on every
      hit, after the monitor has left.
    So nothing is sent while a stopping checkpoint is set; a stopped machine is set running for the
    command and stopped again after it with pause(), so it runs for a fraction of a second. The
    command goes at once (VICE enters its monitor when a line arrives, with no greeting). The
    reply ends at the prompt after it, or, when the monitor leaves after the command, once the
    machine runs again. Closing the connection then makes VICE close its end and leave the
    monitor, and the call returns once the machine runs again, or is stopped again as it was."""
    rpc = rpc or connect()
    held = [c for c in json.loads(call(rpc, "vice_checkpoint_list", {}))["checkpoints"] if c["stop"] and c["enabled"]]
    if held:
        sys.exit("nothing sent to the monitor: a stopping checkpoint would hold the machine before the monitor answers ("
                 + ", ".join(f"#{c['checkpoint_num']} at ${c['start']:04X}" for c in held)
                 + "). Delete or disable it (vice_checkpoint_delete, vice_checkpoint_toggle), then run this again")
    was_paused = paused(rpc)
    if was_paused:
        call(rpc, "vice_execution_run", {})
        if not _until(rpc, running=True):
            sys.exit("the emulator did not start running for its monitor; nothing was sent to the monitor")
    try:
        s = socket.create_connection(("127.0.0.1", MONITOR_PORT), timeout=10)
        data, t0 = b"", time.time()
        checked = t0
        try:
            s.sendall(cmd.encode() + b"\n")
            s.settimeout(0.2)
            while True:
                if time.time() - t0 > timeout or len(data) > 16_000_000:
                    sys.exit(f"the monitor on 127.0.0.1:{MONITOR_PORT} did not finish answering {cmd!r} in "
                             f"{timeout} s ({len(data)} bytes). If tools/logs/vice.log ends in \"Broken pipe\" "
                             "lines, restart the emulator (tools.py stop vice, then tools.py vice)")
                try:
                    chunk = s.recv(262144)
                except socket.timeout:
                    pass
                else:
                    if not chunk:
                        sys.exit(f"the monitor on 127.0.0.1:{MONITOR_PORT} closed the connection during {cmd!r}")
                    data += chunk
                    if data.count(b"(C:$") >= 2 and PROMPT.search(data[-12:]):   # the prompt before, and after
                        break
                # A monitor that left after the command sends no prompt, and a checkpoint that does
                # not stop the machine keeps writing to the connection, so ask by time, not by quiet
                if b"(C:$" in data and time.time() - checked >= 0.2:
                    checked = time.time()
                    if not paused(rpc):   # entered, answered, and left
                        break
        finally:
            s.close()
        time.sleep(0.1)   # a monitor that left already comes back once, a frame later, to close its end
        if not _until(rpc, running=True):
            print("warning: the emulator stayed in its monitor after the connection closed")
    finally:
        if was_paused:
            pause(rpc)
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


def sizes(executed, ram):
    """{instruction address: bytes counted as ran}, and the addresses whose bytes changed after they ran.

    Each instruction is decoded from ram, the memory as it is at the dump, not as it ran. A start
    inside another's span is a deliberate overlap when the instructions from it end where the outer
    one does (a BIT whose operand another path runs, to skip it). Otherwise the bytes there changed
    after one of them ran, and no decode says how long any of the instructions were: only the
    opcodes are certain, so each counts one byte (IK+, #276)."""
    executed = sorted(executed)
    starts, n = set(executed), {}
    for a in executed:
        d = decode(ram, a)
        n[a] = LEN[d[1]] if d else 1
    changed = set()
    for i, a in enumerate(executed):
        inner = [b for b in executed[i + 1:i + 3] if b < a + n[a]]
        if not inner:
            continue
        b = inner[0]
        while b in starts and b < a + n[a]:
            b += n[b]
        if b != a + n[a]:
            changed.update([a] + inner)
    return {a: 1 if a in changed else n[a] for a in executed}, sorted(changed)


def zap():
    try:
        out = monitor("memmapzap")
    except OSError as exc:
        sys.exit(f"no monitor on 127.0.0.1:{MONITOR_PORT}: {exc} (run `tools.py vice` first)")
    if "ERROR" in out:
        sys.exit(f"memmapzap failed: {out.strip()[:200]}")
    print("execute record cleared")


def dump(gdir, under_rom=False):
    rpc = connect()
    try:
        executed = parse_executed(monitor(f"memmapshow {EXEC_MASK}", rpc))
        rom_marked = parse_executed(monitor(f"memmapshow {ROM_EXEC_MASK}", rpc))
    except OSError as exc:
        sys.exit(f"no monitor on 127.0.0.1:{MONITOR_PORT}: {exc} (run `tools.py vice` first)")
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
    size, changed = sizes(executed, bytes(read_mem(rpc, 0, 0x10000)))
    if changed:
        print(f"warning: {len(changed)} instructions overlap without rejoining, at "
              + ", ".join(f"${s:04X}" + (f"-${e:04X}" if e > s else "") for s, e in runs(changed))
              + ": most often the game rewrote those bytes after running them, so only their opcodes are "
              "counted as ran. Read what ran there in the code that rewrites them, or in a snapshot from before")
    ran = set()
    for a, k in size.items():
        ran.update((a + i) & 0xFFFF for i in range(k))
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
