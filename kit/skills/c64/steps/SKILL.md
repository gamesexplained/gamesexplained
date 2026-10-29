---
name: steps
description: Which of the kit's tools each core step uses on the Commodore 64 - the snapshot, the disk's files, the disassembler, the register census, the references search, the processor's idioms, the simulator, the whole machine, the lockstep, the frame, the sound, the checker's fixes and the page's scripts. Read it beside the core skill that names a row.
---

# The core steps on the C64

The core skills (`kit/skills/core/`) say what each step needs and name a
row of this table where a tool does it; this says which tool does it on
the Commodore 64. The machine's facts are in `c64-reference`, and how to
drive the emulator and the disassembler in `tool-vice-mcp` and
`tool-regen2000`. Every script prints its usage with `-h`, and every
JavaScript file's header is its manual.

| Row | Core step | On the C64 |
|---|---|---|
| `snapshot` | `10-orient`, `15-parts`, `50-coverage`: the image everything is read from | a `.vsf`, saved by VICE without ROMs (`tool-vice-mcp`); the hand-over is `work/entry.vsf`, which `listing.py` takes as its `--entry` by default. The snapshot to build the listing from is always named: `listing.py <game dir> work/<state>.vsf` |
| `media` | `10-orient`, step 7; `15-parts`, step 6: the files on the disk | `c1541` from the emulator's build reads a G64 or D64; `python3 kit/c64/disk.py extract <image> <dir>` writes every file, and `disk.py <image>` lists the sectors no file holds. A cartridge is `kit/c64/crt.py` (`c64-reference`, "Bank-switched cartridges") |
| `disassembler` | `10-orient`, step 6; `50-coverage`, the loop | regenerator2000, live, through `kit/c64/r2000.py` (`tool-regen2000`); `symbols_export.py <game>` reads the running session, and `coverage.py --live` its figure |
| `census` | `40-sweep`, the register census | `python3 kit/cpu/census.py <game or part dir> [<snapshot.vsf>] [--live]`: the chips at `$D000`-`$DFFF`, the expansion port's pages and the processor port at `$00`-`$01` |
| `references` | `50-coverage`, step 2; `60-verify`, "Negative results" | `python3 kit/cpu/opcodes.py <game> [<snapshot.vsf>] [--live] --refs <address>`: by name, as a pointer, through an index, and through an index that wraps past `$FFFF`, undocumented opcodes included |
| `cpu` | `50-coverage`, inline arguments and jump tables | the 6510 runs the NMOS 6502's instructions: `kit/skills/cpu/6502`; its undocumented opcodes are in `c64-reference` |
| `simulator` | `60-verify`; `70-minisite`, a widget's test | `kit/cpu/cpu6502.js` ("The simulator", below); `kit/scripts/port_check.js` cuts a page's block out and hands it the same simulator |
| `machine` | `60-verify`, "Unreachable"; `70-minisite`, Play | `kit/c64/machine.js`, and for a game that reads typed lines or loads as it plays, `kit/c64/kernal_lines.js` and `kit/c64/c64run.js` ("The machine", below) |
| `lockstep` | `70-minisite`, Play (`play.md`) | `kit/c64/lockstep.js`: `checkGen`, `standIn`, `standInGen`, `irqBytes` and `timing` |
| `frame` | `10-orient`, step 3; `70-minisite`, "One frame, rebuilt from memory" | `python3 kit/c64/frame.py capture`, `compare` and `trim` ("The frame", below) |
| `sound` | `70-minisite`, "The sound" | the SID, `site/lib/sid.js`, playing the game's own driver run on the kit's 6502 or ported ("The sound", below); a Play tab hands it its game's writes with `C64Sid.host({ live: true })` and `push` |
| `fixes` | `60-verify`, the checker's corrections | `python3 kit/c64/r2000.py --apply fixes.json` sends them to the disassembler, keeps each comment's kind, and refuses a label given to two addresses before anything is sent |
| `page` | `70-minisite`, "Building it" | `site/lib/c64.js` (`C64.load`, the glyph, screen and sprite drawing, `C64.renderFrame`, `C64.drawFrame`, `C64.videoMemory`), `site/lib/sid.js`, `site/lib/collide.js`, and `lib/cpu6502.js` as `C64Cpu` |

## The simulator

`kit/cpu/cpu6502.js` is the kit's 6502, and its header is the manual.
Use it rather than writing one. `CPU.fromSnapshot(vsf, { io })` gives the
machine as the snapshot left it, the port's banking included, and
`call(entry, regs)` runs a routine to its return. The chips belong to the
test: `io.write` sees every write in order, which is how a music driver's
port is checked register by register, frame by frame. A read of a chip
the test does not answer stops the run, and so does a call into ROM
unless a hook stands in for the routine. `irq()` runs the game's
interrupt, `cycles` times a routine, and the `executed` map shows which
instructions the cases reached.

