# Prospector Pete — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

The Mastertronic cassette of 1986 (British Software, code by Doug
Turner), from the TOSEC raw tape file named in `orientation.md`, loaded
on a 16 KB PAL Commodore 16 in plus4emu. Novaload's turbo loader reads
one block, `$1000`-`$3FFE`, and calls `$1800` (`start`). Nothing is
loaded after that: the whole game, title screen and high scores
included, is that one block. *(live)*

The game never calls the KERNAL once it has started. It takes the
interrupt through the KERNAL's vector at `$0314` (`start_level`,
`title`) and ends each interrupt with its own `RTI` (`irq_play`), and it
reads the keyboard and the joystick through TED itself (`read_controls`).
The ROMs stay paged in throughout: `$FF3E` and `$FF3F` are never written.

## Memory layout

| Thing | Where |
|---|---|
| Variables | zero page, `$02`-`$FF` cleared by `start` |
| The water list | `$0200`, three bytes a cell (address, row), deepest first (`water_fill`, `add_water`) |
| The large goodies' addresses | `$0316`, two bytes each, for `swap_face` (`place_goodies`); up to ten, over the KERNAL's vectors from BRK to GETIN, which the game never uses |
| The figures' shifted frames | `$0400`-`$06FF`: `$0400` up and down, `$0500` left, `$0600` right; Pete's at `$00`-`$7F` of each page and a creature's at `$80`-`$FF` (`build_figures`) |
| The dynamite list | `$0700`, three bytes a stick (address, frames left), `$9E` long (`dynamite`) |
| Colour memory | `$0800`-`$0BE7` |
| Screen | `$0C00`-`$0FE7`; the status line is its bottom row, `$0FC0` (`status_line_text`) |
| The character set | `$1000`-`$17FF`, 256 multicolour characters (`chr_earth` to `chr_letters`) |
| Code, tables and text | `$1800`-`$37E7` |
| The map | `$37EA`-`$3FFF`, 90 columns by 23 rows, `$5A` bytes a row (`map_surface`) |

The map's first three rows are the surface, loaded with the game and the
same on every level; the other twenty, from `$38F8`, are filled again by
`start_level` for every level and every life.

## Timing

A PAL frame is 49.86 a second (`kit/skills/c16/c16-reference`,
"Timing"). `irq_play` runs four raster interrupts a frame, at lines 0,
`$1A`, `$AC` and `$BA`, and does nearly all the work; `main_loop` runs
once a frame, waiting for the interrupt to move `frame_count`.

| What | How often | Source |
|---|---|---|
| Pete's step | every other frame, every frame from level 10; four steps a cell, so 8 frames a cell, 4 from level 10 | `irq_play`, `move_pete`; *live*: 8 rows in 64 frames on level 1, 16 on level 10 |
| The creatures' step | every `level_creature_day` frames by day (4, 3, then 2 from level 10), every `level_creature_night` at night (3, 2, then 1 from level 11); four steps a cell | `irq_play`, `move_creatures` |
| The water's step | every `level_water_speed` frames: 5 on level 1, down to 2 on level 16 | `irq_play`, `water_step` |
| A stick of dynamite | `level_fuse` frames (120 on level 1, 60 on level 16), then 70 frames of explosion, then debris | `dynamite`; *live*: 120 and 70 frames on level 1 |
| The big charge | `level_big_fuse` frames (255 on level 1, 90 on level 16), then the 70 of its explosion, then the flood | `start_level`, `check_big_charge`; *live*: flood at frame 325 of level 1 |
| A creature | out at the end of each count of `level_release` seconds (7 on level 1, 4 from level 13) once the flood has begun; the count runs from the start of the level | `main_loop`, `release_creature`; *live*: on level 1 the flood came at frame 325 and the first creature at 350 |
| A "second" | 50 frames, counted by `irq_play` in `$7E` | `irq_play` |
| A step of the day | every 256 frames while a level runs: 16 steps, about 82 seconds a day, with night at steps 6 to 9, from about 31 to 51 seconds into each life | `irq_play`, `start_level` |
| Pete's death | about 160 frames from the touch to the rebuilt level: six frames for each of six rows he sinks, then 120 | `death`; *live*: 162 frames |
| The level's end | the jingle, 24 frames, and a pause of about 46; then 50 points and a tone for each stick left; then about 130 frames to the next level | `main_loop`, `sound` |

