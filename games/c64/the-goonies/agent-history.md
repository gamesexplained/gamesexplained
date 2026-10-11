# The Goonies — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 7 October 2026

**Orient.** Two G64 images from the contributor, the Datasoft disk and the
U.S. Gold disk. Only the 130-byte boot file reads through the 1541's DOS;
it runs in the stack page and loads the game with its own transfer, so true
drive emulation is needed. An execute checkpoint on `$0800` stops at the
hand-over about 25 seconds after autostart (`work/entry.vsf`). The U.S.
Gold disk, taken to its own hand-over, differs in about 23,000 bytes and
was left alone. Every scene was reached by poking its index into `$12BC`
and pressing F7 (`work/scene0.vsf`-`scene8.vsf`); F7 has to be held for
about 0.6 seconds for the key scan to see it.

**Features.** The C64-Wiki was the one detailed source. Several of its
U.S. Gold notes (simultaneous two players, five lives) turned out to be
true of the Datasoft build, which is why `features.md` says so per row.

**Coverage.** One agent, the whole program. The memory map came first
(`facts.md`, "Memory layout"); the scenes are separate blocks of code,
each with start, per-pass and late routines through the tables at
`$1201`. The rectangle lists, the shape table and the effect scripts were
commented by small scripts from templates.

## 8 October 2026

**The restart.** The container was replaced mid-run and the disassembler
was down. It was started again on `work/entry.vsf` and the annotation log
replayed (`kit/c64/r2000.py --replay`); the export matched the one before
byte for byte. Keep a copy of `work/annotations.jsonl` outside `work/`
before long sessions: replaying it is the whole recovery.

**The machine.** `kit/c64/machine.js` built from a play snapshot's RAM
ran the main loop forever: the loop waits for the frame counter, and the
raster interrupt never fired, because `readSnapshot` gives the RAM and
the CPU but not the VIC's raster compare and interrupt enable. Setting
`enable = 1` and `cmp = $FB` (the game's line) by hand fixed it
(`work/tests/mk.js`). With that, the jump's line-by-line path, the
infinite-lives poke and the tune commands were measured on the machine.

**Verify.** One checking agent took a sample of 40 hand-written and 20
generated comments. Three were wrong; two came from one template that
had copied a pointer table's comment onto every entry it pointed at. All
58 comments that template wrote were rewritten, each stating its own
entry's role (`facts.md`, "Listing error rate").

**Live tests that changed the page.** The draft said the ending returns
to the title. Entered from a fresh boot with the ship's x poked to its
end, it leads to scene 1 with the score and lives kept
(`reference/second-round.png`): the game goes round again. Loading a
scene snapshot and then starting another scene gives DISK ERROR, because
a snapshot does not bring the drive's state back; boot fresh for any test
that loads a picture.

**Writing the pages.** Several facts were wrong and were found only while
writing about them:

- The shape copy counts (13, 7 and 38) did not add up against the list
  beside them. Recounted from the bytes: in any scene's table 15 shapes
  have four copies, 6 have two and 37 have one.
- "Shapes 0-15 are the scene's own shapes" was true but missed what they
  are. Drawing the seven blocks at `$B797` showed seven different
  children, eight frames each: each scene picks its two Goonies. Scene
  8 sets the second Goonie's base shape to `$31`, a taller figure.
- "Eight shapes the table holds as loaded, which no scene uses" was
  wrong: the pointers as loaded name shapes 49-56, the figure scene 8
  uses.
- The protection check's comment quoted `LDX #$E3`; the code is
  `LDX $A14F`, with the value kept among scene 8's tables.
- The leftover source at `$F84D` was noted as matching one table; read
  against the bytes, it is the source of all seven tables at
  `$F405`-`$F412` and the start of the routine after them.
- Run through each tune on the 6502 machine, the driver reached only
  command 0, which settled the open question about command 5's table
  overlapping a tune.

The Play tab was left for a later pass on the same branch.
