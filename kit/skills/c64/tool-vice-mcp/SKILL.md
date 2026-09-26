---
name: tool-vice-mcp
description: How to drive VICE through the vice-mcp server, the recommended emulator setup. Check the build first, then the tool names, the sequence that works, stepping and input, and the behaviours that waste time on any build. What to do when a check fails is in workarounds.md, beside this file.
---

# VICE through vice-mcp

Registered in `.mcp.json` as the `vice` server (HTTP, `127.0.0.1:6510`).
Claude Code connects to MCP servers when a session starts, so the
`vice_*` tools are there only if the emulator was already running then; a
server started later does not appear by itself. Other harnesses are
untried. On a first run the tools are therefore missing, and that is
normal: the emulator is installed partway through the session, and a
session opened in the folder above the clone never reads `.mcp.json` at
all. Do not wait for them, or restart the emulator hoping they appear. A
server that was up at the start and is restarted later does come back on
the next call.

`kit/c64/vice.py` calls the same tools over HTTP and needs no
registration, so it works either way:
`python3 kit/c64/vice.py <tool> '<json>'` for one call, `--list` for the
names, or import it. Anything repetitive (halt, poke, run N passes, read
back) belongs in a script, not in a string of one-off tool calls: each
call costs a round trip.

## Check the emulator before you trust it

```
python3 kit/scripts/tools.py status            # which build: release <tag>, or own build of <repo>, commit ...
python3 kit/scripts/tools.py get-vice          # is there a newer one for this machine? changes nothing
python3 kit/scripts/tools.py check-emulator    # kit/EMULATOR.md's four phases, under a minute
```

If `get-vice` names a newer release than the one installed, tell the
contributor what it printed and ask before changing anything; an older
build is not wrong, only measured by its own checks. The check resets
the machine, so run it before the game is loaded, not during. It runs its own small test program, measures each capability
this file relies on, and gives every check a name. **Read
`workarounds.md` for the names that failed, and only those.** Everything
in this file is written for a build that passes; where a section needs a
particular check, it says which. Put the build line from `status` and the
list of failed checks in `orientation.md`, and the build line in
`game.json` under `tools.emulator`.

Which build to have is not a version you pick: `tools.py get-vice` finds
the newest release and what this machine can have of it, and asks
(`kit/c64/INSTALL.md`, "Get the emulator"). The dated measurements are
the table at the top of that file: on 22 September 2026 the v3.11.0
release failed 28 of the 56 checks, most of phase 4 among them; on 24
September v3.13 built from source passed all 56.

## The sequence that works

1. `vice_disk_attach` the image, then `vice_autostart` it (or autostart
   the image directly). Wait; screenshot with `vice_display_screenshot`.
2. `vice_machine_config_get` to confirm PAL/NTSC; autostart turns **warp
   mode on**. Turn it off through the generic `tools_call` with
   `{"name": "vice_machine_config_set", "arguments": {"resources": {"WarpMode": 0}}}`
   (the typed wrapper rejects its argument).
3. Send input: `vice_keyboard_type` for text at the BASIC prompt,
   `vice_keyboard_matrix` for games that scan the keyboard themselves,
   `vice_joystick_set` for the stick. Hold an input until the thing that
   should react has reacted; on a running machine a short press can fall
   between two of the game's reads.
4. Confirm play with a screenshot, then `vice_snapshot_save` with a name
   that describes the state. Snapshots are written to
   `tools/vice-home/config/vice/mcp_snapshots/`
   (`python3 kit/scripts/tools.py snapshots` lists them); copy the `.vsf`
   into the game's `work/`.
5. `vice_memory_read` (hex encoding, any size), `vice_memory_write`,
   `vice_memory_search`, `vice_disassemble` for live inspection.
   `vice_registers_get` for the PC. `vice_backtrace` for who called this.
6. `vice_checkpoint_add` for breakpoints (exec) and for load and store
   watchpoints (`load` or `store`, `exec: false`); `vice_checkpoint_list`
   shows hit counts, which is often the fact you wanted (runs once, runs
   every tick). Leave `stop` false unless you mean to stop.
7. `vice_vicii_get_state`, `vice_sid_get_state`, `vice_cia_get_state`,
   `vice_sprite_get`, `vice_sprite_inspect` for chip state and a rendered
   look at sprite data.
8. `vice_run_until` an address or a cycle count; `vice_cycles_stopwatch`
   for timing.

`tools_list` returns the full set with schemas when you need an argument
you are unsure of.

