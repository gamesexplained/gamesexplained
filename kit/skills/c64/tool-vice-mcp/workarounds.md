# vice-mcp workarounds, by failed check

Read this only for the checks that `python3 kit/scripts/tools.py
check-emulator` reported as failed on the build you are using. Each
section starts with the names it covers. If nothing failed, none of this
applies, and following it anyway costs time: several of these
workarounds are slower than the thing they replace.

When a new build or release passes a check, delete that check's
section. When every check passes on the release, delete this file.

Measured on the v3.11.0 release (macOS arm64 GUI build), 22 September
2026. These failed: `ping-running`, `watch-args`, `watch-store`,
`watch-load`, `stop-exact`, `step-pass`, `step-instruction`,
`run-after-stop`, `run-until-resumes`, `load-held`,
`load-stop-checkpoint`, `load-state`, `ignore-count`, `determinism`,
`determinism-screenshot`, `determinism-running-save`,
`determinism-restart`, `checkpoints-survive-load`, `joy-immediate`,
`joy-port-1`, `joy-port-2`, `joy-fire` and all six `frame-advance-`
checks: 28, on a freshly started emulator. It has also crashed partway
through the check (`no-exception`, at the end of this file). The headless
builds fail more: their pause is a stub, so nothing stops at all
(`kit/c64/INSTALL.md`). The v3.13.1 release on Linux failed one check on
26 September 2026, in five runs: `pause-at-instruction`.

## A pause that stops inside the vertical sync

`pause-at-instruction`

`vice_execution_pause` raises VICE's own pause, which takes hold at the
next vertical sync, and asks for a stop at the next instruction as well.
Usually the instruction comes first. When the call lands as a frame ends,
the sync does, and the machine stops part way through an instruction: on
the v3.13.1 release under Linux, four to seven pauses in thirty (26
September 2026). `vice_ping` says `paused` and memory reads true; the
tell is the raster line, which reads the frame's last, 311 on a PAL
machine. What goes wrong there:

- **The registers read stale.** The CPU hands out its registers only at a
  stop between two instructions, so `vice_registers_get` returns them as
  they were at an earlier one.
- **A register set is lost** at the next instruction, overwritten by the
  CPU's own copy. A `PC` set to start a routine starts nothing.
- **A snapshot loaded there keeps the old registers.** Memory comes from
  the file, and the program that was running carries on in it.
- **A snapshot saved there** holds the stale registers, and the video chip
  caught between two frames: it has finished the picture, and its raster
  still reads the last line. Loaded later from a proper stop, it runs
  that line twice, and from then on the emulator draws every line one row
  low in its pictures and ends every frame, where each frame advance
  stops, on line 311 instead of line 0. Every snapshot saved after that
  carries the offset; a reset clears it, and so does loading a snapshot
  saved before it. `frame.py capture` measures it (`picture_lines_low` in
  the frame file, and it says so) and `compare` allows for it.

So never read or set registers, step, or save or load a snapshot straight
after `vice_execution_pause`. Stop with `pause()` in `kit/c64/vice.py`: it
follows the pause with a one-frame `vice_frame_advance`, which from inside
the sync only finishes the instruction and stops, and from a proper stop
runs one frame. After a `vice_execution_pause` of your own, make that
advance yourself. A stop at a checkpoint, a step and a frame advance are
already between two instructions, and so is a snapshot saved while the
machine runs.

## Stops land late

`stop-exact`, `step-pass`, `step-instruction`, `pause-exact`,
`stopped-stays-stopped`, `stopped-without-checkpoint`

A stopping checkpoint or a step asks the window to pause at the next
vertical sync, so the CPU runs up to a frame more after the stop was
asked for, while `vice_ping` may already say `paused`.

- **The program counter after a stop is not the checkpoint address**, and
  the registers are not what the instruction saw: at a stop on a `cmp`
  the accumulator read 0 while the game demonstrably saw $FF. Do not use
  either to decide whether the break happened. "It never reaches that
  routine", founded on the PC, has been flatly wrong. Read the hit count
  from `vice_checkpoint_list`, or memory the routine wrote.
- **`vice_execution_pause` may not stop the CPU at all.** One run lost
  hours to "the game does not do that" because of it. `halt_at()` in
  `vice.py` (a stopping checkpoint) is the stop that works; then prove it
  held by reading the PC twice.
- **Stepping one pass by alternating two stopping checkpoints runs two
  passes.** The stop happens after the tool has returned, and a game's own
  delay can be shorter than the lag. Use the in-game input hook in the
  skill instead of stepping.