## Controls

The joystick in port 2, read through `$FD30` and `$FF08`
(`read_controls`): left, right, up, down and fire. With the keyboard
chosen (bit 7 of `$A3`), A is left, S right, P up, L down and SPACE
fires (`key_p` to `key_s`). *(live)*

On the title screen, left and right choose the starting level, 1 to 16,
round and round (`change_level`); fire starts the game; RETURN switches
between joystick and keyboard and says which (`toggle_controls`). With
the keyboard chosen the joystick does nothing on the title, A and S
change the level and SPACE starts. *(live)*

In play, ESC goes back to the title screen (`irq_play` reads it into
`esc_up`; `main_loop`). *(live)*

Fire lays a stick only when it is newly pressed (`fire_last`), and Pete
moves left or right before up or down when both are held (`move_pete`).

## Graphics

Everything is characters: the C16 has no sprites. The screen is TED's
multicolour character mode, with the game's own 256 characters at
`$1000`. The play area is 39 columns of the 90-column map, copied to the
screen once a frame (`draw_view`) and scrolled sideways a pixel at a time
with TED's fine scroll (`scroll_view`); the whole 23 rows of the map are
on the screen at once, and the status line below them does not scroll.
The view follows Pete when he comes within 10 columns of either edge.

Pete and the creatures are drawn into characters of their own, `$CE` to
`$D7`, two for each figure, every frame (`draw_figures`). For each
figure the game puts its characters into the map over the cells it is
in and moving into (`stamp_figures`), builds each character's eight rows
from the background character it covers, ANDed with a mask and ORed
with a picture, copies the view to the screen, and puts the map back
(`unstamp_figures`). The pictures and masks are pre-shifted at start-up
for each of the four steps of a move, two pixels (one multicolour pixel)
a step (`build_figures`, `shift_frames`), so a figure glides between
cells. Pete standing still is one character, `$CE`, drawn from his
standing picture and mask (`draw_standing`).

The screen is in three bands (`irq_play`): the surface, whose three
colours step through the day from the tables `sky_background`,
`sky_colour1` and `sky_colour2`, light blue by day to black at night;
the mine, always black with `$41` and `$39`; and the status line, 40
columns without the scroll.

Earth is four characters tiled two by two (`earth_at`). Pete digs a
cell in four steps, through three stages of digging for each direction
he moves (`chr_digging`, 48 characters). Water is 17 characters: four
stages each of rising, falling, flowing left and flowing right, and full
(`chr_water`). The explosion's character sparkles: `irq_play` fills it
with random bits from TED's timers every frame. The dynamite's fuse
flickers every fourth frame (`chr_dynamite`). On the title screen the
background pattern rolls upwards and the frame round the screen is built
from it every other frame (`irq_title`).

## Mechanics

**Digging.** Pete can go anywhere in columns 1 to 88 and rows 4 to 21,
through earth or tunnel (`can_enter`), except where the step would open
a hole two cells square: `check_ring` looks at the eight cells round the
one he is entering, and refuses the move if any corner and its two sides
are all open. So every tunnel is one cell wide. Walls, goodies and water
stop him; bumping into a goodie collects it, into water or the face
kills him (`pete_touches`).

**Goodies.** `place_goodies` scatters four kinds at random, each where
`find_space` finds a four-by-four block with no other goodie in it, so
goodies never touch: small ones (one cell), wide ones (two across), tall
ones (two down) and large ones (two by two), in the numbers the level's
tables give (`level_small_goodies` to `level_large_goodies`), plus one
x2 from level 8. Every one, the x2 included, must be collected to finish
the level (`goodies_left`). Their points, from `points_lo`, in
binary-coded decimal:

| Goodie | Characters | Points |
|---|---|---|
| The four small lumps | `$70`-`$73` | 60, 55, 50, 35 |
| OIL | `$74` | 15 |
| A pale lump, two wide | `$76` | 5 |
| A dark lump, two wide | `$78` | 20 |
| x2 | `$7A` | none: every goodie and bonus after it in the level counts double |
| The first seam | `$7C` | 25 |
| The second seam | `$7E` | 15 |
| The third seam, and GAS | `$80`, `$82` | 15 |
| A white vein, white crystals, dark lumps | `$84`, `$88`, `$8C` | 50, 55, 60 |
| The money bag | `$90` | 70 |
| The question mark | `$98` | 0 to 190 at random, in tens |
| Pale crystals | `$9C` | 80 |
| The face | `$94` | kills Pete |

*(live: the x2 appears on level 8 and not on level 7; the counts to
collect, 29 on level 7 and 27 on level 8, match the tables plus the x2.)*

**The face.** From level 6 (`swap_face`), every 32 to 47 frames one of
the large goodies still in the earth turns into a grinning face, and the
one that was a face turns back. Touching the face kills Pete; it is not
counted among the goodies. *(live: a face showed on level 6 and never on
level 5.)*

**Dynamite.** Pete starts each level with `level_sticks` sticks (5 on
level 1, 16 on level 16). Fire lays one in the cell he is in, if it is
tunnel (`dynamite`). It burns for the level's fuse, then explodes: the
cell becomes an explosion for 70 frames, which kills Pete or any
creature in it, then debris. Pete clears debris by walking into it; the
creatures cannot pass it (`move_creatures` treats only tunnel, water, a
stick and an explosion as open). Water flows over a stick, and a stick
the water covers never goes off. A creature killed by an explosion is
worth 150 points, once for each pass of the creatures however many died
in it (`kill_bonus`). *(live: the stick's 120 frames and the explosion's
70, and the kill bonus.)*

**The flood.** `start_level` lays the big charge at the bottom of the
shaft (`$3F78`, column 44, row 21) and puts that cell first on the water
list. When its explosion is over, the floor under it breaks
(`$39`) and the water starts there (`check_big_charge`). `water_step`
fills the cells on the list a stage at a time and lets each full one
flow on: water falling from above spreads left, right and down; water
flowing sideways goes on that way, down and up; rising water goes left,
right and up. It rises above the highest row it has reached only when
nothing below is still filling (`flow_up`), so it fills the tunnels from
the bottom up. A tunnel Pete digs beside full water lets it in
(`let_water_in`). Water kills Pete if he walks into it, or if it reaches
the cell he is in (`check_death`). *(live)*

**The creatures.** One to four (`level_creatures`), let out of the
bottom of the shaft one at a time once the flood has begun
(`release_creature`). They move only through tunnel, water, sticks and
explosions: they cannot dig. At the end of each cell a creature chooses
again: five times in eight it tries to head for Pete, across or up and
down first at random (`chase_across`, `chase_updown`), never straight
back the way it came; otherwise it takes an open way starting from a
random one, turning back only when nothing else is open
(`move_creature`). A creature within a cell of Pete, across and up or
down, kills him (`creature_touch`, which counts positions in quarter
cells so that a figure halfway across counts where it is drawn). At
night they move at the faster of the level's two speeds. *(live: a
creature reached Pete at the top of the shaft on level 1 and he died.)*

**The end of a level.** When the last goodie is collected a ladder
appears at the top of the shaft (`count_goodie`). The level ends when
Pete is standing still in the shaft's top cell (column 44, row 4) with
the stick pushed up (`main_loop`): a jingle, then 50 points for each
stick left, each with a tone (not doubled by the x2, which is switched
off first), and the next level. *(live: five sticks gave 250.)* After
level 16 the level stays at 16 (`main_loop`).

**Lives and score.** Three lives: MEN shows 02 at the start, the men in
hand beyond the one playing, and the game ends when a death finds 00
(`main_loop`). Every 10,000 points gives another man (`add_score`).
*(live: dying with MEN 00 returned to the title; 9,990 plus a kill
bonus made 10,140 and MEN 03.)*

**The high scores.** Five entries, all DOUGGY with 10,000 down to 2,000
when the game loads, kept until the machine is switched off or the
game loaded again (`hiscore_names`). A score that goes in takes six question marks for a
name, and the player spells it on the title screen: left and right step
through A to Z, the full stop, the exclamation mark, the question mark
and a space, and fire takes each letter (`high_scores`). *(live)*

