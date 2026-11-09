# Gradius — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`gradiuskonami_1987vmax2.g64`, the contributor's copy. The header reads
`GCR-1541`, version 0, 84 half-tracks (`$54`), so it is a GCR image of a
protected original, not a sector image. The disk's name is `V-MAX!` and
its directory lists two files:

| File | Blocks | Bytes | Loads at |
|---|---|---|---|
| `! V-MAX!` | 0 | 387 | `$0102` |
| `G2` | 182 | 45989 | `$0801` |

`kit/c64/disk.py` also finds 288 sectors on tracks 19 to 35 that no file
holds. The loading screen is drawn while `G2` loads, so they are most
likely its picture; nothing in the game reads the disk once it runs
(below). No trainer, cracktro or menu appears: this is the publisher's
original, protected with V-Max! version 2.

## From power-on to play

1. Power-cycle the machine (`vice_machine_reset` hard), then autostart
   the G64 with VICE's default settings (true drive emulation is on by
   default; no `vicerc` was needed). The emulator was the v3.14.0 Linux
   release, which passed 57 of 57 checks: no check failed.
2. After about 15 seconds the loading screen appears (the GRADIUS logo
   over a space station, "PROGRAMMING SIMON PICK", "KONAMI 1986") while
   the V-Max loader runs at `$C39A`-`$C39F`. Snapshot `work/loading-screen.vsf`.
3. About a minute later the title screen ("GRADIUS", "ONE PLAYER GAME",
   a star field) appears. Snapshot `work/title.vsf`.
4. Fire on joystick port 2, held for a second, starts the game. "PLAYER
   ONE" shows, then play: the Vic Viper at the left, the power-up bar
   along the bottom (SPEEDUP, MISSILE, DOUBLE, LASER, MULTI, ?).
   Snapshot `work/play-stage1.vsf`, about ten seconds into stage 1.

## The hand-over

The loader puts `G2` at `$0801`-`$C0A3`, identical byte for byte to the
file on the disk, and runs it at `$0801`. `G2` is packed twice:

1. `$0810` copies a decruncher to `$0334` and its table to the stack page,
   moves the packed data to the top of memory, and unpacks it down to
   `$0801` with `$01` at `$34`. It ends with `$01` = `$37` and `JMP $0810`.
   Snapshot `work/depack0801.vsf` at its first instruction.
2. The new `$0810` moves its data up, copies a run-length decoder to
   `$0100` and jumps there; that decoder writes the game and ends with
   `JMP $1688`.

`$1688` is the game's own first instruction. A stopping checkpoint there
gives `work/entry.vsf`, the hand-over, which is the image the
disassembler and the listing read. It differs from the play snapshot only
in pages the game writes as it runs (`$00`-`$07`, the screen and colour
buffers, the sprite tables), so the hand-over holds everything the play
snapshot does.

## Steady state

- `$01` = `$35`: RAM everywhere except I/O at `$D000`-`$DFFF`. The game
  keeps code under the KERNAL (`$FD90`, its IRQ handler at `$7F1C`
  calls into `$F000`-`$FFFF`).
- Hardware vectors: IRQ `$FFFE` = `$7F1C`, NMI `$FFFA` = `$0840`,
  reset `$FFFC` = `$FFFD`. The KERNAL's vectors at `$0314` still hold the
  ROM defaults (`$EA31`, `$FE66`), unused with the ROM banked out.
- One frame of play (`frame.py capture`) has three video writes: at line
  82, `$D016` = `$D6` (multicolour, the playfield's fine scroll), and at
  line 242, `$D016` = `$C4` and `$D011` = `$5B` (extended colour mode for
  the power-up bar).
- The whole 64 KB is in use apart from the RAM under the I/O chips
  (`$D000`-`$DFFF` holds one fill value).
- Nothing is reloaded per level: the whole game is `G2`, and the play
  snapshots show no disk activity.

## The loader, in a paragraph

V-Max! is a commercial protection and fast loader for the 1541. The
boot file `! V-MAX!` loads at `$0102` over the stack, takes over the
drive and reads the protected tracks with its own GCR decoding, showing
the loading screen as it goes; the C64 side waits in a loop at
`$C39A`-`$C39F`. It then runs `G2` at `$0801`. Not annotated further, by
policy.
