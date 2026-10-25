# Pool of Radiance — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## The image and the parts

archive.org has two sets of eight D64 images. The version 1.1 set is a
crack (its credits end "RIPPED BY S.C.I." and its code-word check is
changed), so the run used version 1.0, and compared the two only to be
sure. The game is a resident engine and a dozen modules the linker
loads to `$0800` one at a time, so it was split into 13 parts
(`kit/skills/core/15-parts`): the resident engine, the modules, the view
code under the I/O area and the tables part. Each part has its own
snapshot taken where the module is running.

## Annotation

Every part was annotated in regenerator2000 to 100 %. Two things cost
time:

- After a restart, the disassembler rebuilds its project from
  `symbols.json` and the part's snapshot. In the icons part, a table of
  address pairs and the bytes after it at `$4196`-`$41EF` came back as
  code with stray labels, and coverage dropped until the typing was
  applied again from a saved file of commands.
- Restarting the disassembler on a part's `entry.vsf`, a different
  snapshot from the one its listing was built from, and exporting, wrote
  a `symbols.json` with symbols and coverage missing. It was restored from
  git, and from then on comment fixes were patched straight into
  `symbols.json` and the listing rebuilt with `listing.py` on the
  listing's own snapshot (`listing.json`, `snapshot.file`).

## Wrong turns

- Ten comments said the music and the game run from a raster interrupt
  at 50 a second, which is the PAL frame rate. The code never sets a
  raster interrupt for that: the game keeps the KERNAL's interrupt from
  CIA 1's timer, 60 a second. Counting the handler's calls live over 250
  frames found 300, and the comments were corrected. The page's music
  player runs the driver at that rate (`facts.md`, "Live tests").
- The sample found the sound driver's fields described as all belonging
  to the three streams. Some belong to the voices. The same belief was
  in 15 more comments, and all 18 were corrected.
- The script decoder on the How it works page was held to the game's own
  `get_operand` (dungeon `$1663`). That showed ADD NPC reads one more
  operand than `operand_counts` (`$1625`) gives, where the comment named
  only SETUP MONSTER and ENCOUNTER MENU.
- Writing the city-watch section showed the camp's interruption roll is
  roll_die's 1 to 100 less one, compared under the chance; the comment
  at camp `$1E0F` and the camp's facts said 1 to 100.

## Live tests

All of them are in `facts.md`, "Live tests": two wrong code words, a
lost battle, resting in New Phlan and in the slums, ORDER and the timed
effects, the interrupt's rate and the processor port's banks. Snapshots
were set up for each from the module's own entry (`work/entry_*.vsf`)
and the state needed was poked in.

## The pages

- How it works runs the game's own sound driver for the title tune and
  the eleven effects, and its own code for the ability roll and the
  to-hit rule, on the kit's 6502. The play screen is one frame recorded
  with `kit/c64/frame.py`; all 104,448 pixels match the emulator.
- Discoveries keeps to findings that were tested live or run on the
  game's own code. Left out for now, because what a player would see was
  not settled: the long-shot penalty in combat-set `range_penalty`
  (`$695D`) is added with the wrong sign, but `missile_leg` sets the
  range it reads to 128 before a shot; com-prep stores the monsters'
  start squares by X (`$15C2`); POOL adds a carry when a coin kind
  reaches 65,535 (post-com `$1AB7`); SHARE loses one coin when nobody has
  room (post-com `$21CD`); the camp's spell headings call level 4
  "7TH LEVEL" (camp `$2AC1`); and the one-sided walls in 16 maps. Each is
  in `TODO.md`.
- Maps draws all 29 GEO files from the disks with the How it works
  page's renderer; a wall present on one side only is drawn like any
  other.
