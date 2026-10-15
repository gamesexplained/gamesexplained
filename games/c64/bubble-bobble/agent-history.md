# Bubble Bobble — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 5-6 October 2026, one session, claude-fable-5-1, kit 0.0.93

**Setting up.** Nothing was installed. Rust went into `tools/` with
rustup's own installer, regenerator2000 was built from crates.io, and the
vice-mcp v3.13.2 macOS release was unpacked by `get-vice download`.

**The emulator started and answered nothing.** `tools.py vice` reported
it up, `check-emulator` hung on its first call, and the log ended at
"Queuing trap dispatch for: initialize". The process used 2 % of a
core. `sample <pid>` showed the emulation thread inside
`AudioComponentInstanceNew`, waiting on CoreAudio: the Mac's default
output was a remote-desktop program's virtual device ("Jump Desktop
Audio") that never answered. Writing `SoundDeviceName="dummy"` under
`[C64SC]` in `tools/vice-home/config/vice/vicerc` and restarting cured
it; `check-emulator` then passed 57 of 57.

**The image.** A T64 with one packed file: Remember's crack. It shows an
intro, six pages of the manual's text, the loading picture, and after a
depack a trainer menu whose start code ends in `JMP $4460`. The menu's
patch list was read before anything else in the game: twenty addresses
with their meanings attached.

**The first play snapshot was taken mid-death.** After pressing 1, the
stick was held right for a second and the machine saved. Bub had walked
into the first enemy. A fire test on that snapshot blew no bubble and a
lives dot had gone. The snapshot was replaced by one taken a fixed
number of frames after the key, with Bub standing still
(`play-r1-start.vsf`), and every later test started from it.

**Reading.** regenerator2000's tracer found 12 KB from the entry point.
A small recursive-descent reader over the snapshot (`work/d.py`) printed
compact listings for reading, and the dispatch tables were seeded as
they turned up: the object draw table at `$040C`, the special objects at
`$0D68`, the actor states at `$1E3C`, the item effects at `$2D65`, the
music commands at `$F240`. A list of every instruction that stores into
another instruction found the patched calls: the pass hook at `$0A38`
(which is how the boss's hit test at `$1134` was found, called from
nowhere), the JMP/BIT switches in the interrupt handlers, the fall
routine's two tails. 22 KB of code in the end.

**Water, fire and thunder were first read the wrong way round.** The
object that falls and then runs along the floor carrying actors was
annotated as lightning, and the falling drop that spreads along a floor
as water, from the shapes of the code. The colours the spawner gives
the three bubbles (cyan, red, green) and the trail's cyan cells put it
right, and the pictures confirmed it later: type 6 is water, 8 fire,
`$0A` thunder. About thirty names and comments were corrected in one
pass.

**The enemies' shots were named before their pictures were drawn.**
"Bottle thrower" was first given to the kind that drops a bolt, and
"rock" to a fireball. Rendering the object pictures from the pointer
tables settled which shot is which.

**Score units.** The first descriptions of the item score tables called
the low score byte hundreds. It counts tens: the screen prints a fixed
zero after the six digits. The secret room's block score, `$12` in the
middle byte, 36 times, gives the 432,000 the C64-Wiki quotes, which was
a good check on the corrected units.

**The title tune.** The compare of hand-over and play showed 1 KB at
`$8B00` changing completely. Decoding the tune table showed tune 7, the
title's, pointing there: the game overwrites it with its screen copy.

**Coverage.** After every symbol had a comment the figure read 99.6 %
of 52 KB. A script over the ledger (`work/untracked.py`) then listed
6 KB that no symbol's span reached: the tails of the layouts, enemy
lists, wall blocks and item pictures, and several tables typed for one
byte only. Labels with their round numbers, generated from the data,
closed it at 58,532 bytes.

**Verification.** A Python decoder of the layouts and air currents,
written from the format, matched the running game's collision map in
nine and ten rounds. The burst scores, the chain bonus, the timer,
EXTEND and round 100 were forced and measured. The first round-100 test
poked `level` one too low and landed on round 99.

