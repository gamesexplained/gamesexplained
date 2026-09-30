# ZEsarUX workarounds, by failed check

Read this only for the checks that `python3 kit/scripts/tools.py --platform
spectrum check-emulator` reported as failed on the build you are using.
Each section names the checks it covers. If nothing failed, none of this
applies, and following it anyway costs time.

Measured on the **ZEsarUX-13.0** release, file
`ZEsarUX_macos-silicon-13.0.dmg`, macOS arm64, on **29 September 2026**,
three runs of 40 checks each (37 passed, 3 failed, in about 10 seconds a
run). The same three failed in every run. A build that passes a check
means its section no longer applies; delete the section, not the check.

Two of these are behaviour the kit works around for you: `kit/spectrum/zesarux.py`
does the re-arming and the chunked runs itself, so a script that goes
through the client never meets them. They are written out anyway, because
the numbers in them decide how a long measurement has to be shaped.

## A load switches the whole checkpoint table off

`checkpoints-survive-load`

`snapshot-load` leaves the machine in the state it likes, and one part of
that state is the breakpoint table: after a load, `get-breakpoints` answers
`Breakpoints: Off` and every armed entry reads `Disabled N: ...`. A script
that loads a snapshot and then runs to a checkpoint waits forever, and the
symptom — "the loop never runs after a load" — looks like a broken game.

The entries themselves are not lost, only their arming: their conditions
survive, and `enable-breakpoints` puts all of them back. The pass counters
are the agent's, not the machine's, and they keep counting across the load
regardless (measured: 3311 matches over the 5000 opcodes after a load with
the table switched off).

**What to do instead** — re-arm after every load:

```
rpc.snapshot_load(path)          # kit/spectrum/zesarux.py: rearm=True is the default
rpc.bp_enable_all()              # what that default calls
```

`Rpc.snapshot_load(path, rearm=False)` is the raw emulator call, for the
one check that measures it. On a raw ZRCP connection, send
`enable-breakpoints` after the load — it answers `Error. Already enabled`
when there was nothing to do, which is not a failure.

## A read from a second connection waits for the running one

`count-while-running`

`run` is driven by the connection that sent it, so a second connection
cannot read anything until the run loop finishes: in the measurement a
`get-breakpointspasscount` sent while the other connection ran 400000
opcodes blocked for 1.12 s of that run's 1.28 s, then answered at once.
There is no reading the hit count *while* a run is in flight; the count is
available the moment the run returns.

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

## `send-keys-ascii` presses no key

`input-type-ascii`

`send-keys-ascii <ms> <chars...>` — and `send-keys-string` with it —
changes nothing the machine can see. Measured on the 13.0 release with
`--vo null`: the character `A`, its code `65`, and the string form were
each sent and the ULA port polled every 150 ms for two seconds afterwards
(and every 200 ms for three seconds in a second run); the row never moved.
`send-keys-event <n> 1` does land, on the same machine, in the same second
(`input-lands`, `input-seen`, `input-released` all pass).

**What to do instead** — two paths, both measured:

- **Hold a key or a direction**: `set_input` (ZRCP `set-ui-io-ports`), the
  nine hex bytes. This is the one to use for frame stepping: it is in the
  port register as soon as the next instruction reads it, it is still
  there after a frame, and clearing it releases it — all of phase 4's
  input requirement, with one call.
- **Type**: `key_event <number> 1` / `0` per character, with the numbers
  from `tool-zesarux/SKILL.md` (letters and digits are their ASCII codes).
  Key events are pumped by the *running* machine: sent while the machine
  is stopped in cpu-step mode they are never processed at all, so let it
  run and poll the game's own variable.
