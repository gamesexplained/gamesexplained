# Chuckie Egg 2 — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## The run of 22 and 23 November 2026

One agent, claude-opus-5-5, in a cloud session on the contributor's fork
(JonathanWacks/gamesexplained), working to Silver. The image is a
one-file whole-memory program (MD5 `feba9b149adc49799ba1f58201ef344a`).

### Orient and media

Autostarting the program let an interrupt fire into `$033C` part-way
through the load and the machine crashed. Injecting the file into memory
(`inject()`) and starting it at its entry point worked, and every
snapshot since comes from that route. `work/entry.vsf` is the hand-over
snapshot, and the listing is built from it, so data the game fills at run
time (the screen, the property map, the pick-up cells of the character
set) appears as the file left it.

### Sweep and coverage

Seeding the disassembler from the code map turned typed strings back into
code. The fix was a tracer of my own (a script kept outside the repository,
not committed) that follows the code, steps over the text after each
`JSR $ED40` (print_inline, which prints the bytes after the call), and
types each string exactly, including its terminating zero. Three call
sites of print_inline looked doubtful; they turned out to be a run-time
buffer and dead code.

A shell chain stopped silently once (`grep -c` returned 1 and ended the
chain), so one annotation batch was never written; it was redone. The
annotation went in batches `a1`-`a9` and `b_*` under `work/ann/`.

Coverage reached 100 % with exclusions for the screen, the run-time
tables and VICE's power-on fill. During the minisite work the tune test
showed that the exclusion `$1000-$11FF` hid the interrupt and tune code
at `$1100`-`$11F7`; it was narrowed to `$1000-$10FF` and the tune data
typed (`b_fix7`). A check of every exclusion against the traced code and
the user labels then found nothing else inside one.

### Verify

The checker the contributor wanted needed usage credits the account did
not have, so the sample ran on claude-opus-5-5 with a fresh context: 70
comments drawn with seed 20261122, 18 wrong (25.7 %), all 18 corrected.
Searching the listing for each wrong belief found five more comments
saying the same, corrected with them: the landing mask is `$2D`; the
delays are 255 × 20; the animation header is six bytes; the list at
`$1E00` has no reader; three creature flags were the wrong way round;
the lift stops were swapped, and the lifts in rooms `$22` and `$68` go
down while Harry rides; sfx_init clears only `$D400`; `$0314` points at
`$1105`; the pick-up pictures store height before width; and the "Back
in X" comments named the wrong routine.

The contributor's report of the green ladder sinking was tested in
rooms 1, 109 and 118 and not reproduced: it stays open, in `features.md`
and on Discoveries.

### Minisite

The room viewer is a port of draw_room (`$4000`), held to the game's
code for all 120 rooms by `test_rooms.js`. Its first versions differed
from the game in colour handling (commands 7, 8 and 9 do not shift their
colour byte) and in the pick-up copy (an 8-bit wrap, and the colour comes
through `$57B6`). The tune player runs play_tune (`$1140`) on the kit's
6502; its frames first drifted against the game's cycles and were put on
a fixed grid, and `test_music.js` matches every SID write to the cycle.

The jump widget's caption showed 21 steps where the listing said 22. The
code adds 1 to the counter before comparing it with 22, so only 21
entries of the table are read; the comments at `$50ED` and `$55AE` were
corrected (`b_fix8`).

The source fragment names `tcar`, `lives`, `work1` and `work2`, which
had kept automatic names; they were renamed (`b_fix9`). `tcar` (`$E3`)
is the number the vat code works on, separate from the carried item at
`$B2`.

The session paused overnight and the disassembler stopped; restarting it
through `tools.py r2000` rebuilt the project from `symbols.json`, and an
export afterwards differed from the one before only by the four renames.

The browser check (`pages-browser.js`) needed three fixes of its own:
canvases scrolled into view before reading, `textContent` for captions
that wrap or sit off screen, and console errors only from the site
itself, since fonts and analytics are unreachable in a sandbox.

### Reader review

A reader on claude-opus-5-5, in a fresh context, read the four tabs at
1100 and 380 pixels against `facts.md`, `features.md` and the leads list.
Its sharpest finding was that the Discoveries page called a toy part in
the wrong vat "lost" without saying what that does to the game. Tracing
it showed that only `game_state_init` brings a used part back, and it
runs only for a new game or after an egg is delivered; dropping a part
into the milk vat in VICE left every counter at 8. That egg cannot be
finished, which is now the centre of Discoveries §03. `features.md` had
said the opposite (that toy parts count as their own kind in any vat)
and was corrected.

The other fixes: a save rule stated two ways on two pages, test reports
on Discoveries, the ladder section rewritten as the drop rule and the
measured gap, the leftovers drawn and compared, fall heights given, the
missing extra lives and creature rules added, and numbers on the map.
Colouring and animating the sprites, a player for the footsteps and a
marker on the power switch were left for curation. Each finding and its
outcome is in `work/reports/review-settled.md`.

### The green ladder, from the contributor's save (23 November 2026)

My drops of the ladder had all worked, and the contributor sent a save
made in room 118 where it failed. VICE 4.0 refused to load it: it came
from an older VICE (snapshot format 1.1, the `x64` machine, not
`x64sc`). The kit's snapshot reader still read its RAM, and the VIC-II
module gave sprite 0's position, so the moment was rebuilt: a running
game stopped at the main loop, the save's RAM copied in, and the game's
own restart (`$5085`) used to put Harry at x 224, y 197 in room 118 with
the ladder given back afterwards. The drop key did nothing at first,
because the contributor had redefined take/drop as RETURN (the key table
at `$8890` is in the save).

The drop then sank the ladder to rows 19-23. Stopping inside `drop_item`
showed it measuring the ladder as 2 rows: it reads the shape table
through `(work1),y` with only `work2` set, and `work1` was `$27` in the
save but 0 in all my earlier tests. Patching `$73A9` to a direct
`LDA $8500,Y` fixed it, and Harry then climbed out of the basement. Other
items are misjudged too (a milk bag sank one row; a toy part could not be
dropped). The listing has the finding at `drop_size`, and Discoveries §06
now explains the bug and the fix in place of the open question.
