# Speedball — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## Setting up (30 October 2026)

The tools went in as `kit/c64/INSTALL.md` says for a cloud container:
the vice-mcp v3.14.0 release passed all 57 of `check-emulator`'s checks
once the nine libraries the container lacked were unpacked into
`tools/vice-libs` with `apt-get download` and `dpkg-deb -x`. The
disassembler did not compile at first: a plain `cargo install` of
regenerator2000 0.9.20 took `regenerator2000-core` 0.9.21, and `main.rs`
failed with E0308. `cargo install --locked` built it; the install notes
now say so.

The image is the C64 Preservation Project's Mirrorsoft PAL G64, one load
with no overlays (`orientation.md`). The hand-over at `$2000` was saved
as `entry.vsf`. Compared with the play snapshot, it holds the play
sprites at `$F300`-`$FEFF`, where a match builds the pitch map, so that
range is described as runtime in `game.json`'s coverage exclusions and
the sprites are listed at `$5C00`, where the game copies them.

## Reading the code

The menus are drawn into a bitmap, so the string sweep found nothing
until the text format was decoded: packed nybbles into an alphabet of
the game's own (`30-text`). The copy protection showed up in the
interrupt handler as a run of bytes the listing decoded as data: a
`LAX` and an undocumented `ANC #imm` reading CIA 2's timer B through a
mirror address. ANC was added to `kit/cpu/m6502.py`'s undocumented
opcodes, and the timer checks were then found in three places.

Comments that were wrong in the first draft and corrected before the
sample: `knockout_init`'s order of templates; the slot order at `$2293`
(the save file's digit is league 0, knockout 1, two player 2, which an
earlier note had the other way round); the tackle figure described as
"the lower the better" for the side that has it, when the slide test
makes it work against that side; `tile_choose`'s odds; and `music_on`
(`$53`), which nothing sets.

A fresh agent sampled 60 of the 1,273 comments and marked 11 wrong
(seed 20261030): mostly graphics pointers named by what they point at
rather than what they hold, and stamina effects put in the wrong
routine. All were corrected, with three others that said the same
things (`facts.md`, "The listing's error rate").

## The pages

The sound effects were silent on the page at first: `music_stop` leaves
the volume at 0, and only the launcher's sound at kick-off sets it again.
The effects player now runs the launcher's start and stop before each
effect, as a match does.

Two counts were wrong in `facts.md`, `features.md` and the Discoveries
draft until the pages' tests ran the game's routines:

- The tackle pairs. Reading the tables, I took `pair_distances` to write
  each distance through the right cell list at `$F29D` and only
  `tackles_check` to read through `$F290`, 13 bytes early, and counted
  34 of 45 pairs tested on another pair's distance. The first widget
  worked the count out from the same tables and agreed. In fact both
  routines go through `$F290`, so pairs 13 to 44 write and read the same
  cell and work, and only the 13 pairs that share four cells of row 0
  with pairs 0 to 3 fail. `test_rules.js` placed each pair touching and
  ran both routines; the widget now does the same.
- The knockout. A sample of seeds had given "nine or ten rounds of ten"
  wrong on the page and "agree in at most one round" in `facts.md`. Over
  1,772 seeds the named and the played templates agree in no round for
  half the seeds and in exactly two for the rest.

There is no Levels tab: the game has one arena, and its ten layouts of
bounce domes are drawn on How it works. There is no Play tab.
