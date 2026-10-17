# Thrust — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

TCI's crack of the Firebird release, one packed file on a D64
(`orientation.md`). There is no version string. The crack's marks are
the "TCI" added to the title picture, "SYNDICATE" in all eight places of
the high score table (`$B86A`), the BASIC line `SYS 2082 THE SYNDICATE
1986`, and the line "Cracked By The Syndicate For TCI !" at the end of
`bbc_keys_text` (`$B9DD`).

## Memory layout

As `play.vsf` holds it, with `$01` = `$36` and the video chip in bank 1.

| Thing | Where |
|---|---|
| Game code | `$8200`-`$BEFF`, moved there by the crack's relocator at `$6C16` |
| Start-up code, assembled for `$0400` | held at `$B773`-`$BA72`, copied to `$0400` by `copy_startup_to_0400` (`$B70B`) and run there |
| Data copied at start-up | `$4000`-`$4CFF`, from `$6C47` (`game_start`, `$B675`) |
| Video chip's bank | `$4000`-`$7FFF` (`$DD00` = `$3E`, *live*) |
| Raster list | `$0E01`, three bytes an entry: handler number, then the next line at `$0E03` (`raster_dispatch`, `$8964`) |
| Keyboard matrix copy | `key_rows`, `$9DDA`-`$9DE1` |
| Message texts | `$9516`, `$B967` |
| High score names | `$B86A` |

## Timing

- One interrupt handler, `irq_handler` (`$8943`), through the KERNAL's
  IRQ entry and `$0314`. It took about 350 interrupts a second in play
  (*live*: an execute checkpoint counted 350 in one second).
- A raster interrupt goes to `raster_dispatch`, which jumps through
  `raster_handler_lo`/`hi` (`$89BA`, `$89BF`) to one of five handlers:
  `$89C4`, `$8AA1`, `$8A3E`, `$8A4D`, `$8A8C`.
- A CIA 1 timer interrupt decrements `$B46B`.
- `raster_handler_0` (`$89C4`) counts frames in `$1A`.

## Controls

- `read_keyboard` (`$9DE2`) scans all eight rows into `key_rows`, inverted.
- `key_pressed` (`$B476`) tests a key by matrix number, row × 8 + column,
  with `bit_masks` (`$8B29`); `key_pressed_live` (`$B472`) skips its `$63`
  check.
- Keys the code tests, found as `LDX #key` / `JSR $B476` or `$B472`:

| Key | Number | Tested at | Effect |
|---|---|---|---|
| A | `$0A` | `$9E0F` | `$0D` − 1 (turn anticlockwise), *live* |
| S | `$0D` | `$9E18` | `$0D` + 1 (turn clockwise), *live* |
| right Shift, left Shift | `$34`, `$0F` | `$95CF`, `$95D6` | thrust (left Shift *live*) |
| Return | `$01` | `$A9A7` | fire, *live* |
| Space | `$3C` | `$97BB`, `$B020`, `$B274` | shield and tractor (*live*), start a game (*live*) |
| F5, F7 | `$06`, `$03` | `$975F`, `$976E` | pause and continue, *live* |
| F1, F3 | `$04`, `$05` | `$977D`, `$9786` | `$A2` = `$FF` (sound off), `$A2` = 0 (sound on) |
| RUN/STOP | `$3F` | `$B269`, `$B3E0` | not read yet |

- `$0D` is the ship's direction, kept to 0-31 (`rotate_ship`, `$9E09`),
  and only changes on a pass when `$19` AND 3 is non-zero.
- The pause (`pause_keys`, `$975F`) needs `$27` = 0. Its routine ran 33
  times in 50 frames (*live*), so F5 held for 5 frames was missed and for
  10 frames was taken.
- `control_keys` (`$B4BC`) lists A, S, Return, right Shift, Space. Which
  code reads it is not known yet.

## Graphics

- The ship is sprite 7. Its pointer (screen + `$3F8`) was `$00` with the
  nose up; 25 frames of S made it `$0B`, 25 of A `$15` (*live*).
- The status bar has a screen split of its own: `frame-play.json` in
  `work/` recorded 43 writes in one frame, with `$D018` and `$D011`
  changed near line 65 and again at line 277.

## Mechanics

Not read yet. Seen live: thrust 25 frames from `play.vsf` cost 5 units of
fuel (1035 to 1030); the shield for 25 frames cost 8 (1035 to 1027).

