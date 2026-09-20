# Falcon Patrol — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

The analysed image is the Remember crack, "Falcon Patrol +5 and
Highscoresaver 100%", booted with the high-score saver and **no**
trainers. The original game is Virgin Games, 1983, written by Steve Lee.
Everything below is true of this build; where the crack may have changed
the original it is said so.

Machine: C64 (`C64SC` in VICE), **PAL**. Processor port `$01` stays at
`$37` throughout: BASIC ROM, I/O and KERNAL ROM are all banked in and the
game plays no banking tricks. *(live)*

## Memory layout

| Thing | Where |
|---|---|
| Screen RAM | `$0400`–`$07E7`, VIC bank 0 (`$DD00` = `$C7`; `$D018` reads back `$1D`, though the code writes `$1C` at `$4718` — bit 0 is unused) |
| Sprite pointers | `$07F8`–`$07FF` |
| Title screen page | `$0800`-`$0BE7`, a **second screen page**. The title is shown by pointing the VIC at it (`$D018` = `$2C` at `$46C5`) and play by pointing it back (`$D018` = `$1C` at `$4717`). Nothing is copied |
| High-score name buffer | `$0AB4`, up to 12 characters |
| Player aircraft frames | blocks `$80`–`$86` (`$2000`–`$21BF`), a seven-frame yaw sequence with `$83` head-on; `$80` and `$86` are live buffers repainted from the attitude bank |
| Player attitude bank | `$2B00`–`$2D7F`, two sets of five frames, nose-left and nose-right |
| Explosion frames | blocks `$88`–`$8F` (`$2200`–`$23FF`), a random-dot cloud that grows then fades |
| Enemy aircraft frames | blocks `$94`–`$98` nose-left, mirrored at `$99`–`$9D` nose-right |
| Exhaust plume | blocks `$90`–`$93`, drawn on sprite 7; `$90` is blank and doubles as the "life over" sentinel |
| Crack's front end | `$1900`–`$1A60`, menu text `$1A80`–`$1BE7`, instruction screen `$1C00`–`$1FFF`, unread intro and scroll text `$0C00`–`$123F` |
| Saved high-score table | `$2800`–`$2854`, five entries of five score digits and twelve name characters |
| Character generator | `$3000`–`$37FF`, 256 glyphs |
| Main loop and frame pace | `$41C0` |
| Raster interrupt and its installer | `$4AC0` and `$4B20` |
| High-score name entry | `$4CE2` |
| In-game input read | `$5700`, called from `$419A` |

The game's whole footprint is about 12.5 KB of tracked bytes spread over
`$0000`–`$6FFF`, with a little under the KERNAL.

## Timing

**The tick is CIA2 Timer B, not the raster and not the frame, and it runs
at about 30 Hz.** Each pass of the frame loop at `$4185` writes `$7F` to
`$DD07` and restarts Timer B one-shot (`$DD0F` = `$09`), does the frame's
work, then spins at `$41C0` until the timer has run down. The game never
writes the latch's low byte, so the latch is `$7F` over whatever the low
byte holds — `$7FFF` after a reset. Timer B is counting φ2 cycles
(`control_b` = `$09`, input mode 00), so the period is about 32,768
cycles, which on PAL's 985,248 Hz is 33.3 ms, or **30.1 ticks a second**.

Sampling the counter 150 times found values spread evenly from `$0104` to
a maximum of `$7E90`, consistent with a countdown from `$7FFF` and never
catching the very top. *(live)*

So the game's logic rate is roughly 30 a second against a 50 Hz display.
Every tempo, lifetime and duration counted in ticks inherits that, and
anything derived from "one frame" would be out by two thirds. The raster
interrupt does nothing but repaint the colour split.

The raster interrupt at `$4AC0` fires **three times per frame**, measured
live at 151 Hz on PAL by a non-stopping checkpoint (302 hits in 2 s, 604
in 4 s). It sets up bands at raster lines `$01`, `$8A` and `$D2`, chained
through the state byte `$B0`.

