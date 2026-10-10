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
run during a game's start-up, is marked the same way. A game that banks the
KERNAL in again later, to load a file, puts the KERNAL's code into the record
at the same addresses as its own, so `--under-rom` leaves out, and lists,
what the KERNAL's code reaches from its vectors and jump table and no code
in RAM reaches (kernal_only(), #309).

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
from opcodes import END, operand  # noqa: E402
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


JUMP_TABLE = range(0xFF81, 0xFFF4, 3)   # the KERNAL's entries (kit/skills/c64/c64-reference, "Interrupts")


def word(mem, a):
    return mem[a] | mem[(a + 1) & 0xFFFF] << 8


def transfers(mem, a, d, vectors=None):
    """Where the instruction d at a can jump or branch to: JMP (ind) through mem's pointer, read with
    the 6502's wrap inside the page, and through the KERNAL's default for that vector too, given."""
    m, mode, bs = d
    if mode == "rel" or (m in ("jmp", "jsr") and mode == "abs"):
        return [operand(a, mode, bs)]
    if m == "jmp" and mode == "ind":
        p = operand(a, mode, bs)
        return [mem[p] | mem[(p & 0xFF00) | ((p + 1) & 0xFF)] << 8] + ([vectors[p]] if p in (vectors or {}) else [])
    return []


def reach(mem, entries, recorded, vectors=None):
    """The addresses in recorded that code decoded from mem reaches from entries, through recorded
    addresses only."""
    seen, todo = set(), [e for e in entries if e in recorded]
    while todo:
        a = todo.pop()
        if a in seen:
            continue
        seen.add(a)
        d = decode(mem, a)
        if d:
            nxt = transfers(mem, a, d, vectors) + ([] if d[0] in END else [a + LEN[d[1]]])
            todo += [b & 0xFFFF for b in nxt if (b & 0xFFFF) in recorded]
    return seen


def restor_defaults(rom):
    """{vector: the KERNAL's default for it}, read from the ROM's RESTOR ($FF8A): a JMP to
    LDX #<table, LDY #>table, then LDY #count-1 and LDA vectors,Y in its copy loop. Empty for a
    ROM of another shape."""
    d = decode(rom, 0xFF8A)
    if not d or d[:2] != ("jmp", "abs"):
        return {}
    a, imm = operand(0xFF8A, "abs", d[2]), []
    for _ in range(12):
        d = decode(rom, a)
        if not d:
            return {}
        m, mode, bs = d
        if mode == "imm" and m in ("ldx", "ldy"):
            imm.append(bs[1])
        elif m == "lda" and mode == "aby" and len(imm) == 3:
            table, base = imm[0] | imm[1] << 8, operand(a, mode, bs)
            return {base + i: word(rom, table + i) for i in range(0, imm[2] + 1, 2)}
        a += LEN[mode]
    return {}


def kernal_only(rom, ram, recorded, sources):
    """(dropped, both) among the recorded ROM-execute addresses at $E000-$FFFF, which the memmap
    cannot place in the KERNAL or the RAM under it. dropped: what the KERNAL's own code reaches,
    decoded from the ROM, from its hardware vectors, its jump table and RESTOR's defaults, and no
    code in RAM reaches, decoded from the RAM, from the jumps of the instructions in sources (what
    ran elsewhere in RAM) and the RAM's own vectors. A jump into the jump table counts for the RAM
    only where the RAM holds a JMP there too: otherwise it is a call to the KERNAL. both: what the
    two reach alike; the rest neither reaches, and stays. rom is the memory with the KERNAL in
    (the RAM below it, for the vectors it jumps through); ram is the RAM alone (#309)."""
    vectors = restor_defaults(rom)
    by_rom = reach(rom, [word(rom, v) for v in (0xFFFA, 0xFFFC, 0xFFFE)] + list(JUMP_TABLE)
                   + list(vectors.values()), recorded, vectors)
    entries = [word(ram, v) for v in (0xFFFA, 0xFFFC, 0xFFFE)]
    for a in sources:
        d = decode(ram, a)
        if d:
            entries += transfers(ram, a, d)
    by_ram = reach(ram, [e for e in entries if e not in JUMP_TABLE or ram[e] in (0x4C, 0x6C)], recorded)
    return sorted(by_rom - by_ram), sorted(by_rom & by_ram)


def ranges(addrs, most=12):
    rs = runs(addrs)
    out = ", ".join(f"${s:04X}" + (f"-${e:04X}" if e > s else "") for s, e in rs[:most])
    return out + (f" and {len(rs) - most} more runs" if len(rs) > most else "")


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
    if under and under_rom and under[-1] >= 0xE000:
        ram = bytes(read_mem(rpc, 0, 0x10000, "ram"))
        kernal = bytes(read_mem(rpc, 0xE000, 0x2000, "rom"))
        dropped, both = kernal_only(ram[:0xE000] + kernal, ram, {a for a in under if a >= 0xE000},
                                    set(executed) | {a for a in under if a < 0xE000})
        if dropped:
            under = [a for a in under if a not in set(dropped)]
            print(f"left out {len(dropped)} instructions of the KERNAL's own, which its code reaches from its "
                  f"vectors and jump table and no code in RAM reaches: {ranges(dropped)}")
        if both:
            print(f"note: {len(both)} instructions under the KERNAL are reached both by its code and by code in RAM, "
                  f"and are kept: {ranges(both)}. Check them against what the game's code there runs")
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
