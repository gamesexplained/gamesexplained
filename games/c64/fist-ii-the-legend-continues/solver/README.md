# Fist II: towards a solution — handoff

This folder holds the work on a route through Fist II's Adventure: a
search over the game's own tables, and scripts that drive the joystick in
the emulator to test the search's routes. It is not published: the site
build copies only the pages, `listing.json`, `symbols.json` and
`reference/`. The game facts it relies on are in `../facts.md`, "Towards
a solution"; this file is how to pick the work up.

## The world map

`maplayout.py` places every room for the map on the Maps and solution
tab and prints the layout; `levels.html` carries a copy as `LAYOUT`.
Run it again if the rules change, and paste the output over the old one.

## The crevice (found 1 October 2026, later session)

The blocker below is solved on paper: room 43's exit at 88 arrives in
room 79 at column 0, left of the drop at 18, and with scroll 6 delivered
the drop narrows to 18-24, which a somersault crosses. `solve.py` now
models that (area 13 with scroll 6: the type-17 drop is neither a wall
nor 11 columns wide) and reads `../listing.json` when there is no
snapshot. It plans all eight scrolls and room 122. Drive it: room 43,
up at 88, somersault from about column 15 (as from 112 over 115-121 in room 85), kick the barrier at 109,
walk off at 171. "The blocker" below is kept for the live findings.

## Where it stood (1 October 2026)

- **Delivered live, in this order: scrolls 1, 8, 2, 4, 6.** Lives 6,
  scroll flags `$0405`-`$040C` = `80 80 00 80 00 80 00 80`. These are route
  tests: fights were switched off and energy held (see "The driver").
- **Scroll 3** (room 114, map position 110): not collected. The search
  now routes to it correctly (the stairs from room 113 that arrive at
  column 92, between the walls at 77 and 117), and that route has not been
  driven.
- **Scrolls 5 and 7, chambers 72 and 74, the volcano (rooms 60-63) and the
  ending (room 122): blocked.** By the exit tables the whole region (rooms
  8, 16, 18, 30-37, 60-63, 66-67, 72, 74, 76, 88, 95-99, 107, 117-120,
  122) is entered only through room 79's exit at column 171 to room 117.
  The part of room 79 that holds that exit (between its drop at 18-28 and
  the wall at 191) is entered only from room 117. Every live attempt to
  enter room 79 from room 77 fell through to room 82. See "The blocker".

## Setting up in a new session

Snapshots do not survive a session: `work/` and `tools/` are gitignored,
and the binaries must never be committed. Rebuild them:

1. Install the tools (`kit/INSTALL.md`, `kit/c64/INSTALL.md`) and start
   the emulator: `python3 kit/scripts/tools.py vice`.
2. Put the contributor's `exploding_fist_2.d64` in `../work/`, and follow
   `../orientation.md`, "From power-on to play", to make `f2-entry.vsf`
   and `f2-play.vsf` in `../work/`. `solve.py` and `dis.py` read
   `work/f2-entry.vsf`.
3. With the game in play (the hero in the jungle, room 94), save it under
   the name the scripts use. Snapshots are loaded by name from
   `tools/vice-home/config/vice/mcp_snapshots/`:

   ```
   cd games/c64/fist-ii-the-legend-continues/solver
   python3 -c "from common import *; save('f2-play')"
   ```

   A name cannot be saved over: a second save under an existing name keeps
   the old file without an error. Use a new name each time.
4. Replay the verified legs (each takes 5-15 minutes; run them in the
   background, since a foreground shell command stops at 10 minutes):

   ```
   START=f2-play LEGFILE=legs/scroll1.json LEGS=0 sh run_legs.sh
   # then, from the snapshot that run names (f2-run-0-<time>):
   START=f2-run-0-<time> LEGFILE=legs/from-start.json LEGS="0 1 2" sh run_legs.sh
   ```

   `legs/from-start.json` holds legs for scrolls 8, 2, 4, 3, 6, 7, 5 and
   the ending, from chamber 68. Legs 0-2 are verified. Leg 3 (scroll 3)
   has wrong walk targets (130 and 105: the hero stops at the wall at
   117). Leg 4 (scroll 6) failed at room 85 before the driver learnt to
   somersault the drop there, and has since been driven only in parts.
   `legs/from-room85.json` continues from room 85 holding scroll 6:
   chamber 73 (verified), then scrolls 7, 5 and 3, which stop at the
   chute.
