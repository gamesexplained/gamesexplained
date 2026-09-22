---
name: tool-vice-mcp
description: How to drive VICE through the vice-mcp server, the recommended emulator setup. Tool names, the sequence that works, and the behaviours that waste time if you do not know them.
---

# VICE through vice-mcp

Registered in `.mcp.json` as the `vice` server (HTTP, `127.0.0.1:6510`).
The transport is plain HTTP, so a server started or restarted *after* your
session began is picked up on the next call without restarting the session.
If the tools are missing entirely, start it (`kit/INSTALL.md`) and try again.

`kit/c64/vice.py` is a client for the same server. Anything repetitive
(halt, poke, run N passes, read back) belongs in a script, not in a string
of one-off tool calls: each call costs a round trip and each read restarts
the machine.

## The sequence that works

1. `vice_disk_attach` the image, then `vice_autostart` it (or autostart
   the image directly). Wait; screenshot with `vice_display_screenshot`.
2. `vice_machine_config_get` to confirm PAL/NTSC; autostart turns **warp
   mode on**. Turn it off through the generic `tools_call` with
   `{"name": "vice_machine_config_set", "arguments": {"resources": {"WarpMode": 0}}}`
   (the typed wrapper rejects its argument).
3. Send input: `vice_keyboard_type` for text at the BASIC prompt,
   `vice_keyboard_matrix` with `hold_ms` around 3000 for games that scan
   the keyboard themselves (short presses may not register),
   `vice_joystick_set` / `vice_joystick_tap` for the stick.
4. Confirm play with a screenshot, then `vice_snapshot_save` with a name
   that describes the state. Snapshots are written to
   `tools/vice-home/config/vice/mcp_snapshots/`
   (`python3 kit/scripts/tools.py snapshots` lists them); copy the `.vsf`
   into the game's `work/`.
5. `vice_memory_read` (hex encoding, any size), `vice_memory_write`,
   `vice_memory_search`, `vice_disassemble` for live inspection.
   `vice_registers_get` for the PC. `vice_backtrace` for who called this.
6. `vice_checkpoint_add` for breakpoints (exec) and `vice_watch_add` for
   load/store watchpoints; `vice_checkpoint_list` shows hit counts, which
   is often the fact you wanted (runs once, runs every tick).
7. `vice_vicii_get_state`, `vice_sid_get_state`, `vice_cia_get_state`,
   `vice_sprite_get`, `vice_sprite_inspect` for chip state and a rendered
   look at sprite data.
8. `vice_run_until` an address or a cycle count; `vice_cycles_stopwatch`
   for timing.

`tools_list` returns the full set with schemas when you need an argument
you are unsure of.

## Behaviours that waste time

- **A stopping checkpoint opens the monitor, and an open monitor pauses
  the machine until it is closed.** This is the most expensive trap here,
  because a paused machine does not look paused. `vice_ping` still reports
  `"execution": "running"`. Screenshots still show the last frame, which
  looks like gameplay. Memory reads return steady, plausible values. Every
  checkpoint reports `hit_count: 0`, which reads as "that routine is never
  called". `vice_execution_run` does not bring it back, and neither do
  `vice_machine_reset` or `vice_autostart`: both report success and change
  nothing. Close the monitor window to resume, or avoid stopping
  checkpoints and use `stop: false` with hit counts instead.
- **Prove the machine is *running* before you believe a negative result.**
  The converse of the next rule, and the more dangerous direction: an
  absence measured on a paused machine is indistinguishable from an
  absence in the game. The test costs one call. Read the program counter
  several times: a live machine returns a scatter of addresses, a paused
  or parked one returns the same address every time.
- **Hit counts can stop recording, silently.** `vice_checkpoint_add` keeps
  returning ok and `vice_checkpoint_list` keeps showing the checkpoint
  enabled while every count stays at zero. Always add a **control**: a
  checkpoint on a routine you know runs, such as the interrupt handler, in
  the same batch as the one you are measuring. If the control reads zero
  the instrument is dead, and no other number in that batch means anything.
