---
name: tool-vice-mcp
description: How to drive VICE through the vice-mcp server, the recommended emulator setup. Tool names, the sequence that works, and the behaviours that waste time if you do not know them.
---

# VICE through vice-mcp

Registered in `.mcp.json` as the `vice` server (HTTP, `127.0.0.1:6510`).
If it was not running when your session started, its tools are not
available; start it (`kit/INSTALL.md`) and reconnect or restart the
session. The scripts do not depend on it; only the interactive tools do.

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

- **Reads and writes can leave the machine paused.** Check the execution
  state in `vice_ping` and `vice_execution_run` before sending input or
  expecting the screen to change.
- **A loaded snapshot can come back without its timer interrupt.** The
  CPU sits in the tick-wait loop and nothing moves. Autostart the image
  again; if the emulator itself misbehaves, restart its process.
- **Screenshots are seconds apart.** To catch a short-lived screen, poke
  the game into the state just before it and poll, or read the state
  variables that prove it happened.
- **Memory reads honour banking.** Use the bank argument
  (`vice_memory_banks` lists them) when you need RAM under I/O or ROM.
- The emulator needs a pseudo-terminal and dies with the session that
  started it.
