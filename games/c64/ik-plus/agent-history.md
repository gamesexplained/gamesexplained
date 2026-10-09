# IK+ — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 9 October 2026, one cloud session, one agent (and one checker)

**Boot.** The G64 from the C64 Preservation Project boots in VICE only
about one time in seven: the track-41 check reads a track with no sync
mark, so it passes or fails by where the head lands. `work/scripts/try_boot.py`
loops boots until one passes; `protection-passed.vsf` replays the rest
of the load without the lottery.

**Which image.** The hand-over (`entry.vsf`, at `$0840`) holds the code
as loaded, but the file `p` keeps the frame interrupt's page at `$3C00`
and `game_init` swaps it into `$0C00` before anything runs from it, so
a disassembly of the hand-over shows each of the two pages at the
other's address. The analysis moved to `start.vsf`, the hand-over run
on to just after the swap; the disassembler was restarted on it and the
annotations made so far were applied again by address (the old project's
log is `work/annotations-entry-old.jsonl`).

**What the first reset does.** `decrypt_once` moves code, blanks the
old place and decrypts the pose layouts. Early notes said this happened
"when the first game starts"; `demo.vsf` showed it had already happened
in the attract mode, and the code agreed (`$FD50` = `$81` from
`game_init`). Corrected in the notes and in `facts.md`.

**Claims corrected before they reached the page.** Reading the code a
second time, or running it, overturned these first readings:
`$FD52` is the PAL flag, not an NTSC flag; the bonus round's fall moves
are `$11`/`$12`; the shield's speeds were misread; the flashing balls
come in the third, fifth and seventh bonus rounds, not from the second;
`shout_on_move` works on poses, not moves; `build_mask`'s table is read
by both reflection routines, where an early note said nothing read it;
and `sprite_reset`'s `$FF` aims the reset's clearing loop at
`$FF0C`-`$FFE8`, but no reset ever runs with it (15,000 frames of
attract mode ran none), so the "attract-mode resets" in the first notes
never happen.

**The protection's failure path.** The code reads as if a failed
stack check calls the interrupt's tail and then resets the game. Run
with `$0109` poked, it never reaches the reset: the `RTI` returns into
the stack page and the CPU jams on a `$02` at `$01C5`.

**Data the ledger could not see.** At 100 % the listing still named ten
untracked stretches. Four were the loading picture's leftovers (the same
bytes as file `p1`, `$C000` lower, including the RAM under the I/O
area). Two were the screens, which looked like loaded data the game
relied on until `clear_floor_rows` turned out to blank both floors at
every reset. Three were tables longer than a data label's reach, and
one was a routine nothing calls (`effect_stop`, `$EF88`).

**The code map's two false bytes.** `check_listing.py` failed on
`$106B`-`$106C` as code that ran. They never ran: `codemap.py` sizes
each executed instruction from the RAM at the end of the session, and
by then `decrypt_once` had copied other code over `$1052`-`$106A`, so
the CLI and RTS that ran at `$1069`/`$106A` decoded as three-byte
instructions. The two bytes are typed as code with a comment saying
why; `kit-feedback.md` has the kit's side.

**Two three-key checks.** The check that steps the reflection's drift
(`$1855`) reads three keyboard rows at once, so it is passed by a key
from each of three columns. Pressing P, O and N stepped it, and so did
R, T and X.

**The checker's sample.** One agent that wrote none of the comments
checked 80 drawn with seed 20261009 against the bytes and found seven
wrong (`facts.md`, "Listing accuracy"). Searching the listing for the
same mistakes found twelve more comments to correct. One correction was
tested before it went in: the checker read the knock-down "marks" at
`$3C11` as digits, and a live run painting each attack's points agreed.

**Half the points, painted.** With the marks known to be digits, the
painted number could be set beside the score. `work/scripts/live6.py`
to `live8.py` stop at `$307B` in `play-round1.vsf`, land each attack
and read both: attack 3 adds 800 and paints
400, attack 6 adds 200 or 400 and paints 100 or 200, the other six
agree. The screenshot is `reference/painted-200-scored-400.png`.

**The music port.** The driver at `$E000` and the effects at `$EE45`
were ported to `work/music/driver.js` and run against the game's own
code in `kit/c64/cpu6502.js`, frame by frame, comparing every SID
write. The tune alone left the effect paths unrun, so the test starts
119 effect pairs at random moments and runs seven copies of the data
with one byte changed each, to reach the note flags nothing in the tune
sets. 82,400 frames agree; the one routine never reached, `$EF88`, is
one nothing calls.

**Three tabs and four widgets.** Asked the same evening for the four
article ideas and a split into tabs, the page became Overview, Fighters
and Sound, as Wasteland's had. Porting `print_message` for the judge's
table showed that `$9A`/`$9E` double the letters' height, not their
width as the listing and `facts.md` had it, and that message `$0A` is
never shown: the demo's random pick reads entries 1 to 16 of `$11C8`,
and `$0A` is entry 0. Building the shout player showed that a sample
plays every latch plus one cycles, so the listing's 224-255 cycles on
PAL were one short. The pose viewer rebuilds each pose from its tiles
the way `$3D15` does, and matched the two sprite fighters in
`ram-play.bin` byte for byte before it went on the page.

**The second sample.** A fresh agent checked 80 more comments, drawn
from those the first sample left out: 5 wrong, each with one detail
wrong. While applying the corrections, the disassembler was started on
`start.vsf` rather than on the project, and the export that followed
wrote a symbol map of four comments; `symbols_export.py` said so, the
file was restored from git and the project rebuilt with
`symbols_import.py` before the corrections went in again.