Every CIA1 interrupt source is disabled at `$4B32` (`$DC0D` = `$7F`), so
the KERNAL's own timer interrupt does not run while the game does. A
consequence that misleads: `$00A0`–`$00A2`, the KERNAL jiffy clock, is
repurposed by the game and **counts down**, about one per second. *(live)*

## Controls

The game reads **control port 1** at `$DC01`. Port 1 shares that port with
the keyboard columns, so the game parks `$DC00` at `$7F` — permanently
selecting keyboard row 7 — and takes both the joystick and its keyboard
controls from a single read. Every key the wiki documents (`←`, `1`,
`CTRL`, `2`, space) lies in that one row. *(live)*

Bits in the read, active low: 0 up, 1 down, 2 left, 3 right, 4 fire.

The byte is stored at `$0C` and then **forged**. `$0C` is not the
joystick; it is what the game has decided the pilot did:

| At | Condition | What is written into `$0C` |
|---|---|---|
| `$5705` | sprite 0 Y < `$30` | up bit **set**: climb reads as released. A ceiling |
| `$5718` | sprite 0 Y ≥ `$BF` | down bit set: dive reads as released. A floor |
| `$5724` | sprite 0 Y ≥ `$7C` | fire bit set: **firing is disabled at low altitude** |
| `$5731` | `flight_flags` bit 1 | `ora #$FE` — every bit set **except bit 0**, so only the climb survives. A take-off gate, not an automatic climb: the player still has to push up |
| `$573D` | `flight_flags` bit 3 or 7 | `$FD` — down held. Bit 3 is **destroyed**, bit 7 is **out of fuel**: one gate, two ways to stop flying |
| `$5754` | bit 3 **and** `$07F8` ≥ `$88` | `$FF`, and both velocities zeroed — the wreck coming to rest |

Bit 1 is the take-off gate. The instruction is `ora #$FE`, which sets bits
1 to 7 and leaves bit 0 alone, so during take-off the climb is the only
control that still reaches the game. It is not an automatic climb: left
alone the aircraft sits on the pad indefinitely, and the bit clears the
moment it starts to rise. The death and out-of-fuel path at `$573D` uses
`lda #$FD`, an immediate load, and that one really does force the dive.

Bit 3 is set by `player_hit` at `$4400` (`lda $22 / and #$10 / ora #$08`),
which is reached from either collision register. It means **the aircraft
has been destroyed**, and the forced dive at `$573D` is the wreck falling,
not a landing.

`flight_flags` bits 6 and 7 are recomputed from the fuel every frame at
`$5570`: `and #$3F` clears both, then bit 7 is set when all three fuel
digits `$17`/`$18`/`$19` are zero, and bit 6 when only the units digit
`$17` is zero. So the input gate at `$573D` does double duty — it is the
landing path and the out-of-fuel path, and an aircraft that runs dry is
flown into the ground by the same three instructions that land it.

Turning: `$54A8` steps the horizontal velocity `$2A` by one per press,
clamped to `$FD`…`$03` (−3…+3), and only on one pass in eight of the
counter at `$2D`.

Zero-page variables named so far:

| Address | Name | Meaning |
|---|---|---|
| `$0C` | `input_byte` | the forged input byte |
| `$22` | `flight_flags` | bit 1 take-off, bit 3 landing, bit 6 low fuel, bit 7 tank empty |
| `$2A` | `vel_x` | horizontal velocity, −3…+3 |
| `$2B` | `vel_y` | vertical velocity |
| `$2D` | `tick_counter` | free-running; low bits select which update runs |
| `$B0` | `raster_band` | which raster band comes next |

## Graphics

**The landscape and the status panel are static; what moves in the
character layer is drawn two different ways.** The scrolling world and the
radar are animated by rewriting glyph bitmaps at `$3000`, so screen RAM
holds still for them. But screen RAM is written every frame by five
routines — `$5840` and `$58A0` erase and redraw the player's missiles,
`$5960` and `$59C0` do the same for enemy shots, and `$5F60` stamps blast
craters. A 1.5-second sample of quiet flight shows no screen writes only
because nothing had been fired, hit or destroyed in it.

