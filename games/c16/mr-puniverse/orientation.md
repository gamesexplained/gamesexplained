# Mr Puniverse — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Mr Puniverse (1985)(Mastertronic).tap`, from TOSEC's Commodore C16, C116
and Plus/4 set of 11 November 2016 (archive.org item
`tosec-20161111-commodore-c16`), the tape folder, the entry with no flags.
The same folder has two alternative dumps, `[a]` and `[a2]`, and the
program folder two PRG versions, one marked `[m levels]` (modified
levels); neither was used. 167,066 bytes, SHA-256
`92729862fcac99ac8ac53833b38bf8ae65331dbe73bfad5ebe7f44dbf89d7f13`.

The header says what it is: `C16-TAPE-RAW`, version 1, machine 2 (C16 and
Plus/4), video 0 (PAL), 167,046 bytes of pulses. It is the Mastertronic
cassette with a Novaload turbo loader. Plus/4 World lists the game as 16K,
so the run uses the kit's default machine, a PAL Commodore 16 with 16 KB.

Plus/4 World's page (read 27 October 2026) says there is an older version
"that looks almost the same, but has a different ending". This tape is
the other one: Plus/4 World's cheats for it fit its code (`>3367 BD`, for
unlimited lives, turns the death sequence's `DEC lives,X` at $3367 into a
load), and the two marked "older version" do not (`>33E6 AD` and
`>25F7 60` land on an operand and the middle of player_pass).

## The emulator

`python3 kit/scripts/tools.py --platform c16 check-emulator` on 27 October
2026: 46 passed, 0 failed, on plus4emu 1.2.11 (git 939e652) with
`kit/c16/codemap.patch`, built without libsndfile, in the kit's server.
No workaround applies.

## From power-on to play

1. Start the server (`tools.py plus4emu`, the default C16), power on
   (`reset`), run 150 frames to BASIC's `READY.`, put the tape in
   (`tape`, PLAY held down) and type `LOAD` and RETURN (`type "LOAD\n"`).
2. The KERNAL finds `MR PUNIVERSE` and loads it; about 42 seconds of the
   machine's time after `LOAD` the turbo loader takes over, the border
   flashing as it reads, and soon after the loading screen appears:
   MASTERTRONIC PRESENT, a figure drawn in graphics characters, BY TONY
   KELLY and (C)1986 MR. CHIP SOFTWARE. No menu, trainer or choice.
3. **The hand-over**: an exec checkpoint on $1AF4 stops on the game's
   first instruction (`JMP $31F5`), about 99 seconds after `LOAD`. Eject
   the tape there and save `work/entry.p4emu`
   (`work/scripts/entry.py`). The save reports `exact: false`, as
   `tool-plus4emu` says a tape hand-over does; it holds PC $1AF4, A $00,
   X $00, Y $12, S $F6, P $30.
4. From `entry.p4emu`, 300 frames reach the title (MR PUNIVERSE drawn
   dot by dot, with PROGRAMMED BY T KELLY, MASTERTRONIC PRESENTS and
   © MR CHIP SOFTWARE 1985). RETURN, held 25 frames, brings the menu
   (F1 1PLY JOY, F2 1PLY KEY, F3 2PLY JOY, HELP 2PLY KEY); 50 frames
   later F1, held 25 frames, starts a game for one player with the
   joystick in port 2. 300 frames after that is
   `work/play-room1.p4emu`, Mr Puniverse standing in room 0 at the top
   left of the map (`work/scripts/play.py`).

**The snapshot the listing is built from is `work/entry.p4emu`.** It and
the play snapshot agree everywhere in $1000-$3FFF except the object tables
at $1001-$107E (which hold the BASIC line `0 SYS6900` at the hand-over),
the player's characters at $3BC0-$3BEF and his work buffer at
$3FD0-$3FFE, and the random cannon's head at $3CC2-$3CFE, which the game
animates by rewriting its glyphs. The hand-over holds the character set
as it was loaded, so it is the one to read.

## Steady state

- **Interrupts.** The game keeps the KERNAL's interrupt entry and points
  $0314 (cinv) at irq, $312E (setup_machine); the ROMs stay paged in. One
  handler serves two raster interrupts a frame, setting the next line
  itself: line 146 ($92), where it sets the panel's colours, and line 250
  ($FA), where it sets the room's colours and plays the tune. It ends
  with the KERNAL's keyboard scan (`JSR $FF9F`), and the game reads the
  keys from what that leaves in $C6 and $0543.
- **The main loop is not tied to the frame.** main_loop ($32BC) runs its
  six routines one after another with no wait on the beam or on irq, so
  its pace is the processor's time, which TED's own memory accesses cut
  on each line it draws (`c16-reference`, "The CPU").
- **Video in play**: multicolour text, 25 rows by 40 columns, the
  screen's colours at $0800 and characters at $0C00, the character set
  from RAM at $3800 ($FF13 = $38, 256 characters). The play area is rows
  0-17 and the panel rows 19-24.
- **Where the game sits.** The turbo loader fills $1001-$3FFE; nothing
  is loaded later. The rooms, the tune and the code lie in $1090-$37FF
  and the character set in $3800-$3FFF. Pages 3 and 5 hold the game's
  variables; RAM the loader never wrote still holds plus4emu's power-on
  pattern, $00 and $FF in turn ($0BE8-$0BFF, $0FE8-$0FFF, and stretches
  of the program that the game never reads, $1AA7-$1AF3 and
  $3471-$37BB).

## The tape's files

There is no script that reads a C16 tape's files (`kit/skills/c16/steps`,
"media"), so the map comes from watching memory fill, one second of the
machine's time at a time (`work/scripts/loadmap.py`):

| Seconds after `LOAD` | Written | What |
|---|---|---|
| 1-41 | page 7 and $0527-$0549 | the KERNAL's tape load of `MR PUNIVERSE`, the Novaload stage |
| 42-46 | $07FD-$0BE7, then $1001-$13AF | the turbo loader's first block |
| 48 | $082C-$0FDF in pieces, $3FAA-$3FF4 | the loading screen appears on the screen |
| 55-98 | $1003-$3FFE, about 280 bytes a second | the game, over the first block |

At 99 seconds the loader jumps to $1AF4.

## The loader, in a paragraph

The KERNAL loads a short first file, which puts Novaload's turbo routine
in the tape buffer at $0333-$03F2 and leaves the text `NOVALOAD N103106`
in screen codes at $0215. The turbo routine times each pulse from the
tape with TED's timer 2, flashing the border with each byte, and reads a
first block that becomes the loading screen, then the game into
$1001-$3FFE, leaving the BASIC line `0 SYS6900` at $1001. The game itself
never calls the loader again. Not annotated further, by policy.
