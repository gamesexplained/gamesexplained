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