The player's aircraft is **sprite 0**, fixed at screen X = 172; the world
moves around it. The sprite 0 pointer at `$07F8` selects the aircraft's
attitude frame and is itself read as state by the touchdown test. *(live)*

Enemy aircraft are sprites too. `$D015` reads `$01` in the analysed
snapshot, but that is a moment before the first wave arrives: the
collision code at `$4200` handles sprites 1–6 and `$D015` is written from
eight sites. Sprite Y-expand, X-expand and priority are never written at
all, so every aircraft is unexpanded and drawn in front of the scenery.
The scenery and the radar are characters, not sprites.

Screen layout, from the routines that draw it: rows 0-10 sky; row 11 alone
is the horizon strip, 40 cells of glyph `$9E` written by `$4E50`; rows
12-19 are the landscape, which `$50D0` points at `$05E0` with a row count
of 8; rows 20-24 are the status panel, 200 bytes copied from a template at
`$2E00` by `$4E70`, with `SCORE` and `HI` on the left, the radar in the
centre and `GAS` and `AAM` on the right.

The **terrain map** is `$3800`-`$3FFF`: 256 world columns by 8 landscape
rows, one 256-byte page per row, walked by `$509F` through the pointer at
`$0E/$0F`. Its top page `$3800` carries the **six bases**, each written as
`$16 $17 $16 $17`, at columns 4, 40, 84, 136, 172 and 200. A destroyed
base becomes `$6F`/`$70` and is restored to `$16`/`$17` by `$5FD0`, which
is called from exactly one place: the life-lost reset at `$564E`.

### The alphabet

The character set is in the game's own order, so a byte search in screen
codes or PETSCII finds nothing:

| Codes | Glyphs |
|---|---|
| `$00`–`$09` | digits `0`–`9`, index equal to the digit |
| `$20` | space |
| `$80`, `$9C` | `.` — two glyphs with the same full-stop bitmap; `$9C` is the one the title page uses for the rank separators |
| `$81`–`$9A` | `A`–`Z` |
| `$9B` | `_` |
| `$9D` | `©` |

In other words a letter's code is its C64 screen code **plus `$80`**. The
remaining glyphs are landscape tiles, status-panel furniture and the
aircraft shapes drawn as characters.

Strings recovered with this table include `SCORE`, `GAS`, `AAM`, `HI`,
`PRESS FIRE TO START` (`$53D0`), the alphabet strip
`.ABCDEFGHIJKLMNOPQRSTUVWXYZ_` used by name entry, and
`©VIRGIN GAMES 1983  WRITTEN BY STEVE LEE`.

## Mechanics

**Shooting an aircraft down is character collision, not sprite collision,
and that is why the game has a reputation for missing.** The player's AAMs
are drawn into screen RAM as glyphs `$12`/`$13` by `$58A0`; they are not
sprites, so they can never raise a sprite-to-sprite collision. A kill is
registered from the other side: when an **enemy** sprite reports a
sprite-to-background collision, `$4262` works out the character cell under
it, reads three cells through `($05),y` and tests each for a glyph in the
range `$0C`-`$13`. If a missile glyph is in one of those three cells the
aircraft dies; if the missile is a cell away, or the latched collision is
read for a different pair first, nothing happens and the shot appears to
pass straight through.

Enemy shots work the same way in reverse: `$5B00` draws a white streak in
glyphs `$25`/`$26`, and it reaches the player through the sprite-0
background collision bit at `$4241`.

The flight envelope is enforced entirely by rewriting the input byte, so
there is no separate "am I allowed to climb" test anywhere downstream.
Take-off, the altitude limits, being shot down and running out of fuel are
all the same mechanism.

