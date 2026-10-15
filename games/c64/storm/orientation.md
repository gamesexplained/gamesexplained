# Storm — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`storm.g64`, 278,234 bytes, from the C64 Preservation Project's G64
collection on archive.org, where it is named
`storm[mastertronic_1986](!).g64` (the `(!)` is the collection's mark for
a verified good dump). The header reads `GCR-1541`, version 0, 84 half
tracks (42 tracks), maximum track size `$1EF8`: a GCR image of the
original disk, not a sector image. Disk name `storm`, ID `2a`. The
directory lists four programs:

| File | Blocks | Loads at | Bytes | What it is |
|---|---|---|---|---|
| `storm` | 2 | `$0300`-`$0429` | 298 | the boot file: overwrites the BASIC vectors and its own loader at `$0400` |
| `storm-a` | 2 | `$C000`-`$C0FE` | 255 | the loader proper |
| `storm-b` | 131 | `$0800`-`$897F` | 33,152 | the game: character set, rooms, text, code |
| `storm-c` | 10 | `$9000`-`$99C7` | 2,504 | David Whittaker's music and sound driver with its data |

`storm-a` is listed with two trailing spaces (`"storm-a  "`), so
`c1541 -read storm-a` misses it; `-read "storm-a*"` finds it. Nothing on
the disk is protected: the KERNAL's own loader reads every file, and
VICE's default drive emulation boots it with no settings changed.

The title screen and its scroller read `..STORM.. (C) MASTERTRONIC LTD.
1986 WRITTEN BY THE FIRM CONVERTED BY J.BAGULEY. MUSIC AND SOUND FX BY
DAVID WHITTAKER.` Nothing on the disk names a version.

## From power-on to play

1. Emulator: VICE x64sc (vice-mcp v3.13.2), PAL, default settings; the
   G64 needs no `vicerc`.
2. Hard reset, then autostart `storm.g64` (the first file, `storm`). The
   screen clears, the border flashes while the files load, and about 90
   seconds later (with autostart's warp) the game starts.
3. **Hand-over.** `storm-a` ends with `JMP $75AC`. A stopping checkpoint
   on `$75AC` set before the autostart stops there: snapshot
   `work/entry.vsf`. Its RAM holds `storm-b` and `storm-c` byte for
   byte. **This is the image analysed and listed** (see Steady state).
4. Run on: the title screen (`----- STORM -----`, `PART 1:UNA CUM'S
   LAIR`, `PRESS FIRE TO START`) appears within three seconds, over the
   first room. Snapshot `work/title.vsf`.
5. Fire on either joystick port: `SELECT NUMBER OF PLAYERS`. Left on
   either port for one player, right for two.
6. `DO YOU WANT INSTUCTIONS ?` (the game's spelling): up for yes, down
   for no. Yes shows twelve pages of story, controls and objects, each
   left with fire.
7. Play starts in the first room. Snapshot `work/play-1p.vsf`: one
   player, a few seconds into the first room, the monsters out of their
   generator at the top right.

## Steady state

| | Hand-over (`entry.vsf`) | Play (`play-1p.vsf`) |
|---|---|---|
| `$01` | `$37` | `$37`: BASIC, I/O and KERNAL all in throughout |
| IRQ `$0314` | `$EA31` (KERNAL) | `$7D80` |
| NMI `$0318` | `$FE47` (KERNAL) | `$80DE` |
| `$FFFA` (RAM under the KERNAL) | `$FFFF` fill | `$80F6` |
| VIC bank (`$DD00`) | 0 | 0 (`$C7`) |

One frame of play (`kit/c64/frame.py capture`, `work/frame-play.json`)
has seven writes to the video chip and none to `$0314`: one handler
splits the screen. From line 256 to the top of the next frame the status
panel shows the character ROM (`$D018` = `$15`, screen `$0400`,
characters `$1000`) on red; at line 89 the background turns blue for the
message line, scrolled one pixel (`$D016` = `$D1`) from line 90; at line
98 the play area takes the game's character set at `$0800`
(`$D018` = `$13`) on black, multicolour, unscrolled. No sprite is ever
enabled in play: every figure on screen is made of characters.

Hand-over and play differ in variables, the screen, the stack, the
vectors above, and the character set at `$09D0`-`$0A0E` and
`$0C41`-`$0E7E`, which play redraws. The hand-over holds the loaded
bytes everywhere, which is why it is the image listed. Nothing is
reloaded during play: the game is one load.

## The loader, in a paragraph

`storm` loads at `$0300` with `,8,1` and so overwrites the BASIC vectors
there: `$0302` (the main-loop vector) becomes `$0400`, so the KERNAL's
return to BASIC after the load runs the code that came with it at
`$0400`. That code loads `storm-a` to `$C000` and jumps to it. `storm-a`
points the STOP vector `$0328` at a three-instruction routine that bumps
the border colour and goes on to the KERNAL's own STOP test (the
flashing border), turns the KERNAL's messages off, clears the screen,
loads `storm-b` to `$0800` and `storm-c` to `$9000` (it makes the second
name by incrementing the last letter of the first), sets `$BA` to 1 and
jumps to `$75AC`. Not annotated further, by policy.
