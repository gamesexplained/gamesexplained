# Winter Games — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 29-30 October 2026: the Silver run

One agent, unattended after the contributor's "yes to all" at the start,
from the C64 Preservation Project's two G64 images of Epyx's PAL disks.
The run took about seven hours, most of it in annotation.

**Parts.** The disk is eleven files, and the game is ten loads as the
player meets them. Comparing every load's snapshot byte for byte
(`15-parts`) showed the fast loader the same at `$0900`-`$0EFF` under all
of them, so it became the `resident` part, with the boot file and the
loader's first copy at `$C000`. The title, the opening ceremony, the menu
and five of the six event files lie over it, each event loading at
`$1000` over the menu's memory. Speed Skating loads at `$4C00`, above the menu, and leaves it in
place, so its part lies over the menu's. Figure and
Free Skating are one file entered at two addresses, so they are one part,
`skating`. Each snapshot was taken by a checkpoint on the loader's
`ldr_run_file` (`$0ADD`): stop there, read the file number in X, run to the
file's entry, save.

**The code maps.** The opening ceremony's first code map was zapped just
after its entry snapshot was loaded, and `codemap.py` ran the stopped
machine for the command, so the ceremony's start-up ran and was cleared
before anything was recorded: 3,306 bytes. Zapping in the title and
playing through the load recorded 3,638. `codemap.py zap` now says when
the machine was stopped.

**Snapshots of the same name.** Every part's hand-over is `entry.vsf`, and
vice-mcp loads a snapshot by name from one folder. `vice.snapshot_load`
refused the second part's file under a name the first had taken, which
showed itself at once; each was copied in under a name of its own.

**The shared sound engine.** Hot Dog was annotated first, and its sound
engine was carried to Biathlon, Ski Jump, Skating and Bobsled with a
script in `work/`: a fixed address shift where the copy was the same
bytes moved, and pairing by instruction shape where it was not. Speed
Skating's engine is an older form with three slots and could be paired by
neither, so it was described by hand. Two wrong comments rode along with
the carrying (`start_sound`'s limit, given as 99 where the code compares
with 100, and a label `snd_bad` that exists nowhere) and were corrected in
every copy (#552 has the case).

**Zero page.** Every event keeps its own variables in `$10`-`$8F`, where
the loader keeps others between loads, and the export dropped the events'
labels there because the resident owns those addresses. The listings then
named the events' counters after the loader's (`ldr_disk_side` 33 times in
Figure Skating's). The kit change on this branch, `"names"` rows in
`part.json`, keeps them; each event's zero-page variables were then named
and every listing rebuilt. Bobsled's session had been seeded with the
loader's comments before its rows were set, and fifteen of them came
through as Bobsled's own, at `$0023` and `$C000`-`$C54A`; the verify step
found them, and the export now leaves such comments out. The resident's
`$0000` carried a user label `start`, which named every event's
`sta $00`; it is `cpu_port_ddr` now, and #643 asks about the same label in
17 other games.

**Verify.** A sample of 60 comments, seed 20261030, went to a fresh agent
on the run's own model. It found five wrong details, 8.3 %, over the mark
of 2, and all five held against the code; the same beliefs were searched
for and corrected in `check_record` and `ready_set_go`. An audit of the
whole listing is recommended in `TODO.md`.

**Live tests.** Each discovery was played in VICE before it reached a
page. The Figure Skating wrap was found in `base_mark` and played with
the stick alone: 22 falls scored 6.0 from every judge, and 40 scored 0.0.
The Bobsled crash over the line was first shown by forcing a crash at
stretch 166 with a poke, which recorded " 02.99"; `70-minisite` asks for
the state to be reached by a player, so it was played again with the
stick alone: steered down the middle, then held into the left wall, a
crash at stretch 168 slid over the line and recorded 22.20, the clean run
22.10, and a crash at 164 came to a halt and recorded 99.99. The `S` key
was tested in Hot Dog: alone it does nothing, and with joystick 2 held
down it stops every sound.

**The pages.** Every widget runs the game's own code on the listing's
bytes: the anthem player and the events' sound engine for 34 buttons
(`test_music.js` compares every write to the sound chip, 65,631 frames),
and `base_mark` and `free_mark` for the skating calculator and the
Discoveries chart (`test_marks.js`, 23,060 cases). The Bobsled frame was
drawn by `frame.py` from one recorded frame and matched the emulator's
picture pixel for pixel but for the bottom row's letters, which come from
the character ROM. The first draft of the copy carried a handful of
claims that had not been checked (Free Skating's entry two bytes on, where
it is five; the skating tunes looping, where they play once; the KERNAL
switched off, where `$01` = `$26` keeps it in); each was checked and
corrected before the rewrite pass.

**Left out.** There is no Maps / levels tab: the game has no levels.
Each event is one course, Biathlon's 32 screens are three scenes in a
fixed order, and Bobsled's 177 stretches are drawn on the How it works
page. There is no Play tab, and no recording of play (`65-inputs`) was
made, since no step needed one. The 47 sectors on side 1 that the BAM
marks used and no file holds are open: nothing in this run read them.

## 31 October 2026: the contributor's follow-ups

The contributor asked for the loader and player-page sections to go, for
the skating calculator to become a tile for each move, animated, that adds
the move to a program, for Ski Jump's chart to show the jumper for each
band, and for a closer look at Bobsled's rumble. The skater's frames come
from running `draw_frame` on the listing for each of the 60 frames; the
white sprites, solid where the skater is not, sit in front of the
multicolour ones as a mask on the white ice. Each tile plays the
frame lists of its move's records, and `test_marks.js` checks that each
tile's records count the element, fall or awkward move its click adds.
Ski Jump's poses needed the landing slope unpacked first, by the game's
own `unpack_list`, since `draw_frame` draws over it. For the rumble, the
recorded Bobsled frame turned out to show far piece 24, and `draw_far` on
the listing matched it in every cell but the rumble's, which held `$02`
where the panorama has `$69`: the change is a black dash in the sky, not
a hidden byte.
