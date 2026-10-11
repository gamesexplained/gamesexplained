# ZEsarUX workarounds, by failed check

Read this only for the checks that `python3 kit/scripts/tools.py --platform
spectrum check-emulator` reported as failed on the build you are using.
Each section names the checks it covers. If nothing failed, none of this
applies, and following it anyway costs time, unless the summary says the
host is slow: that is a NOTE, not a failed check, and "A slow host" at the
end is for it.

Measured on the **ZEsarUX-13.0** release, file
`ZEsarUX_linux-13.0-ubuntu24_x86_64.tar.gz`, Linux x86_64, on **10 October
2026** with the launcher's flags: 42 passed, 3 failed, 19 seconds, the same
in three runs. The three are below, in the order they matter; a build that
passes a check means its section no longer applies, so delete the section,
not the check. `count-while-running` fails by ZRCP's design, so its section
stays for as long as the protocol works that way.

## A load lands at the start of a frame

`load-keeps-frame-phase`

`snapshot-load` restores RAM, the registers and the interrupt count, but not
where in the frame the machine was. Measured on 13.0: a snapshot saved 29452
T-states into a frame loads back at 6. The ROM's interrupt counter at `$5C78`
comes back with the file, so "how many interrupts have happened" is safe to
compare across a load; "where in the frame" is not.

**What to do instead** — start every experiment from a load, and never compare a
live run with a loaded one. Two runs that both begin with `snapshot_load` land at
the same phase and are repeatable (`determinism-at-stop` gets three identical
runs).

## A read from a second connection waits for the running one

`count-while-running`

ZRCP runs one command at a time across all its connections: each command
takes one lock (`zrcp_command_semaforo` in ZEsarUX's `src/zrcp/remote.c`),
which only ZENG Online mode skips. So while one connection's `run` is in
flight a second connection cannot read anything: in the measurement a
`get-breakpointspasscount` sent while the other connection ran 400000
opcodes blocked for 1.12 s of that run's 1.28 s, then answered at once. Any
slow command holds the others the same way, `send-keys-ascii` included.
This is the protocol's design, the same in the 13.0 source and on the 13.1
snapshot of 10 October 2026, so the bounded runs below are the way to
work, not a stopgap. There is no reading the hit count *while* a run is in
flight; the count is available the moment the run returns.

**What to do instead** — run in bounded chunks and read between them. That
is the whole of phase 3, and it is cheap: 100000 opcodes of the kit's test
program take about a quarter of a second, and the machine never stops
while a chunk runs.

```python
rpc.bp_set(1, "PC=800FH")        # the checkpoint to count
rpc.bp_passcount(1, 10 ** 9)     # a limit it will never reach: this counts, it does not stop
for _ in range(10):
    rpc.run(limit=100000, timeout=20)     # bounded, so it always comes back
    print(rpc.bp_count(1)[0])             # matches so far
```

A pass count is how many matches to skip before firing once, not a hit
counter; a limit nothing can reach turns the entry into a counter that
never stops the machine (`count-while-running` fails, `counting-checkpoint`
passes, on the same entry). A `let var0=var0+1` action is the second way
to count, and `evaluate var0` reads it — useful when ten counters are
needed at once, since ten is all the user variables there are.

## A watchpoint counts only the last byte it touches

`watch-store`, `watch-load`

A memory watchpoint fires on the address line at the end of the instruction, and
a multi-byte access has one address line at the end: its last byte. Measured on
13.0 with `LD ($9010),HL` and `LD HL,($9010)` in a loop: `MWA=9011H` counted 1425
matches and `MWA=9010H` counted zero, and the same for `MRA`. A script that
watches the first byte of a 16-bit variable reads a counter that never moves and
concludes the instrument is dead, which is exactly the trap `kit/EMULATOR.md`
warns about.

**What to do instead** — watch the **last** byte: `MWA=<addr+len-1>H` for a store,
`MRA=<addr+len-1>H` for a load. A single-byte variable is its own last byte.

## Warp is set when the emulator starts

`warp`

ZEsarUX's warp is `--emulatorspeed`, a command-line option. ZRCP has
`get-cpu-turbo-speed` and no setter, so a running emulator cannot be warped or
unwarped from a script.

**What to do instead** — pass `--emulatorspeed N` to the launcher, which means a
restart; it is off again at the next launch:

```
python3 kit/scripts/tools.py --platform spectrum zesarux --emulatorspeed 20
```

## A slow host

No check fails for the host's speed. `cheap-loop` checks that twenty frame
steps in a row each stop at the end of their frame; what a step costs is
printed on a `SPEED` line with the host's load average, kept under `speed`
in the result, and given a `NOTE` when it is over half a second. Until 4
October 2026 the check failed at half a second, and on a busy Mac it did,
with a build that passes on the same Mac idle (#178).

On such a host the frame-stepping loop is slower than `kit/EMULATOR.md`
asks, and nothing in the emulator can fix that: close what else is
running, or plan for fewer steps a second. Measure in the machine's time
(frames, T-states, loop passes), never the host's.
