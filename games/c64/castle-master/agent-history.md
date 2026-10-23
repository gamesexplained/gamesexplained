# Publication history

30 September 2026: contributor authorized publication directly from the existing exhaustive disassembly, online research, and a separate PR for each game. Imported annotations without claiming a new reverse-engineering run. Measured the repository’s own prose coverage and retained Bronze pending completion and maintainer review.

30 September 2026 review correction: booted Dualis disk from power-on, captured menu/play, replaced the direct-import listing with canonical generation and moved shared tooling to #125. Imported descriptions remain leads. Article held at Bronze form until verification.

## Follow-up verification on 1 October 2026

The original contribution merged while verification continued, so further work starts on `game/c64/castle-master-verification`. Rebuilt the disassembler from canonical symbols and the menu snapshot. Independently walked all 34 areas/546 records, parsed all 193 FCL streams/809 tokens, and called the native area loader for every ID. A first universal object-remainder parser rejected a local type-0 record: tracing `$7C5A` established its allowlist role, while nine-byte type-2 records require separate treatment. Native projection tests exposed the loop's zero-depth shortcut scope; the revised integer model matches fourteen vertices in three batches. Parsed the complete supplied SID phrase/order directory and corrected runtime-workspace naming for authored music. Corrected self-modified operand aliases and described renderer, collision and interpreter continuations. These checks improve the source but do not replace the remaining semantic verification or maintainer tier gate.

Cold boot required letting the Dualis intro finish unpacking before Space; early key holds did not reach its waiting loop. Stopped at $476F before the game initializer and saved entry.vsf, then at $9A44 before menu drawing. This exposed authored HUD/colour data omitted by the earlier blanket bitmap exclusion: the viewport starts empty, but surrounding art and 1000 colour cells are loaded already. Native font/instrument fixtures passed. All 65 code-byte changes have operand owners and direct writers. A parked-CPU frame capture initially failed beam phase inference when there were no intermediate watchpoint hits; unchanged $D018 stores supplied timing samples without changing pixels. The resulting reconstruction matches all 104448 pixels. A preliminary unchanged-border-store loop produced three grey-dot pixels and was replaced; it is not the retained comparison. The graphics scope also showed that coverage.include takes precedence over exclude; include only the authored matrix gaps when restoring RAM under a platform default. A false 52-word cursor-table boundary was corrected from the 43-pair consumer windows: the shared allocation is 54 words and ends $86CE.

### 1 October 2026 — serializer and palette startup

Independent object traversal predicted a 652-byte save payload; controlled native serializer/deserializer calls matched all bytes. Native disk SAVE/LOAD on a private disk copy then returned the identical payload. The initial restored-state comparison exposed IRQ clock updates; masking IRQs for the final copy comparison resolved that difference. Breakpoint cleanup was corrected to use the tool schema’s `checkpoint_num` field. The retained C200 occupant decoded as a 53-byte RAM-to-colour-hardware banking loop; a controlled call reproduced all 1024 low nibbles and reached 473B. Its following zero tail is distinct from sprite artwork. New auto-labels created by recovered code were given physical-shadow bank descriptions.

### 1 October 2026 — allocation audit, interactive article and retrospective

Authored localization, trig, topology, keyboard and music allocation tails were added explicitly; generated renderer/collision/interpreter buffers were excluded only after identifying writers/consumers. Operand aliases retain instruction-byte meanings. The completed ledger has 52,770 tracked/described bytes, zero bare bytes and no loaded-data audit stretches. Several residue/header roles and behavioral boundaries remain open in TODO.md, regardless of that metric.

The article was drafted from checked facts and rewritten under the house style. Firefox exercised all 34 area selectors/546 object records,14 native projection cases,59 glyphs,8 instrument windows and save-position controls. The display matches all 104,448 colour-index pixels after accounting for the emulator and page palettes. Raw RGB comparison initially differed because the palettes differ; the one-to-one colour correspondence matches the shared frame check.

All 17 music request groups completed 25 native ticks with the final voice root matching the independent directory. This finite check does not establish exact sustained audio. The frame phase fix passes five pure regressions and a native frame capture with zero writes; broad include precedence is now documented. Maintainer review remains necessary for Silver.


## 1 October 2026 — annotation review correction

