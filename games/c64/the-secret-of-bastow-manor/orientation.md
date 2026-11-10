# The Secret of Bastow Manor — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`work/bastow.d64`, a plain 35-track 1541 sector image, 174,848 bytes (no
error block), SHA-256
`5df882b2ef598d845e4bfe4ebcc4d51a477f0c50bdf1f6df036b8302eb90aab2`, named
in the contributor's upload `Secret_of_Bastow_Manor_The_USA.D64`. The
header says it is a cracker's disk, not the publisher's: the disk is
named `ASS PRESENTS:`, and the directory (`kit/c64/disk.py <image>`,
683 sectors, none with a bad checksum, none in use that a file does
not hold) is:

```
BASTOW MANOR   PRG  137 blocks   34,760 bytes, loads at $0801
BM-1           PRG    4 blocks      822 bytes, loads at $3120
BM-2           PRG    4 blocks      905 bytes, loads at $3220
```

`BASTOW MANOR` is the whole game: one program in BASIC, 953 lines, from
`$0801` to `$8FC6` (BASIC's pointer to the end of the program, `$2D`, reads
`$8FC7` after the load; SHA-256 of the file
`305be944ef30871c7c21859dd1fccbd63037c5a2b58fca5a4e177d5ed62fe04e`).
It contains no machine code. `BM-1` and `BM-2` are two saved games, not
programs: their "load addresses" are the first two characters of a text
file (the game's own `mansav` format, `restore_game`), and their bytes are
`PRINT#1` output, one value to a line (`facts.md`, "The two saved games on
the disk"). Nothing on the disk loads either of them. No trainer, no
cracktro and no menu is in front of the game: the crack is the disk
transfer itself, so the program is the game's own, apart from anything
the crackers changed that the publisher's copy does not show (not
checked; no other copy was to be had).

## From power-on to play

Tools: vice-mcp `release v3.14.0, v3.14.0-linux-x86_64-gui.zip`, which
passed all 57 of `check-emulator`'s checks on 10 November 2026 (none
failed, so no workaround applies); regenerator2000 0.9.20 (the listing was
written by a script from `work/entry.vsf`, `facts.md`, "How the listing was
made"); PAL.

1. Hard-reset the emulator, then autostart the image's first file without
   running it (`autostart(rpc, "work/bastow.d64", 1, run=False)` in
   `kit/c64/vice.py`). VICE types `LOAD"BASTOW MANOR",8,1` and the load
   finishes with `READY.` and 38,911 BASIC bytes free.
2. **Hand-over snapshot, `work/entry.vsf`**: saved at that `READY.` (BASIC's
   program-end pointer `$2D` is `$8FC7`), without ROMs. This is the image the
   listing is built from: the file's bytes are at `$0801`-`$8FC6`, equal to
   the file's byte for byte. A program in BASIC has no entry point in
   machine code; `RUN` is the hand-over.
3. Type `RUN`. About 25 seconds later the title screen has played its tune
   and the text asks `DO YOU WISH TO RESUME A SAVED GAME  Y/N?`.
4. **Play snapshot, `work/play-start.vsf`**: answer `N` and press RETURN.
   The game draws "I AM OUTSIDE THE MANOR GATES" and waits at `> WHAT NOW ?`;
   save there. Every command after that is typed and ended with RETURN.
5. The game takes its input through the KERNAL's line editor, so
   `vice_keyboard_type` with a carriage return does not reach it: the
   keys must go in as PETSCII bytes (`vice_keyboard_petscii`, RETURN is 13,
   letters in upper case). With warp mode on the game's pauses
   (`FOR H=1 TO 4000: NEXT` and the like) take about a second; without it a
   command can take ten.
6. A scripted replay of a whole winning game from `play-start.vsf` is
   `tools/route.txt` in the project's shared files: 225 commands, from the
   walkthrough published on the Interactive Fiction Archive (`features.md`,
   Sources), all of which the game took.

## The parts

One load. The game does not read another file, and no overlay or bank is
involved. It writes one file, `mansav`, to the cassette (`verb_save`), and reads
it again (`restore_game`): the save goes to tape (device 1), not to the disk.

## Steady state

The program never installs an interrupt handler. During play the KERNAL's
vectors at `$0314`-`$0319` hold their defaults. The only machine state the
program changes is the video chip's sprite registers (`$D000`-`$D02E`),
the sound chip, the screen and the colours; and one vector in BASIC itself:
line 17 pokes `$A8` into `$0307`, the high byte of the vector BASIC's
`LIST` goes through (the ROM sets it to `$A71A`), so that a `LIST` of the
program in memory prints nothing but the line number (`facts.md`).
Sprite shapes are poked into `$0340`, `$0380` and `$03C0` (blocks 13, 14
and 15) at run time from DATA lines.

## The loader, in a paragraph

There is none. The BASIC program is a single file in the directory's first
position and BASIC's own `LOAD` brings it in; RUN starts line 5. The BASIC
text is not tokenised in any unusual way, and the file has no BASIC stub
and no `SYS` line, so the usual question of a hand-over into machine code
does not arise.
