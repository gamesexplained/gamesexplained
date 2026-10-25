# Master of Magic — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 2026-09-24: the first run, on Linux

The first run of the kit on Linux, in a cloud container with no display.

**Tools.** The vice-mcp release could not be downloaded from where the
run was, so the emulator was built from source. First `air/vice-mcp`'s
`fixed` branch, then, at the contributor's request, the latest
`barryw/vice-mcp` with the two pull requests still open (#20 frame
advance, #24 step on a held machine) merged locally. Both passed 54 of
56 checks. The two failures were in the check script, not the emulator:
`stopwatch` compared cycles with the wall clock and caught VICE catching
up after the previous check's busy checkpoint had slowed it to 78 % of
real time; `determinism-running-save` armed a stopping checkpoint on a
running machine and set its ignore count in a second call, and on a host
where a call takes 16 ms the checkpoint usually fired in between. With
the script fixed, 56 of 56. While this was going on the two pull
requests were revised and merged upstream as v3.13.0, which was built
and measured again: 56 of 56, and that is the build the game was done
with.

**Getting in.** The image is Remember's crack: an intro, a docs reader
with the tape inlay's text, the tape's loading picture, and a two-question
trainer. The docs reader was the best manual this run had. A scripted
boot stops on the trainer's first instruction and on the game's own
entry at `$07F9`; the trainer's patch addresses were the first map of the
game's variables (`$4EC5`, the player's body strength).

**A wrong turn with the keyboard.** The first boot script held N down
through `vice_keyboard_matrix` inside a helper that failed before its
release. The key stayed down in the emulator across every snapshot load
that followed. For the next hour the KERNAL's current-key variable `$C5`
read `$27` (N) whatever was pressed, and B on the controls screen and M
in the menu "did nothing". The first explanation written down was that
no interrupt ran the keyboard scan on that screen. The tell was `$C5`
never changing; releasing N made both keys work at once. The kit's
vice-mcp skill now says to release keys in a `finally`.

**The shape of the code.** A flow trace from the entry, the restart, both
interrupt handlers and the music entries covered about 10 KB, then
stopped at a self-modifying `JSR` in the main loop (`$0846`), the menu
dispatch. Typing its eighteen-entry handler table and tracing each
handler made the code contiguous from `$07F9` to `$2F52`. The tracer also
wandered into the title scroller's text (a run of spaces is `JSR $2020`)
and traced the RAM under the ROM routines the game calls; both were
undone.