Corrected $37C6/$37C7/$37C9 to the five-way clip-plane intersection dispatcher, selected by $104B. Corrected $2A17 to describe a rewritten absolute JMP operand. The surrounding instructions and original Ghidra comments substantiate both corrections; geometry-constructor and indirect-JMP wording was wrong.

## Review edits, 3 October 2026

Repaired prose separators in the canonical symbol comments and regenerated
Source with listing.py --recomment. That route preserves every captured
byte, block and cross-reference; the ledger remains 52,770/52,770.
Moved the projection-loop quirk to the section opening and kept test
counts in facts. Split feature rows by what was actually observed,
confirmed in controlled calls, or still open; disk and tape saving now
have separate rows. Published the code-difference audit recipe instead of
requiring a private JSON. Browser checks exercised all 34 areas, fourteen
projection cases, 59 glyphs, eight instruments and save controls at phone
width, without script errors or horizontal overflow.

## 16 October 2026: the original disk, the audit and Silver

Taken on by the maintainer (`air`) after the contributor's Bronze, as a
fresh run from `kit/START.md`. The listing had been built from a Dualis
crack; this run fetched the original Domark disk (a verified G64 from the
C64 Preservation Project), booted it from a hard reset and saved new
hand-over, menu and play snapshots (`orientation.md`). The game's code
and data were the same; the crack had replaced the loader at `$C200`, so
that was annotated again and every byte of the listing now comes from the
original.

The first sample, 60 comments with seed 7351 on a proven model, found 14
wrong, over the mark. Each was corrected with the 83 others that said the
same thing, and the listing was audited in four ranges, one fresh checker
at a time. Range B's checker said `$3697` and `$4803` were workspaces,
not leftover text, which the summing loop at `$36D2-$36E0` bears out; the
TODO's open "retained text fragments" had been the same misreading.

The page was rebuilt to the current kit: a tune player on the game's own
driver, a frame rebuilt from memory, the database's record format, and a
Maps tab that draws all 34 areas and decodes all 193 scripts, held
against `SELECT_AREA`, `FIND_OBJECT_BY_ID` and `QUEUE_PYRAMID_OBJECT` by
`test_world.js`. The old article's projection, font, instrument and save
widgets were cut; their facts stay in `facts.md`.

Reading every decoded script turned up the potion of strength that never
hides itself (64 drinks, confirmed with `stores.py`), the Hospital's
regeneration, the food that runs shared object 214, and the escape's
tour skipping the Hospital's redraw. Sweeping the spirit meter through
the game's own multiply and divide for every clock value showed that
"never if all 21 are destroyed", as `features.md` had it, held from 13;
the earlier note was right only in its last case. A first draft of the
How it works copy gave the potion's sound, the moat and the sensor
drain from memory of the scripts; each was checked against the decoded
tokens before publishing, and three were wrong in a detail (the fall
threshold is tested as at least scale times 2 by one caller and more
than it by the other; strength ends the
game at 0, not only below it; the spirits are shared shapes, not one
script each).

