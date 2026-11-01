# Rambo: First Blood Part II — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`
(`work/entry.vsf`, stopped at `$C006`).

## Build

Ocean's original disk, master date 4 December 1985 (track 18, sector 2),
protected by the XROM system of Tequila Sunrise, Belgium. The game is one
load that fills every page of RAM; nothing is loaded during play. The
game's own credits are in the heroes table's default names (`$B0F0`):
coding Tony, Dave, Bill and Martin; graphics Steve, Tony and Dave; music
and sound effects Martin (the tune data also holds "MUSIC BY MARTIN
GALWAY" at `$922B`); tape loader Bill.

## Memory layout

| Thing | Where |
|---|---|
| Zero page: object tables, multiplexer copies, scroll and map state, driver sequence pointers | `$02`-`$FF` (runtime; `game_init` clears `$03`-`$FF`) |
| Jump table used by the helicopter stage | `$0337`-`$0381` |
| Jungle engine: main loop, items, enemies, POWs, energy, messages | `$0382`-`$2832` |
| Mission message scripts | `$0579`-`$07A3` |
| Helicopter stage | `$3000`-`$38E1` |
| Score digit font (seven bytes a digit) | `$3980` |
| Screen (video bank 1) and sprite pointers | `$4000`-`$43FF` |
| Panel sprites (ENERGY, SCORE, the bar, the digits) | `$4400`-`$447F` (pointers `$10`, `$11`) |
| Sprite shapes | `$4480`-`$77FF` (pointers `$12`-`$DF`) |
| Character set: front end's at the hand-over, the jungle's in play | `$7800`-`$7FFF` |
| Arc table of thrown shots | `$8000`-`$801B` |
| Music and effects driver | `$8100`-`$90B8`; tables `$90B9`-`$9290`; tune data `$92DA`-`$AFB3` |
| Heroes table: scores, names, order | `$B000`, `$B0F0`, `$B41A` |
| Front end: printer, attract pages, name entry, front-end interrupt | `$C000`-`$CFFF` |
| The jungle's character set at the hand-over (RAM under I/O) | `$D000`-`$D7FF` |
| Working map (rewritten every game) | `$E000`-`$E76F` |
| Clean map, 119 rows of 16 tiles, row 0 the south end | `$E770`-`$EEDF` |
| Tiles, 8 by 8 characters each, tiles 0-66 | `$EF00`-`$FFBF` |
| RAM vectors (NMI to an RTI, so RESTORE does nothing) | `$FFF8`-`$FFFF` |

## Conventions

- Objects are zero-page arrays indexed 0-13: Y `$45,x`, X low `$7D,x`
  with bit 8 in `$61,x`, sprite frame `$8B,x`, colour `$99,x`. Slots 0-4
  are enemies (state `$11E5`, type `$11EA`; slot 4 is the special object
  placed at map marker `$FD`), 5-8 the enemies' four bullets and 9-11
  Rambo's three shots, one table of seven (X in two-pixel units at
  `$82,x`, active flags `$1919`; the shots' type `$191D` is entries 4-6), 12 the item or the helicopter, 13
  Rambo, drawn as hardware sprite 0 by `irq_top`.
- The stick byte `$1D06`: bit 0 up, 1 down, 2 left, 3 right, 4 fire,
  set when pressed (`read_stick`, which ANDs both CIA 1 ports).
- The map row `$FE`/`$FF` is the row at the top of the screen and grows
  northward; `$F8` is the column; `$E3` and `$E4` are the fine scrolls.
- `$C000` (`print_text`, at `$C077`) takes the two bytes after its
  caller's JSR as the address of a printer script and returns past them;
  18 calls do so. Scripts are characters, or `$FF` and a command (0 end,
  1 move, 2 colour, 3 fill, 4 large letters, 5 normal).
- The music driver has one entry, `$8100`, with a command number in A
  (31 commands through `$836E`/`$838D`). Several commands enter runs of
  BIT instructions part way, the hidden `LDY #n` choosing a tune or an
  effect; those BITs mint false symbols in other parts of the program
  (`$03A0`, `$0FA0`, `$11A0`, `$17A0`, `$23A0`, `$0BA0`, `$09A0`,
  `$05A0`, `$06A0`, `$07A0`, `$47A0`).

## Timing

The game interrupt alternates two handlers (`irq_game`): the multiplexer
(`$22C5`), which reschedules itself down the screen, and the panel and
input handler (`$217C`) from line `$DB`. The main loop waits on two
counts the interrupt sets (`frame_wait`), so it runs at most once a
frame; how often it actually keeps up was not measured.

## Controls

Joystick in either port (`read_stick` ANDs `$DC00` and `$DC01`). Space
selects the previous owned weapon (`weapon_select_key`, key code `$3C`),
S toggles sound effects and the tune (`music_toggle_key`, `$0D`),
RUN/STOP pauses (`key_pause_toggle`, `$3F`). *Live:* the stick and fire
move through the front end and the name wheel.

## Mechanics

- Energy `$0CC3` starts at `$30`; damage accumulates in `$0B` and drains
  one unit a frame (`energy_tick`). A walking enemy touching Rambo adds
  4, an enemy bullet 7, the gunship's shot 5; in the helicopter the fuel
  timer adds one unit every `$3064` frames.
- Rambo carries weapons 0-2 at the start (`$19ED` = 7); items add bits.
- Enemies come from seven entry zones (`$11EF`-`$120B`), limited by a
  spawn budget `$119B` that explosions, thrown weapons and a 1-in-200
  chance a frame raise; once `$0AFF` is set they spawn without limit.
- Enemies fire with a chance that grows going north (`bullet_fire`).
- Explosions damage the map tile under them through `$1241`.
- Item slot 3 starts the helicopter stage; its first landing puts Rambo
  back in the jungle (`heli_landing_check`), which unlocks the hut
  (`$0B00`). Opening the hut with weapon 0 frees ten POWs and makes the
  gunship pursue on the next flight; landing then from map row `$300`
  northward ends the game with message 4.
- The gunship needs five hits from the rocket: `gunship_hit_test` counts `$3127` down from 4 and downs it on the hit that finds 0.
- The input lock `$1CE4` is read by `read_stick` and `scroll_mask_heli`
  but only the two routines at `$07A4` and `$07AA` write it, and nothing
  calls them: in this build the lock is never set.

## Data tables

The tune table `$91E3` holds twelve tunes (three sequence pointers
each); the effect sequence tables are at `$9241`-`$929A`. `$B6FB`-`$BFFE`
holds data in the driver's sequence format that no pointer found here
reaches.

## Sound

Martin Galway's driver: three copies of one voice routine (`$870C`,
`$8A46`, `$8D82`), sequences of note-and-length pairs and command bytes
`$C0`-`$DC` (return, call, jump, repeat, instrument loads, transpose,
native code), arpeggios and four-segment slides, pulse sweeps, and a
master volume sweep.

