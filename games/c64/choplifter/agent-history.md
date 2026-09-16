# Choplifter — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## Getting in

The disk image gave up its structure offline in a minute: one 66-block
program, a BASIC `SYS 2064`, and a copy loop at `$0810` that moves 16 KB to
`$8000`. Extracting the program from the `.d64` by hand and comparing it
with the snapshot later was worth the ten minutes: `$8000`-`$BFFF` in the
running game is byte for byte the copy from the disk, which settled early
that nothing self-modifies and let every later question be answered from
the file rather than the emulator.

The `CBM80` signature at `$8004` was not noticed until the shape pointer
table was being decoded and the eight bytes in front of it refused to be
anything sensible.

## The joystick

Reaching gameplay took longer than everything else in the orientation step.
The title screen waits for fire on control port 1, and nothing the emulator
offered would deliver it:

- `vice_joystick_set` with `port: 1` pulls bits on `$DC00`, which is
  control port **2**. With `port: 2` it returns `{"status":"ok"}` and
  changes nothing at all. `port: 0` and `port: 3` are rejected.
- `vice_keyboard_matrix`, `vice_keyboard_chord` and the row/column form all
  reported success and left `$DC01` at `$FF`, including for keys in the row
  the game leaves selected.
- The resource whitelist in `vice_machine_config_set` has six entries and
  none of them is a joystick port.

What worked was to stop treating `$DC01` as an input. CIA1 port B is an
input only because DDRB says so; writing `$1F` to `$DC03` makes bits 0 to 4
outputs, and after that a plain memory write to `$DC01` is exactly what the
game reads. That is now `stick_arm`/`stick` in `kit/scripts/vice.py`.

Before that worked, one dead end ate time: `$DC00` sits permanently at
`$7F`, which looked like the game selecting keyboard row 7 so that it could
read `Q` and `RUN/STOP` out of the same `$DC01` read as the joystick. That
is a real C64 idiom and it may even be what happens here, but it was not
the way in, because no key press could be injected either.

## Finding the code

`r2000_disassemble` from the three entry points ($959C, and the IRQ and NMI
vectors) reached about 6.5 KB of the 16 KB and stopped. A scan for JSR and
JMP targets inside the code it had found turned up nothing new, which meant
the rest was either data or reached some other way.

It was reached another way. Four routines - `$8BBA`, `$8BE0`, `$8BF9` and
`$8C17` - take their argument from the two bytes that follow the `jsr` that
calls them, pulling the return address off the stack, reading the word and
resuming past it. A control-flow disassembler walks straight into that word
and decodes it as an instruction, and everything after it is shifted.
Finding the 57 call sites, typing the two bytes after each as data and
restarting the disassembly from the resume point took the tracked image from
9,221 bytes to 16,348 in one pass.

The actor handler table at `$B32E` accounted for most of the rest: eleven
entries reached only through `jmp ($6F)` in the dispatcher at `$B307`.

## The display

The first reads of `$D018` and `$DD00` disagreed with each other because
both are rewritten several times per frame by the raster handler. Sampling
them from a script gave a different answer each time and cost a false start
on "the character set is at `$5000`, no, `$2000`". Reading the handler at
`$99F2` settled it in one go: six raster compares, a text band at the top
and a multicolour bitmap below, and a whole second copy of the display in
the other VIC bank.

## Splitting the burn-down

Nine agents took disjoint ranges: the shape table, the drawing layer, the
tables between `$90D2` and `$959B`, the main loop and the interrupt, the
hostages and the spawner, the flight model and the sound, the actor
handlers, the initialisation and the world, and the variables with the
character set. Each had its own annotation log. The coverage figure went
0 to 100 % in about forty minutes of wall clock once they started writing.

Two ranges were added part way through. Nobody owned `$1000`-`$1FFF`
because nobody knew it held anything until the drawing-layer agent
identified 4 KB of pre-shift tables there; it went back and took them.
Nobody owned `$B800`-`$B809` either, because it is the middle of a routine
that starts in the neighbouring range and no symbol can sit on an operand
byte; that was closed by a comment on the head of the routine.

## Two claims that did not survive a check

The shape agent reported that shapes 14 and 15 are shapes 5 and 11 "with
exactly one row deleted". Diffing the bitmaps showed rows 0 to 8 identical
and then the undercarriage redrawn rather than a row removed: shape 5's row
9 is `01 FF FF FE 00` and shape 14's is `01 FF FF FE 60`, with the skid
pixels folded up from the row that is gone. No single-row deletion
reproduces either shape. The comments were reworded.

The flight-model agent first wrote that the engine sound is a triangle
wave, then read `$D404` back live, found `$81`, and corrected it to noise
before it reached anything downstream.

Both were caught by comparing bytes, not by reading the prose. The
spot-check rule in `AGENTS.md` is worth the minute it costs.
