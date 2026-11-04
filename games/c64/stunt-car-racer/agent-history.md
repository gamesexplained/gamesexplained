# Stunt Car Racer — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 4 November 2026, the Platinum run

Asked for Platinum, with yes to every question at the start, on
claude-opus-5-5, one agent throughout.

**Orient.** The G64 from the C64 Preservation Project is the uncracked
MicroProse release. Its directory names only the loader `*`; the game is
330 sectors no entry names. The loader's last jump enters the start-up at
`$3FFB`, and that moment, saved as `work/entry.vsf`, is where both the
listing and the port begin. The game is one load, so there are no parts.

**Port and comments together.** Rather than annotate first and port
afterwards, each group of routines was ported, tested on random states
against the game's code (`port/test/t-*.js`), and commented in the same
sitting: the maths and the physics first, then the drawing, the
opponent, the menus and the race loop, the wheels and the raster
interrupt, the menus' disk work and the Hall of Fame. Writing the port
forced each comment to say exactly what the code does. The whole
listing was described by about 10:10, and the checked sample of 60
comments still found 12 wrong (20 %), mostly in what a variable stands
for: a byte taken for the car's height is how far a wrecked car sinks,
and the "landings" count in the track's data is in fact how many presses
of a spring in a row add damage.

**The pause froze the lockstep.** The port's PAUSE waited for O in a
plain JavaScript loop with no yield. On the game that loop runs while the
interrupt goes on; in the port nothing else could run, so the pause
session hung in the middle of a pass with no error. Found by giving the
lockstep the pause key and waiting for a session that never finished. A
yield in the loop fixed it. The lockstep cannot catch this by itself: a
loop that never yields never hands control back to it.

**The lockstep's hooks.** Passing the machine's own `m.hooks` to the
lockstep put it out of step at the first pass, at an address that had
nothing to do with the cause: the lockstep added its checkpoints to that
object and handed them on to the copies of the machine it runs ahead for
the interrupt's bytes. The game's session passed a copy; the kit's
lockstep now takes one itself.

**The pacing.** The fit (`port/scripts/fit-cost.js`, non-negative least
squares over the lockstep's stretches) was made on four sessions with
seed 1 and checked on four with seed 2: a mean error of 1.8 % per
stretch. `test_play.js` then found the page reached the menus 13 frames
early from the hand-over. Two causes:

- The lockstep never timed the stretch from the hand-over to the port's
  first checkpoint, so the routines only the start-up calls had no row
  in the fit and cost the page nothing. The kit's lockstep now takes
  `entry` for this (`kit/c64/lockstep.js`), and the page starts its
  clock at `$3FFB`.
- Still 7 frames early after that: the fit can price a stretch's total
  right and split it wrongly between routines that are always called
  together, so a write in the middle of a stretch (the screen's mode,
  `$3DF8`) comes too soon. A checkpoint just before that write
  (`$3511`, MENU_BACKDROP) made its time a stretch's end, which the fit
  does measure. The lockstep stayed identical in every session.

**The pages.** The Tracks tab shows the eight tracks from above, as the
game shows them before a practice race, made by running the Play tab's
own machine through the menus (`port/scripts/track-previews.js`), so the
pictures are the port's and `test_levels.js` holds them pixel for pixel.
The Graphics tab and How it works draw the race the same way
(`port/scripts/race-frame.js`). The Discoveries came from reading data
no code reads (a scrambled copyright, an Atari ST alert), from the
Super League's settings, and from working the odds of the races the
player never sees out exactly: a first draft said Max Boost beat Hot Rod
5 times in 4,096, and counting every pair of draws showed that no driver
70 or more below him ever can, while Dare Devil, 60 below, wins 8 times
in 4,096.

**Screenshots.** A full-page screenshot in Chromium left the last sections
of How it works blank: the site's `content-visibility` skips drawing what
is off the screen. Each section shot on its own showed it fine.