**Landing** is a separate path and does not go through the forced dive.
`$559A` tests that the aircraft is at sprite Y exactly `$84`, that `vel_x`
is zero, and that the terrain map holds a base tile (`$16`) under both
`$3800[$0D+$12]` and `$3800[$0D+$14]`. That is the documented "land
vertically on a base": you must be stopped, at the right height, over a
base. It then refuels at double rate and sets the auto take-off bit.
`$5000` is the visible wind-up at the start of a life, looping `$5420`
until the tank is full.

**Being destroyed** runs the other way. `$4400` sets bit 3; `$5690`
flickers sprite 0 through frames `$88`-`$8F` in white multicolour with a
smoke puff on sprite 7; `$4800` sweeps the SID filter down and switches
all three voices to noise; `$5640` ends the life once the frame reaches
`$90`. Rendering those sprite blocks settles what they are: `$83` is the
jet, `$88` and `$89` are scattered debris, `$8F` is the debris thinning
out and `$90` is empty. The sequence is an explosion dispersing to
nothing.

## Hardware register census

Extracted from the snapshot image by decoding absolute-mode accesses to
`$D000`–`$DFFF`. The scan is linear, so it reads some data as code: rows
with an implausible register (`$D0C9`, `$D4CF`, `$DDB0`, `$DDDD`) are
that, not real accesses, and are left out here. Everything listed was
checked against the disassembly.

| Register | What the game does with it | Where |
|---|---|---|
| `$D000`/`$D001` | player sprite X and Y. X is fixed at 172; Y is the altitude the flight envelope tests | `$5705`, `$4408`, `$5060` |
| `$D008`-`$D00D` | enemy **bombs** as sprites 5 and 6: `$5D6E`/`$5D73` write `$D008,x` and `$D009,x` with x = 2 or 4, so they reach `$D00A`/`$D00B` and `$D00C`/`$D00D`. Sprite 4 is not touched here | `$5D6E` |
| `$D00E`/`$D00F` | sprite 7, the smoke puff that follows a falling wreck | `$505A` |
| `$D010` | sprite X high bits, read as well as written: the world is wider than 256 pixels | `$4761`, `$5D31` |
| `$D011` | written from 20 sites, three of them the raster split | `$4AD6`, `$4AEE`, `$4B03` |
| `$D012` | raster compare, set per band; also polled at `$4B44` to sync the install | `$4ADB`, `$4AF3`, `$4B08` |
| `$D015` | sprite enable, eight write sites — aircraft appear and vanish | `$473D`, `$56AC` |
| `$D016` | control 2; multicolour on, 40 columns, horizontal scroll left at 0 | `$46CA`, `$4720` |
| `$D018` | screen and charset base; rewritten when the display changes between title and play | `$1905`, `$46C7` |
| `$D019`/`$D01A` | interrupt acknowledge and enable | `$4B0D`, `$4B2D`, `$41E0` |
| `$D01C`, `$D027` | sprite multicolour select and sprite colours | `$435C`, `$4364` |
| **`$D01E`** | **sprite-to-sprite collision**, read once per pass into `$8B` | `$4204` |
| **`$D01F`** | **sprite-to-background collision**, read once per pass into `$8C` | `$4241` |
| `$D020`/`$D021`/`$D023` | border and backgrounds; the raster split writes `$D021` and `$D023` per band | `$4AC8`, `$4AE2` |
| `$D400`–`$D412` | SID voices 1–3: frequency, control and envelope all written, so the music is a conventional three-voice engine, not frequency-only | `$4975`, `$49F5`, `$4B8E` |
| `$D416`, `$D417`, `$D418` | filter cutoff, resonance and volume — the filter is used, including a sweep during name entry | `$4D4B`, `$4DEF`, `$4E1C` |
| **`$D41B`** | **oscillator 3 output read as the random number source** | `$43BC`, `$4513`, `$4650` |
| `$D800` | colour RAM written from five sites only | `$191C`, `$44C4` |
| `$DC01` | control port 1 and keyboard row 7, twelve read sites | `$5700` in play |
| `$DC02`/`$DC03` | CIA1 data direction registers, written once each at `$5AE2`/`$5AE7` |
| `$DC0D` | CIA1 interrupt control; `$4B32` writes `$7F`, disabling the KERNAL's timer interrupt | `$4B32` |
| `$DD06`/`$DD07` | CIA2 Timer B: the game's tick | `$41C0`, `$466A` |
| `$DD0E`/`$DD0F` | CIA2 control, starting that timer | `$411D`, `$4120` |

