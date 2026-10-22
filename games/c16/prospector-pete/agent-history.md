# Prospector Pete — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 19 October 2026: the first C16 game through the kit

The contributor named the TOSEC set for the C16 on archive.org, Silver,
and a yes to everything START.md asks. The tape is a raw TOSEC file with
Novaload; the kit's plus4emu server loaded it with `LOAD` in about 80
seconds. A checkpoint at `$1800` caught the hand-over. Saving there with
the tape in carries the whole tape log, so the tape was ejected at the
stop first; the save said it was not exact, and loading it back gave the
same registers, cycles and RAM (now in `tool-plus4emu`). A second boot
script stopped at the wrong place because the first boot's checkpoint
was still set: the server keeps checkpoints across a `reset` as well as
a `load`.

The game is one block, `$1000`-`$3FFE`, and never calls the KERNAL, so
orientation was short. The C16 kit had no script for the code map, which
`check_listing.py` needs; `kit/c16/codemap.py` was written for it, from
the server's record of what ran, folding the 16 KB's repeats. Annotation
reached 100 % of 10,395 bytes in one agent. Reference pictures found on
the web (the inlay and Plus/4 World's Hall of Fame shots) were read for
`features.md` and not committed; the pages use the run's own
screenshots.

The verify sample of 60 found 5 comments wrong in a detail, all
corrected with the other comments that repeated them. Most live tests
were short pokes from the title snapshot (see `facts.md`).

The freeze came from reading `move_creatures` for what ends its search
when every way is shut: nothing does. Making it happen live took four
levels: on levels 1, 5 and 14 the creature came out with the bottom
cell still exploding or already water. On level 6 the stick's debris,
the broken floor and the earth boxed the first creature in at frame 300,
and `main_loop` never ran again.

The pages run the game's own routines on the site's 6502
(`reference/pete.js`). `work/trace/record.py` recorded the emulator's
timer readings, with the address of each reading instruction, and the
memory after each frame; `work/trace/test_trace.js` replays them. Three
differences came out. Level 16 built a different mine from the 102nd
reading on: the room check for row 21 reads row 23, which is `$4000`,
the zero page on a C16; copying the zero page there before each check
fixed it (#435 asks for the 6502 to do it). The play traces were a frame
out: the first frame after `start_level` returns has no main-loop pass
and no top interrupt line. And the explosion's sparkle masked its last
row with a byte of the next character, which the game fills from the
timers instead. The frame section's picture matched
plus4emu's at every pixel once it was drawn in `irq_play`'s three
bands.

On the pages, the title's verdict first came out empty: the code had to
start at `$3009`, where X and Y are set for a score of 0, and the
message's pointer is the `$01` before it. A formula for the earth's
tiling was wrong and was replaced by `start_level`'s own pattern,
checked against a built level.

## Typed data no label reached (22 October 2026)

#455 made the ledger count typed data that no label reaches, and the
listing then left out 3 bytes (#481): `$2970`-`$2972`, the first three
entries of the table beside. Its base label, `earth_beside_base`, is on
the `RTS` at `$296F`, in a code block, so its span stopped there. A
line comment at `$2970` now describes them. The route in
`orientation.md`, run again from the same tape, gave a hand-over
snapshot with the same SHA-256 as the first run's, so the listing's
bytes are unchanged.

