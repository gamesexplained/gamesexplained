# Classic Adventure — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Classic_Adventure_1984_Melbourne_House.d64`, 174,848 bytes: a plain
35-track 1541 sector image with no error block (the size says so; a D64
has no header). SHA-256
`30b84e9714d96a231151bff9dc52c179ef73661a5a1ee0ce2975bf12c2658837`.
The disk is named `DIGITAL DUNGEON` with ID `98`, and holds one file:

```
0 "digital dungeon " 98 2a
130  "classic adv."     prg
534 blocks free.
```

This is not the original release. The C64 inlay says the game came on
tape with the Pavloda fast loader; this disk carries a single-file
transfer of it with a wrapper in front (below). The same directory is
listed for the Internet Archive's copy of the game (item
`Classic_Adventure_1984_Melbourne_House`, read 8 October 2026), so this
is a widely circulated transfer.

`CLASSIC ADV.` is 32,769 bytes (SHA-256
`e6430f89e1ce9e59f0930afbfa4da267febf9b08ebef2f23397f647babb4c127`):
a load address of `$0801` and 32,767 bytes, `$0801`-`$87FF`.

## From power-on to play

Tools: vice-mcp `release v3.13.2, v3.13.2-linux-x86_64-gui.zip`, which
passed all 57 of `check-emulator`'s checks on 8 October 2026 (none
failed, so no workaround applies); regenerator2000 0.9.20. PAL.

1. Hard-reset the emulator, then autostart the image's first file
   (`autostart(rpc, "work/classic-adventure.d64", 1)` in `kit/c64/vice.py`).
   VICE types `LOAD"*",8,1` and `RUN`.
2. The BASIC line is `0 SYS 2079:"` followed by eight DEL characters and
   `UPERSOFT`, so `LIST` shows only `0 SUPERSOFT`. `SYS 2079` (`$081F`)
   is the wrapper (below). No menu or trainer appears.
3. About three seconds after `RUN` the screen turns blue and shows
   "Welcome to Classic Adventure. (c)Abersoft 1984" and the first room.
   The game is then waiting for a typed command in the KERNAL's line
   editor. Commands are typed and ended with RETURN
   (`vice_keyboard_type` with `\n` works).
4. **Hand-over snapshot, `work/entry.vsf`**: set stopping checkpoints on
   `$081F`, `$0B9E` and `$12B5` before the autostart, resume past the
   first two, and save without ROMs when the machine stops on `$12B5`,
   the game's first instruction. `$01` is `$36` there. This is the image
   the disassembler and the listing are built from.
5. **Play snapshot, `work/play-building.vsf`**: from the entry, resume,
   type `INSTRUCTIONS`, `INFO`, `HELP`, `ENTER`, `TAKE LAMP`,
   `TAKE KEYS`, `INVENT`, `SCORE`, and save at the prompt that follows.

## Steady state

The game never installs an interrupt handler. During play `$0314`
holds the KERNAL's `$EA31`, `$0316` `$FE66` and `$0318` `$FE47`; the
RAM under `$FFFA`-`$FFFF` is fill. `$01` is `$36`: BASIC ROM out,
KERNAL and I/O in. `$D018` is `$17`, the ROM's upper and lower case
character set, and nothing in the game writes it. The program counter
sampled while the game waits is `$E5D4`, inside the KERNAL's wait for a
key: input comes through `CHRIN` (`$FFCF`), output through `CHROUT`
(`$FFD2`). The border is set to blue by the game at start; the
background is the KERNAL's default.

Between the hand-over and the play snapshot only these bytes changed:
`$0C5A`-`$0CC5` (line buffer and the game's variables), `$0F6B` (a digit
of the turn counter, which lives inside the score message), `$1ADB` (the
length operand of the message printer), and `$8AA2`-`$8AA5` (the
locations of the keys and the lamp). Nothing is reloaded during play.

## Files on the disk mapped to memory

| File | Loads at | In the hand-over |
|---|---|---|
| `CLASSIC ADV.` | `$0801`-`$87FF` | moved whole to `$0B41`-`$8B3F` by the wrapper (32,767 of 32,767 bytes equal at an offset of `$0340`); the original bytes at `$0801`-`$0B3F` stay where they were loaded |

## The loader, in a paragraph

The wrapper at `$081F` copies 128 pages, `$0800`-`$87FF`, up by `$0340`
to `$0B40`-`$8B3F`, starting with the top page so the overlapping copy
is safe. It then checks that the byte at `$0814` is still `U` (the
`UPERSOFT` text hidden in the BASIC line) and hangs if not, and jumps to
`$0B9E`, the moved copy of its own second half. That code writes `$1B` to `$D011` (screen on, 25 rows), stops CIA 2's timer A,
sets `$01` to `$36`, copies the KERNAL's own default I/O vectors from
`$FD36` back into `$031A`-`$0327`, enables interrupts and jumps to the
game at `$12B5`. The stub also carries the text `"SYS 2974"` and `PRG`,
apparently a directory line naming the game's original entry, `SYS
2974` being `$0B9E`. The bytes the move leaves at `$0801`-`$0B3F` are a
stale copy of the start of the file and are never read again.
