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