## Data tables

| Table | Where | What |
|---|---|---|
| `raster_handler_lo`/`hi` | `$89BA`, `$89BF` | five raster handlers |
| `bit_masks` | `$8B29` | `$01`, `$02` … `$80` |
| `control_keys` | `$B4BC` | five key numbers |

## Text

The game's texts are plain ASCII, upper and lower case. A search by
letter differences found "FUEL" only as `fuel` inside "Out of fuel"
(`$B9D8`, and copies at `$0665` and `$0971`), and a scan for printable
runs found the rest. The messages at
`$B967` are each two bytes, then the text, then `$FF`. The status bar's
FUEL, LIVES and SCORE are not stored as text anywhere in the image (the
same search found no LIVES or SCORE); they are drawn some other way, not
yet found.

| Where | Text |
|---|---|
| `$9516`-`$9585` | Mission Complete · No Bonus · Planet Destroyed · Reverse Gravity · Invisible Landscape |
| `$B967`-`$B9DB` | Game Over · Top Eight Thrusters · Congratulations · Please enter your name · Press SPACE BAR to start · Out of fuel |
| `$B9DD`-`$BB95` | the BBC Micro key page (`bbc_keys_text`): VDU 22,7, teletext codes, "Jeremy's Thruster Game", "The keys are:", the BBC keys, the crackers' line, "Press the space bar to start" |
| `$B86A` | SYNDICATE ×8, the high score names |

## Sound

The sound code writes the SID through its mirror at `$D500`-`$D518`, not
at `$D400`: every one of the 53 SID writes the census found does (the
first at `$9B62`). It never names `$D402`-`$D403` (voice 1 pulse width)
or `$D410`-`$D411` (voice 3 pulse width), and it never reads
`$D41B`-`$D41C`. Who wrote the music is credited elsewhere to Rob
Hubbard (`features.md`); nothing in the image names him.

## Hardware register census

From `kit/c64/census.py` over `play.vsf`, 124 instructions naming 48
registers. Grouped:

| Registers | Accesses | First at | What for |
|---|---|---|---|
| `$D000`-`$D001` indexed, `$D00C`-`$D00F`, `$D010` | `sta`, `lda`, `ora`, `and`, `eor` | `$8B0F`, `$8D0D` | sprite positions; sprites 6 and 7 by name, 0 to 5 indexed |
| `$D011`, `$D012`, `$D016`, `$D018` | 22 | `$8976`, `$89AD` | screen splits by the raster handlers |
| `$D015` | 7 | `$89D7` | sprite enable; `raster_handler_0` keeps only 6 and 7 |
| `$D019` | 4 | `$8946` | interrupt acknowledge in `irq_handler` |
| `$D01E`, `$D01F` | 7 reads | `$8CD0`, `$8CD3` | sprite-sprite and sprite-background collisions: what is tested is not read yet |
| `$D021`-`$D023` | 7 | `$89C6`, `$8A29` | background colours per split |
| `$D027` indexed, `$D02D`, `$D02E` | 3 | `$8AE6` | sprite colours |
| `$D400`-`$D418` as `$D500`-`$D518` | 53 | `$9B62` | sound (above) |
| `$DC00`-`$DC03` | 4 | `$9DEA` | keyboard (`read_keyboard`) |
| `$DC0D`, `$DD0D` | 2 reads | `$894B` | interrupt sources in `irq_handler` |

Named by no traced instruction: `$D013`-`$D014`, `$D017`, `$D01A`-`$D01D`,
`$D020`, `$D024`-`$D026`, the timers and control registers of both CIAs,
and `$DD00`-`$DD0C`. The start-up code at `$B773`, which runs at `$0400`
and is not decoded, writes `$DD00`, `$DD02`, `$D01A`, `$D020`, `$DC05`,
`$DC0D` and `$DC0E` (found by a byte search for the store instructions,
at `$B78C`-`$B846`).

## The listing's error rate

Not measured: this is a Bronze run, and no sample of the listing's
comments has been checked.

## Live tests

From `play.vsf`, 25 frames with and without each key, sprite registers
read at the end (`work/scripts/controls.py`): see Controls and Graphics.
Pause from `play.vsf`, 50 frames then F5 for 10, then 25 frames of
thrust (`work/scripts/pause_test2.py`): sprite 7 stayed on line 148 and
`$61` read 1; after F7, it moved.
