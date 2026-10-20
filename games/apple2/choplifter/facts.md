# Choplifter — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

Broderbund's original 1982 disk, `Choplifter.woz` from archive.org's A Woz
A Day collection (`orientation.md`, "The image"). There is no DOS and no
file: a loader of its own, at `$0200-$07FF`, reads the game into
`$0800-$BFFF`, both hi-res pages included, sums it and jumps through
`($0020)` to `start` (`$0800`). The listing is built from memory at that
moment (`work/entry.json`).

The disk runs on the Apple II and the Apple II Plus only. While it loads,
the loader compares stretches of the Monitor ROM with copies it carries and
stops with a lone `M` on any difference, which the enhanced IIe's Monitor
has at `$FB51` (*live*, `orientation.md`, "The loader").

No version number, no build date and no cracking group anywhere in memory.
The only build text is in the shapes: "Broderbund Software presents..."
(`$A0F2`), the CHOPLIFTER logo (`$A0F0`) and the credit line (`$A0F4`),
drawn as pictures, not characters.

The program is written as modules that call each other through jump tables
of `JMP`s at fixed addresses, three bytes apart: the graphics library
(33 services, `$1000-$1060`), the hostages and the spawning (`$6000-$6012`),
the helicopter, the sound and the lists (`$7322-$7379`), the objects
(`$8000-$8003`), and the scenery (15 services, `$9000-$902A`).

## Memory layout

| Thing | Where |
|---|---|
| The game's variables and the graphics library's | `$00-$7C`, `$80-$C8` |
| The loader's stages; its error printer stays as the BRK and RESET handler | `$0200-$07FF` (not the game's) |
| Start-up, title, attract mode, the main loops, the keys and buttons | `$0800-$0F21` |
| 222 bytes of another program, never run | `$0F22-$0FFF` |
| The graphics library: jump table, drawers, line address tables | `$1000-$1D91` |
| Hi-res page 1 and page 2 | `$2000-$3FFF`, `$4000-$5FFF` |
| The hostages, the tanks, the spawning, the jets' manoeuvres, the helicopter's tables | `$6000-$6FFF` |
| The world's constants, the erase lists, the object table, the variables, the flight, the sound | `$7000-$7FFF` |
| The objects: jets, shots, missiles, bombs, shells, drones, explosions, hits | `$8000-$8E00` |
| The scenery: planet, stars, counters' bar, base, fence, barracks, scrolling | `$9000-$9F78` |
| The shape table, 128 pointers | `$A000-$A0FF` |
| The shapes | `$A102-$BF5E` |

Four stretches are leftovers of the screen that was in memory when a page
was saved to the disk, laid out like hi-res lines and never read:
`$68E5-$6BFF`, `$6FD5-$6FFF`, `$7FC2-$7FFF` and `$8E01-$8FFF`.
`$9F79-$9FD4` is an older copy of the table at `$6F79-$6FD4`, also never
read.

## Timing

**No interrupts.** `start` runs `CLD` and `SEI`, and nothing on a II Plus
raises an interrupt. The game is one main loop, and a game frame is
however long one pass takes: drawing everything on the page not shown,
then showing it (`sortie_loop`, `$0C13`). There is no wait for the
screen's vertical blank.

A pass took about five of the screen's frames in play: the game showed
page 1 33 times and page 2 32 times in 330 frames (*live*,
`orientation.md`, "Steady state"). Speeds in this file are per game frame.

Each pass of `sortie_loop`: the once-a-frame sound flags cleared, the end
tests, the keys (`read_keys`, `$0D92`), the vertical stick, button 1,
button 0, the erase list (`erase_old`, `$9B4C`), the stars, the planet,
the scrolling, the hills, the base, the fence, the barracks, the hostages,
the horizontal stick, the spawning, every object (`run_objects`, `$8651`),
the objects whose depth changed put back in order, and the page shown and
flipped.

## Controls

