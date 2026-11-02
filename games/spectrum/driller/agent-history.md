# Driller — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 2 November 2026: the run, in one session

A Platinum run in a hosted Linux container with no display, kit 0.0.292,
ZEsarUX 13.0 and SkoolKit 10.1 under `tools/` (SDL 1.2 came from apt,
outside the repository, as the Linux notes say). The emulator check
passed 47 of 50, the three failures the notes already record.

**The image.** TOSEC's original 1987 Incentive tape. Its three turbo
blocks are not encoded: they land in memory byte for byte as they are on
the tape, so a script cuts them out of the `.tzx`, and TOSEC's `.z80` of
the game differs from the snapshot only in variables.
The game starts at `$97A4` and asks for a word from the manual before
play; the 128 words sit in a table at `$ABC1`, each letter stored as one
of four bytes, so a search for the words as text finds none of them. A
`JR $6B12` the loader leaves at the start of the game is the trap behind
a wrong answer: the right answer writes a `PUSH IX` over it.

**The order of work.** The port came first and the listing's comments
second. The 3D renderer was ported routine by routine (culling, the view
matrix, the multiply routines the game writes into itself, clipping,
projection, the painter's sort and the span filler), each run beside the
game's own code on moments of play saved from ZEsarUX. Then the rest:
keys, sensors, the object scripts, the console, the interrupt, movement,
the laser, drilling, the main loop, the information screen, the control
options and the security question. The comments in the listing were
written from the port's understanding of each routine, which is why the
`play` row in `accuracy` found nothing to fix.

**The lockstep.** The whole port runs in lockstep with the game from the
hand-over (`port/test/lockstep.js`). Three things took the most rounds:

- The interrupt moves bytes the main program reads in the middle of a
  pass (the sensors' beam counts, the minutes, the shield). The port reads
  each through `irqByte`, and `IRQ_BYTES` lists them, so a read gets the
  value the game would have seen at that point rather than the value at
  the pass's start.
- The ways out of play (the clock, the energy, the shield, abandoning
  from the information screen) were seldom reached by the recorded
  sessions, so the lockstep forces each as a scenario and follows it
  through the game over, the demonstration and the menus.
- Six saved moments failed late in play by one byte at `$8A21` or
  `$8A46`. The port was right: while it waits for a sensor's beam, the
  main program writes the very value the interrupt had just left, and the
  kit's lockstep restores a stale value when a byte still holds what the
  interrupt wrote. A checkpoint at each end of every beam wait clears the
  record and fixed it; the kit's side is issue #729.

After that, 150 passes from every saved moment taken between two passes
were identical in the game and the port, with no routine standing in for
the game.

**Pacing.** The page runs the port at the game's speed by a cost model
fitted on the game's own T-states (`port/scripts/fit-cost.js`). On a
moment with a sensor in view the page ran ahead, because the interrupt
draws the sensors' beams and that work is not the main program's; the
interrupt got counts of its own work (sensors and beams) and a fit of its
own. On 1,199 passes it was not fitted on, the median error of a whole
pass is −0.9 %. `port/test/t-page.js` plays the built page against the
game on saved moments and checks the pace is within 5 %.

**The sample.** 75 of the listing's 262 comments, drawn with seed
20261102, went cold to a second session as checker before any was
changed. It found 14 wrong in a detail (a field of a sensor's record, where a divide's rounding happens, how
many cycles a sound effect plays); each was checked against the code and
corrected. That is over the mark, so `TODO.md` recommends an audit.

**The discoveries.** None of them came from the documentation. Each
area's object scripts were decoded into words and sorted by what they
pay; the ones that add a large score or show and hide objects in other
areas led to Trachyte's million, the number on Obsidian's wall and the
four switches that open the way to Trachyte. A walk of the graph of exits
found Mitral, which has none. Trachyte's shots were found by a search over
the port's own `run_scripts`, which reached 21 states and found that four
shots is the shortest. Each picture on the Discoveries tab is the port
drawing the view after those scripts have run.

**Claims caught before they reached a page.** "The way back from Mitral
is through its own doors" was false: Mitral has no exit. The probe lands
at Mitral's entrance 7, not 6. "Only the jet can fly
that high" became the probe's own height limit of 4 cells. A claim about
when sensors fire, and one about an artefact of the painter's sort, were
cut because neither could be shown with the port.

**Pages.** `port/scripts/build-pages.js` builds How it works, Maps and
Discoveries from templates, with the port and a data pack in which the
code's bytes are blanked. Two things that look like bugs and are not: a
full-page screenshot in Playwright left the first section blank, which is
`content-visibility` in the screenshot only; and a hook on `io.out` did
nothing, because the port keeps a copy of the `io` it is given, so a page
hooks `P.io.out`.