**The title's verdict.** After a game, the scroller starts with a
message chosen by the score's thousands (`title`, `scroller_text`),
then goes on to the greeting: THAT WAS PATHETIC below 2,000, NOT QUITE
GOT THE HANG below 6,000, NOT BAD below 9,000, MY MAIN MAN from 9,000
to 9,999, and MEGA SCORE from 10,000. A game that scored nothing goes
straight to the greeting. *(live: 7,000 gave NOT BAD.)*

**Random numbers.** `random_below` mixes the raster position, TED's
timers 1 and 2 and a running seed, `$7A`, seeded from the raster at
start-up (`start`), so no two games are alike.

### Corner cases

- **A creature boxed in on all four sides freezes the game.** When
  every way round a creature is shut, `move_creatures` looks for an open
  one for ever: its loop at `$281E`-`$2827` masks the way to 0-3 each
  time round, so the `BNE` at `$2827` always branches. It runs inside
  `irq_play`, so `main_loop` never runs again; the other raster
  interrupts still draw the screen and move Pete and the water, but
  nothing kills him, nothing is collected, no stick goes off and ESC
  does nothing. A player can do it: on level 6, walk straight down the
  shaft, lay a stick in the bottom cell above the big charge (row 20)
  and climb away. The stick's debris forms at frame 291 of the level, the
  flood starts below it at 285, and the first creature comes out at 300,
  two frames before the water rises through the debris: debris above,
  the broken floor below and earth either side. *(live: `main_loop` ran
  no pass in the 500 frames after, while the interrupt ran 2,000 times.)*
  On levels 1, 5 and 14 the same play missed, the creature coming out
  with the bottom cell an explosion or already water.
- **The creatures' up-and-down chase reads the wrong coordinate.**
  `move_creatures` works out the difference up and down as Pete's row
  less the creature's *column* (`$27A6`, `SBC $8A,X`; the rows are at
  `$8E`). Pete's row is 4 to 21 and a creature's column mostly larger,
  so the difference is nearly always negative and a creature chasing up
  or down nearly always tries up. Creatures start at the bottom of the
  shaft, below Pete, so the slip seldom shows.
- **The test for wandering is an AND.** A creature wanders instead of
  chasing whenever the two differences ANDed together are zero
  (`$27E0`), which happens for many pairs with no bits in common, not
  only when it is level with Pete.
- **The level's end reads TED's `$FF10` where the lines round it store
  to TED.** At `$18BB` it loads 3, then loads `$FF10` over it; voice 2's
  pitch for the jingle keeps whatever high bits `$FF10` held. A store
  looks to have been meant (inferred).
- **The large goodies' list** at `$0316` overwrites KERNAL vectors
  (BRK, OPEN to GETIN). The game never calls the KERNAL, so nothing
  reads them while it runs.
- **`level_fuse` is not monotonic:** 90 frames on level 6, 95 on
  level 7.