## Register census

The game writes the video chip's sprite, scroll, memory, interrupt,
colour and mode registers; the SID's voice, filter and volume registers;
CIA 1's ports (stick and keyboard), timer A low byte (the random seed
`$DC04`) and interrupt control; CIA 2's port A (`$DD00`, video bank 1)
and, in unused code at `$CF0D`, its time-of-day clock. It never touches
the sprite collision registers (`$D01E`, `$D01F`): collisions are boxes
worked out in software (`box_hit`, `heli_box_hit`).

## The listing's error rate

Sample, seed 20261102: 60 of the listing's 925 comments, drawn with
`sample.py` and checked by a fresh agent on claude-opus-5-5 that wrote
none of them. It found 18 wrong, all in a detail and none in what the
code is for: 30 % (95 % interval 20 % to 43 %), over the mark of 2 in 60,
and a lower bound, since a checker misses some. The wrong details were
mostly counts and ranges (the gunship takes five hits, not four; a
POW's step count; the rescue's state byte), a height table read as a
width, register and sprite numbers, which bytes a routine reads, and
two descriptions of scripts and characters ($106A prints no text; $5B is
the front-end font's space). All 18 were corrected, with every other
comment that said the same, and so were three beliefs found while the
sample was out: the seven bullet slots (four enemy bullets and Rambo's
three shots), the S key (it sets which voices the music may use) and the
driver's "fades" (repeating sounds). An audit of every comment is
recommended (TODO.md).

## Live tests

- *Live, 2 November 2026:* with the loader's first file open retried
  once, the game reaches its instructions about 75 seconds after the
  autostart and plays (`orientation.md`).
- *Live:* `$C006` is the first instruction run outside the loader's
  pages after the fast loader, with `$01` = `$37`.