- **Prove the machine is stopped before you poke it.** Read the program
  counter twice; if it changes, it is running and every write you make is
  being overwritten. `vice_execution_pause` held the CPU in one run and
  appeared not to in another (that run lost hours to "the game does not do
  that"); the cause is not established. A checkpoint with `stop` set halts
  it in every run so far, and `vice_ping` reports the execution state.
- **After a checkpoint stops the machine, the reported program counter is
  not the checkpoint address.** Do not use it to decide whether the break
  happened; a claim like "it never reaches that routine" founded on the PC
  can be flatly wrong. Use `vice_checkpoint_list` and read the hit count.
- **Check the execution state after reads and writes, in both directions.**
  One run saw reads and writes leave the machine paused; another saw a
  paused machine running again between reads (a direct test afterwards
  showed `vice_memory_read` leaving it paused). Either way, a sequence of
  reads taken while a key is held may sample a game that has run several
  frames between them, which is why input experiments give answers that
  look random. `vice_ping` tells you which state you are in.
- **A loaded snapshot can come back without its timer interrupt.** The
  CPU sits in the tick-wait loop and nothing moves. Autostart the image
  again; if the emulator itself misbehaves, restart its process.
- **Screenshots are seconds apart.** To catch a short-lived screen, poke
  the game into the state just before it and poll, or read the state
  variables that prove it happened.
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
- **Poke, then read a derived value, and a whole update may have run in
  between.** Break at a point *after* the update and before the code you are
  testing, or expect the game's own per-frame change to be added to whatever
  you wrote. Numbers that are consistently one step out are this.
- **Not every tool in the list does something.** The cycle stopwatch may
  return frame-quantised numbers. Validate any measuring tool against a
  known quantity (a timer latch you can compute, a loop you can count)
  before you trust a figure from it, and record in `features.md` when an
  input path could not be exercised rather than calling it confirmed.
- **`vice_joystick_set` is off by one.** `{"port": 1}` pulls bits on
  `$DC00`, which is control port **2** on the hardware. `{"port": 2}`
  returns `{"status":"ok"}` and changes nothing at all; `port` 0 and 3 are
  rejected. The cause is in the server's source
  (`src/mcp/mcp_tools_input.c`): it validates `port` as 1 or 2 and passes
  it straight to VICE's `joystick_set_value_absolute()`, whose first
  argument is a **zero-based** joyport index. Most C64 games read control
  port 2 (port 1 shares its lines with the keyboard), so for most games
  the bug hides: ask for port 1 and the game responds. A game that reads
  control port 1 at `$DC01`, as the early Commodore titles here do,
  cannot be driven with this tool at all, and `vice_keyboard_matrix`,
  `vice_keyboard_chord` and the row/column form all report success and
  leave `$DC01` at `$FF` as well. A fix is proposed upstream
  (barryw/vice-mcp#6); once it lands, port numbers mean what they say and
  "ask for 1 to get 2" stops working.

  The way in is to stop treating `$DC01` as an input. CIA1 port B is an
  input only because DDRB says so. Write `$1F` to `$DC03` and bits 0 to 4
  become outputs, and from then on a plain memory write to `$DC01` is
  exactly what the game reads. `kit/c64/vice.py` wraps this as
  `stick_arm`, `stick` and `stick_release`. Leaving bits 5 to 7 as inputs
  keeps the keyboard columns working for a game that reads a key out of the
  same port. Undo it with `stick_release` before handing the machine back.

  **While the stick is armed, keyboard columns 0 to 4 are dead**, because
  those bits are outputs. Keys in columns 5 to 7 keep working, which is
  what makes this confusing: a menu where one key responds and another
  does nothing looks like a flaky emulator rather than a mask. Call
  `stick_release` before **every** keyboard press, not only at the end.
- **`vice_machine_config_set` has a six-entry whitelist**:
  `MachineVideoStandard`, `WarpMode`, `Speed`, `SidModel`, `CIA1Model`,
  `CIA2Model`. Joystick port assignment is not among them, so the mapping
  above cannot be fixed with a resource.
- **A snapshot save name cannot be reused**, and a loaded snapshot starts
  running at once: pause it with a checkpoint in the same breath or the
  state you wanted has already moved on. Save **without** ROMs so the RAM
  image lands where the platform reference says it does.
- **Keys a game polls rarely can be missed by a short press.** Where
  `vice_keyboard_matrix` with a long `hold_ms` still does nothing, try
  `vice_keyboard_type`, which goes through the KERNAL buffer instead.
- **`vice_watch_add` ignores `load: true`** and creates a write watchpoint
  regardless; its own schema wants `type: "read" | "write" | "both"`. A
  silently-wrong watchpoint reports zero hits and looks like proof of
  absence. `vice_checkpoint_add` with `load: true, exec: false` does work.
- Some tools can take the server down. If a call returns a closed socket,
  check the port before assuming the answer meant anything.
- The emulator needs a pseudo-terminal and dies with the session that
  started it.

## Keys that the matrix tool does not deliver

`vice_keyboard_matrix` with `"key": "SPACE"` reports row 7, column 4 and
`pressed: true`, and a game that scans column 7 itself never sees it: a
hit counter on the game's pause loop stayed at zero through four holds,
by name and by row and column. `vice_keyboard_key_press` with
`"key": "Space"` (the host-key path) reached the same routine at once.
When a key "does nothing", try the other tool before concluding anything
about the game, and keep the hit counter on the routine that should react
as the instrument. F1, F5, F7 and the digits worked through the matrix
tool in the same session.

A stopped machine hands back stale registers: at a stopping checkpoint on
a `cmp` the accumulator read 0 while the game demonstrably saw $FF. Do not
read register contents at a checkpoint as the values the instruction saw;
count hits, or read memory the routine wrote.

`vice_joystick_tap` for half a second was not seen by a loop that polls
the stick every pass; `vice_joystick_set` held for two seconds was. Hold
the stick when a loop has to notice it.

`vice_snapshot_load` after a hard reset returned a machine with `$01`
changed ($37 instead of the game's $36), the CPU in the KERNAL screen
scroller and a garbage screen. The snapshot file itself was fine for the
disassembler. Re-autostarting the program is the reliable way back to a
state.

## Replaying inputs pass by pass: patch the control read

A corner case is only worth publishing if a player could reach it, and
that means feeding the game a chosen input on every pass of its loop and
comparing what it does with a model. Stepping the emulator is the wrong
tool for that here, for three reasons met in one afternoon:

- `vice_execution_run` after a *stopping* checkpoint did not resume the
  machine; memory reads kept returning the same state and the hit counter
  on the loop stayed at zero. Deleting the checkpoint and then running
  does resume, which is what `kit/c64/vice.py`'s `release()` does.
- Alternating two stopping checkpoints (top of the loop, after the move)
  to advance one pass at a time ran two passes per step. The stop happens
  after the tool has already returned, and the loop's own delay is only
  about 30 ms.
- A joystick bit written while the game had quietly ended started a new
  game from the attract screen and parked the CPU in the opening tune.
  Everything then read as "the input does nothing". Before staging anything,
  put a non-stopping checkpoint on the game loop for a second and read its
  hit count; zero means you are not where you think.

What worked was not stepping at all. Find the game's one `jsr` to its
control reader, and replace it with a `jsr` to a routine in free RAM that
takes the pass's input from a table, sets the same flags the reader would,
and copies the state variables into a log, sixteen bytes per pass. Then let
the game run at its own speed and read the log afterwards. The first game
to need this carries the routine in its `agent-history.md` (inputs at
`$C100`, log at `$C200`, counter at `$C0F0`); it is fifty bytes and any
game gets a variant of it. Restore the original `jsr` as soon as the event
you wanted has fired, or the counter walks the log into I/O space.

Snapshots do not shortcut this. A snapshot saved by `vice_snapshot_save`
during play and loaded back a minute later returned the RAM intact and the
CPU spinning in the game's timer wait (`$EE4E`), with the loop never
reached again: the existing note about loaded snapshots losing their timer
holds for the server's own snapshots too. Getting back into play still
means autostart, the trainer's questions and F1.
