## next · 6 October 2026 · Bubble Bobble · icyriver2023 with Claude

**A kind is named by its picture.** Bubble Bobble has three special
bubbles, and what each releases is a routine: one falls and runs along
the floor carrying whatever it meets, one drops and spreads into a row
of cells that kill, one flies level. Read as code, the first looked like
lightning and the second like water, and thirty names and comments said
so. The colours the spawner gives the bubbles and the pictures behind
the draw routines said water, fire and thunder, in that order. The same
happened to the enemies' shots, where a bottle and a bolt were given to
each other's owners until the object pictures were rendered from their
pointer table. A rule for `50-coverage`, to follow a kind's draw routine
to its picture and colour before naming it, waits in the game's
`kit-feedback.md` for a second game that shows the same slip.

**A score table is in the units of the byte it is added to.** The item
scores are one byte each, and the routine that adds one chooses the
score byte by the item's number. Read without that routine the table
gave hundreds where the game gives tens. A figure the documentation
quotes for a whole scene (432,000 for a secret room) checked the
corrected units against 36 blocks of 12,000.

**Authored data can sit in a buffer.** The title page's tune lies in the
kilobyte the game uses as its copy of the screen, so it plays once and
is gone. The compare of hand-over and play showed the region changing;
what it held was found by following the tune table's pointers, not by
looking at the bytes. `10-orient`'s hand-over snapshot and
`50-coverage`'s rule on pointer tables already lead there, and they
did.

**A comment written from memory is right about the routine and wrong
about its details.** The 22 KB of code were read once, end to end, and
the 400 routine comments written afterwards in batches from that
reading. An agent that had written none of them found a wrong detail in
one of four: frames where the code counts runs of a loop, a compare
described by the values it was meant for and not the ones it accepts,
up for down, once for every time. None named the wrong routine.
Correcting the kinds of slip a first sample found did not move the
rate in a second; only a full audit by a fresh agent did, and it
rewrote 99 of 367. A sentence for `50-coverage`, to write each
description with its listing on screen, waits with the rule above.

**A game that runs its actors in the interrupt leaves the lockstep a
floor it cannot go below.** Bubble Bobble moves the players and the enemies inside the
raster interrupt at line 50, every other frame, while the main loop is
halfway through its bubbles. The lockstep replays an interrupt between
two of the port's routines, so when the game's interrupt fell inside one,
the game's routine saw half the actors moved and the port's none: 1.7 %
of 52,000 passes differed, always by the renderer's scratch and one
object slot, never by anything else, and never out of step. That is the
game's own race, and the number to expect from a game of this shape. For
those passes the proof is the routine-by-routine check, which runs each
routine with no interrupt at all.