Registers the game never touches are informative too. It writes no sprite
Y-expand (`$D017`), no sprite X-expand (`$D01D`) and no sprite priority
(`$D01B`): the aircraft are all unexpanded and all in front of the
scenery.

Two rows earn their own note:

- **Randomness comes from the sound chip.** `$43A9` reads `$D41B`, the
  output of SID voice 3's oscillator, masks it to 0–3, adds `$88` and
  writes the result as a sprite pointer — but only for an aircraft whose
  state byte has reached `$E0`, which means destroyed. What the SID's
  noise chooses is which frame of the debris cloud a wreck shows, not how
  an aircraft is flying. The player's own wreck uses all eight frames
  (`$56A1`). Wave direction and spawn position are drawn from the same
  register at `$4520`.
- **Collision detection is entirely the VIC's.** `$4200` reads `$D01E`
  and `$D01F` once each and keeps them, because reading those registers
  clears them. Bit 0 of either is the player, and both paths call the same
  `player_hit` at `$4400`.

## Data tables

| Where | What |
|---|---|
| `$3800`-`$3FFF` | the terrain map: 256 world columns by 8 landscape rows, one 256-byte page per row, walked by `$509F` through `$0E`/`$0F`. The world is 256 columns round |
| `$3800` | its top row, which carries the bases. `$0B` is desert, `$69` a second terrain tile (42 cells), and each base is `$16 $17 $16 $17` |
| `$4000` | a 256-entry glyph-to-colour table; `$509F` and `$4E70` colour a cell by looking its glyph up here |
| `$2E00` | 200-byte status-panel template, copied to rows 20-24 by `$4E70`; `$FF` means leave the cell alone |
| `$2A00`-`$2AE0` | six note tables, a base SID register image and the note lengths for the title tune |
| `$4F00`-`$4F5F` | SID register images: three 25-byte sets for `$D400`-`$D418` and four 7-byte sets for one voice |
| `$5B80`/`$5B90` | the FALCON PATROL logo, two rows of 16 glyphs, copied into the title page |
| `$3150`-`$315F` | glyphs `$2A`/`$2B`, the bomb crater, re-randomised every pass by `$5E45` from `$DD04`; `$3160` is their silhouette mask |

Zero-page object records:

| Where | What |
|---|---|
| `$48`, `$4C`, `$50`, `$54`, `$58` | enemy aircraft, four slots, sprites 1-4: row, world column, fine Y, fine X, state (`$00` empty, below `$D0` flying, `$D0` and up exploding or leaving) |
| `$30`, `$33`, `$36`, `$39` | the player's AAMs, three bytes each: column, row, direction (`$00` free, `$01` left, `$FF` right) |
| `$3C`-`$3F` / `$40`-`$43` | enemy shots: row (negative means free) and column |
| `$9F`-`$A8` | enemy bombs, sprites 5 and 6: row, column, fine Y, fine X, busy |
| `$12`-`$16` | five score digits, `$16` the units; `$17`-`$19` fuel; `$1A`-`$1C` AAM count; `$1D` lives; `$0D` world offset; `$AA` the current kill award |

## Sound

SID voice control registers are written at `$4BD3`–`$4BE1` in the title
loop, and a filter sweep runs at `$4D4B` during name entry. Not yet
analysed further.

## Live tests

Every test below was run on a booted machine, with the program counter
sampled first to prove it was executing. Checkpoint hit counts stopped
recording part way through the session — `$4AC0` reported zero hits while
the program counter was caught inside that very handler — so nothing here
rests on one.