The joystick is two paddles read through the Monitor's `PREAD`
(`$FB1E`). Paddle 1 is up and down: a sixteenth of it is the vertical
stick, 0 to 15 (`read_stick_y`, `$7663`), and the climb rate for each is
-10 to -1 dots a frame for 0 to 9, 0 for 10, then 1, 2, 3, 4 and 6
(`climb_table`, `$7424`). Paddle 0 is left and right: a sixteenth of it,
less 2, held between 0 and 10, less 5, so -5 to +5 with a dead band at
each end (`read_stick_x`, `$769C`) (*live*: the stick flew the
helicopter).

Button 0 fires (`fire`, `$0E0F`): one shot a press, none while the
helicopter is on the ground or hit, and none while five of its shots are
in flight (`shots_in_play`, `$7310`).

Button 1 turns the helicopter (`turn_button`, `$0E3B`). A short press
turns a side-on helicopter to face the viewer; a long one, held until its
pose has passed the front, carries it on round to face the other way. A
press while it faces the viewer turns it to the side the stick leans to.
`turn_step` (`$0EC2`) moves the pose a step a frame, two when it is more
than one pose away.

The keys (`read_keys`, `$0D92`):

| Key | Effect |
|---|---|
| ESC | pause, until a second ESC |
| CTRL-S | sound off and on (`sound_on`, `$72F6`) |
| CTRL-V | up and down reversed (`reverse_y`, `$72F5`) |
| CTRL-A | left and right reversed (`reverse_x`, `$72F4`) |
| CTRL-L, then a key | the level (`level`, `$731D`) set to the key's low two bits (*live*: CTRL-L then 3 set it to 3) |
| any other key | a new game, from the title or the attract mode |

A CTRL-L pressed before a game is lost: a new game sets the level to 0
(`refill`, `$9A47`).

## Graphics

**Two hi-res pages, flipped.** Every frame is drawn on the page not shown
and then shown (`gfx_show_page`, `gfx_flip_page`). The library EORs `$60`
(`g_page`, `$8D`) into the high byte of every line address on page 2:
`$20` EOR `$60` is `$40`.

**Rows count up from the bottom.** `row_lo` and `row_hi` (`$1C02`,
`$1CC2`) give the address of each of the 192 lines, index 0 being line 191
(`$3FD0`) and index 191 line 0 (`$2000`).

**Shapes.** `$A000-$A0FF` is 128 pointers, low byte first. A shape starts
with its width in dots and its height in rows, then its rows, top first,
one bit a dot, the most significant bit first (`gfx_shape`). The library
shifts the bits into the screen's seven dots a byte as it draws. Seven
shapes drawn by `gfx_copy_bytes` (the four stretches of hills, the post
office and the barracks, closed and open) are instead seven copies of the
picture, one for each dot a byte can start at, already in screen bytes.

**Colour.** A hi-res byte's bit 7 picks one of two colour groups, violet
and green or blue and orange. The library ORs `g_colour` (`$8C`), `$00` or
`$80`, into every byte it draws (`gfx_colour`). So a shape's colours come
from its dots' columns and from which group it is drawn in, and the jets,
the explosions and the drones' bodies are drawn with the bit set, the
tanks' hulls and the drones' spinning parts with it clear.

**Ways of drawing.** OR, opaque (every dot inside the box cleared first,
with edge masks at `$1D82` and `$1D8A`), mirrored either way, a copy of
pre-shifted bytes, a slant (the helicopter's turning poses and its rotor,
sheared a row every 3 to 13 dots by `slant_steps`, `$120E`), and an OR that
reports the first lit dot it lands on (`gfx_draw_hit`, `$102D`), which this
game never uses.

**Erasing.** Nothing is cleared. Every shape drawn records a box in its
page's erase list (`add_erase`, `$7BF8`): a kind, its X and its row, four
bytes. `erase_old` (`$9B4C`), the first drawing step of each frame, swaps the two lists
and fills every box recorded when this page was last drawn, two frames
before, with black above the ground line (row 25) and the ground's colour
below it, so nothing behind needs to be put back. The 26 kinds' boxes are
in `erase_boxes` (`$9C69`).

