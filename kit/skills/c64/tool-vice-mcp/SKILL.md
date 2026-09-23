---
name: tool-vice-mcp
description: How to drive VICE through the vice-mcp server, the recommended emulator setup. Check the build first, then the tool names, the sequence that works, stepping and input, and the behaviours that waste time on any build. What to do when a check fails is in workarounds.md, beside this file.
---

# VICE through vice-mcp

Registered in `.mcp.json` as the `vice` server (HTTP, `127.0.0.1:6510`).
The transport is plain HTTP, so a server started or restarted *after* your
session began is picked up on the next call without restarting the session.
If the tools are missing entirely, start it (`kit/INSTALL.md`) and try again.

`kit/c64/vice.py` is a client for the same server. Anything repetitive
(halt, poke, run N passes, read back) belongs in a script, not in a string
of one-off tool calls: each call costs a round trip.

## Check the emulator before you trust it

```
python3 kit/scripts/tools.py status            # which build: release, or own build of <repo>, commit ...
python3 kit/scripts/tools.py check-emulator    # kit/EMULATOR.md's four phases, under a minute
```

The check resets the machine, so run it before the game is loaded, not
during. It runs its own small test program, measures each capability
this file relies on, and gives every check a name. **Read
`workarounds.md` for the names that failed, and only those.** Everything
in this file is written for a build that passes; where a section needs a
particular check, it says which. Put the build line from `status` and the
list of failed checks in `orientation.md`, and the build line in
`game.json` under `tools.emulator`.

The v3.11.0 release fails 28 of the 56 checks, most of phase 4 among them.
A contributor's own build may pass them all (`kit/c64/INSTALL.md`, "Using
a build of your own").

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
  `hold_frames` holds it for a count of frames. A key the tool has no name
  for, such as `:`, takes its `row` and `col` from the matrix in
  `c64-reference`.
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
  flaky tool and it is not. Read the interrupt handler instead and work out
  what each band does.
- **Validate a measuring tool before you trust a figure from it**, against
  a known quantity (a timer latch you can compute, a loop you can count),
  and record in `features.md` when an input path could not be exercised
  rather than calling it confirmed.
- **When a key "does nothing", try the other tool** before concluding
  anything about the game: `vice_keyboard_matrix`, `vice_keyboard_key_press`
  by host name, and `vice_keyboard_type` through the KERNAL buffer reach the
  game by different paths. Keep a hit counter on the routine that should
  react as the instrument.
- **`vice_machine_config_set` has a six-entry whitelist**:
  `MachineVideoStandard`, `WarpMode`, `Speed`, `SidModel`, `CIA1Model`,
  `CIA2Model`. Joystick port assignment is not among them.
- **A snapshot save name cannot be reused.** Save **without** ROMs so the
  RAM image lands where the platform reference says it does.
- **Some calls can take the server down.** If a call returns a closed
  socket, check `tools.py status` before assuming the answer meant anything.
- **One emulator answers on :6510, whoever started it.** A second clone of
  the kit on the same computer, or an emulator left from an earlier run,
  takes this session's calls, and its snapshots land in its own folder.
  `tools.py status` warns when the emulator on the port came from another
  folder, and `tools.py vice` refuses to start beside it; stop it from the
  clone that started it, or ask the contributor to close it.
- The emulator needs a pseudo-terminal and dies with the session that
  started it.