**The take-off gate, the ceiling and the input byte, in a single run.**
With the aircraft on the pad and `flight_flags` = `$03`, holding up gave:

| t | `$22` | `$0C` | sprite Y |
|---|---|---|---|
| 0.0 s | `$03` | `$FF` | `$84` |
| 0.5 s | `$01` | `$FE` | `$75` |
| 1.5 s | `$01` | `$FE` | `$56` |
| 2.5 s | `$01` | `$FE` | `$37` |
| 3.0 s | `$01` | **`$FF`** | `$2F` |

The take-off bit cleared as soon as the climb began, the input byte showed
the forged `$FE`, and at `$2F` — one below the `$30` ceiling — the game set
the up bit again and the climb stopped.

**Horizontal control**, airborne:

| held | `vel_x` over 3 s | `world_x` |
|---|---|---|
| nothing | 0 0 0 0 0 0 | `$42` throughout |
| right | +2 +3 +3 +3 +3 +3 | `$46` → `$90` |
| left | +1 −1 −3 −3 −3 −3 | `$96` → `$5C` |

Clamped at exactly −3 and +3, as `$54A8` reads.

**Refuelling, twice.** From the moment the jet touches the pad: `$5390`
flies it down (`$6E` → `$7A` → `$84`), bit 0 sets, and the fuel digits
climb `[0,0,0]` → `[9,0,0]` over about nine seconds while the AAM count
rises to `[1,0,0]` and **sticks at exactly 100**. Bit 1 is set in the same
half-second that the fuel reaches 9.

**Being destroyed.** Caught live: `$22` = `$08`, `$0C` = **`$FD`** — the
forced dive — and sprite Y falling `$92` → `$A2` → `$B1` → `$BF`, where
`$0C` returned to `$FF` as the floor took over. Then a new life, the jet
lowered onto the pad again, and the refuel cycle repeated.

**Low fuel.** Poking the hundreds digit `$17` to zero with the other two
non-zero set `flight_flags` bit 6 within one frame, exactly as `$5570`
reads. **Bit 7 (tank empty) was not observed live**: the aircraft was
destroyed before the tank emptied on every attempt. It rests on the code
at `$5582` alone.

- Checkpoint hit count on `$4AC0`: 302 hits in 2 s, 604 in 4 s — three per
  PAL frame, so the raster split is real and running.
- Program counter sampled repeatedly: this is the quickest test of whether
  the game is actually running. A live machine returns a scatter of
  addresses (`$41C3`, `$58CC`, `$5314`, `$51D7`); one that returns the
  same address every time is parked in a sync loop, or is not executing at
  all. It is how the frame pace at `$41C0` was identified.
- Load watchpoint on `$DC01` stopped at `$5703`, with a backtrace showing
  the call came from `$419A`. That is how the in-game input reader was
  found, after a byte search for `lda $DC01` had produced twelve
  candidates and checkpoints on all of them had reported nothing.
- Holding each input bit in turn and watching sprite 0's position: bit 0
  climbs. Horizontal control could not be exercised, because every state
  reached so far has the input overridden.
- `$00A0`–`$00A2` watched over 3 s: `$0010` → `$000D`, counting **down**,
  proving it is not the KERNAL clock.
- A restored snapshot runs: after `vice_snapshot_load` with no stopping
  checkpoint in place, the program counter scatters and CIA2 Timer B
  counts down `$3059` → `$2989` → `$2604` → `$20D9`. Snapshots are a sound
  basis for live tests.
- A checkpoint with `stop` set opens VICE's **monitor**, and while the
  monitor is open the emulation is paused — `vice_execution_run`,
  `vice_machine_reset` and `vice_autostart` all report success and change
  nothing until it is closed. A paused machine reports
  `"execution": "running"`, screenshots its last frame, returns steady
  plausible memory values and gives every checkpoint a hit count of zero.
  No negative result from this game is worth anything until the program
  counter has been sampled a few times and seen to move.
