# Lords of Chaos — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 2-3 November 2026: the run to Silver

**Orientation.** The TOSEC `.tzx` (no flags) loads in ZEsarUX 13.0 as a
48K Spectrum; the `.tap` in the same set carries a cheat loader and was
left alone. The engine loads to `$606E`-`$E220`, and the designer and the
three scenarios each load at `$D003` over the same header, so the game
became five parts: the engine (`$4000`-`$D002`), the designer
(`$D003`-`$E220`) and three scenarios (`$D003`-`$FFFF`). Play snapshots of
each scenario, and of the designer, were taken by driving the menus
through ZEsarUX's remote port (`work/scripts/drive.py`).

**Coverage.** Static tracing (`kit/spectrum/codemap.py`) found most of
the engine; execution maps recorded live by ending turn after turn in
each scenario (figures in `facts.md`, "Live tests") decided what the
static reading could not, chiefly the scenario hooks the engine calls
through the header's JP slots. A first pass of those maps marked the
scenarios' start-up code at `$FE03`-`$FF30` as code in the engine's
snapshot, where it is garbage: the engine's map now skips `$D003`-`$FFFF`.
The scenarios' IM 2 vector at `$FFFF` holds a JR whose offset is the
ROM's first byte, which crashed both codemap.py and listing.py; both were
fixed in the kit with a test each. The parts' build script takes its end
address as exclusive: given `FFFF`, it dropped the last byte, and `10000`
is right. The designer's symbols needed `--force` once, because its
header bytes are the same as scenario 1's and an unused label there would
otherwise have been lost.

**Verify.** A checker (the same model, briefed cold, writing none of the
comments) sampled 80 of 1,129 comments with seed 7061 and found 12 wrong,
all in hand-written comments: 15 % plain, 18.7 % weighted, over the mark.
Each was corrected with every comment that said the same, across parts.
The commonest kind was a list of cases left short (`kit/lessons/2026-11-03-lords-of-chaos.md`).

**Pages.** The How it works page ports the map window, line of sight,
combat and the sound routines, each held to the game's code. The
Discoveries page started with seven findings, four of them checked live
in the emulator (LOAD's first-letter match with a two-file tape, the
designer's lost points, the authors' breakpoint called by hand, the
vials' strength in a fresh game). Opening a tape in ZEsarUX after loading
a snapshot reset the machine; opening the tape first and then loading the
snapshot works.

**Two findings from the Maps page.** Drawing each scenario whole, and
testing what the page reads against the game's routines, turned up two
things the listing had wrong or had missed. The trip squares had been
annotated as waking their creatures when stepped on; trip_square's
callers showed that only a change to the square does (a door unlocked,
opened or closed, a chest opened, a terrain set). The comment in the
header and the scenarios' generated text were corrected. And reading the
routes the way waypoint_square does, with no check on the number, put
waypoint 28 of three of scenario 2's routes on a rock wall: an eighth
discovery, tested by running computer_choose_target on the game's code.

**Play (Platinum).** The port was written group by group, 412 routines
in all, each group's routines checked alone against the game's on the
moments the sessions' player reached (`port/test/check.js`), then the
whole program run beside the game in the kit's lockstep. Two things in
the kit's lockstep had to change: a byte that `readsAt` hands over is the
instruction's first read past its operands, which an indexed load and
`LD A,(nn)` had been getting wrong, and `countCalls` wrapped a class the
port throws and broke `new` on it; both have a test in
`kit/spectrum/test_lockstep.js`.

The longest lockstep, from the hand-over with seed 1, stopped at pass
93,557 with the game going round its turn loop for ever.
computer_pick_up searches its list of objects for the target's type with
no end; the list holds ten objects and the computer's wizard stood on
fifteen, wanting the twelfth, so the search ran on through memory, and
the write it makes at the byte it found landed on the operand of
`LD HL,$5B11` in the turn loop, so the player number's increment went to
the ROM. I first took the object to be missing from the square; hooks
on the object's entry showed it was there, seen and on the ground, and
the list's count was 10. The port now reads that operand from memory,
as the game does, and the lockstep counts the hang as in step.

The designer's save-and-load session drifted at the end of the cassette:
the test machine's instant cassette loaded a block while SPACE was held,
which the ROM's LD-BYTES never does (it looks at the keyboard before the
first byte and returns). Both the test machine and the port now break
off a load, and a save after its flag byte, when SPACE is held.

