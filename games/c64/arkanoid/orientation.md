# Arkanoid — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`arkanoidimagine_1988pal.g64` as uploaded by the contributor (325,814
bytes, SHA-256
`0ad3045ebd137dfeebbbb7c19cc597481f7af5a7141ea735cdbff5c4e3a43fe1`),
copied to `work/arkanoid.g64`. Its header reads `GCR-1541`, 42 tracks: a
GCR-level copy of a disk. The directory, as VICE's `c1541` lists it:

```
0 "".... ."0:*",8,1" ..
1    "????????????????" prg
254  "arkaniod"         prg
5    "f"                prg
396 blocks free.
```

The disk's name is the instruction to the player: `LOAD"0:*",8,1`. All
three files read through the standard DOS chain with `c1541 -read`:

| File | Load address | What it is |
|---|---|---|
| `????????????????` | `$0316`-`$0401` | the boot: loaded with `,8,1` it overwrites the KERNAL's RAM vectors, and its output vector `$0326` points at a stub at `$0363` that puts `$F1CA` back, loads `F` with the KERNAL and jumps to `$4000` |
| `f` | `$4000`-`$43FF` | the fast loader: drive code and the C64 side, which ends in the stack page (`$0100`-`$01FF`) |
| `arkaniod` | `$0400`-`$FFF9` | the whole game, 64,506 bytes, one file |

The `arkaniod` file is byte for byte the RAM from `$0400` to `$FFF9` at the
hand-over (`work/entry.vsf`): the fast loader moves nothing and unpacks
nothing. The file name's spelling is the disk's. The pictures are
Imagine's, the title says "© TAITO 1986 © IMAGINE 1984"
on its menu, and no cracker's screen or trainer appears: the image
behaves as the original release. The upload's name says 1988; the menu
says nothing of the year of this release.

## From power-on to play

1. Power-cycle the emulator (`vice_machine_reset`, `mode: hard`). The
   machine is PAL. VICE's default drive settings (true drive emulation)
   load it with no `vicerc`.
2. Autostart `work/arkanoid.g64` (VICE types `LOAD"*",8,1`, which loads
   the first file, the boot). Turn warp on: the fast loader runs from the
   stack page (`$0130`-`$01D8`, reading bit pairs from `$DD00` and
   flashing the border) and reaches the hand-over about 76 s of host time
   after the autostart (measured 5 October 2026). Turn warp off.
3. The hand-over: the loader sets `$01` = `$35`, masks both CIAs'
   interrupts, `SEI`, `JMP $9400`. A stopping checkpoint on `$9400` stops
   it there; `work/entry.vsf` was saved at that stop.
4. The title picture (a bitmap, "IMAGINE / TAITO", the ship and the Vaus,
   signed "Jones", `reference/title.png`) shows. Fire on **joystick
   port 2**, held a second and a half, brings up the menu
   (`reference/menu-paddles.png`, with paddles selected); fire on port 2
   on the menu then did nothing.
5. The menu: "SELECT YOUR INPUT DEVICE": Neos mouse, joystick, keyboard,
   paddles; 1 or 2 devices; 1 or 2 players, chosen with N, J, K, P, D, 1
   and 2. Press **J** (joystick, `reference/menu.png`), then **fire on
   joystick port 1**: the story text shows (`reference/story.png`), then
   the title picture again, then round 1.
6. Round 1, one player, four lives. `work/play-round1.vsf` was saved about
   ten seconds into it (a life already lost, score 1330).

Snapshots in `work/`, each saved without ROMs:

| File | State |
|---|---|
| `entry.vsf` | the first instruction of the game, `$9400`, from a power-cycled machine. **The disassembler and the listing are built from this one** |
| `play-round1.vsf` | round 1 under way, step 6 |

`entry.vsf` and `play-round1.vsf` hold the same bytes everywhere but the
variables (zero page, `$0200`-`$05FF`), screen memory (`$C000`-`$C3FF`)
and a few scattered bytes in `$2400`-`$2FFF`, `$5F00`, `$9400`-`$BFFF`
and `$F000`-`$FFFF`; the RAM under `$D000`-`$DFFF` is identical. The
hand-over keeps the start-up code and authored data as loaded, so it is
the image analysed.

## Steady state

In play: `$01` = `$35` (RAM at `$A000` and `$E000`, I/O at `$D000`); the
KERNAL is out, so the game owns the hardware vectors. CIA 2 port A
(`$DD00`) low bits `%00`: video bank 3, `$C000`-`$FFFF`. `$D018` = `$03`
outside the splits.

The hand-over runs `$9400` (`LDA #$35 / STA $01`, an undocumented
two-byte `NOP`, `JMP $095A`), and `$095A` is written with more
undocumented opcodes (`NOP abs,X`, `LAX $F004`, `NOP zp`) around a
`JSR $B9C3` and a `JMP $F000`.

The interrupts, from one recorded frame of play (`kit/c64/frame.py
capture`): a chain of raster interrupts, each handler writing the next
one's address into `$FFFE`/`$FFFF`: `$F75E` (set on line 247),
`$FBEE` (set on line 21), `$F720` (set on line 26). The NMI vector
`$FFFA`/`$FFFB` alternates between `$F855` (set on line 52) and `$F903`
(set on line 246). Sprite Y positions are written on lines 22-25 and
cleared on line 245.

Nothing is reloaded: the whole game is in memory after the one load.

## The emulator

`release v3.13.2, v3.13.2-linux-x86_64-gui.zip`; `check-emulator` passed
57 of 57 on 5 October 2026. No check failed, so no workaround applies.

## The loader, in a paragraph

`LOAD"0:*",8,1` brings in a 236-byte file at `$0316` that replaces the
KERNAL's RAM vectors, so the KERNAL's next character output runs the stub
at `$0363`. That stub restores the output vector, loads the 1 KB file `F`
to `$4000` with the KERNAL and jumps to it. `F` sends drive code to the
1541 and installs a two-bit receiver in the stack page, which reads the
`arkaniod` file over the serial bus's clock and data lines (`$DD00`),
flashing the border on every byte. It then puts the KERNAL's serial bus
back with `$ED0C`/`$EDB9`/`$EDDD`/`$EDFE` (LISTEN, SECOND, CIOUT,
UNLISTEN), turns the screen on, and jumps into the game. Not annotated
further, by policy.
