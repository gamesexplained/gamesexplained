# Summer Games II — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

US Gold's two-disk PAL release (`orientation.md`). Fourteen parts: the
resident loader, the title, the menu, the opening and closing ceremonies,
the eight events and the first game's two swimming events. Each has a
listing; the swimming events' is built from a snapshot taken during a
race (`parts/swimming/work/play.vsf`).

## Memory layout

| Thing | Where |
|---|---|
| Players' records, 32 bytes each: name, country text, score text, score (3 bytes, higher is better), medals, country number | `$0800-$08FF` (resident `shared_vars`) |
| Practising flag, number of players, event under way | `$081D`, `$081E`, `$081F` |
| Number of joysticks | `$087D` |
| The loader, its NMI handler and its file table of 20 records | `$0900-$0FFF`; table at `$0C47` |
| Hand-over to a part | `jmp` at `$0AF3` |
| The menu | `$0F00-$3FFF` |
| An event | from `$1000`, `$1C00`, `$4000` or `$4C00` up, by its record in the file table |

## Timing

| Part | Clock | Rate | Where |
|---|---|---|---|
| Rowing | a tenth every 5 frames | right on PAL | rowing's clock slot |
| Cycling | a tenth every 6 frames | right at 60 Hz; a PAL machine shows 10 s for 12 real seconds (*live*: 600 frames moved it 10.0 s) | cycling `irq_clock` `$9808` |
| Swimming | a tenth every 6 frames, BCD, to 9:59.9 | the same (*live*: 600 frames, 10 s) | swimming `clock_tick` `$EF46` |
| Kayaking | CIA 2's time-of-day clock in its 60 Hz setting | a PAL machine feeds it 50 Hz (*live*: 16.9 clock seconds in 989 frames) | kayaking `clock_unlatch` and the TOD registers |
| Equestrian | 3 hundredths a frame | 50 game seconds take 33 frames each | equestrian `st_ride`, `add_faults` |
| Fencing | 2 hundredths a frame, from 3:00 down | | fencing's clock |

The menu's music player runs twice a frame (`$1E32`).

## Controls

Every event reads the joystick through CIA 1 (`$DC00`, `$DC01`). Where two
players race side by side (Rowing, Cycling, Swimming) the first button
pressed at the start decides which joystick drives which competitor.

- Swimming: right dives (*live*: the dive phase went from $FF to 8 a
  frame after right was pushed); left at the far end turns; fire, in
  time with the stroke, changes the speed (`stroke` `$FB99`,
  `speed_change` `$FC82`).
- Equestrian: up quickens, down slows; at a fence the course's code and
  joystick right decide the jump (`st_ride` `$1F46`); fire is read only
  to start the count and after a fall. A run holding fire jumped the
  first two fences by itself, both of code 2, which jumps whatever the
  stick says (*live*); whether fire alone can jump a fence of code 1 or
  3 was not settled live.

## Graphics

Each part sets its own video bank through CIA 2 (`$DD00`) and runs its own
raster interrupt. Cycling has 11 interrupt slots and two screens at
`$4000` and `$4400`; Rowing seven slots; Swimming four handlers chosen by
raster line, a double-buffered scrolling bitmap in banks 0 and 1, and
sprites shared between the two swimmers above and below line `$BD`.

## Mechanics

The rules each event's code applies are in `features.md`, row by row,
with the routine for each.

## Data tables

- The loader's file table, `$0C47`: side mask, load address, unpack
  address, unpack end, entry, and the one-letter name.
- The swimming events' event table: `$E514` for the relay (title `$F4EB`,
  finishing mask `$F8`, hand-over wall count 6), `$E50F` for the 100
  metres (title `$F513`, mask `$FE`, 0).

## Sound

Register census over all fourteen parts (`kit/cpu/census.py`, each part's
listing):

| Register | Used by | What for |
|---|---|---|
| `$D400-$D406` voice 1 | every part with sound | tunes and effects |
| `$D407-$D40D` voice 2 | menu, opening; Fencing, Triple Jump, closing and swimming touch its frequency or control | the anthems and the opening's tune; the swimmers' second voice |
| `$D40E-$D414` voice 3 | most events | the crowd's noise, beeps, footsteps |
| `$D415-$D417` filter | Triple Jump, Rowing, Javelin, High Jump, Cycling, Kayaking; the resident clears it | filtered noise for the crowd and the oars |
| `$D418` mode and volume | menu, opening, the events with a crowd, swimming | the crowd's volume follows the result in High Jump and Javelin |

## Register census

The I/O registers the fourteen listings name, beyond the SID's:

| Register | Parts | What for |
|---|---|---|
| `$D000-$D00F`, `$D010` sprite positions | every part with sprites | the athletes, the clocks' digits, the swimmers |
| `$D011`, `$D012`, `$D019`, `$D01A` | every part | raster interrupts and the screen's mode |
| `$D016`, `$D018` | every part but the resident | fine scroll, multicolour, screen and character set |
| `$D017`, `$D01D` sprite expansion | menu, closing, most events | the big flags and the scoreboards |
| `$D01B` sprite priority | Triple Jump, Rowing, Javelin, Kayaking | athletes behind the stands or the banks |
| `$D01C`, `$D025`, `$D026` multicolour sprites | most parts | |
| `$D01F` sprite-background collision | Javelin, Kayaking | read to clear it as the interrupt starts; Kayaking's hull uses it |
| `$D024` background colour 3 | Rowing, Cycling | |
| `$DC00-$DC03` CIA 1 ports | every part | joysticks and keyboard |
| `$DC0D` CIA 1 interrupts | every part but the title | turned off as each part takes the machine |
| `$DC0E` CIA 1 timer A control | Equestrian, High Jump | stopped as their interrupt starts |
| `$DC0F` CIA 1 timer B control | Triple Jump, Rowing, Cycling | bit 7 cleared as the screen is set up |
| `$DD00`, `$DD02` CIA 2 port A | every part that moves the video bank | the VIC's bank |
| `$DD04`, `$DD05`, `$DD0D`, `$DD0E` CIA 2 timer A | resident only | the loader's timing while it loads |
| `$DD08-$DD0B` time-of-day clock | Kayaking only | the run's clock |
| `$00`, `$01` processor port | every part but the menu | banking BASIC and the KERNAL out |

No part writes `$DC04-$DC07` or `$DD06-$DD07` (the CIA timers' latches
other than the loader's) or `$D01E` (sprite-sprite collision).

## The listing's error rate

A sample of 70 comments (seed 2617: 10 of the 172 generated, 60 of the
written), checked on a proven model by a checker that wrote none of
them, found 7 wrong: 1 generated and 6 written, 10.0 % with an interval
of 4.9 % to 19.2 %. All seven were corrected, with the other comments
that said the same thing (fencing's 20 bitmap-cell comments among them).
That is over the mark, so a full audit is recommended (`TODO.md`).

## Live tests

On 17 November 2026, in vice-mcp release v4.0.0 (VICE 3.10), from each part's
entry snapshot:

- Cycling's clock moved 10.0 seconds in 600 frames, with its handler at
  `$9808` run 600 times.
- Swimming's clock moved 10 seconds in 600 frames, with `clock_tick`
  run 600 times; joystick right dived; pressing fire about every third
  of a second let the speed fall to 1; at the far end the swimmer turned
  by itself and LAP 1 stayed on the panel.
- Kayaking's TOD clock moved 16.9 seconds in 989 frames.

Not checked: whether the Epyx NTSC disk's Rowing also counts a tenth
every 5 frames, because its modules are outside the directory, where
`disk.py` does not reach.