The last run of the routine tests stuck on strike_hit's case 32: a
random combat of 255 gives random_below a limit of 0, which the game
spins in for ever, and so did the port's loop, in JavaScript, where on
the page it would have locked the tab. random_below and
computer_pick_up's search now throw `P.Hang` where the game would never
leave, the page then runs only the clock and the interrupt, and
`test_play.js` checks that it does. The routine tests count those cases
as waiting on both sides.

The page's pacing is fitted on the game's own T-states. A routine's own
time is credited to the innermost routine the port also calls, so that
small routines the port does inside their callers do not leave their
time unpriced; the routines whose cost varies most from call to call are
priced by the work counted inside them (squares a creature looks at,
entries and words printed, numbers drawn). The first fit had no rows from
the hand-over's menus and was a fifth fast there; another had none for
the 20-frame pause after some spells. Rows from the boot, the designer
and seed-11 moments filled both. Two page machines, one on the whole
memory and one on the page's blanked memory, diverged only once a page
drew more random numbers than the recorded session held; the replay now
gives both the same bytes past the end and compares them up to it.

**The hang on Discoveries.** For the Discoveries section the lockstep
game was run again from the hand-over and the machine saved at each of
TORQUEMADA's tries to pick up the mushroom, then loaded into ZEsarUX.
That corrected what facts.md had said: the earlier searches marked entry
3, an empty wizard slot, not the first wizard, and the search reached the
turn loop only because one of the computer's spell priorities had
climbed to the mushroom's type between two tries in the same turn. The
lockstep's pass number had not told the tries apart, since the computer's
whole turn is one pass. ZEsarUX showed the operand rewritten, the
end-of-turn menu, and then the blank screen that no key ends.

**The Graphics tab.** The tab came after the kit asked for one at every
tier above Bronze. Following each thing's frames from the things table
left graphics 1 to 4 and frames 165 to 167 with nothing to show them, in
all three scenarios. A search for writes to `$FF86` found the four
cursors in graphics 1 to 4, and a search for the frame's number found
show_hit and summon_display writing `$A5` into thing `$4F`'s next frame:
the sparkle. That left graphics 113 and 164 of scenario 2 and 145 of
scenario 3, which the page shows under their own heading. The death
animation, the burst and the missile shapes are drawn by ports held to
the game's routines (test_graphics.js), and the pauses come from the
game's own T-states for each step's sound.

**Pictures in the tables, and a search that never ends.** Aaron asked
for the terrain, creature and spell tables to carry their pictures, and
how a game starts, since LOAD SCENARIO never came back. It never came
back because the name typed was SCENARIO: find_file loads the first file
whose name starts with the letter typed, and no file starts with S. The
game searches on, as it would on a Spectrum, but the page's cassette
wound round to its first block at once and for ever. It now stops at the
end of the tape after one round without a file, says so under the
screen, and SPACE winds it back to the start; test_play.js loads
scenario 1 after such a search. Stopping it with the tape left on a data
block put the next search out of step, header against data, which the
same test showed.

For the spells, a search of the listing for callers of draw_spell_bolt
found only ENCHANT and the area spells. Running each spell's routine on
the kit's Z80 (test_spells.js) found SUBVERSION, CURSE and MAGIC ATTACK
flying the bolt too, through pick_creature_target, and every flight
ending in the burst, because draw_missile runs on into draw_hit with no
call to find.

**Left open.** Nothing for Platinum. Gold needs a person's pass over the
copy.
