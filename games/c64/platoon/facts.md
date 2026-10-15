# Platoon — verified technical facts

What is true of the game as a whole: how its parts follow one another, and what they share.
Each part's own facts are in `parts/<id>/facts.md`, where one exists; the rest are in each
part's listing.

## The four programs

| Part | File | Section | How it ends |
|---|---|---|---|
| load1 | OVL1, side 1 | the jungle and the village | the trapdoor, with the torch and the map, loads LAY2 (load1 `$B09F`, `$3D74`) |
| load2 | O1, side 2 | the jungle and the village, a second copy | as load1 |
| load3 | O2, side 2 | the tunnels, then the dugout | dawn in the dugout loads LAY3 (load3 `$1BD2`, `$C3F6`) |
| load4 | O3, side 2 | the jungle maze and Barnes's bunker | every ending loads LAY1, which loads O1 (load4 `$C06A`, `$C111`, `$3DC2`) |

Each program fills memory from `$0400` and nothing is carried between them.

## What every part shares

- A copy of the same music driver at `$E000`: `sid_init` `$E0DE`, `start_tune` with Y = 0, 10
  or 20 (`$E20F` in loads 1 and 2, `$E222` in loads 3 and 4), and `play_music` once a frame
  (`$E395`, `$E3A8`). Three tunes in each part. `test_music.js` runs all nine against the
  page's port for 3,000 frames each.
- M turns the music on and O turns it off, handing the voices to the sound effects (load1
  `$08A5`, load3 `$26D0`, load4 `$1DE9`).

## The listing's error rate

Sample 1: seed 41015, 60 comments drawn from the 3,172 comments of all four listings, checked
by one checker on claude-opus-5-5[1m]. 15 of the 60 were wrong in a detail or outright: a pause
flag read as a frame wait (load4 `$056F`), a sound tick read as a tune start (load4 `$C016`),
timer operands read as appearance delays (load3 `$22AA`), sprite positions given the wrong axis
(load4 `$0F19`), a CIA mask said to stay off (`$0400`), and smaller slips in counts and
targets. All 15 were corrected, with the other comments that said the same (the load2 copies
and load4's sprite table `$0F16`-`$0F24`). At 15 in 60 the 95 % interval for the rate is about
15 % to 37 %, a lower bound since a checker misses some. An audit is recommended.

## Live tests

- 7 October 2026, load1: holding Z, A, C, H and 1 changed `$2BC8` from `$EA` to `$60`
  (`parts/load1/facts.md`).
- 15 October 2026: `test_music.js`, every SID write of nine tunes over 3,000 frames, port
  against the driver on `kit/c64/cpu6502.js`: no difference.
