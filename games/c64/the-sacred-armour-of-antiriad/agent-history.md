# The Sacred Armour of Antiriad — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 24 October 2026, one session (Silver)

**Image and loading.** The archive.org UK Palace D64 is a one-file
crack: five unpacking stages and a KERNAL reset into a "CBM80" header at
`$8000`. A checkpoint on `$8009`, armed before the autostart, stopped on
the game's first instruction, and that hand-over is the listing's
snapshot (`orientation.md`).

**Tools.** The VICE v3.13.2 release zip lacked nine libraries in this
container and there was no `sudo`. The packages were fetched with
`apt-get download` and unpacked into `tools/vice-libs`, which the
launcher reads; `check-emulator` then passed 57 of 57.

**Annotation.** The code (`$8009`-`$B499`) was read by hand in six
batches. Most of the data is records of known formats (room maps,
tiles, character lists, sprite lists, tracks, instruments, animations,
paths), so their comments were written by scripts from the bytes. Pointer
tables here are read at `table,y` and `table+1,y`, so the disassembler
made an auto symbol one byte into each, and `coverage.py` stopped each
table's comment at that symbol's 64-byte reach; naming them as user
labels (`..._hi`) closed the gaps. Two stretches the listing does not
count, `$4000`-`$43FF` and `$D800`-`$D8FF`, were excluded with the
evidence that nothing reads them first: a load watch on the screen from
the hand-over stayed silent while a store watch stopped at once.

**Verify.** One checker on the run's own model took a sample of 80 (60
hand-written, 20 generated). Fifteen were wrong in a detail; two of them
were generated sentences, so the template fix went to every record that
used it (seven room lists, three splashes). The details are in
`facts.md`, "The listing's error rate".