5. For a fresh plan: `python3 solve.py` (or with `FROM=`, see its
   docstring), then `python3 make_legs.py`, and drive
   `../work/solver/legs.json`.

## Files

| File | What it does |
|---|---|
| `common.py` | paths, the VICE connection, `load`, `save`, `keep` (energy), `no_fights` |
| `solve.py` | the search: plan and hops into `../work/solver/` |
| `make_legs.py` | hops to legs, adding the walks that touch each scroll |
| `drive.py` | drives one list of hops live; saves `f2-in<room>-<time>` at a scroll room |
| `run_legs.sh` | drives legs in turn and stops at the first that fails |
| `holes.json` | the type-11 holes per room, for the driver's somersaults |
| `legs/` | the legs driven so far (see step 4) |
| `reach.py` | rooms the model cannot reach with every scroll, and the exits into them |
| `probe.py` | walks and logs room, column, `$72`, height, exit bits, move |
| `jump.py` | walks to a column, gives one stick input, reports the landing |
| `chute77.py` | the room 77 tests, from a snapshot named `f2-in77-end` |
| `dis.py` | disassembles a range of the entry image |

## The model, and where it was wrong

A state is (room, section): the stretch of floor between two walls or
drops. The search moves through exits whose column lies in the section,
subject to the gates in `facts.md` (barriers of types 3 and 7 need scrolls
1 and 4; area 13 needs scroll 6; area 7 needs scroll 3 or the hero dies;
room 52's exit to room 80 needs scroll 2; area 5 drains the hero until
scroll 8). Each of these was wrong once and corrected from a live run:

- Walls stop the hero at column + `$0AC7`[type] from the left and
  column − `$0ABD`[type] from the right, not at one column.
- A hero arriving on a wall's column belongs to the side with exits.
- Holes (type 11) are not walls: a somersault crosses them. Arriving on a
  hole, or inside a drop, drops straight through (`land()`).
- Drops of type 17 (11 columns) are walls that cannot be crossed. Drops
  of type 16 (7 columns) are crossed by a somersault and are not walls.
- A scroll is reached only when its own map column lies in the hero's
  section, since he must touch it.
- Room 4's exit to room 84 lands the hero on room 87 (special case in
  `neighbours()`).

Known gaps: exit types 13 and 21 are modelled as plain exits, though both
also drop the hero (type 13 left of its column, type 21 everywhere left of
it). Arrival columns are taken from the table, but the game offsets them
(see the leads below).

## The driver

- **Fights off.** `no_fights()` sets bit 7 of every non-scroll encounter
  at `$E609`, and `keep()` holds `$0412` = `$7F` and `$0413` = 0. A chain
  of ten opponents (`$0472`) does not end when the opponent's energy is
  poked to 0, which is why encounters are switched off rather than won.
  A real playthrough has to win those fights.
- **Stick per exit type** (facing right; `ACT` in `drive.py`): down for
  types 1, 9, 15; up for 2, 4, 10, 14, 20; up and right for 3, 5, 19;
  right for 18; left for 12. When the first try fails the driver cycles
  through the other directions and records what worked.
- **Somersault.** Walk to the take-off column holding the stick, release
  for 0.2 s, then up and back (up and left when walking right) for 0.3 s.
  Take off 4 columns before a type-11 hole; for the drop at 115-121 in
  room 85, from column 112 (lands at 122). It covers about ten columns.
- **Barriers.** When the column stops changing for 12 polls the driver
  kicks (fire with a direction, three heights). Type-1 barriers break this
  way; 2-byte walls never do.
- **Scrolls.** Walk-only hops pass over the scroll. Live walk targets:
  room 102: 190, then 150; room 44: 195, then 170 (picked up at 178); room
  84: from the right, 144, then 124. It shows when `$72` + 0 (walking left)
  or + 41 (walking right) equals its map position, and is picked up on
  sprite contact (`$2C25`).

## The blocker: rooms 77, 79 and 82