The audit's four checkers corrected 182 of the 779 comments and renamed
18 labels. The two template errors among them were in all 34 area
headers: the first byte holds the sky's and the floor's fill patterns,
not flags, and the scale multiplies every vertical distance, not only
the step. Range C's checker called the fills colours and range D's
named the pattern table, so C's 22 headers were reworded to match. A
fifth checker then went through the 177 claims in `facts.md` and found
21 wrong in a detail. Two had reached the page, the second fall test
and voice 2's frequency in the alarm; and the note length in
`facts.md` (it is the byte after the pitch; the nibble the old text gave
belongs to the instrument's waveform steps) had been right in the
listing all along.

## 16 and 17 October 2026: the Play tab

After Silver, the whole game was ported to JavaScript for a Play tab, as
Space Rogue's and Mercenary's were: 123 routines, each checked alone
against the game's own on the simulator, then the main loop in lockstep
from 199 moments, the title's six choices from the loader's jump, and the
information screen's saves and loads. The page carries the game's memory
with every instruction byte zeroed except 192 the game uses as variables,
and the music driver, which runs on the site's shared 6502.

Play kept the game's pace from the first fit, on 8,240 passes. The
title's opening ran 23.5 % fast: its 60 steps run between clock ticks,
in loops the fit leaves out, so the step had no cost. Timing it alone,
with the lines each step draws and clears counted, put it right, and the
menus and the information screen were then timed against the game key by
key; each key is taken within 2 % of the game's time. A load from the
information screen first failed in the page's test, which tapped I for
three frames: the game reads the keys once a pass, which in that view
takes longer, and the C64 misses such a tap as well.

A checker that wrote none of the port compared the comments of the 114
routines it covers with the port, and found six wrong
(`port/corrections.md`).

## 17 October 2026: native resolution and smooth motion

Two switches on the Play tab redraw the 3D view and nothing else, as on
Space Rogue's and Mercenary's (`port/page/modern.js`, `test_modern.js`).
The first version read everything at the draw. From the 199 moments,
whole views came out wrong: the draw paints the background over the
objects' bounds, which share the view's buffer, and a redraw after a
fall draws the last rebuild's objects from a place the player has left.
The place and the objects are now read as the game's sort finishes, and
only the background as the draw starts.

The page's sort on the game's own bounds matched the game's every time,
yet 29 of 1,619 views came out in another order: the page kept slivers a
pixel across that the game had left out, and the sort, which is not a
strict order, moved the others round them. The page now reads which
objects the game queued from its directory. The faces the game left out
were faces whose first three corners, on the game's whole pixels, wind
no way; the game's projection drops the fraction toward the middle of
the view, and with that rounding the page's winding test leaves out 158
of the 169 faces it had drawn and the game had not.

Without its easing, the smooth view jumped at almost every picture, by
up to a third of a step: the next picture is known only once the page's
machine runs its pass, a frame or two after the last one's blit. It now glides from that moment
to the first frame that shows the next picture, eased over a frame, and
is on average 1.4 % of a step behind as each picture comes on show.

## Typed data no label reached (22 October 2026)

#455 made the ledger count typed data, and bytes under a line comment,
that no label reaches, and the listing then left out 47 bytes (#474).
Eight are the identity matrix at `$2C73`, which the code reads as
`$2C72,X`, so only its last entry had a label; the other 39 are zeros
no instruction refers to, after the `rts` at `$734D`, between the code
and the database at `$9D00`, and from the end of the music driver to
`$D000`. All four stretches are listed under `coverage.exclude` with
those reasons. Comments would have suited the matrix better, but the
imported analysis's model is unknown, so a comment written after the
maintainer's last sample would undo it (`models.py check`). The Play
page is unaffected: its machine keeps every data byte of the hand-over.

The snapshot was made again from the same G64, downloaded from the C64
Preservation Project, by the route in `orientation.md`. It differed
from the listing in one byte of variables (`$1C64`), which was written
back from the earlier listing into `work/menu.vsf`; the unpatched
snapshot is `work/menu-raw.vsf`.

## 22 October 2026: the fast CPU

A third switch on the Play tab runs the main loop once for every frame of
the screen, each round doing the share of a C64 round that its time is
(`port/page/fast.js`, `test_fast.js`). The page's machine runs the main
loop's stretches at a thousandth of their cost and holds each round at its
start for the next frame; it keeps counting the cycles each round would
cost the C64, in either mode, and the mod divides a frame's time by that
count to scale the round's steps.

The first walk with the switch on covered about 6 % less ground than the C64's.
The hold at a round's start ended past the frame by the interrupts that
fell during it, so each round's share came out short; the hold now ends at
the frame. A round that only redraws the view (the lightning) cost a fifth
of one that works the view out, and the next round's share came out five
times too big; only rounds that work the view out set the C64's round now.
The pointer moved at least half as fast again as the C64's: a round that moves it costs
the C64 12,083 cycles, but the mod measured it from rounds that moved it
several times. It is now measured only from rounds that move it once.

At angles between the game's 72, the game's own pictures put walls near
the player a few pixels off at each change in the rounding of its 64ths:
over a turn, 4 % of the view's pixels differed from the page's painter at
the same angle, against 1.7 % at the game's own angles. The page paints the
view at the exact angle, as smooth motion does, and the game's own
picture stays for what the game uses it for.

Each round then lasted as long as the browser's frame, so the same keys
made a slightly different game at each frame rate. A round now lasts one
tick of CIA 1's timer A, 16,422 cycles (the latch the KERNAL leaves,
16,421, plus one), and starts at the same count of it: the timer moves on
everything in play that is timed, while the music's frame (19,656 cycles)
has only 42 cycles in common with it. The page banks real time, runs at
most four rounds a frame and lets the rest go, and paints the view a round
behind, between the last two pictures. 1,500 rounds of scripted controls
gave the same machine byte for byte at 60 and 144 frames a second, with
frames 4 to 40 ms apart, and with a frame each quarter second (four rounds
a frame, so slower than the C64). In Chromium a round cost 1.3 to 2.1 ms
and the painter 0.3 to 0.9 ms; with the frame rate unlimited (456 frames
a second) the page still ran 60 rounds a second.

The speed checks first compared how far each machine turned in a fixed
time, 24 seconds of the C64 against 20 of the fast CPU, and turning came
out 4 % slow. The two windows ended at different headings, and a C64
round lasts from 0.2 s facing away from the castle to 1.76 s facing it,
so they averaged different parts of the turn. Timed over a whole turn,
the C64 takes 17.33 s and the fast CPU 17.24 s; `test_fast.js` now times
a whole turn, 1,200 units of walking and 30 pixels of the pointer.

Matched to the C64's own round, the fast CPU turned slower facing the
castle than facing away, as the C64 does, though nothing in the game asks
for it: its main loop never waits, so on a faster processor it would take
whole steps as fast as it could go round. A step now takes one pace in
every view, 60 ticks of the timer (a second). Over ten minutes of random
play in 15 areas, the C64's rounds that drew a view took 0.20 to 3.02 s,
the median 0.92 s and the mean 1.06 s. With the steps on the rounds and
the scripts' timer, the strength drain and the spirit meter on the clock,
the player now covers the same ground between two of the timer's events
whichever way they face. The scripts that a step sets off still run each
round, 60 a second while the player moves: of the five global scripts and
the eleven areas' condition scripts, those on the step's event only show
or hide objects by flags and variables, and score, strength and messages
wait on the scripts' timer. The pointer keeps the C64's pace, since a C64
round that moves it draws no view. A whole turn takes 24.04 s and 1,200
units of walking from the start 5.05 s, against 24 and 5.01 of the C64's
rounds.

Taking a step in sixtieths, each through the game's collision code,
was not the game's step. The solver settles a whole stride at once: a
stride that meets a wall at an angle stops at it, and one that leaves an
edge stops there and drops. Small pieces slide along the wall and go on
past the edge. From 2,329 places met in ten minutes of random play, four
headings each, three steps forward ended more than 64 units from the
C64's three in 58 % of 9,316 walks, at another height in 0.4 %, and 20
walks in the Stairwell fell off a ledge the C64 held the player at.
A step is now the game's own whole stride, along the fine angle, taken
when the key goes down and again each pace it is held, and the view
glides along it over the pace; turning and looking, which meet nothing,
stay continuous. 420 steps from 105 places in ten areas end where the
C64's do, at the same height and strength (`test_fast.js`).

The pace became a choice of three, a step a second, half a second or a
fifth (60, 30 or 12 ticks), each a round the C64 plays at in some view.
Smooth motion, which drew the view between the C64's own pictures, was
taken off the page, since Fast CPU draws a view each tick.

Whole strides were taken back out after Aaron played them: the player
glided on for the rest of the pace after the key came up, and a second
tap inside the pace was let go, and controls that do not answer at once
are worse than a walk that ends elsewhere at a wall. Walking is again a
share of a stride each tick with the remainder carried, every press is
taken when the key goes down, and the page states the difference at
walls and edges. The step-equivalence check left `test_fast.js` with
them; the walk is timed over 1,200 units at each pace again.

Aaron found that U turned him about twice and left him facing the same
way. A held key set its action off again each pace, and at 5× a pace is
a fifth of a second: in Chromium a press of 250 ms turned about twice and
one of 400 ms three times (at 1× and 2×, once). A C64 with nothing in
view goes round as fast and would do the same. The actions that switch
something (the speeds, facing forward, turning about, the sights, act,
the pointer and the information screen) now act once a press; a shot and
Ctrl's quarter turns and looks still repeat each pace while held.