## The machine

`kit/c64/machine.js` is the simulator with a raster interrupt, the
keyboard, the joystick and colour RAM around it (with `collide: true`
the sprite collisions and their interrupts), started from the listing's
memory or, with `Machine.fromSnapshot`, from a snapshot of play with its
raster interrupt set as the game left it, counting passes where the main
loop begins. It takes interrupts as the processor does, a handler that
runs `cli` interrupted in turn and through the KERNAL's entry while the
KERNAL is banked in. A test leaves the taking to it, with `onInterrupt`
and `onReturn` to watch and a hook at the KERNAL's exit that ends with
`leave()` where the game needs one: a `tick` or `take` of the test's own
runs each handler whole, and the collisions a handler latches after its
`cli` are lost. `kit/c64/lockstep.js` runs a port beside it.

A game that keeps the KERNAL and reads whole lines through `CHRIN` needs
neither: `kit/c64/kernal_lines.js` runs it a typed line at a time on the
simulator, with the KERNAL's line routines as hooks, and the test
compares the two sides at each line the game reads, with the same jiffy
clock handed to both. A game that loads from disk as it plays needs the
drive: `kit/c64/c64run.js` runs it from where its boot program hands
over, through every load, with the KERNAL's disk routines as hooks, on
the files `kit/c64/disk.py pack` reads off its images in `work/`.

## The frame

A screen split by raster interrupts changes the video registers, and
often the sprite pointers, several times a frame, so one read of them
draws the wrong picture. The kit records and draws the frame for you:
`python3 kit/c64/frame.py capture work/frame.json` records one whole
frame of the running game (every write to the video chip, the video bank
and the sprite pointers, with the line and cycle it happened on, and
memory as the frame began), `compare` draws it with `C64.renderFrame`
from `../../lib/c64.js` and counts the pixels that differ from the
emulator's picture of the same frame, line by line, and `trim` keeps only
the memory the drawing reads, which is what the page embeds
(`C64.drawFrame` puts it on a canvas). If the renderer lacks something
the game does, extend it in `site/lib/c64.js` and in `frame.py test`.
The handler that sets a raster interrupt's line writes `$D012` (and bit 7
of `$D011`); a frame's writes to the interrupt vector name every handler
in a chain (`10-orient`, step 3).

## The sound

Port the game's own music driver and play it through the site's model of
the SID, `../../lib/sid.js`: it runs the driver once a frame, plays it,
and shows each voice as a bouncing ball, or on a piano roll, with the
lines the port supplies about what the driver read. When the game calls its driver from a CIA
timer instead, pass the timer's period in cycles (the latch plus 1) to
`mount` as `period`, and port one call to each `play()`: the player keeps
the game's tempo, where mapping calls to frames in the port makes a
note's length wander by up to a frame. The script's header gives the
driver's contract and what the model leaves out.

The game's own driver, run inside `createDriver` on the kit's 6502,
counts as a port, its code and tables embedded in the page as data like
any widget's. Write no 6502 of your own: the page loads the kit's after
`sid.js`, as `../../lib/cpu6502.js`, and `sid.js` hands it to
`createDriver` as its second argument, `C64Cpu`, in the AudioWorklet too,
where the driver reaches nothing outside its own text.
`new C64Cpu.CPU(memory, { port: 0x35, io })` gives a 6502 whose `io`
answers the chips at `$D000`-`$DFFF`, and its `call(entry, regs)` runs a
routine to its return. What the test then checks is what the driver
adds: its entry points, its registers and its chips. Hand `createDriver`
the module, `require('<repo>/kit/cpu/cpu6502.js')`, and compare every
write of every tune, frame by frame, with the same calls made on the
simulator as the game makes them. Make the test's `createDriver` from its
source text alone, `vm.runInNewContext('(' + createDriver + ')', {})`, as
the worklet makes it: one taken from the page's scope passes a driver
that uses the page's other names, and on the page that driver is silent.
Say in the caption that the page runs the game's own player.

The filter is off unless the page passes `filter: '6581'` (or `'8580'`)
to `mount`, which also shows a switch to compare it with no filter; pass
it when the game sets the filter, and say in the caption that the cutoff
is one chip's. To measure what a reader reports missing, render the
writes through the model in node (`C64Sid.engine()`) and measure the
output.
