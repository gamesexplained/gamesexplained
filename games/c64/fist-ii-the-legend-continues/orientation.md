# Fist II: The Legend Continues — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`exploding_fist_2.d64`, 174,848 bytes, SHA-256
`d61d133d231b6453d4c409f0ff8d058771493b9030384a7d1c67758fee873b54`. A
standard 35-track disk with no disk name. It shows a Mindscape logo, so
it is the Mindscape release (as "Fist: The Legend Continues" in the
US; the in-game title reads FIST, THE LEGEND CONTINUES, COPYRIGHT 1986
BEAM SOFTWARE). No crack intro or trainer appears. The directory holds
twenty files:

| File | Loads at | Bytes | What it is |
|---|---|---|---|
| `L` | `$032C` | 90 | autostart stub: hooks a KERNAL vector, loads `LL` at `$9800` and jumps to it |
| `LL` | `$9800` | 1,187 | the menu: "PRESS THE NUMBER OF YOUR CHOICE 1) TRAINING 2) ADVENTURE" |
| `M`, `T` | `$6000` | 3,890 / 6,949 | the Mindscape logo and a second picture (not traced) |
| `LOADALL` | `$C000` | 689 | the Adventure loader |
| `TITLE`, `TSETUP` | `$6000`, `$1000` | 1,024 / 98 | the title picture and the code that shows it |
| `BNK4B`, `BNK4A`, `BNK3`, `BNK12A`, `COLOR`, `BNK2B` | see below | | Adventure |
| `LOADIT` and the `TNK`/`TOLOR` files | | | Training, the same layout |
| `DUMMY` | `$1000` | 256 | not loaded by either loader |

## From power-on to play

1. Hard reset (power cycle) the emulator, PAL.
2. Autostart the disk. VICE loads the first file, `L`.
3. A "Please wait - Loading..." line, the Mindscape logo, then the menu.
   Snapshot `work/f2-menu.vsf` there.
4. Press `2` (Adventure). The title picture stays up while the loader
   reads six files through the KERNAL; warp mode makes this take seconds.
5. The loader ends with `JMP $C3FD`. `work/f2-entry.vsf` is stopped
   there (a stopping checkpoint on `$C3FD` set from the menu snapshot).
6. Play starts at once, with no attract mode: the hero in a jungle.
   `work/f2-play.vsf` is a few seconds in, no input.

## Steady state

`$01` = `$15` in play: I/O visible, RAM everywhere else. The hardware
vectors are the game's: IRQ `$FFFE` = `$3B43`, NMI `$FFFA` = `$3C23`,
reset `$FFFC` = `$39BF`. Program-counter samples fall in `$2000`-`$22xx`,
`$3F67`-`$3F91` and `$F5F9`. The game runs `$C400` once at the hand-over
and then `JMP $0402`.

The Adventure is one load: nothing is read from disk once play has
started. Training is a separate load of its own files.

## Emulator

`release v3.13.1, v3.13.1-linux-x86_64-gui.zip`, Linux x86_64 in a cloud
container with no display. `check-emulator`: 56 of 57, failed
`pause-at-instruction`.

## The loader, in a paragraph

`LOADALL` (`$C000`) loads `TITLE` and `TSETUP` and calls `$1000` to show
the title picture. It then loads `BNK4B` at `$1000` and, with every ROM
and the I/O switched out (`$01` = 0), copies `$1000`-`$3FF8` up to
`$D000`-`$FFF8`, under the I/O area and the KERNAL. It loads `BNK4A` at
`$C280`-`$CFFF` (over the end of the loader itself), `BNK3` at `$1000`
and copies it to `$8000`-`$BFFF`, `BNK12A` at `$0400`-`$5BFF`, `COLOR` at
`$6000` copied into colour RAM, and `BNK2B` at `$5C00`-`$7FFF`. Then it
switches everything out again and jumps to `$C3FD`. The game fills all
of memory from `$0400` to `$FFF8`, the RAM under the I/O chips included.