- **The room check for row 21 reads the zero page.** `find_space`
  refuses a place when any cell of the four-by-four block round it holds
  `$70` or more, a goodie (`$2DA7`). For a goodie in row 21 the block's
  last row is row 23, at `$4000`, past the map's end, and on the C16,
  whose 16 KB of RAM repeats through the 64 KB, that is the zero page:
  a variable of `$70` or more there refuses the place above it. *(traced:
  level 16 built on 64 KB of plain memory from the timer readings of a
  plus4emu run made a different mine from the 102nd reading on; with
  `$0000`-`$00FF` copied to `$4000` before each check it made the
  game's.)*

## Data tables

Sixteen bytes each, one a level (`start_level`), from `$1EC9`:

| Level | Sticks | Release (s) | Water | Creatures day / night | Creatures | Small | Wide | Tall | Large | Fuse | Big fuse |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 5 | 7 | 5 | 4 / 3 | 1 | 2 | 2 | 3 | 5 | 120 | 255 |
| 2 | 5 | 7 | 4 | 3 / 2 | 2 | 3 | 4 | 5 | 5 | 110 | 250 |
| 3 | 6 | 6 | 4 | 3 / 2 | 2 | 3 | 7 | 7 | 4 | 110 | 240 |
| 4 | 7 | 6 | 4 | 3 / 2 | 3 | 4 | 5 | 8 | 5 | 105 | 230 |
| 5 | 8 | 6 | 4 | 3 / 2 | 3 | 5 | 6 | 3 | 6 | 100 | 220 |
| 6 | 9 | 6 | 4 | 3 / 2 | 3 | 7 | 7 | 5 | 5 | 90 | 215 |
| 7 | 9 | 5 | 4 | 3 / 2 | 3 | 9 | 8 | 6 | 6 | 95 | 210 |
| 8 | 9 | 5 | 4 | 3 / 2 | 3 | 10 | 7 | 3 | 6 | 80 | 210 |
| 9 | 10 | 5 | 3 | 3 / 2 | 4 | 10 | 7 | 7 | 7 | 80 | 210 |
| 10 | 10 | 5 | 3 | 2 / 2 | 4 | 10 | 8 | 9 | 7 | 80 | 200 |
| 11 | 11 | 5 | 3 | 2 / 1 | 4 | 10 | 8 | 5 | 8 | 75 | 180 |
| 12 | 12 | 5 | 3 | 2 / 1 | 4 | 10 | 5 | 9 | 8 | 70 | 160 |
| 13 | 13 | 4 | 3 | 2 / 1 | 4 | 11 | 8 | 10 | 9 | 65 | 140 |
| 14 | 14 | 4 | 3 | 2 / 1 | 4 | 12 | 9 | 6 | 9 | 65 | 120 |
| 15 | 15 | 4 | 3 | 2 / 1 | 4 | 12 | 9 | 11 | 9 | 65 | 100 |
| 16 | 16 | 4 | 2 | 2 / 1 | 4 | 12 | 11 | 11 | 10 | 60 | 90 |

Water and the creatures' speeds are frames a step; the fuses are frames.
The tables, in order: `level_sticks` (binary-coded decimal),
`level_release`, `level_water_speed`, `level_creature_day`,
`level_creature_night`, `level_creatures` (stored as the highest
creature's number, one less), `level_small_goodies`,
`level_wide_goodies`, `level_tall_goodies`, `level_large_goodies`,
`level_fuse`, `level_big_fuse`.

The surface's colours for the 16 steps of the day (`sky_background`,
`sky_colour1`, `sky_colour2`), as TED colour bytes:

```
background  56 46 46 41 31 21 11 00 00 00 01 21 31 41 46 56
colour 1    48 48 48 38 38 28 31 11 11 11 41 38 38 38 48 48
colour 2    29 29 29 19 19 19 21 01 01 01 11 11 19 19 29 29
```

## Sound

TED's two voices, effects only: the game has no music. `sound` runs
once a frame from `irq_play` and plays the first effect that is going,
in this order: the tones for the sticks left at the end of a level
(noise, fading); the level's end (both square voices, voice 1
warbling); a goodie collected (voice 1, its pitch wobbling at random);
an explosion (noise on voice 2, fading twice); Pete's death (noise
pulses rising and falling); a fuse burning (a hiss of noise at
volume 1); Pete digging (a scratch of noise at volumes 0 to 3). Silence
otherwise.

## The listing's error rate

One sample of 60 of the listing's 202 comments, drawn with the seed
4310 from the whole listing, checked against the bytes, the kit's
simulator and pictures of the character set by an agent (on
`claude-opus-5-5[1m]`, the model that wrote them) that wrote none of
them. It marked 5 of the 60 wrong in a detail and none wrong in its main
claim; each of the five was read against the code and holds. That is
8.3 % wrong (Wilson 95 % interval 3.6-18.1 %), over the mark of two in
60, and a lower bound, since a checker misses some. The five: the
surface's characters $3A-$4F were said to draw the sky and the clouds,
which are the blank character and characters $51-$56, $58 and $59; `irq_play` gave the
creatures' and the water's intervals as the counters `$82` and `$80`
rather than the values they are set from (`$81` or `$A2`, and `$7F`);
`scroll_view` was said to stop at either end, where its test for the
right end compares with `$77`, a column the view never reaches;
`level_release` said `main_loop` counts the seconds, which `irq_play`
does; and `draw_box` called its shadow striped, where in multicolour it
is solid. All five were corrected, with the four other comments that
said the same things (`move_creatures`, `water_step`,
`release_creature`, `chr_box_lines`) and `main_loop`'s, `release_count`'s,
`chr_ladder`'s and `map_surface`'s. An audit of every comment is
recommended (`TODO.md`).