**Coverage.** About 45 KB of the image is the game. Ten agents took
disjoint ranges: five over the engine's code, one for the title,
demonstration, music driver and the RAM under the KERNAL, and four over
the data (variables and the top band's font, the text and property
tables, the pictures, the map and the bottom band's bitmap).
Every agent had its own range, its own annotation log and its own
coverage figure (`coverage.py --range`, added to the kit for this), and a
brief with what was known. Two claims in that brief were wrong, and the
agents caught both. `$2566`, with its table pointers at `$4968`/`$4970`
and an operand rewritten at `$25A7`, was briefed as a picture-drawing
routine; it is the creatures' move chooser, and the rewritten operand
picks between two tables of the ways out of each tile. The title screen
was briefed as character mode with its matrix at `$C400` and characters
at `$F000`; it is a multicolour bitmap at `$E000` with its matrix at
`$CC00`, which two agents found independently and proved by rebuilding
the picture from memory. The lesson for the next brief: say which
claims are measured and which are guesses from a register write.

Agents also disagreed with each other, and settling that was most of the
verify step. Whether a shield, armour or ring protects when carried in
the backpack (it does not: the test wants the object's position to be
the player). Whether the DEAD sprite is doubled one way or both (both,
`$D017` and `$D01D` are written `$FF`). One agent reported that pressing
fire cuts a timed action short, from the test at `$0904`. The code and a
live count both say no: nothing polls the controls during a timed
verb's passes, and INVENTORY ran its 12 passes with fire held. The comment
that said otherwise was corrected before the export.

**The lairs.** The inlay says most monsters patrol round their lair. The
code has a home address per creature, but the new-game loop that clears
two 31-byte flag tables runs for 64 entries and wipes the high byte of
every home as it goes. The loaded file already has them wiped, which says
the game was saved from memory after it had run. With a home in page 0,
an idle creature heads north, and in play-run 17 of the 24 creatures
that do not wander were north of their starting row. Two agents found
this separately.

**Rock is not floor.** An agent simulating the ray caster reported a
corner case in "open floor" where no ray records the player's own cell,
naming `$7E` as plain floor. `$7E` is solid rock. Poking the player into
rock to test it gave nonsense (an invisible attacker, a menu that would
not close). A flood fill over the cells the player can actually stand on
from the start showed the corner case needs one of 11 cells in a strip
of level 4 that cannot be reached.

**Spells.** One agent read that spells never roll: the random number is
fetched and then overwritten by `LDA #$1F`. The test was a cast of MAGIC
MISSILE from a saved target menu, from six random seeds poked into the
generator, at a skeleton, both vampires and the minotaur. The results
were the same every time, and match the arithmetic.

**The reset.** RESTORE restarted the game cleanly, but a reset brought
the title up with scrambled colours. The label on `$01` said the restart
clears bit 0; reading the CPU port after a reset showed the data
direction register at 0, so that write does nothing and BASIC stays in
over the game's tables. Starting a game after a reset confirmed it: the
view window stays empty. The kit's platform reference now says to test
the reset as well as RESTORE.

**Live tests added in verify**: the death (body poked to 0, the minotaur
put on the player's cell), the DEAD label (a skeleton left with 10 and a
missile), the weight limit (either side of 70) and the fire count. Each
took a few minutes with the menu read from the screen and chosen by
label.

## Typed data no label reached (22 October 2026)

#455 made the ledger count typed data that no label reaches, and the
listing then left out 48 bytes (#473): `obj_px`, the pixel columns of
the 64 objects, runs past the memory map's edge at `$4000`, where a
span stops, so objects 16-63 had no description. A comment at `$4000`
now carries them.

The snapshots were made again from the same image (`orientation.md`).
With the hand-over to compare against, `listing.py` found two more
stretches that hold the same bytes at the hand-over and in play. The
text screen's spaces are the KERNAL's screen clear, the game's first
call, written over the trainer's questions, so the screen is excluded
with that reason. The 192 bytes at `$FF40`-`$FFFF`, past the title
bitmap in the RAM under the KERNAL, are the end of the crackers' packed
copy of the game: a stop on the second decruncher's first instruction
(`$00FD`) showed the move at `$3F40` had put the packed copy at
`$6613`-`$FFFF` (from `$3F51`), with these bytes already as they are in
play; the unpacked game stops at `$FF3F`, and nothing in it reads them.


## The whole game on the Play tab (22 October 2026)

The first Play tab ported play only, from a new game's first menu, and
paced its wall tests by a count of cycles: no title, no story, no
instructions, no recorder, no footsteps and no interrupt. For Platinum
the port was written again as the whole program, from the entry at
`$07F9`, in `reference/mom-port.js`, with the three interrupt handlers
(`$5D08` on the title, `$2653` in play, the KERNAL's `$EA31` between)
and the music driver (`reference/mom-music.js`, moved out of
`index.html`) running on the game's own memory.

`test_play.js` runs it in the kit's lockstep from the cold start. The
kit's machine needed two things from the game's test: the ROM routines
the game calls, as `MoMPort.ROM` (the screen clear, BASIC's RAM set-up,
CHROUT and the KERNAL's interrupt work), and an interrupt line held for
as long as its source holds it. The title's handler returns on CIA 1's
timer without reading `$DC0D`, so on a C64 it is taken again at once
until the scroller's half reads it; the kit's machine took it again only
at its next line. With both, the machine played the game's demonstration
as VICE's recording of it, at all 2,371 passes.

What the lockstep found, in order: the title's picture copy wrote colour
memory through the wrong path (pass 53); `$0385`-`$0386`, random_byte's
save of its caller's X and Y, which the port has no registers for (left
out, pass 234); the play handler's read of the collisions in `$D01F`,
which the lockstep did not replay (pass 288: a kit change, below); and a
fire on the title, where the title's interrupt wrote `$D016` between the
port's checkpoint and the SEI at `$5C19`, so the replay landed after the
port's own write (a checkpoint there). The scripted player then needed
help to reach every verb: the backpack and the potions brought and
picked up (PUT IN, TAKE OUT, LOOK IN, DRINK), the player put on doors
(OPEN, CLOSE) and the shield cast (UNCAST). The game's own demonstration
ends with the player's death and the game over's full wait, so part 1 of
the test runs about 23,000 frames.

The pacing was fitted on 2.1 million stretches between checkpoints with
the video chip's cycles off, and charges the game's work to within
0.12 %. The page's own clock then ran the demonstration 0.95 % fast: the
band of the play interrupt that plays the music had one average cost,
and the fit had averaged the theme's frames with the frames after a
death or a win, where the tune has ended and the driver returns at once.
Split by the driver's state (bit 7 of `$C41D`), the band's cost is the
theme's, and the page ends the demonstration 30 of its 14,119 frames
sooner than the machine (0.21 %). The test fails past 0.5 %.

The page carried 27,849 bytes of the game's data regions for the first
port. The new one loads the listing and carries only the 1,251 bytes
that differ between the file as it loads and the listing's snapshot.

## The story line, the Music switch and the mouse (22 October 2026)

On the published Play tab the title's story line jumped a character
back and forth every fourth frame. `C64.videoMemory` compared only the
video bank on show, and the title's picture half moves the line in bank
0 while bank 3 is shown, so the move was found after the scroller half,
past the line. It now compares every bank (`site/lib/c64.js`), and
`test_screen.js` draws the title as the page does: 0 or 2 pixels left
per drawing, where it had moved 6 right and 10 left. The page also
skipped a frame now and then, since the title's timer interrupt holds
the main program back to line `$EE` and a stretch could end most of a
frame past the page's target; `MoMPlay.frameAt` gives the frame due.

The Music button held M for four frames, which the game reads only in
play, and the game turns its music on again at each new game and game
over. It is now a switch the page holds the game to: the game's own M in
play, and the SID's volume turned down elsewhere. W, A, S and D are the
stick, and a click on a menu's word steers the cursor there with the
stick and holds fire until the chooser reads it, so a recording made
with CTRL and R records it.

## The skipping music and a click for fire (24 October 2026)

Aaron heard the Play tab's music skip badly. The page sent each frame's
SID writes, in twelfths of a frame, to a queue in the audio worklet that
kept 48 of them, 80 ms. That is less than the page's uneven frames and
the audio device's buffer need together, so the queue ran dry and
overflowed by turns: in headless Chromium with a 100 ms device buffer
it did so about 130 times a second. The queue is now the site's, in
`site/lib/sid.js` (`host({ live: true })`), half a second long, and the
other Play tabs that kept a copy of it use it too
(`kit/lessons/2026-10-24-master-of-magic-sound.md`).

A click anywhere on the picture but a menu's word is now fire, held
until the game has read it and, in play with no menu up, until the menu
comes back: so a click stops a RUN, and the chooser, which waits for
fire to be released, picks nothing.
