# Storm — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## The image and the boot (14 October 2026)

Aaron asked for Storm from archive.org without naming a machine; the run
took the C64 (Mastertronic, 1986) and said so. The disk came from the C64
Preservation Project's G64 collection: four files and no protection.
`c1541 -read storm-a` found nothing because the directory name ends in
spaces; `-read "storm-a*"` worked. The boot file loads `storm-a`, a
small loader at `$C000`, which loads `storm-b` and `storm-c` and jumps
to `$75AC`. A checkpoint there gave `work/entry.vsf`.

The hand-over matched the files on the disk byte for byte, and play
differed from it in `$0D00-$0EC9` (the start-up copies the ROM font
there) and in variables, so the listing was built from the hand-over.
The same comparison showed that room 0's walls are marked removed and
two of its objects taken in the file itself: the game was saved after
someone had played it, and `game_init` puts the room back.

The web lookup was thin. C64-Wiki had no page, Lemon64 answered 403 and
web.archive.org was refused, so `features.md` rests on the game's own
screens, the manual's scan on archive.org (twelve pages of instructions
in the game, which a first count made thirteen), the Mastertronic
Collectors Archive's review and CSDb's SID entry. The manual has the
characters' joystick ports the wrong way round.

## Annotation

One agent read the whole program routine by routine before writing a
comment. There are no hardware sprites: every actor is composited into
characters `$A0-$EF` over the floor, with masks that keep the floor in
front. The rooms are lists one after another in room order, which is
what `reset_walls` and `reset_objects` rely on. The room map is BCD,
which a first script decoding it as binary hit as a `KeyError`. Coverage
reached 100 % at about an hour, with the ROMs, the screen, the loader
and the never-loaded gap between `storm-b` and `storm-c` excluded.

Several first readings were wrong and were put right before the sample:
`draw_border` takes its wall style from the last wall record, not
character 1; the actors' shapes are 8 bytes per character, top row
first; widths are in characters, not cells; the armour test is a BCD
compare with `$0D`; the main loop takes at least two frames, 2.6 with
six monsters, not two. Junk traced in the RAM under the KERNAL was set
back to undefined and the KERNAL range excluded.

## Live checks

Each bug was run in VICE before it was written up: the carried counters
(poked, then a game over and a new game), armour stopping hunger, the
spell that misses monsters in higher slots, the count that goes below
zero and stops spawning, the second spell that freezes the game, room
69's description running into room 70's, RESTORE and a soft reset, the
touch damage by animation frame, and Corrine's ending. A first try at
the spell shot a newly spawned monster rather than the survivor; it was
redone shooting the survivor right after the spell. `vice_registers_set`
needs `{"register":"PC","value":...}`, and `frames()` raises when a
checkpoint stops the machine, which the ending's script had to catch.

The laboratory lock was found last, after the pages were built: the
carried counter had been written up as a discovery without reading its
tests. With `brooches` 4 in room 3 the door refused; with 3 it opened
(`reference/brooch-door.png`).

## The sample

A checker on a cold context sampled 80 comments (seed 20261014): 8 had a
wrong detail, and it noted 3 more outside the sample. Each was settled
against the code and corrected, with the comments that repeated the same
belief (`facts.md`, "The listing's error rate").

## The pages

Every widget runs the game's own code on a 6502 in the page: one block,
`storm-machine`, shared by index.html, discoveries.html and levels.html,
and one inside each sound driver. Four tests hold them to the kit's
simulator. Two differences came out of that work. The machine test
differed at `$8127`, where a delay routine saves the caller's Y: the
page's 6502 and the kit's began calls with different registers, and now
both begin with A, X and Y 0 and every flag clear. The monster widget
called `spawn` before `move_monster`; the main loop does the opposite,
with the drains cleared first, and the test could not see it because it
drove both sides in the page's order. A room table read from the
as-loaded memory showed room 0's walls as removed until it read the
memory after the reset.

In Chromium, full-page screenshots drew nothing past the first screen
(the pages skip off-screen sections), so each section was checked on
its own, at desktop width and at 375 pixels. That found the spell
stepper's reference picture showing over its canvas, and room 69's
text one character short because its marker counted toward the 80.

## The Play tab

A follow-up asked for a Play tab, played with the arrow keys or WASD,
with a live map under it and a guide to the nearest brooch. The port
(`reference/storm-port.js`) is one function for each routine of the
listing, run on the listing's 64 KB; the title tune's player is the one
piece of 6502 code it runs. `test_play.js` holds it to the game's code in
the kit's lockstep for 40,000 passes of the main loop, over games of one
player and of two, driven by an autopilot that follows the guide.

The lockstep needed two fixes on the way (`kit-feedback.md`): a routine
that waits for the raster, called twice running, made two stops at the
same exit, which the checker read as one; and the interrupt handler's
replay ran on operands the main program had patched since, because only
its data reads were set back to what the game's handler saw. Past those,
the one difference left was a race of the game's own on the title, the
tune's driver sharing `$03`/`$04` with `cell_address` (`facts.md`,
"Bugs and oddities"); the test takes those cells from the game.

The page's pace began as a fit of each routine's cost to the stretches
between checkpoints (`play.md`). It was replaced by measuring each
routine on the game's code, from its entry to its RTS with the
interrupts taken out, which came within half a per cent once three
things were added: bad lines on both clocks (the kit's machine with `dma`, and
the page's own), costs for `put_block`, `compose` and `restore_bg` by
the block's width and height, and `panel_band`'s cost on the frames it
moves the message line apart from the others. `test_pace.js` compares
the frames a pass takes on the kit's machine and on the page, with the
same pilots: the two leave the same frames after a few passes (a mean
cost lands a pass a frame early or late near a raster wait, and the
interrupts then differ), so it holds the average over the passes of
play, leaving out the title, whose answer comes by the frame. Over
24,000 frames the page was 0.45 % slower with one player and 0.41 % with
two.

The map and the guide read the game's memory as it runs: `room_map`,
`exit_bits`, the room's object lists and the players' records. The
guide's search is the one `test_play.js`'s autopilot follows, so 40,000
passes of play steered by it are part of the lockstep. Checked in
Chromium at 1,200 and 375 pixels: the title frame lines up with
`reference/title.png` to the pixel, the guide's line starts at the
player, and the arrow keys drive Storm in a two-player game.
