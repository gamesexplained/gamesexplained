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

## Follow-up: the Graphics tab (3 November 2026)

Added `graphics.html`. Its sheets show every weapon and head the combat
icon editor offers, 100 choices in both poses, each laid out by the
editor's own lines (`save_head`, then `pick_piece` from `$B14C` to
`$B1F2`) on the kit's 6502 over the icons part, starting from the
editor's own icon with the size's first weapon and first head. The
cells are drawn on the battle's colours from `combat_colours`
(com-prep `$146A`: dark grey, light red, black), which the editor sets
too (icons `$AF77`-`$AF8B`). The cursor is built by running com-prep's
`set_sprites` with the resident's banking routines stood in for. Only
missile pictures 0 to 3 are in the combat-set listing; the other
sixteen lie under SPELLN00 there. The monsters' figures (COMPIC files)
and the 3D view's sprites are in no part, so the page does not draw
them.

## Follow-up: the Bestiary tab (8 November 2026)

Aaron asked for a tab like a bestiary: every monster's pictures with its
stats. Added `bestiary.html`, its data written by
`scripts/bestiary_data.py` from the eight sides' files (extracted into
`work/files/` with `kit/c64/disk.py extract`).

- The four kinds of file were decoded first: MON (the record), COMPIC
  (the battle figure), PIC (the close-up, ANIMATE00's format; the
  driver was disassembled from its file, which is in no part, and the
  decoder written from it) and SPRITE (the 3D view, placed as
  `draw_monster_sprites` places them).
- Tying a record to its pictures went through the scripts. A flat
  decode of an ECL file stops at its tables, so the generator follows
  GOTO, GOSUB and ON GOTO/GOSUB from the five entries, and resolves an
  operand through SAVE, GET TABLE and RANDOM. The LOAD MONSTER operand
  gives the figure directly. The close-up and sprites come from the
  SETUP MONSTER or ENCOUNTER MENU before the load, which can belong to
  another monster: a first rule taking any number a version was loaded
  with gave the ORC's picture to the GOBLIN GUARD, HOBGOBLIN and OGRE,
  and a fallback to the same-numbered file on the side gave the KOBOLD
  LEADER the treasure chest and the 4TH LVL FIGHTER a picture of the
  docks. The rule kept: a number of the monster's own (its file's, its
  most used figure's, another version's file's) shown by an encounter
  that loads it, or, for a race-0 monster, a PICTURE of its file's
  number in a script that loads it (TYRANITHRAXUS). Every entry was
  checked by eye on a contact sheet.
- The battle numbers are run, not read: `porBattle` calls
  `strength_index` and `compute_combat_stats` on the kit's 6502, and
  `test_bestiary.js` holds it to com-prep's own lines from `$1630`.
  A first guess that monsters skip the weapon step was wrong:
  `compute_combat_stats` skips it only for a negative `$6DB1`, and a
  monster's slot is 8 to 11. Zeroing the dexterity table in a mutation
  run changed only the side-5 HILL GIANT, which has dexterity 0 (in
  `TODO.md`).

## Follow-up: the area scripts on the Maps, Solution and Discoveries tabs (8 November 2026)

Aaron asked what the maps hide: traps, scripts, treasure, secrets,
Easter eggs and bugs, and for a solution with the main quest and the
shortest way through. The 31 scripts on the eight disk sides were
decoded with the How it works page's decoder (`areas/ecl.py`, held to
`get_operand` and `operand_counts` earlier) and read area by area.

`areas/events.py` ties each script event to its squares. It runs a
script's square entry in a small interpreter for every square, with
Search on and off, every facing and three rolls of the dice, and takes
the texts, menus, fights, treasure, damage, passwords and exits along
the path. What made it hard, in the order it came up:

- GET TABLE takes the operand's own address as the table's start, not
  the byte stored there.
- Area-wide events (a welcome, a random encounter) answer before the
  square's own event, so the runs take their flags from the welcome's
  fall-through path only; taking them from the whole walk switched
  every event off.
- Code that two or more events reach (a secret door's check, the
  random fights) is left out of each event, so a square shows its own
  event and not the area's common stock.
- The castle's four maps are shared by four scripts that load a map by
  the party's facing; ECL03, ECL05 and ECL06 each draw on more than one
  of them, so the Maps tab shows a map with each script that runs it.

`areas/highlights.py` names 52 squares worth reading, each found by a
piece of the script's own text so that it cannot point at a square the
extraction does not show.

Corrections made while writing the pages, each from a second reading of
the script: the scripts never call the two-wide runes elvish (only the
pyramid's sign names its runes, dwarvish); the kitchen slave's and
Cadorna's slips carry only the gate password; the coffin can be
sanctified only before the vampire's fight in the pit; the pale form in
Sokal Keep comes back after a wrong word, because the word is kept in
the area's own flags; and the Discoveries text first had the barracks
giants boasting they could read, where they dare the party to.

The new findings are traced, not watched live; `TODO.md` lists them.
