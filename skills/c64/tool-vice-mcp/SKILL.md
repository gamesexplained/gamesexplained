---
name: tool-vice-mcp
description: How to drive VICE through the vice-mcp server, the recommended emulator setup. Tool names, the sequence that works, and the behaviours that waste time if you do not know them.
---

# VICE through vice-mcp

Registered in `.mcp.json` as the `vice` server (HTTP, `127.0.0.1:6510`).
The transport is plain HTTP, so a server started or restarted *after* your
session began is picked up on the next call without restarting the session.
If the tools are missing entirely, start it (`kit/INSTALL.md`) and try again.

`kit/scripts/vice.py` is a client for the same server. Anything repetitive
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
   that describes the state. Snapshots are written under the emulator's
   config directory; copy the `.vsf` into the game's `work/`.
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
  (`vice_memory_banks` lists them) when you need RAM under I/O or ROM.
- **Poke, then read a derived value, and a whole update may have run in
  between.** Break at a point *after* the update and before the code you are
  testing, or expect the game's own per-frame change to be added to whatever
  you wrote. Numbers that are consistently one step out are this.
- **Not every tool in the list does something.** The joystick tools may
  report success and change nothing at `$DC00`/`$DC01`; the cycle stopwatch
  may return frame-quantised numbers. Validate any measuring tool against a
  known quantity (a timer latch you can compute, a loop you can count)
  before you trust a figure from it, and record in `features.md` when an
  input path could not be exercised rather than calling it confirmed.
- **A snapshot save name cannot be reused**, and a loaded snapshot starts
  running at once: pause it with a checkpoint in the same breath or the
  state you wanted has already moved on. Save **without** ROMs so the RAM
  image lands where the platform reference says it does.
- **Keys a game polls rarely can be missed by a short press.** Where
  `vice_keyboard_matrix` with a long `hold_ms` still does nothing, try
  `vice_keyboard_type`, which goes through the KERNAL buffer instead.
- Some tools can take the server down. If a call returns a closed socket,
  check the port before assuming the answer meant anything.
- The emulator needs a pseudo-terminal and dies with the session that
  started it.