- Check the execution state after reads and writes, in both directions:
  one run saw reads leave the machine paused, another saw a paused machine
  running again between reads. A sequence of reads taken while a key is
  held may sample a game that has run several frames between them, which
  is why input experiments give answers that look random.

## Resuming after a stop

`run-after-stop`, `run-until-resumes`, `run-after-watch-stop`

`vice_execution_run` after a stopping checkpoint may not resume the
machine: reads keep returning the same state and the loop's hit count
stays at zero. Delete the checkpoint first, then run; `release()` in
`vice.py` does both. `vice_run_until` does not resume a stopped machine;
run it on a running one.

**A stopping watchpoint opens the monitor window, and an open monitor
pauses the machine until the window is closed.** This is the most
expensive trap on these builds, because a paused machine does not look
paused. `vice_ping` still reports `"execution": "running"`. Screenshots
show the last frame, which looks like gameplay. Memory reads return
steady, plausible values. Every checkpoint reports `hit_count: 0`, which
reads as "that routine is never called". `vice_execution_run`,
`vice_machine_reset` and `vice_autostart` report success and change
nothing. Close the monitor window, or restart the emulator
(`tools.py stop vice`, `tools.py vice`), and never ask for a stop on a
watchpoint: count instead.

## Watchpoints

`watch-args`, `watch-store`, `watch-load`, `watch-stop`

`vice_watch_add` ignores `load`, `store` and `stop`: it wants
`type: "read" | "write" | "both"`, and it creates a **stopping write**
watchpoint whatever you asked for. That watchpoint then opens the monitor
(above), and a silently wrong watchpoint reports zero hits and looks like
proof of absence. Use `vice_checkpoint_add` with `load: true` or
`store: true`, `exec: false` and `stop: false`, which works.

## Checkpoints die on a snapshot load

`checkpoints-survive-load`

A snapshot carries the CPU's "check the monitor before each instruction"
bit. Loading one that was saved with no checkpoints switches every live
checkpoint off, silently: `vice_checkpoint_add` keeps returning ok,
`vice_checkpoint_list` shows them enabled, counts stay at zero and stops
are never taken, until the next checkpoint change. Two runs read this as
"a loaded snapshot comes back without its timer interrupt, and the loop
never runs again": the loop was running and the instrument was off.

After every load, add a checkpoint and delete it again, and keep a control
checkpoint in every batch of counts.

## Loads and snapshots

`load-held`, `load-stop-checkpoint`, `load-state`, `ignore-count`,
`determinism`, `determinism-screenshot`, `determinism-running-save`,
`determinism-restart`

These fail on the release because the stop is late, not, as far as
measured, because the emulation is nondeterministic: the two runs stop a
few instructions apart and the samples differ by the bytes written in
between. So:

- A loaded snapshot runs at once. Stop it with a checkpoint armed before
  the load, and expect the machine to be a little past it.
- To compare two runs, compare what the game wrote (a log from the
  in-game input hook), not the machine at a stop.