## Live tests

All on the kit's plus4emu server from the snapshots in `orientation.md`,
through `kit/c16/plus4emu.py`, reading memory frame by frame.

- **The end of a level:** goodies poked to 0 and Pete held up at the top
  of the shaft. The level went from 1 to 2, the sticks back to 5, the
  score to 250 (five sticks at 50).
- **The big charge and the flood:** level 1 from its start. The charge
  went off at frame 255 of the level, the flood began at frame 325 with
  the floor under the shaft broken (`$39` at `$3FD2`), and the day moved
  one step in 256 frames.
- **A stick:** laid with fire, Pete walking away. It burned 120 frames
  and exploded for 70, then left debris and dropped off the list.
- **Deaths:** an explosion poked into Pete's cell. MEN went from 02 to
  01 and `start_level` ran again; with `$1888` poked to 00 MEN stayed
  02; with MEN at 00 a death went back to the title.
- **The extra man:** score 9,990 and a creature killed: 10,140, MEN 03.
- **The x2 and the face:** levels 7 and 8 built from the title; the x2
  in the map on 8 only. Levels 5 and 6 played for 300 frames; a face on
  6 in 43 of them, none on 5.
- **Pete's speed:** the stick held down from the top of the shaft for 64
  frames: 8 rows on level 1, 16 on level 10.
- **The keyboard:** RETURN on the title switched to KEYBOARD; then A, S,
  P and L moved Pete, SPACE laid a stick, ESC went back to the title,
  and on the title the joystick did nothing.
- **The high scores:** a game ended at 7,000 went in third as six
  question marks; right twice and fire, twice, spelled AB; the scroller
  began NOT BAD; a later 2,000 went in last.
- **The creatures' release:** level 1 from its start, nothing pressed.
  The flood at frame 325, the first creature at 350, as the count of
  seven 50-frame seconds ran out; it climbed the shaft and killed Pete at
  frame 613.
- **Unlimited sticks:** `$2C40` poked to 00; after seven sticks STICKS
  still read 05. Without the poke two sticks left 03.
- **No creatures:** `$186C` poked to `$2C` on level 1, nothing pressed: no creature in 1,500 frames; at frame 666 the water rose into Pete's cell at the top of the shaft and he died.
- **Debris stops a creature:** debris (`$A3`) poked into the shaft at
  row 15 on level 1 before the first creature came out. The creature
  climbed to row 16, turned back, and passed only after the water had
  risen through the debris at frame 445; Pete then drowned at frame 666.
  Without the debris the creature reached Pete by frame 613.
- **A stick under water:** a stick poked into the shaft at row 20 with
  255 frames of fuse at frame 200 of level 1. The water filled its cell
  at frame 345, and at frame 455, when the fuse ran out, it left the
  list without exploding. The same stick with 100 frames exploded at 300.
- **The right end of the view:** Pete's column poked to 88 and the view
  to its right end. `$08` read 1 after every frame and the view did not
  move.
- **The freeze:** level 6 chosen on the title with the joystick, the
  stick held down from the start until Pete reached row 20, fire, then
  up. The stick was laid 132 frames into the level; at frame 300 the
  first creature came out boxed in. A checkpoint on `main_loop`'s call
  of `dynamite` counted no pass in the next 500 frames, against 2,000
  raster interrupts; Pete then stood in the water without dying, and
  ESC did nothing. The same play on levels 1, 5 and 14 did not freeze.
- **The pages' engine:** the level builder and a frame of play, run
  on the kit's 6502 by `reference/pete.js`, against plus4emu. With the
  timer readings of the emulator's runs fed in, levels 1, 6 and 16 built
  the same mine, and 1,166 frames of play on level 1 (standing still,
  and digging with sticks) left the same memory every frame
  (`work/trace/`, which keeps the traces). A frame drawn from the
  game's screen memory in `irq_play`'s three bands matched plus4emu's
  picture in all 64,000 pixels. `test_pete.js` holds the engine to the
  tables and to the timings above in CI.