**Scenery drawn from the code.** The planet is 66 `LDA #` and `STA`
pairs a page that store its bytes straight into screen memory, rows 101
to 119 at byte columns 31 to 34 (`draw_planet`, `$9411`): the picture is
in the code. The stars are fourteen bytes, each stored at four to seven fixed
places on the screen (`store_stars1`, `$972D`, 77 stores); every frame
`twinkle_stars` (`$96AE`) makes them from two random numbers with each bit
kept one time in four, so the sky twinkles. Two of the stores land on the
same byte, `$2427`, so 76 places show stars.

**The ground band is never drawn by the game.** It is in the loaded
picture on both pages, and the erase boxes refill it with the same
pattern, `$55 $2A`. `build_screen` (`$9ADD`), which would draw it, is
never called.

**The fence is drawn in perspective:** five posts from 7 to 17 dots wide
(`$A0C0-$A0C8`) at rows 28, 27, 25, 22 and 17, each further from the
screen's left edge in proportion to its nearness (`draw_fence`, `$9136`,
with `shift_left`, `$9E65`).

**The view** (`scroll_view`, `$9CD1`) is kept between world X `$02B0`
and `$1208`. Flying the way it faces, the helicopter is led: the view aims
to put where it will be in eight frames 70 dots from the left edge when it
flies left, 210 when it flies right, and closes at the helicopter's speed
plus 4 dots a frame. On the pad it runs 4 dots a frame towards the base.
The hills scroll at half the view's speed (`draw_hills`, `$7C28`).

## Mechanics

**The world.** World X runs left to right in dots. The four barracks
stand at `$0380`, `$0480`, `$0580` and `$0680` (`$700E`, the high byte
plus 0 to 3); the fence at `$1174` (`$700C`); the base at `$1274`
(`$7008`), with the post office's door at `$12D5` (`$700A`). The
helicopter is held between `$02D0` and `$1300` (`$7000`, `$7002`) and
starts each sortie on the pad at `$1293`, height 7 (`heli_setup`,
`$9F18`). The game compares the high bytes on their own, so it reasons in
blocks of 256 dots.

**Depth.** Every object has a depth, the row it stands on, and the object
list is kept in order of depth, furthest first, so the nearest are drawn
last (`insert_object`, `$7942`). The ground's depth is 22 (`$701A`).

**The flight.** Each frame a sixteenth of the horizontal speed is taken off
as drag and the thrust for the stick's lean added, 0, 96, 180, 264, 348 or
420 256ths of a dot a frame (`thrust`, `$737C`, `thrust_table`, `$7418`),
up to 21 dots a frame. The vertical speed closes on the stick's climb rate
by half the difference a frame. The tilt follows the stick a step a frame,
and the helicopter's highest height is 112 (`$701D`).

**Landing.** A helicopter that comes down with a lean lands tilted, and on
the ground it rocks back towards level on its skids (`rock`, `$7803`). The
tilted pictures are taller than the level one's 13 rows: up to 18 nose
down and 16 nose up. Each step of the rocking raises or lowers the
helicopter by the difference between two heights from `land_height_table`
(`$7895`: 7 level, up to 10 nose down and 8 nose up) and moves it along by
the difference between two offsets from `rock_x_table` (`$787F`), so the
end of one skid stays on the ground: at every tilt, facing either way, the
helicopter's lowest dots are on screen line 167 or 168 (`test_tilt.js`).
In Apple2TS one that landed at a tilt of 4 was level two frames later
(*live*). Coming down at more than about 4.4 dots a frame it bounces
(`bounce_speed`, `$7010`). Touching the ground at the top horizontal speed
is a crash (`crash_speed`, `$7012`).