## Stopping, stepping and input

Needs `stop-exact`, `step-pass`, `run-after-stop` and the `joy-` checks;
the frame calls need the `frame-advance-` checks. Where they fail, the
in-game input hook below does the same job.

- **A stop is on the instruction.** A stopping checkpoint,
  `vice_execution_pause`, `vice_execution_step` and `vice_frame_advance`
  halt the CPU where they say, `vice_ping` reports `paused` only then,
  and `vice_execution_run` resumes from any of them.
- **One pass of the game loop.** Put a stopping checkpoint on the top of
  the loop; then `vice_execution_run` and wait for `paused` is one pass,
  exactly, about a tenth of a second from a script. `step_pass()` in
  `vice.py`.
- **N frames.** `vice_frame_advance` with `frames` runs that many from a
  stop and stops at the frame boundary, one call for any count. `frames()`
  in `vice.py`. A game paced by a delay loop rather than the frame runs a
  pass in some other time; step by pass there.
- **Every write of one frame.** A stopping checkpoint that fires first
  ends `vice_frame_advance` early (its message says so), and the next call
  runs on to the same frame's end. So a loop of calls, with stopping
  watchpoints on what you want to see written, visits every such write of
  one frame and ends at its boundary. After a store the machine stops on
  the next instruction, with the value already written. The raster line at
  each stop and the cycle stopwatch place each write on its line and cycle:
  the raster register steps in the first cycle of a line, except that line
  0's first cycle still reads 311. `kit/c64/frame.py capture` does all of
  this for the video chip.
- **The stick.** `vice_joystick_set` with `port` 1 is control port 1
  (`$DC01`), 2 is `$DC00`. A value set while stopped is in the register
  before the call returns, seen by the next instruction, and stays until
  you release it. `joy()` in `vice.py`. Most C64 games read port 2; the
  early Commodore titles read port 1.
- **Keys.** `vice_keyboard_matrix` (row and column, or a key name) behaves
  like the stick. `vice_keyboard_key_press` by host key name does not: VICE
  delivers it 1000 cycles plus a random amount up to a frame later, on
  purpose, to imitate a hand. Use the matrix tool for anything timed.
  `pressed: true` holds a key until a call with `pressed: false`, and
  `hold_frames` holds it for a count of frames. Prefer `pressed: true` and
  a release of your own once the game has taken the key: an automatic
  release (`hold_ms`, `hold_frames`) has been seen to miss a game that
  scans the matrix itself (`workarounds.md`, Keys). A key the tool has no name
  for, such as `:`, takes its `row` and `col` from the matrix in
  `c64-reference`. Letters are named in capitals: on the v3.13.1 release
  `"U"` works and `"u"` comes back as "Unknown key name", which a script
  that ignores the reply takes for a key the game did not answer.
- **Typing into a game.** A game that scans the keyboard from its main
  loop misses a press shorter than a pass, and a fixed `hold_frames` is
  either too short or slow. Put a non-stopping checkpoint on the
  instruction that stores a new key, hold each key until its hit count
  grows, release, and wait for the game's last-key variable to clear
  before the next key; doubled letters need that gap.
- **Snapshot, load, step.** A load on a stopped machine leaves it stopped
  at the loaded state's program counter, with every checkpoint still armed
  (`load-held`, `checkpoints-survive-load`). The same snapshot plus the
  same inputs gives the same machine, byte for byte (`determinism`). This
  is how to reach a corner case and try it a hundred ways.
- **Choose from a menu by its text, not its position.** A game whose menu
  lists only what applies moves every entry when one appears or goes, so
  "three to the right" picks something else as soon as the state differs.
  Read the menu's rows from screen memory, find the entry's slot, move
  the cursor that many slots and press fire; read the rows again after
  each choice. For a submenu, save a snapshot on it and start each trial
  from there.
- **A trace of the real game is the test for a port.** Before trusting a
  JavaScript version of a mechanic, record the game's own state with a
  stopping checkpoint on the top of its loop: per pass, read the blocks
  of memory the mechanic uses and write them out, a few hundred passes
  with the input held still. Start the port from the first pass's state
  and compare every pass. A port that matches every variable for
  hundreds of passes is the same mechanic; one that matches most of them
  is not yet.

A replay loop: load, then per pass `joy()`, `step_pass()`, read the
variables. About nine passes a second.

### The in-game input hook