- One run saw `vice_snapshot_load` after a hard reset return `$01` changed
  ($37 instead of the game's $36), the CPU in the KERNAL screen scroller
  and a garbage screen; the cause is not established. The file itself was
  still good for the disassembler. Re-autostarting the image is the
  reliable way back to a state.

On v3.13.1 on Linux (24 September 2026) the stops were exact and only
`determinism-running-save` and `determinism-restart` failed, in most runs
but not all, whether the build was the release or compiled from source.
Both loaded a snapshot straight after `vice_execution_pause`, and failed
whenever that pause had stopped inside the vertical sync
(`pause-at-instruction`, above), where a load keeps the old registers.
They now stop with `pause()`, and passed in five runs out of five on 26
September 2026.

## The joystick

`joy-port-1`, `joy-port-2`, `joy-immediate`, `joy-fire`, `joy-release`

**`vice_joystick_set` is off by one.** `{"port": 1}` pulls bits on
`$DC00`, which is control port **2** on the hardware. `{"port": 2}`
returns `{"status":"ok"}` and changes nothing; 0 and 3 are rejected. The
server validates `port` as 1 or 2 and passes it straight to VICE's
`joystick_set_value_absolute()`, whose first argument is zero-based
(barryw/vice-mcp#6 fixes it). Most C64 games read control port 2, so for
most games the bug hides: ask for port 1 and the game responds. A game
that reads control port 1 at `$DC01` cannot be driven with this tool at
all, and `vice_keyboard_matrix` and `vice_keyboard_chord` leave `$DC01`
at `$FF` as well.

The way in is to stop treating `$DC01` as an input. CIA 1 port B is an
input only because DDRB says so. Write `$1F` to `$DC03` and bits 0 to 4
become outputs; from then on a plain memory write to `$DC01` is exactly
what the game reads. `vice.py` wraps this as `stick_arm`, `stick` and
`stick_release`. Leaving bits 5 to 7 as inputs keeps the keyboard columns
working for a game that reads a key out of the same port.

**While the stick is armed, keyboard columns 0 to 4 are dead**, because
those bits are outputs. Keys in columns 5 to 7 keep working, which is what
makes this confusing: a menu where one key responds and another does
nothing looks like a flaky emulator rather than a mask. Call
`stick_release` before **every** keyboard press, not only at the end.

A value set through `vice_joystick_set` lands at a random point within
the next frame (VICE imitating a human hand), so a direction set just
before a step is seen a pass late about half the time.
`vice_joystick_tap` for half a second was missed by a loop that polls the
stick every pass; `vice_joystick_set` held for two seconds was seen. Hold
the stick when a loop has to notice it.

## No frame advance

`frame-advance-exists`, `frame-advance-one`, `frame-advance-pass`,
`frame-advance-boundary`, `frame-advance-many`,
`frame-advance-refuses-running`

The release has no `vice_frame_advance`. Use the in-game input hook in
the skill to replay inputs; to catch one frame on screen, poke the game
into the state just before it and poll, or read the variables that prove
it happened.

## The execution state is not reported truthfully

`ping-running`

`vice_ping` reported `paused` on a freshly started machine that was
running, and can report `paused` a frame before the CPU stops (above).
Never use it alone: a hit count that grows on a routine known to run is
the test that the machine is running.

## Keys

`keys-matrix`, `keys-host`

On one release run, `vice_keyboard_matrix` with `"key": "SPACE"` reported
row 7, column 4 and `pressed: true`, and a game that scans column 7
itself never saw it through four holds, by name and by row and column.
`vice_keyboard_key_press` with `"key": "Space"` (the host-key path)
reached the same routine at once. F1, F5, F7 and the digits worked through
the matrix tool in the same session. Keys a game polls rarely can need a
`hold_ms` around 3000; where that still does nothing, try
`vice_keyboard_type`, which goes through the KERNAL buffer.

On 26 September 2026, on v3.13.1 built from source on macOS, a game that
scans the matrix itself from its main loop (about five passes a second)
never saw E sent with an automatic release: `vice_keyboard_matrix` with
`hold_ms` 600, three times, and `vice_keyboard_key_press` with `hold_ms`
400 and 800. A non-stopping checkpoint on the instruction that latches a
new key was never hit. `vice_keyboard_matrix` with `pressed: true`, left
down across two or three other tool calls and then released with
`pressed: false`, reached it every time. Released after a single call it
was missed once. So when an automatic release does nothing, hold the key
by hand, watch the latch with a checkpoint or a variable, and release
only after it has moved.

In the same session, `vice_joystick_set` did not always stay set across
`vice_frame_advance`: "up" held through three advances of 200-250 frames,
but "right", set after a snapshot load, was not seen at all by the game
(its stick variable stayed `$0F`); set again, it was seen for about 50
frames and then gone. Read the game's own stick variable after setting
the stick, and set it again after every snapshot load.

## The stopwatch

`stopwatch`

The cycle stopwatch has returned frame-quantised numbers. Time with a CIA
timer you read yourself, or count loop passes with a checkpoint, and
validate against a quantity you can compute.

## The transport

`call-during-stop`, `unpaced-calls`

A call made while a checkpoint is stopping the machine can time out after
five seconds, and some calls can take the server down. Pace a script's
calls, check `tools.py status` after a closed socket, and do not read a
timeout as an answer from the game.

## A phase did not finish

`no-exception`

A phase stopped on an error before its last check, and the script went on
to the next phase. The checks after that point did not run and are in
neither the passed nor the failed list; the totals can still add up to 57,
because `no-exception` is counted in their place. The traceback printed
under the phase's heading says what went wrong.

Run `tools.py status` first. If the emulator is down, it crashed: the
v3.11.0 release has died this way during the check, with a segmentation
fault on a background thread (22 September 2026; cause not established).
Start it again and rerun `check-emulator` on the freshly started emulator.
If the same phase stops again, treat the checks it did not reach as
failed and read their sections: they are the ones after the last result
printed under its heading, in that phase's function in
`kit/c64/check_emulator.py`.