**A wrong turn on the registers.** The first orientation draft quoted
`$D01A` = `$F3` and `$D018` = `$0D` from the recorded frame, where the
game stores `$03` and `$0C`: the chip reads its unused bits back as 1.
The same slip is in two published games (issue #535); the rule is now in
`kit/skills/c64/c64-reference`.

**Frame capture.** `frame.py capture -h` captured a frame into a file
named `-h` (now fixed). The first real capture differed from the
emulator in 163 pixels, all in the animated tiles, whose characters the
game rewrites while the beam draws; `--watch '$7000-$7FFF'` made it 0 of
104,448.

**Pages.** The three pages share one port of the room drawing (the
`ant-room` block) and one of the sound driver (`ant-music`), built from
scratch files and held by `test_rooms.js` (69 rooms, 207 sprites and the
title against `build_room`, `place_room_sprites` and
`draw_title_screen`) and `test_music.js` (every button of both players
against the driver scheduled from the game's timers). Copy was checked
against the listing claim by claim; that pass corrected several of the
draft's sentences (where the armour stands, how `play_effect` treats a
busy voice, `check_detonation`'s address, the bomb-thrower's list in
room `$1E`). Live tests in VICE confirmed the bomb dies to one stone,
that a stone kill scores double, and the 100-frame hold-back in room
`$40`, which also showed `hold_back_group`'s comment had given the wait
in unnamed steps.

**Browser check.** Full-page screenshots came out blank below the first
sections, because the site skips drawing sections off the screen
(`content-visibility`). Screenshots taken one section at a time, each
scrolled into view first, showed every widget drawn and no console
errors on any of the three pages.

**Left open.** A checkpoint on `$8109` (the title tune's first part),
loaded from `work/entry.vsf`, did not stop within 60 seconds, though the
title starts that tune within a second. It was not run down; the music
check used a state recorded another way.

## Follow-up: animated tiles and the ending (24 October 2026)

After the Silver pull request, the contributor asked for four of the
debrief's ideas. `animate_tiles` was ported into the shared room block
(`ANT.tilesStart`, `tilesPass`, `tilesFrame`) and `test_rooms.js` now
runs it beside the game's routine, with `count_timers` once a frame and
three main-loop passes after it, for 1,500 frames of each of the 37
rooms that have tile scripts; the character set and every slot's script,
step and wait matched on every frame. Maps and How it works animate the
tiles from it.

The ending widget needed `scroll_message` and the dissolve. Both were
ported into the same block and `test_ending.js` holds them: every one of
the 22 messages for 1,500 frames, and `victory_sequence` in room `$00`
stopped at each of its nine waits. A planted slip in each port (the
dissolve mask's index, a letter's code) failed the test. The step's
length on the screen came from VICE: the border flips 17 or 18 frames
apart, of which the AND takes about eight with the interrupt running.

Drawing the strip under the ending showed that the panel widget of
section 08 had drawn its letters in hires red. A screenshot of the strip
in VICE, decoded pixel by pixel, matched the strip's bytes drawn in
multicolour with dark grey, light blue and cyan (colour RAM 11), and
both widgets now draw it so.

## Follow-up: the route (24 October 2026)

A beam search played the game on the kit's machine from `$8009`, a leg
at a time (into the armour, each add-on, the mine), trying the stick in
steps of seven frames, the game's own rate of reading it, and keeping
the paths that cost Tal least energy.

On the kit's machine Tal first walked through the armour, the add-ons
and the creatures alike. The game finds every touch in its collision
interrupt, which the machine never raised. Collision interrupts were
recorded in VICE (`frame.py irq`) and the machine now raises them; the
kit's changes say how.

Replaying the bot's route in VICE a frame at a time drifted at once:
the game started two frames later there, from timer counts and memory
the kit's machine does not hold. Replayed a stick read at a time instead
(a stop at each read of `$DC00` in play, given the stick the kit's
machine read there), it matched for 122 reads and then took Tal from
room `$3E` through `$3F` into `$40` in seven frames. A watch on stores
to `spr_xhi` showed `throw_stone` writing it dozens of times a frame,
though no stone had been thrown. The difference at the first read was
`zp_throw`: 0 on the kit's machine and `$C9` in VICE, the byte BASIC's
start-up leaves at `$7C`. With `$7C` set to 0 in VICE the replay went on
through `$3F` and matched for 528 reads. At the 529th, Tal lost a life
in room `$3B` in VICE and not on the kit's machine; the other eight
bytes below the listing still differed there, and that difference was
not run down. The kit's processor's read and write trackers found nine
bytes the game reads before it writes them; the route's test starts
them as VICE held them, and the bot's route now begins with a stone.

With all nine bytes set, the route matched VICE for 710 reads. At the
711th, in room `$2B`, VICE had taken 16 points off Tal where the kit's
machine took 8: a creature's touch in both, and a scenery hit in VICE
alone. Logging every read of `$D01F` and every interrupt on the kit's
machine showed why. The raster handler at line 50 clears I and runs
`scroll_message`, `roll_score` and, when the timer is due, the music,
for about fifty lines, and at its end it reads `$D01E` and `$D01F` to
clear them. On the machine the collision's interrupt comes inside that
handler and `latch_bg_hits` keeps it; the kit's machine ran each handler
whole, so the handler's own read cleared the collision first. The
machine gained an option, `nest`, which takes interrupts between a
handler's instructions. Fed VICE's stick read by read, it matched VICE
for 1,380 reads, through five deaths to the game over, where whole
handlers had matched 711; it also reads the stick every 7 frames, as
VICE does, where whole handlers let some reads come 6 frames apart. The
bot's route up to the ledge in C13 was carried to the new model a read
at a time, each read the same, and the bot searched the rest again on
it.

The new route, played in VICE a read at a time, matched for 1,934 of its
1,954 reads and reached the ending there, the mine and the last message,
with the same score. The 20 that differed came in a row in H8, after
Tal's first death there, where VICE's Tal had 4 points less energy.
Logging every latch of `$D01F`, every pass of `scenery_hits` and the
address each interrupt broke into, on both machines, showed the same
collision latched on the same line of the same frame. On the kit's
machine its interrupt had come at `$A4AC`, after `scenery_hits` had read
the latch as empty and before it stored 0 there, so the touch was wiped;
in VICE the main loop was elsewhere and the touch cost 4 points. That is
the game's own race, and which way it falls depends on where the main
loop, which runs with no wait, is in its pass, which the kit's machine
does not hold to the cycle over thirteen thousand frames. Tal's energy
ran out on the same read in both, and the two runs joined again. A first
check of the ending in VICE let go of the stick before the last read had
been taken, and Tal never landed: the read is taken once the run goes on,
so the stick it is given has to stay until then.

## Follow-up: the Play tab (25 October 2026)

Every routine the game runs was ported to JavaScript in `port/src`, one
file to a group of the listing, and the sound driver runs on the site's
6502 as the music player does. Each routine was checked alone against
the game's code on states made from 56 moments of play (`port/test`),
and the whole program in lockstep with the game on the kit's machine
with nested interrupts: from the cold start for 500,000 passes (19,315
frames, past the ending) and from each of the 56 moments for 6,000,
every pass identical. The moment in the ending waits for fire at
`$8B4C`; with fire pressed after the route it went on identical through
the title.

The page paces the port by the cycles each routine cost the game on the
route (`port/scripts/time-routines.js`). Five things put it out of step
with the C64, each found by running the page beside the machine from
the same moment:

- `add_weight` loops by branching back to its own first instruction,
  and the measure took each turn for a call of its own, where the port
  runs the loop in one call. A return to a routine's label with the
  stack as it was is now a turn of the call under way, and the port
  counts the turns.
- The music handler stops CIA 1's timer A, clears I and runs the
  driver, and a raster band that comes inside it holds the timer. The
  page ran the driver whole and the band after it, so the sound's timer
  drifted against the frame. The driver's core now asks the page
  between its instructions whether an interrupt is due. Of the 56
  moments, 43 kept Tal in step for 300 frames, where 40 had. Moving the
  chips' clock on through a handler by the cost of its routines so far
  was tried as well and made it worse, 29 of 56: a band's last read of
  the interrupt flags then cleared flags that should have come as
  interrupts of their own.
- `colour_panel` returns at once on all but one call, and on that one,
  the first time the armour is worn, recolours the panel for most of six
  frames. Costed by its mean, the page lit the panel eight frames early.
  Its looks in the list of colours are now counted and paid a row at a
  time.
- The tasks the game runs every frame (moving the sprites, Tal's
  footing, the score, the panel's messages and its power-up) return
  after a test or two on most frames. Costed by their means, each idle
  call paid a share of the busy ones, and in the game's first room the
  page reached `clear_room_objects` 177 lines after the C64. Each task's
  turns past its first test are now counted, and it is 10 lines.
- The ending dissolves the playfield's character set in nine steps,
  each 2,048 bytes ANDed with a mask and then a wait of ten frames.
  The routine waits, so it takes what time the game gives it and had no
  cost of its own, and the page ran the ANDs in no time: it showed the
  last message 65 frames before the C64. Each turn of that loop is now
  timed on the route, 41 cycles, and counted.

`test_play.js` holds the published page on a clean checkout. The C64
replays the route; at each of its stages the page, restored from a
moment made 120 frames before it, reaches the stage within two frames
of the C64, and keeps Tal in step for 50 frames, a frame either way
allowed, since the page runs a handler whole where the C64 takes its
fifty lines. From power-on the game starts on the same frame as the
C64's.

Measured as the test measures, on the frames the page draws and a frame
either way, 48 of the 56 moments keep Tal in step for 300 frames.
Counting the frame tasks put the room build in step and left that
figure where it was, 47 of 56 either way before the ending's dissolve
was costed.

What is left apart is where the two meet the stick. The page runs an
interrupt's handler whole at its line, line 250 for the band that runs
`tal_control`, where the C64 reaches the read in it about line 262. A
change of the stick that falls in the twelve lines between can move
`tal_control`'s reads, one every seventh frame, a frame apart from then
on. From power-on the page's Tal falls a step behind the C64's at frame
842, and the page enters room `$39` on frame 975 against the C64's 967.

`test_play.js` hung in the ending at first: once the C64 ran past the
route's last frame, the test asked it for runs of no cycles, over and
over. Past the route's end the stick is now let go and the C64 runs on
whole.

## Follow-up: the solution on the Play tab (25 October 2026)

Aaron asked for the Play tab to play the route. Given the route's stick
frame by frame from power-on, the page's Tal lost a life at frame 1,250,
in room `$3A`, where the route loses none, and on the frame the route
puts on the armour he was in another room. Given each change of the
stick at the cycle the C64 first read it, the page kept to the route
through three add-ons and parted at frame 11,070, in room 9: the page's
rooms draw at their own pace, and by then it was five frames behind the
C64, so a change came to Tal at another moment of his walk.

The game reads the stick at four instructions: `foot_control`
(`$909C`) and `suit_control` (`$9383`), from the interrupt every seventh
frame of play, 1,954 reads on the route; and `read_fire` (`$8417`) and
the ending's wait (`$8B4C`), which poll for fire as fast as they can.
`port/scripts/solution.js` keeps the stick at each of the controls'
reads, and the polls' by the clock (three changes: the stick let go, and
fire pressed and let go at the title). `port/page/solution.js` gives the
page's controls the C64's value read by read, and the polls theirs by
the clock. From power-on the page then plays the whole route: its 17
stages in their rooms, at most 19 frames from the route's, and every one
of the 1,954 reads used.

## Follow-up: the kit's machine takes interrupts as the processor does (29 October 2026)

The kit's C64 now takes interrupts inside a handler by default, takes a
held line again straight after the RTI, and lets a waiting interrupt in
one instruction after a `CLI` (#525, #556). The route's joystick, a byte
a frame, then parted from `route.json` at frame 4,832 and ended with a
life lost, since a few cycles here and there moved some reads of the
stick into the next frame.

The route was carried to the new machine a read at a time: the game ran
with each read of `foot_control` and `suit_control` given the value
`port/solution.json` kept for it, and the frame's byte became the value
of the read made in it. Played a frame at a time again, the new joystick
gives the same 1,954 reads, the same 17 stages in the same rooms and
places, each within four frames of the old, the same three lives lost,
and the last message at frame 17,685. Since the reads are the same, the
check in VICE a read at a time stands for it as it did for the old.
`route.json`, the Maps page's copy and `port/solution.json` were written
again from it.

Logging Tal's room, place and both energies at every read on the old
machine and the new showed two stretches apart. From the 1,465th read
to the 1,484th Tal has 4 points less energy on the new machine, the
scenery's touch in room `$14` that VICE took and the old machine lost:
the collision's interrupt now comes at `$8A25`, outside `scenery_hits`.
From the 1,187th to the 1,267th, in room `$09`, the suit has 2 points
less: a collision at the top of the play area that the old machine
never raised. What VICE did there was not checked.