When stepping is not available, or when a replay is long enough that the
game should run at its own speed, stop stepping and patch the game
instead. Find its one `jsr` to the control reader, and replace it with a
`jsr` to a routine in free RAM that takes this pass's input from a table,
sets the same flags the reader would, and copies the state variables into
a log, sixteen bytes per pass. Let the game run and read the log
afterwards. The first game to need this carries the routine in its
`agent-history.md` (inputs at `$C100`, log at `$C200`, counter at
`$C0F0`); it is fifty bytes and any game gets a variant of it. Restore the
original `jsr` as soon as the event you wanted has fired, or the counter
walks the log into I/O space.

Before staging anything, put a non-stopping checkpoint on the game loop
for a second and read its hit count. A stick bit written while the game
had quietly ended started a new game from the attract screen, parked the
CPU in the opening tune, and made every input read as "does nothing".

### Recording what the SID plays

Needs the `frame-advance-` checks. To check a music driver against what
it actually plays, or to give the minisite a tune, record the chip rather
than modelling the driver. Once the music is under way, stop the machine
and alternate `vice_frame_advance` of one frame with `vice_sid_get_state`,
keeping each voice's frequency, gate and waveform: the list of frames is
the tune, at the video rate. Three things decide whether it is right:

- **Start at the first real note**, not at the call that starts the piece:
  whatever runs in between (a walk to the instrument, a sound effect) is
  in the recording otherwise, and a fixed wait can end before the music
  begins. Wait until a voice is gated on a pitch the lead-in never uses.
- **One gate is one note.** Vibrato moves the frequency every frame; merge
  frames under one gate whose pitch stays within a semitone.
- **Name the notes with the clock the table was built for**
  (`c64-reference`, "Mistakes that bite"), and say what the machine you
  recorded on actually sounds.

Two calls per frame run at about 13 frames a second, so a minute of PAL
music takes four minutes to record; run it in the background. A batch of
frames per call would be faster and would lose every note shorter than
the batch.

## Behaviours that waste time, on any build

- **Prove the machine is running before you believe a negative result.**
  An absence measured on a stopped machine is indistinguishable from an
  absence in the game. The test is a hit count that grows on a routine
  known to run, such as the loop or the interrupt handler. Two reads of the
  program counter are not the test: a game idling in a two-instruction
  delay loop returns the same address twice while running.
- **Keep a control checkpoint.** In every batch of hit counts, count one
  routine you know runs. If the control reads zero, the instrument is dead
  and no other number in the batch means anything. It costs one call, and
  on a build that fails `checkpoints-survive-load` it is the only thing
  that tells you.
- **Prove the machine is stopped before you poke it.** `vice_ping`, or a
  read of the PC twice. A write to a running game is overwritten by the
  game.
- **Poke, then read a derived value, and a whole update may have run in
  between.** Stop at a point *after* the update and before the code you are
  testing, or expect the game's own per-frame change to be added to whatever
  you wrote. Numbers that are consistently one step out are this.
- **Screenshots are seconds apart on a running machine.** To catch a
  short-lived screen, stop and step to it, or read the state variables that
  prove it happened.
- **Memory reads honour banking.** Use the bank argument
  (`vice_memory_banks` lists them) when you need RAM under I/O or ROM. The
  banks are `default`, `cpu`, `ram`, `rom`, `io` and `cart`; reading a
  character or KERNAL ROM through `rom` and diffing it against a copy the
  game made in RAM is a one-call way to settle what that copy is.
- **Registers a raster interrupt rewrites cannot be sampled.** Reading
  `$D011`, `$D016`, `$D018` or `$DD00` from a script gives whichever value
  the handler last wrote, and consecutive reads disagree. It looks like a
  flaky tool and it is not. Read the interrupt handler to work out what
  each band does, and record the frame with `kit/c64/frame.py capture`,
  which stops at every write of one frame instead of sampling.
- **Validate a measuring tool before you trust a figure from it**, against
  a known quantity (a timer latch you can compute, a loop you can count),
  and record in `features.md` when an input path could not be exercised
  rather than calling it confirmed.
- **Measure in the machine's time, not the host's.** A non-stopping
  checkpoint on a busy loop can slow the machine below real time, and VICE
  then runs faster than real time until it has caught up: half a second of
  wall clock read 700,000 cycles once. Count passes, frames or cycles on a
  stopped machine at both ends, and never compare against `sleep`.
- **Arm a stopping checkpoint on a stopped machine** when you set its
  ignore count or condition in a second call. On a running machine it can
  fire in between, and on a slow host it usually does.