Room 77's exits: type 13 at 38 to room 78, type 15 at 92 to room 0, type
20 at 222 to room 79 (arrival 21), type 17 at 233 to room 79 (arrival 21).
Room 79's: type 19 at 3 to room 43, type 17 at 18 to room 82 (arrival 21),
type 18 at 171 to room 117. A type-7 barrier lies at 109 (breakable with
scroll 4).

Seen live, 1 October 2026, from a snapshot in room 77 at column 199 with
scrolls 1, 2, 4, 6, 8 delivered:

- Walking right past columns 220-223 starts move `$24`: the hero slides
  right whatever the stick says (holding left included) to 236, falls
  (move `$22`) in the drop at 233, and lands in room 79 at column 21. That
  is inside room 79's drop, so he falls on into room 82 at column 21.
  Standing, ducking and every stick direction at column 221 give the same.
- In room 77 the stick up, up with a direction and fire with a direction
  do nothing (move stays `$0C`). Only walking and ducking (down, move
  `$0F`) respond, so no somersault can carry him over 220-224.
- `$92` is the hero's height (78 = `$4E` standing; it runs 38 to 88 in a
  fall), not his screen column. A drop takes him only when `$92` = `$4E`
  (`$371D`).

From `scan_room_exits` (`$0576`): a type-17 exit sets exit bit 2 when the
hero's column is in [column, column + 10]. In area 13 (room 79) it first
sets `$0492` = 5 and `$0491` = `$0A`, which blinks the scroll-6 icon. Then, with scroll 6 delivered, it
narrows the test to [column, column + 6] (`$067B`); without scroll 6 it
drops at once. Either way column 21 is inside.

Leads, roughly in order of cost:

1. **Where a fall lands.** The new map position comes from `$0796`-`$07CA`
   (`$0469` = exit column − `$72`; `$0481` = arrival, less 3 when `$1E`
   is set; then `$0469` = `$0481` − `$0469`). Read how `$E5` is set after
   move `$22`, and whether entering room 77's drop further right (it
   spans 233-243) would land beyond 24 in room 79, past the drop's reach
   with scroll 6. The slide entered it at 233 to 236 and landed at 21
   every time.
2. **The scroll-6 hint.** `$0491`/`$0492` are not a fight: `blink_icons`
   (`$2D57`) blinks scroll icon `$0492` while `$0491` counts down. Room
   79's drop sets icon 5 (scroll 6) for 10 blinks, so the game points the
   player at scroll 6 there, and with scroll 6 delivered the drop narrows
   to columns 18-24 (`$067B`). The live tests had scroll 6 delivered and
   landed at 21. Find an arrival column of 25 or more (lead 1), or a way
   to stop the fall before the hero's height reaches `$4E`.
3. **Move 2.** `$36A6` skips the exit actions when the move is 2. Find
   which input gives move 2 (`$8D`), and whether holding it through
   columns 220-224 avoids the slide.
4. **Room 97.** Its type-21 exit at 30 drops the hero into room 77 at
   column 237, which is inside room 77's drop. That is a way out of the
   region, not a way in, but it shows the chute is meant to be fallen
   through.
5. **Check the far side on its own.** Poke the hero into room 117 (room
   `$046B`, and the position) with scrolls 1-4, 6 and 8 set, and drive
   scrolls 7 and 5 and the ending. That would test the rest of the route,
   but it is not a solution and has to be labelled so.
6. **A walkthrough.** The contributor gave a GameFAQs guide
   (gamefaqs.gamespot.com/c64/571009-fist-the-legend-continues/faqs/48570)
   and a video (youtube.com/watch?v=v4YRJ155z7w). This session's network
   refused both; a search summary gave only "jump across the hole". The
   guide's account of rooms 77 to 79, or of the 117-118 rooms, would
   settle it.

## Snapshots from the 1 October session

Gone with that session's container, listed so the names in logs make
sense: `f2-leg1-done3` (scroll 1 delivered, room 3), `f2-in44-*`,
`f2-in84-*`, `f2-in85-end` (room 85 at column 30, scrolls 1, 2, 4, 8
delivered and 6 carried), `f2-in77-end` (room 77 at column 199, scrolls
1, 2, 4, 6, 8 delivered), `f2-run-*` (the end of each leg).
