# Power Drift — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 30 October 2026: the Silver run

**Tools.** The vice-mcp release v3.14.0 needed nine libraries the cloud
container lacked; `apt-get download` found them only after an
`apt-get update`, and they were unpacked into `tools/vice-libs` as
`kit/c64/INSTALL.md` says. `check-emulator` passed 57 of 57. The
disassembler did not compile at first: `cargo install regenerator2000
--version 0.9.20` took `regenerator2000-tui` 0.9.21, and `main.rs` failed
with a type mismatch. `cargo install --locked` built it from the crate's
own lock file, and the kit's install notes now say so.

**Images.** The C64 Preservation Project has two PAL originals. The
Rapidlok one hung at `$A005` on a blank blue screen and was not looked at
further. The Securispeed one boots in about a minute: a fast loader at
`$0334` reads six blocks, shows the title picture with code it later
overwrites, and jumps to `$0834`. A snapshot at that jump (`entry.vsf`)
holds the whole game, which fills all 64 KB and never loads again.

**Code map.** The first play session recorded nothing. A stopping
checkpoint left at `$0834` by the script that found the hand-over made
`codemap.py` refuse `zap` and `dump`, and my wrapper threw its error
output away, so the session looked fine. Cleared checkpoints and a
wrapper that prints errors fixed it. The first dump then left out 759
instructions, the sound driver at `$B800` in the RAM under BASIC, and
said so; `dump --under-rom` put them in. Seeding the disassembler from
the first instruction of each run left code after every `RTI` and
indirect jump untyped, and `work/seed.py` went round the starts until
every one was inside a code block.

**Text.** The game draws text in its own alphabet: digits 0 to 9 at
characters `$00`-`$09`, letters from `$0A`, with the letter O sharing the
zero's shape. `work/pdtext.py` decodes it, and the string sweep found the
select screen's lines, the panel's words and the copyright line.

**Annotation.** In address order, in files `work/ann1.txt` to
`work/ann14.txt` applied with `r2000.py --apply`, and scripts for the
tables (`gen_ann9.py`). Early guesses that the code later overturned:
`s_1A40` looked like the start lights and sets the kart's steering frame;
`s_3A37` looked like part of the sky and places the rivals; the routine
after a stage won was read as changing a face and flashes the place
number; `s_BF17` was read as playing the finish and ends the effect that
is playing; the high-score tables have nine slots, of which seven are
shown; the twelve records the multiplexer reads are sprite records, not
karts. The horizon pictures were named upper and lower the wrong way
round from the first reading of the course records, and the names
spread into labels and comments until the sample caught them.

**The time bonus.** The first reading took the bonus count as decimal,
paying the number shown in thousands. Running `show_bonus` and
`count_bonus` on the kit's 6502 showed a binary count: `draw_score`, which
the count calls, ends with `CLD`. A live test agreed: with the seconds
poked to 20, the bonus showed 25, counted 37 times through 1F to 1A and
0F to 0A, and paid 37,000. `count_bonus`'s own comment still said a bonus
of 0 counted 100 times until the retrospective found it.

**The clock.** Counting race frames with a checkpoint on
`race_frame_loop` over 500 video frames, in several runs, showed a race frame of
about three video frames and a clock second of 12 race frames, so the
clock runs about 40 % fast.

**The stick.** After a snapshot load, setting the stick to the value it
had before the load did nothing; releasing it first and then setting it
worked every time.

**Verify.** One sample of 60 comments, seed 20261030, with 20 drawn from
the 103 that scripts wrote. The checker marked seven wrong and all seven
held against the code: the select screen's first cursor move, the order
of the kart sprites' copy, the scenery lists' last sentence for stages B3
and E1 (a bug in the generator, fixed and run again for all 25), the
jump path in `move_player`, the horizon pictures' upper and lower, the
sprites shared by drivers' heads, and the band a sprite pointer is
written for. Every comment that shared one of those beliefs was corrected
with it.

**Minisite.** Two frames recorded with `frame.py` (flat road and raised
track) match the emulator pixel for pixel. The scenery, rival and horizon
viewers draw from the game's tables. The sound player runs the game's
own driver, with a button for each tune and effect, and
`test_music.js` holds it against the driver run the way the game runs
it. The bonus widget is a port, and `test_bonus.js` holds it against
`show_bonus` and `count_bonus` for every second and three minute values.

**Retrospective.** Exporting the symbols showed nothing wrong, but a
search of the comments found 25 that named routines by automatic names
they had lost when renamed (`s_10B4` for `show_bonus`). They were
rewritten, and `symbols_export.py` now prints such names after each
export. One of them, the race frame loop's, still called `place_rivals`
part of the sky.

## 31 October 2026: the course drive and the page order

The contributor asked for the sound effects to sit higher on How it works,
the note in front of the first instruction to open Discoveries, and a way to
drive a course on Maps / levels. The effects section moved to follow the
music, and the text section to the top of Discoveries.

**The drive.** The levels page runs the game's own `setup_stage` and the
drawing half of `race_frame_loop` on the site's 6502, from the listing's
bytes, with `move_player` replaced by a speed level and the kart held in
the middle of the road (`$2F` = `$E0`, found by drawing a few values). The
first picture drawn from the listing's snapshot had the road in hires
stripes: the colour buffer was 0, because the snapshot is taken at the
game's entry, before any screen has run `clear_text_screen`, which leaves
it at 8. Below speed level 10 the first jump calls `drop_kart_back`, which
waits on the frame counter, so the slider stops at 10. `test_course.js`
runs the game's own `stage_loop` and `race_frame_loop` beside the page,
with stand-ins only for `wait_frame` and `move_player`, and compares the
two view screens, the character set, colour RAM and the sky and ground
bytes after every frame of a lap of all 25 stages; dropping `bend_drift`
from the page fails it at frame 146 of A1. The sky and ground's change of
colour comes from timer A, 256 × `$24` + 204 cycles into the frame, within
5 cycles on four recorded frames.