- **When a key "does nothing", try the other tool** before concluding
  anything about the game: `vice_keyboard_matrix`, `vice_keyboard_key_press`
  by host name, and `vice_keyboard_type` through the KERNAL buffer reach the
  game by different paths. Keep a hit counter on the routine that should
  react as the instrument.
- **A key held through `vice_keyboard_matrix` stays down until released,
  across snapshot loads**: it is the emulator's keyboard, not the machine's
  state. A script that dies between the press and the release leaves it
  held, and every key test after it is wrong: the KERNAL's scan keeps the
  last key it finds in its scan order, so the stuck key hides the one you
  press, and a working key reads as dead. Release in a `finally`, and after
  any failed script release every key it pressed. The tell: the KERNAL's
  current-key variable `$C5` sitting on one code (`$40` means none).
- **`vice_machine_config_set` has a six-entry whitelist**:
  `MachineVideoStandard`, `WarpMode`, `Speed`, `SidModel`, `CIA1Model`,
  `CIA2Model`. Joystick port assignment is not among them.
- **Switching the video standard sticks.** One run set
  `MachineVideoStandard` to NTSC and back to PAL, and every snapshot saved
  earlier then failed to load: the call says only "Failed to load
  snapshot", while `tools/logs/vice.log` says the snapshot was made with
  another video chip model. Restarting the emulator (`tools.py stop vice`,
  then `tools.py vice`) cured it. Run an NTSC test last, or restart after
  it.
- **A snapshot save name cannot be reused.** Save **without** ROMs so the
  RAM image lands where the platform reference says it does.
- **Some calls can take the server down.** If a call returns a closed
  socket, check `tools.py status` before assuming the answer meant anything.
- **`vice_machine_reset` leaves a paused machine paused**, `run_after`
  or not. Resume it with `vice_execution_run` before waiting for `READY.`.
  So does `vice_autostart`: on a paused machine it attaches and returns,
  and nothing loads. `frame.py test` leaves the machine paused, so
  resume it before the first autostart; `tools.py check-emulator` resumes
  it at the end.
- **`vice_autostart` loads the first program on the disk.** On the
  v3.13.1 release (25 September 2026) its `program` and `index`
  arguments did not choose another file. For any other file, resume the
  machine at `READY.` and type `LOAD"NAME",8,1` and `RUN` with
  `vice_keyboard_type`.
- **`vice_memory_read` takes at most 65,535 bytes**, so a whole 64 KB is
  two reads.
- **Every MCP call stops the emulated machine for a moment.** A script
  that polls in a tight loop slows the game it is watching. Sleep between
  polls, or let a stopping checkpoint do the waiting.
- **A restored screen can be one the game is still drawing.** A snapshot
  or a freezer backup may show the title while the game redraws it from
  scratch, for seconds; keys pressed before it reaches its keyboard read
  are lost, and the next key does the job of the lost one. Before typing,
  stop on the routine that reads the keys, or wait until the game's
  key variable changes.
- **Protected originals (`.g64`) need the drive's own processor.** The
  drive settings are not in `vice_machine_config_set`'s whitelist: stop
  the emulator, write them to `tools/vice-home/config/vice/vicerc` under
  `[C64SC]` (`Drive8Type=1541`, `Drive8TrueEmulation=1`, `TrapDevice8=0`;
  the names carry the drive number, and `DriveTrueEmulation` or
  `VirtualDevice8` are unknown to v3.13.1), start it again, check
  `tools/logs/vice.log` for "Unknown resource", and delete the file when
  done. When a loader hangs, look at the drive: with
  `BinaryMonitorServer=1` in the same file, VICE's binary monitor answers
  on port 6502, and memory space 1 of its protocol is drive 8, so the
  drive's program counter and RAM can be read while the C64 waits.
  Try the image before writing the file: VICE's own defaults already run
  the drive's processor. On 26 September 2026 the v3.13.1 Linux release,
  with no `vicerc` at all, autostarted a publisher's original G64 through
  its custom loader to the game in 143 seconds; the file is for an image
  that hangs.
- **One emulator answers on :6510, whoever started it.** A second clone of
  the kit on the same computer, or an emulator left from an earlier run,
  takes this session's calls, and its snapshots land in its own folder.
  `tools.py status` warns when the emulator on the port came from another
  folder, and `tools.py vice` refuses to start beside it; stop it from the
  clone that started it, or ask the contributor to close it.
- The emulator needs a pseudo-terminal and dies with the session that
  started it.