**Boarding and crushing** (`boarding`, `$6139`) need the helicopter level
on the ground (`door_open`, `$0D`), not hit, and outside the base's block.
A hostage 8 or 9 dots right of its X or 10 or 11 dots left climbs in, up to
16 aboard; one closer is under it and is crushed (`crush`, `$62D7`), from 7
dots right to 9 dots left. Since the door opens only when the helicopter
is level, a tilted landing neither boards nor crushes.

**Hostages out of the barracks** (`release`, `$62F2`), every fourth frame:
none while 16 are out or walking home, none while five are out. One comes
out of the barracks the helicopter is over if it is open and has some
left, otherwise of another open barracks with some left, the search
starting at a random one. Hostages do not have to be taken a barracks at a
time. A new game opens the fourth barracks and lets 8 of its 16 out
(`open_fourth`, `$9EA9`), each a random even 32 to 158 dots right of the
one before.

**Unloading.** On the pad (13 to 63 dots right of the base's X) the
hostages aboard climb out one at a time, each counted home at once
(`let_out`, `$6359`), and walk to the post office's door.

**The level** (`level`, `$731D`), 0 to 3, starts each game at 0 and goes up
by one at the first hostage set down on the pad after hostages have
climbed aboard (`trip_flag`, `$731E`) (*live*: an unloading after a
boarding raised it from 0 to 1, a second unloading with no boarding
between left it at 1). So it counts trips, not time.

**Enemies** (`spawn`, `$6884`). Eight frames in every 256 an enemy may
come: at level 0 only tanks; at 1 a jet half the time, else a tank; at 2
and 3 a drone one time in four, else a jet half the time, else a tank.
Each kind only while fewer than its most are in play (*live*: the most
seen at each level matched):

| Level | Tanks | Jets | Drones |
|---|---|---|---|
| 0 | 1 | 0 | 0 |
| 1 | 2 | 1 | 0 |
| 2 | 2 | 2 | 1 |
| 3 | 2 | 2 | 2 |

Tanks and drones come only while the helicopter is two blocks or more
short of the fence (`spawn_tank`, `$63EA`; `spawn_drone`, `$653A`). An
enemy appears about 432 or 440 dots ahead of a helicopter flying at 17
dots a frame or more, otherwise on either side at random.

**Tanks** (`tank_impl`, `$65C3`) drive towards the helicopter until 128
dots away, then decide every 8 to 23 frames: fire if the helicopter is in
the arc of the gun's aim, and stop, come on or back off. The gun turns a
step a frame towards the helicopter, one of five aims (`aim_table`,
`$675C`). They stop short of the fence, the nearer ones further from it.
A tank is destroyed only by a blast in front of the ground's depth
(`blast`, `$881D`). A shot fired side-on stays at its depth, and only one
fired while the helicopter faces the viewer or is turning comes forward
as it falls (`shot_depth_table`, `$7FBC`), so only those can reach a
tank.

**Jets** (`jet`, `$8006`) follow scripts of four-byte steps (picture, X,
height and depth steps): cruising (one step), turning round towards the
viewer (18), coming forward (15), and the attack runs (24), with missiles
at a helicopter in the air and a bomb at one on the ground
(`jet_scripts`, `$8262`, `jet_script_steps`, `$6CE9`). At levels 2 and 3
some jets are bold (one in eight, then one in four, `bold_masks`, `$6536`)
and swoop sooner. A jet leaves once the helicopter is over the fence's
block or beyond.

**Drones** (`drone`, `$8C42`) turn their speed a dot a frame towards the
helicopter, up to 5, and close on its height while on the screen; at
level 3 they drop shells. A drone that touches the helicopter destroys
it.

**The end.** The game is won when all 64 hostages are home (the crowns,
`game_won`, `$0CA2`), and over when those home and those killed make 64
or after the third helicopter ("THE END", `game_over`, `$0C92`) (*live*:
64 home showed the crowns; 63 home and 1 killed showed "THE END"). A
helicopter lost with hostages aboard adds them to the killed
(`killed_add`, `$7A6B`).

## Data tables

| Table | Where | Contents |
|---|---|---|
| `thrust_table` | `$7418` | thrust by stick lean |
| `climb_table` | `$7424` | climb rate by vertical stick |
| `land_height_table` | `$7895` | height on the ground by tilt |
| `heli_raise_table` | `$6CEE` | rows a sheared helicopter is lifted, 9 poses by 11 tilts |
| `rotor_offset_table` | `$6D51` | the main rotor's offset, 11 by 11 pairs |
| `gun_table` | `$6E9B` | where a shot starts, 11 by 11 pairs |
| `shot_speed_table` | `$6F8D` | a shot's speeds by pose and tilt |
| `jet_script0`-`jet_script3` | `$6C00-$6CE8` | the jets' manoeuvres |
| `max_tanks`, `max_jets`, `max_drones` | `$68D9`, `$68DD`, `$68E1` | the most in play, by level |
| `erase_boxes` | `$9C69` | 26 kinds of erase box |
| `demo_script` | `$0ADF` | the attract mode's flight, 32 steps of 4 bytes |
| the shape table | `$A000` | 128 pointers |

## Sound

The speaker only. Every click of `$C030` is followed by a read of `$C020`,
the cassette output (`click_impl`, `$78AB`; `tone_impl`, `$78C2`;
`noise_impl`, `$76CD`), so an amplifier on the cassette port plays the
same sound, as the instructions say. Every sound routine tests `sound_on`
(`$72F6`), `game_on` (`$79`) and whether the helicopter is a settled wreck,
so the title and the attract mode are silent.

Three routines make every sound:

- `tone` (`$7370`): Y clicks, each after a delay loop of X counts, X
  growing by A after each.
- `noise` (`$7373`): pairs of clicks, the first after a delay read from the
  bytes of the game's own code at `$8100` onwards, the second after a
  period that grows each pair. Only a tank firing and a jet firing call
  it.
- `click` (`$736D`): one click.

A tone's clicks come 5X + 30 cycles apart, so its pitch is 1,020,484 /
(2 × (5X + 30)) Hz: period 48 is 1,890 Hz, 97 is 991 Hz and 255 is 391 Hz
(the clicks' spacings in Apple2TS, Live tests).

The effects:

| Effect | Where | What |
|---|---|---|
| A new game | `new_game`, `$0B7C` | three phrases of three notes, periods 144, 67, 97; 112, 67, 97; 80, 67, 97; 48 clicks each |
| A shot | `fire`, `$0E36` | a falling tone, period 48, 32 clicks, the period one longer after each |
| A hostage aboard | `boarding`, `$61E1` | three notes, periods 255, 224 and 152, once a frame at most |
| A hostage killed | `killed_up`, `$79F0` | three notes, periods 48, 67 and 97, 48 clicks each, once a frame at most |
| A hostage home | `rescued_up`, `$7A30` | one note, period 40, 40 clicks |
| A helicopter lost with hostages aboard | `killed_add`, `$7A6B` | four falling notes, periods 64, 84, 97 and 131, of 80, 64, 48 and 32 clicks |
| A tank fires | `tank_shoot`, `$686B` | noise |
| A jet fires | `jet_missiles`, `$8BEC` | noise |
| A drone on the screen | `drone`, `$8C89` | 5 clicks, period 1, 5 or 9 by its spin, once a frame for all the drones |
| A drone drops a shell | `drone`, `$8DDB` | a steady tone, period 48, 32 clicks |
| Explosions, the burning helicopter | `$83A7`-`$8490` | clicks between the pictures |

There is no engine sound and no music.

## The listing's error rate

One sample of the listing's comments, seed 20261020, checked against the
bytes and in the kit's simulator by an agent (on `claude-opus-5-5[1m]`)
that wrote none of them. The 1,037 comments fell in two strata: 835
written by hand on the code, the variables and the tables, and 202 on the
shape table and the shapes ($A000-$BF5E), written by a script from the
shapes' headers. The sample drew 60 from the first and 20 from the
second.

13 of the 80 were wrong, 16.3 % (Wilson 95 % interval 9.7-25.8 %): 13 of
the 60 by hand (21.7 %, 13.1-33.6 %) and none of the 20 by the script
(0-16.1 %), so 17.4 % weighted by the strata's sizes. That is over the
mark of one in 30. One was wrong outright: $00AE is not the bytes a
clipped copy copies a row but the whole bytes cut off the left of each
row. One overstated: $1021 claimed most of the game's sprites are drawn
by OR, when the plain drawer draws as many. Eleven were wrong in a
detail: a variable's unit or use given for one routine of several ($0085,
$008E, and $628D, which also keeps X across the boarding sound's three
calls); a count or a route ($0B9B: 23 frames, not 24, reached by a JMP
after the first sortie, and running no objects); a range ($169F divides
only numbers below 896; $7895's tilts +1 to +3 land as level; $9411's
rows were counted from the top, against the listing's count from the
bottom; $63EA's slipped tank lands anywhere in $0000-$00FF and is kept
when the helicopter is at $02D0-$034F); an order ($9B4C is the first
drawing step, after the keys and the stick, not the first call); a type
shared ($85B0's shells are dropped by drones too); and a shape's pointer
called the shape ($085E). All 13 were corrected, with the 37 comments
that said the same, 30 of them a pointer called a shape. The checker's
rate is a lower bound on the true rate.

The 138 comments on the graphics library's inline arguments, written by a
script from their bytes, came after the sample and are outside it.
Building the Sound section, after the sample, found two more wrong: the
noise routine (`$7373`, `$76CD`) was called an explosion's, when only a
tank firing and a jet firing call it. Both are corrected. Drawing the
helicopter at each tilt found two more: `$7895` said a tilted helicopter
touches down up to three rows higher, when its heights only lift the
taller tilted pictures so a skid stays on the ground, and `$0006` counted
the helicopter's height from its landing height instead of from the row it
stands on. Both are corrected.

## Live tests

All in Apple2TS as an Apple II Plus (`orientation.md`), from the
snapshots in `work/`, with the scripts in `work/verify/`.

- *Spawning sides* (`tanks.py`): with the helicopter at world X `$0702`,
  3,000 video frames gave one tank on the left, at X 1362, and two meant
  for the right that never appeared in the tank list. See Discoveries.
- *The rules* (`rules.py`): rescued set to 64 ended the game with the
  crowns; 63 home and 1 killed ended it with "THE END"; on the pad with one
  aboard after a boarding, the level went from 0 to 1, rescued to 1 and
  the trip flag was cleared; a second unloading with no boarding left the
  level at 1; CTRL-L then 3 set the level to 3.
- *The enemies by level* (`enemies.py`): the most of each kind seen in play
  at levels 0 to 3 matched the table above; at most five shots were in
  flight.
- *The barracks at the start* (`play-sortie1.json`): states 0, 0, 0, 1,
  left 16, 16, 16, 8, out 8, in the barracks 56.
- *Tilted landings* (`work/verify/tilt.py`): six landings with a lean
  from `play-sortie1.json`, four facing right and two facing left, three
  frames each as the helicopter rocked level. In each frame the
  helicopter, drawn alone on a blackened page, was the same 8,192 bytes as
  the same state drawn by the same routines from the listing on the kit's
  6502 (`reference/tilt.js`, `test_tilt.js`).
- *The sound* (`work/verify/sound.py`): each of the nine effects in the
  Sound section, run from its first instruction to its last in Apple2TS
  with the sound on, clicked at the same spacings, click for click, as the
  same code from the listing on the kit's 6502 (`reference/sound.js`,
  `test_sound.js`). The two count an access's cycle at different points of
  the instruction, 4 cycles apart, which moves every click alike.
