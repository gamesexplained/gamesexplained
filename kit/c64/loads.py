#!/usr/bin/env python3
"""Every KERNAL LOAD a C64 game makes, with the memory each one changed.

kit/skills/core/15-parts needs a table of the files a game loads and, for each part, the
addresses its load writes. Where the disk's files cannot be listed or extracted (a protected
disk whose directory points at decoy sectors), this finds both, as long as the game calls the
KERNAL's LOAD at $FFD5, whatever loader the vector at $0330 leads to (c64-reference, "Loading a
file"). A loader the game calls at its own address is not seen.

  loads.py <game dir> [--seconds 900] [--gap 16] [--out <file>]

Start the emulator on the game before its first load you want (tools.py vice). The script puts a
stopping checkpoint on $FFD5, sets the machine running and waits while you play, or while a route
plays it. At each stop it reads the name, the device and the secondary address the call was
given, and the whole of RAM: what changed since the stop before is the load before's work, and
the play in between. Each load is written when the next one comes, and the last when the time is
up or on Ctrl-C, to <game dir>/work/loads.jsonl (or --out) and printed as a table.

A line: n; name (printable PETSCII as text, any other byte as {hex}) and name_hex; device;
secondary (0 loads to the address in X and Y, given as address, anything else to the file's own);
verify (A was not 0); caller (the JSR that called LOAD, from the stack); changed, the runs of RAM
that changed before the next load, as [first, last], with runs fewer than --gap bytes apart
merged. The RAM is read beneath the ROMs and the chips, so a load under them is seen.

A load's ranges hold the play between it and the next load as well: the screen, the zero page and
the stack change with play. Take a part's ranges from the runs its file's size accounts for, and
compare them with the snapshots either side of the load where one is in doubt.
"""
import json
import os
import signal
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

LOAD = 0xFFD5


def petscii(raw):
    """The name as text: printable PETSCII (upper case and digits, as a directory shows them) as it
    is, any other byte as {hex}."""
    return "".join(chr(b) if 0x20 <= b <= 0x5F else f"{{{b:02X}}}" for b in raw)


def changed(before, after, gap=16):
    """[[first, last]] of the bytes that differ, runs fewer than gap bytes apart merged."""
    runs = []
    for a in range(min(len(before), len(after))):
        if before[a] != after[a]:
            if runs and a - runs[-1][1] <= gap:
                runs[-1][1] = a
            else:
                runs.append([a, a])
    return runs


def call_of(ram, regs):
    """What LOAD was asked to do, read at its first instruction: SETNAM's name ($B7 its length,
    $BB-$BC where it is), SETLFS's device ($BA) and secondary address ($B9), A (0 loads, anything
    else verifies), X and Y (where a secondary address of 0 loads), and the caller from the return
    address the JSR left on the stack."""
    ptr, n = ram[0xBB] | ram[0xBC] << 8, ram[0xB7]
    raw = bytes(ram[(ptr + i) & 0xFFFF] for i in range(n))
    sp = regs["SP"]
    ret = ram[0x100 | ((sp + 1) & 0xFF)] | ram[0x100 | ((sp + 2) & 0xFF)] << 8
    return {"name": petscii(raw), "name_hex": raw.hex(), "device": ram[0xBA], "secondary": ram[0xB9],
            "verify": regs["A"] != 0, "address": regs["X"] | regs["Y"] << 8, "caller": (ret - 2) & 0xFFFF}


def table(lines):
    rows = []
    for e in lines:
        big = sorted(e["changed"], key=lambda r: r[0] - r[1])[:4]      # the largest runs, most often the file
        where = ", ".join(f"${a:04X}-${b:04X} ({b - a + 1})" for a, b in big) + (
            f" and {len(e['changed']) - 4} smaller" if len(e["changed"]) > 4 else "")
        to = f" to ${e['address']:04X}" if e["secondary"] == 0 else ""
        rows.append(f"{e['n']:3}  \"{e['name']}\" device {e['device']} secondary {e['secondary']}{to}"
                    f"{' (verify)' if e['verify'] else ''}, called from ${e['caller']:04X}\n       changed: {where or 'nothing'}")
    return "\n".join(rows)


def watch(rpc, out, seconds=900.0, gap=16, poll=0.05, vice=None, clock=time.time, sleep=time.sleep):
    """Record the loads until seconds have passed or the watch is stopped; return the lines."""
    if vice is None:
        import vice
    stop = [False]
    def interrupt(*_):
        stop[0] = True
    old = signal.signal(signal.SIGINT, interrupt) if hasattr(signal, "SIGINT") else None
    n = vice.arm(rpc, LOAD)
    if vice.paused(rpc):
        vice.call(rpc, "vice_execution_run", {})
    lines, last, t0 = [], None, clock()
    try:
        while not stop[0] and clock() - t0 < seconds:
            if not vice.paused(rpc):
                sleep(poll)
                continue
            regs = vice.ask(rpc, "vice_registers_get")
            if regs["PC"] != LOAD:              # stopped by someone else: leave it to them
                sleep(poll)
                continue
            ram = vice.read_mem(rpc, 0, 0x10000, bank="ram")
            if last is not None:
                last[0]["changed"] = changed(last[1], ram, gap)
                lines.append(last[0])
                with open(out, "a") as f:
                    f.write(json.dumps(last[0]) + "\n")
                print(table([last[0]]), flush=True)
            last = (dict(n=len(lines) + 1, **call_of(ram, regs)), ram)
            vice.call(rpc, "vice_execution_run", {})
            sleep(poll)
        if last is not None:
            vice.pause(rpc)
            last[0]["changed"] = changed(last[1], vice.read_mem(rpc, 0, 0x10000, bank="ram"), gap)
            lines.append(last[0])
            with open(out, "a") as f:
                f.write(json.dumps(last[0]) + "\n")
            print(table([last[0]]), flush=True)
    finally:
        vice.release(rpc, n)
        if old is not None:
            signal.signal(signal.SIGINT, old)
    return lines


def main(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    gdir, opts = argv[0], argv[1:]
    def opt(flag, default):
        return opts[opts.index(flag) + 1] if flag in opts else default
    out = opt("--out", os.path.join(gdir, "work", "loads.jsonl"))
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    import vice
    rpc = vice.connect()
    seconds = float(opt("--seconds", 900))
    print(f"watching LOAD at ${LOAD:04X} for {seconds:.0f} s (Ctrl-C ends it); writing {out}", flush=True)
    lines = watch(rpc, out, seconds, int(opt("--gap", 16)))
    print(f"{len(lines)} load(s)" + (f", in {out}" if lines else ": did the game load through $FFD5 while it ran?"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