**The listing sample was bad twice.** An agent that had written none of
the comments checked 60 drawn at random and found 11 with a wrong
detail, none wrong about what its subject is. Those were fixed, and the
same slips looked for elsewhere, and a second sample of 60 came back
with 10. Sixteen of the 21 were routine descriptions: units (frames,
runs of the actor loop, passes of the main loop), which states a
compare lets through, up for down, once for every time. Fixing by
pattern had not moved the rate, so a fresh agent audited all 367
routine comments not yet checked and rewrote 99. Its report also turned
up a store of the wrong register in the game itself (`$F23C`).

**A pass is three frames, not two.** The pass loop's own wait reads as
two frames. A blown bubble sampled every frame changed every third, and
non-stopping checkpoints then counted 100 passes in 300 frames: the
buffer flip at the top of each pass waits for a frame of its own. The
same trace showed the growth table is indexed by the counter before the
decrement, because the routine's AND works on the value its caller
loaded.

**Two pictures showed nothing.** The first Baron screenshot was taken
60 frames after the Baron's object appeared, during a jingle the game
waits for inside its main loop, so no Baron had been drawn. The first
EXTEND picture was a black frame between two scenes. Both were caught
by looking at the built page, not by any check.

**The page.** The decoders were rewritten in JavaScript inside
`index.html` and compared with the Python ones for all 100 rounds by a
node script in `work/`; a second script compared the drawn screen with
the game's clean copy for rounds 1 and 3, and found that the unpacker
forces the left wall on before the shadows are drawn. No Firefox was
installed, so the page was checked with the Mac's own Chrome, headless,
with its profile in `tools/chrome-profile`.

## 6-7 October 2026, a second session, claude-fable-5-1, kit 0.0.93: the Play tab

The contributor asked for the whole game playable in the browser as a
recreation, not an emulator (`kit/skills/core/70-minisite/play.md`), with
sound, and allowed up to four agents at once.

**The frame first.** The port runs on the game's own 64 KB, loaded from
`listing.json`, one JavaScript function per listing label, with the
chips behind `P.io`. Routines that wait are generators, and a reachability
walk from `wait_frame` over the call graph fixed the set (`GEN` in
`work/port/src/core.js`) before any group was given out; the walk missed
`init_round_state`, which plays a tune through a JSR four instructions
from its end, and the long lockstep sessions found it at the first round
change. The main program, the three raster handlers and the waits were
written first (`src/flow.js`) and run in lockstep with everything else
standing in by the game's own code; a stand-in that waits runs the
game's routine in the kit's simulator up to the frame counter's poll and
polls from JavaScript, so a whole session could run with one group
ported. Twenty-two moments of play were saved from the snapshots with
random input (`work/port/states/`), and a harness ran a port routine and
the game's routine from the same random moment and compared all memory,
colour RAM and the chip registers.

**Six agents, four at once.** The 271 routines were split into seven
groups by address (objects, actors, items, screen, round, enemy
intelligence with the music driver, and the flow), one agent each but
the flow. Each agent got the
same brief (`work/port/BRIEF.md`), its ranges, and the harness; each
reported cases passed per routine, lockstep results against the flow-only
baseline, every place its port departs from the instructions, and the
listing comments it found wrong. One claim per agent was checked against
the listing before the report was believed (the double burst in
`age_objects`, the overlapping `bonus_step` tables, the hidden LDA under
the BIT at `$E0EE`, the carry into the ADC at `$EAB1`, the BPL to the
next instruction at `$27B0`, and the two rejoin checks of `draw_lives`),
and all six held. Sixteen comments were corrected in `symbols.json` (`work/ann/30-port.txt`)
and the listing rebuilt.

