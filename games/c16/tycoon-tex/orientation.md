# Tycoon Tex — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Tycoon Tex (1985)(Gremlin).tap`, from TOSEC's Commodore C16, C116 and
Plus/4 set of 11 November 2016, the tape folder, the entry with no flags
(TOSEC marks cracks, trainers and hacks; this one carries none). 155,336
bytes, SHA-256 `9f64074c41dabd8d9150fb74cda3e8608acf20c7f7f1186152aab32db84a3d5a`.

The header says what it is: `C16-TAPE-RAW`, version 1, machine 2 (C16 and
Plus/4), video 0 (PAL), 155,316 bytes of pulses. It is the Gremlin
Graphics tape, with a Novaload turbo loader, which the screen names while
it loads (`NOVALOAD A100000`). Plus/4 World lists the game as 16K and PAL
only, so the run uses the kit's default machine, a PAL Commodore 16 with
16 KB.

## The emulator

`python3 kit/scripts/tools.py --platform c16 check-emulator` on 21 October
2026: 46 passed, 0 failed, on plus4emu 1.2.11 (git 939e652) with
`kit/c16/codemap.patch`, built without libsndfile, in the kit's server.
No workaround applies.

## From power-on to play

1. Start the server (`tools.py plus4emu`, the default C16), power on
   (`reset`), run 150 frames to BASIC's `READY.`, put the tape in
   (`tape`, PLAY held down) and type `LOAD` and RETURN (`type "LOAD\n"`).
2. The KERNAL finds `TYCOON TEX`, loads it, and the screen clears to
   `TYCOON TEX` and `NOVALOAD A100000` while the turbo loader reads the
   rest. No menu, trainer or choice: about 92 seconds of the machine's
   time from `LOAD` to the game (frame 14,671 from power-on).
3. **The hand-over**: an exec checkpoint on $1800 stops on the game's
   first instruction (`SEI`). Eject the tape there and save
   `work/entry.p4emu`. The save reports `exact: false` ("no clean
   snapshot to replay from"), as `tool-plus4emu` says a tape hand-over
   does; loaded back, it stops at PC $1800 with the same registers
   (A $00, X $00, Y $40, S $F5, P $32) and the same 16 KB, byte for byte.
4. From `entry.p4emu`, 250 frames reach the menu (`work/title.p4emu`):
   the high-score table, PLAY THE GAME, WATCH THE DEMO, the difficulty,
   the lives and the sound, with a scroller along the bottom.
5. Fire on either joystick, held 10 frames, starts the game; 20 frames
   later is `work/play-start.p4emu`, and 200 frames after that
   `work/play-desert.p4emu`, Tex standing at the left of the desert stage
   with a jet crossing the sky (`work/play-desert.png`).

**The snapshot the listing is built from is `work/entry.p4emu`.** It and
the play snapshot agree everywhere in $1000-$3FFF except the variables at
$25DB-$25E4 and $3458-$3459 and the character set at $3C00-$3FFF, where
the running game rewrites the characters it animates. The hand-over holds
the character set as the game was loaded, so it is the one to read.

## Steady state

- **Interrupts.** The game keeps the KERNAL's interrupt entry and points
  $0314 (cinv) at $18A9; $0312 (itime) stays at the KERNAL's $CE42. The
  ROMs stay paged in (`chips`: `rom` true, bank 0) and $0314 does not
  change during play. One handler serves five raster interrupts a
  frame: it writes the next line to $FF0B at $18E2, in the order 65, 176,
  192, 204 and 23, and back to 65 (write checkpoint on $FF0B over 40
  interrupts in play).
- **Video at the menu and in play**: multicolour text, 25 rows by 40
  columns, the screen's attributes at $0800 and characters at $0C00, the
  character set from RAM at $3C00.
- **Where the game sits.** The turbo loader fills $1000-$3FFF, all 12 KB
  of the C16's RAM above the screen, in one file; nothing is loaded
  later. The stack page holds the loader's stub ($0180-$01BF) and the
  tape buffer the loader ($0333-$03F2). RAM the loader never wrote still
  holds plus4emu's power-on pattern: $0509-$0700 in pieces, and the 24
  bytes after each half of the screen ($0BE8-$0BFF, $0FE8-$0FFF).

## The tape's files

`python3 kit/c16/media.py work/<the tape>` reads the tape's files, and
`media.json` lists them. The run made its map first from the loader's
own variables, read at checkpoints during the load, and the two agree.

| File | Format | Loads to | How it was found |
|---|---|---|---|
| `TYCOON TEX` | the KERNAL's | 256 bytes at $0140-$023F, by its header: the stub, and from $01C3 to $01FF a run of $02 over the stack. At the hand-over the stub is at $0180-$01BF, and $032E (iload) points at $0333 | the tape, and memory at the hand-over |
| `TYCOON TEX`'s header | the KERNAL's | the tape buffer, $0333-$03F1: the file's addresses and name, then the loader from $0348 | the tape, and memory at the hand-over |
| `NOVA` (the name the stub passes, at $0225, length 4) | Novaload | $1000-$3FFF, 48 pages and an end block (49 passes of the header check at $0378) | the block header at $9B-$A0: start page $0F00 + $100, end $4000, page count $31; the tape's file has the same six bytes and every checksum right |

The game's bytes in the snapshot are that file's bytes: the hand-over is
the first instruction after the load, so no code of the game has run.

## The loader, in a paragraph

The KERNAL's `LOAD` reads `TYCOON TEX`, which puts a short stub in the
stack page and Novaload in the tape buffer. The file loads over the
stack itself, and its bytes from $01C3 to $01FF are all $02, so the
first return address the KERNAL pulls after the load is $0202 and
control goes to $0203 (live: a checkpoint on $0203 stops there 2,266
frames after power-on, with the stack pointer at $F7). That clears the
screen and jumps to the stub at $0140, which draws the name and
`NOVALOAD A100000`, copies 21 bytes over the start of the tape buffer and
points $032E at them. The stub points the name at `NOVA` and calls the
loader at $033C, which pages the RAM in, waits for
a sync byte $AA and the name, reads a six-byte header into $9B-$A0 (the
address one page below the first, the end address and the page count)
and then the pages, one checksum a page, timing each pulse with TED's
timer 2 and flashing the border with each byte. When the count runs out
it pages the ROMs back, puts the end address in $2D-$2E and returns; the
stub then calls the game with `JSR $1800`. Not annotated further, by
policy.
