---
name: tool-mame
description: How to use MAME on the Game & Watch kit - building only its Game & Watch driver from source, running a ROM set in a window, driving it from a Lua script with its debugger on (a trace of every instruction with the registers, the CPU's cycle count at a press, the data memory), holding the kit's machine to it, and the traps. Read it before running MAME or comparing with it.
---

# MAME on the Game & Watch

MAME is the Game & Watch's second machine. The kit drives its own SM5A
(`tool-gnw-server`); MAME is what that machine is held to
(`kit/gnw/check_machine.js`, and by hand on a game), and the one to play
a game on with its screen and sound.

## Getting it

`python3 kit/scripts/tools.py get-mame` downloads MAME's source at the
tag the kit was measured on, and on macOS SDL3's framework, both checked
against their SHA-256, and builds MAME with one driver,
`src/mame/handheld/hh_sm510.cpp`, which holds every Game & Watch:
`make SUBTARGET=gnw SOURCES=src/mame/handheld/hh_sm510.cpp`. The program
is `tools/gnw/mame-src/gnw`, 73 MB. It built in two minutes on an
Apple M4 with ten cores. What it keeps where: `kit/gnw/INSTALL.md`.

## Running a game

`tools.py mame games/gnw/<slug>/work/<set>.zip` runs the ROM set in a
window. The set's name is the zip's name, which must be MAME's
(`gnw_<name>`): MAME finds a set by its name in the folder given as
`-rompath`. MAME's files (`cfg/`, `nvram/`, `snap/`) land in
`tools/gnw/home`. A set made for another MAME version runs with a warning
about the SVG's length and checksum; the program's checksum is what
matters, and the warning names it if it differs.

## Driving it from a script

MAME runs a Lua script given with `-autoboot_script`; with `-debug
-debugger none` its debugger is on with no window, so the script can use
it. The pattern the kit's scripts use (`kit/gnw/check_machine.js`, its
`LUA`):

- **A trace of every instruction**, with registers:
  `manager.machine.debugger:command('trace <file>,maincpu,noloop,{tracelog "%X %X %X %X ",acc,bl,bm,c}')`,
  from the script's first `emu.register_periodic` call. Each line is the
  registers before the instruction and MAME's address and disassembly,
  `0 9 3 0 0:F:03: TR $03`. The trace starts at the second instruction:
  the first runs before the script's first call. A skipped instruction
  is not traced. `traceflush` before the exit writes the rest.
- **The CPU's cycle count**, to say exactly when something happened:
  `debugger:command('printf "%d",totalcycles')`, then the last line of
  `debugger.consolelog`. A press made in `emu.register_frame_done` at
  cycle n is seen by the instruction that starts at cycle n.
- **A button**: `manager.machine.ioport.ports[":IN.2"].fields["Game A"]:set_value(1)`,
  the port and field names from the unit's driver block; `:BA` and `:B`
  have one field each.
- **The data memory**: `manager.machine.devices[":maincpu"].spaces["data"]:read_u8(a)`
  for a = 0 to $7F.
- **Stop**: `manager.machine:exit()`.

`-video none -sound none -nothrottle` runs it as fast as it goes,
seven to fourteen times real time on an Apple silicon Mac.

## Traps

- **A unit's wiring is the driver's, not the chip's.** A row of buttons
  wired to ground (`inp_fixed_last()` in the unit's class) is read whatever
  R selects, and alpha and beta are active low on some units. The kit's
  machine has `always` and the server's `wiring` for both; read the
  driver block before comparing.
- **A segment stays drawn for a moment after it goes off.** MAME's
  picture keeps a segment for a few milliseconds (`update_display`'s
  decay), so its screenshot can show a segment the chip has just turned
  off. Compare segments with the chip's latches, not with the picture.
- **`-video none` wants `-seconds_to_run`** or prints a warning; a
  script that exits on its own needs neither.