**What the lockstep showed.** 47 sessions, 52,000 passes, memory
compared at every pass start: 98.3 % identical, none out of step. Every
differing pass has the same shape, the renderer's scratch pointers
(`$0D`, `$18`-`$1B`, `$31`-`$3A`, `repair_row_b`) and one object slot: the
game runs `update_actors` inside the line-50 interrupt, and when that
falls in the middle of the bubble loop a bubble the player has just blown
or an enemy just caught is seen by half the loop in the game and by none
or all of it in the port. The differences come in pairs two passes
apart, the two screen buffers. Two smaller things the sessions caught in
the flow: the kit's lockstep counts a checkpoint repeated with nothing
between as one, so the title loop's three score rows needed a turn
between them; and the frame the pass loop reads after `check_deaths` has
waited for a death must be read directly, since the game's own polling
reads come first in that stretch.

**Pacing.** A pass is three frames by the game's own wait, so the page
keeps a PAL clock and moves it by the cycles each stretch of the main
loop took on the kit's machine (the median over the sessions, the
interrupts' own cycles taken out) and by each handler's cycles,
`update_actors` apart. From four saved moments, 600 frames of the same
input gave the same pass count, the same player position and the same
score on the machine and on the page.

**The page.** The chips of the page start as the KERNAL leaves them: the
game never sets CIA 1's data direction and only ANDs `$D011`, so a chip
state of zeros gave no keys and a black screen. `DEC $D019` acknowledges
through the read-modify-write's first store, which the port's handlers
now make. The page was driven headless over Chrome's DevTools protocol
(`work/port/test/browser.js`), which starts a round, lets the page run
for some seconds, presses keys, and reports the console. The first build was a
script three hundred copies long, because a string replacement had
expanded `$'` inside the code.

**Four more sections for the Gold pass (7 October 2026).** The three
Gold pages on the site (Jupiter Lander, Radar Rat Race, Chiller) and the
section list in `70-minisite` were compared with this page, and the gaps
filled with what the port had made possible: a Controls section with the
numbers measured in the emulator; the sound, with the ported music driver
playing all twelve tunes through the site's SID model (the driver is cut
out of the port's source by `work/port/music-driver.js`); an enemy
stepper that runs the whole port one frame or one actor run at a time
and prints what each enemy's routine did, with the port inlined by
`work/port/index-port.js`; and a Discoveries section of nine findings
from the code, each with its address and, where there was one, the live
observation. The movement paragraph was written from the routines'
comments after a first draft had put in two things the code does not do
(a walker turning to face its player on landing, which only the dropper
does, and walking off an edge when above its player). Both pages were
driven in headless Chrome over the DevTools protocol before the commit.

**The tabs (7 October 2026).** The one long page was split the way
Chiller's is: Overview, Play, Gameplay, Enemies, Controls, Maps,
Graphics, Music, Discoveries, Source code, About, listed in `game.json`.
The style sheet, the decoders and the widgets went to `reference/`,
which the site builder copies beside the pages, so the port (340 KB) and
the music driver are loaded once as scripts instead of being inlined;
`work/port/index-port.js` and `work/port/music-driver.js` write them
there. Each widget block now runs only on the page that has its elements.
The Overview gained two short sections: the makers as the title page
names them and what is unusual about the conversion, and the list of
tabs. Every tab was loaded in headless Chrome and its widgets counted;
the one error (a shared animation counter left in one block) was fixed
before the commit.

## 11 October 2026: the Music tab was silent

The player's readout said "Volume 0". The game writes the SID's master
volume once, in `silence` (`$F4BD`, `$1F` to `$D418`) from the start-up
code; no tune routine touches it. The tab's driver started each tune on
a cleared SID with `start_tune` alone, so the voices played into a muted
chip. `init` now calls `silence` first, as the start-up does; every tune
checked in node writes `$1F`, and the page test clicks a tune and reads
the volume after 1.5 s (15). The Play tab runs the start-up and was not
affected.


## 15 October 2026: the Play tab's memory

The Play tab and the Enemies tab drew each frame's registers over memory
as it stood when the page drew, part way into the next frame, and kept
a log of their own for the sprite pointers the interrupts change. They
now take memory as each frame began, with each later change logged where
the game made it (`C64.videoMemory` in `site/lib/c64.js`), as the Storm
and Ghostbusters Play tabs do; the pointer log is gone, since the
pointers are among the bytes compared. Checked in Chromium: round 5
plays, and the Enemies tab builds a round and steps it, with no errors.
