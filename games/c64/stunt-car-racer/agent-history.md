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

## 4 November 2026, the name's prompt, the sound player and the drivers

**The name's prompt skipped itself.** Return at the first menu picks Single
Player League, and the Play tab held a key until the game had read it
twice. The game reads Return once at the menu; the next read came from
the name's prompt, which took it as the name's end. The page now lets a
key go two frames after it comes up once the game has read it, read again
or not. `port/test/keys-browser.js` presses Return for 100 ms in Chromium
and checks that the prompt waits; with the old rule it ends at once.

**The sound player.** `port/scripts/race-sound.js` records every call the
race's main loop makes to the sound's code while the Play tab's machine
drives a practice race, with the frame each came in. Two things made the
first playback differ from the port: the interrupt can come between
ENGINE_SOUND's start and its read of the engine's note (the call then
belongs to the next frame), and between two of START_EFFECT's writes to
the SID (once in the race, at frame 1378). The page runs the interrupt
there, on a second 6502 over the same memory. STOP_EFFECTS was the third
writer the first recording missed. Then all 1,675 frames match, register
by register. A frame's writes reach the player's SID at one instant, so
an effect whose gate the interrupt closes in the frame it starts (effect
4, one frame) was silent; each frame of the player now begins with the
interrupt and ends with the main loop's calls, so the gate stays open a
frame.

**The drivers.** Every driver has the race's engine (`$C386` comes from
`race_start_bytes`), and the top speed is drawn per track, not per driver.
The drivers differ in the habits byte at `$AEE0` and in how often they
swerve, the driver's number plus one in 32.
