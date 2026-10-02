# Mr. Hat — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in `work/handover.vsf` (`orientation.md`). *Live*
means observed in VICE (vice-mcp v3.13.1, PAL), with the script named.

## Build

No version or build string was found. The image is a freezer backup of
the game on its title screen (`orientation.md`); the game's own BASIC line
survives at `$0801`: `10 SYS 2157` and the text `SYSTEM EDITOR<<<E **`
(`$0810`). Chiola's earlier game Lupenio (SIPE, 1988) left text in the
image (below, "Text").

## Memory layout

| Thing | Where |
|---|---|
| Entry (`SYS 2157`) | `$086D`: `JSR $0876` (sets `$01` = `$36`, `JSR $16A3`, the title), `JSR $9265` (bitmap mode on), `JMP $087E` (clears `$F7`-`$FA`, `$44E0`, `$64F0`, `$64F1`, then `JMP $6E00`) |
| Title | `$16A3`: KERNAL IRQ back to `$EA31`, clears `$2000`-`$3EFF`, `JSR $CDC0`, sprite colours, `JSR $1770` (the fire wait) |
| Title font | `$CE00`-`$CFFF`, 64 glyphs, copied to `$2800`-`$29FF` by `$CDC0`; `$D018` = `$1B` (screen `$0400`, characters `$2800`) |
| Title words | screen codes at `$C000`-`$C05x` (below, "Text") |
| Play screen | bitmap at `$2000`-`$3F3F`, colours at `$0400`; `$9265` sets `$D018` bit 3 and `$D011` bit 5 |
| Mr Hat | hardware sprite 4: his position is the sprite's own registers `$D008`/`$D009`, stepped with `INC`/`DEC` in place (census below) *live* (`work/track.py`) |
| Lives marks | screen cells `$07E1` and `$07E2`, rewritten by `$1700`-`$1740` |
| Interrupts | title: `$0314` = `$C0AF`; play: `$0314` = `$1C00` (`JMP $AAB2`). `$01` = `$36` throughout (KERNAL and I/O in, RAM at `$A000`) |
| Leftovers of Lupenio | text at `$7E31`-`$7F9x` and `$A1F6`-`$A35x` |
| A machine-code monitor | the command letters `:;RMGXLSTFHDP,AB` at `$9FB7` and the register header `PC SR AC XR YR SP` at `$9FEA`: Supermon's; its calls to `CHRIN` and `CHROUT` sit in `$983E`-`$9EB2` |

## Timing

## Controls

- Joystick in control port 2: the title waits at `$1770` for `$DC00` to
  read exactly `$6F` (fire, nothing else). *live*
- Fire jumps: Mr Hat rises 21 pixels at once (sprite Y 204 to 183), stays
  13 frames and drops back; held, he jumps again. Stick up does nothing on
  a floor. Left and right walk, about 2.4 pixels a frame. *live*
  (`work/track.py death1`)

## Graphics

## Mechanics

## Data tables

## Sound

## Text

The game's words are screen codes, in the order of the C64's own set.
The title's font at `$CE00` is drawn two cells high: the top half of a
letter is its screen code, the bottom half the code plus 32 (on the
screen at `$0453` and `$047B`, forty cells apart). The source strings are
at `$C000`-`$C05x` (`OCTOPUS` at `$C00E`, `SNAILY` `$C018`, `KNIFFY`
`$C024`, `OTHERS` `$C033`, `SYSTEMS` `$C039`, `PRESENTS` `$C041`, `GAME`
`$C050`). SCORE, ROOM and STAGE are not stored as text in any encoding
(searched by letter differences, which survive any offset); the status
line is drawn as bitmap graphics.

PETSCII text in the image, none of it shown by Mr. Hat so far:

- `$7E31`: Lupenio's congratulation, in Italian: "SIPE COPYRIGHT STUPITA
  ANNUNCIA CHE GIOCATORE ECCEZIONALE E BRILLANTE! SEI UNO DEI POCHI CHE HA
  RISOLTO QUESTO DIFFICILE GIOCO BASATO SULLE PERICOLOSE E FURTIVE
  AVVENTURE DI LUPENIO. NON ERA FACILE SCOPRIRE LA RELAZIONE TRA LE CHIAVI
  E LE PORTE... BENE, MOLTO BENE!! UNA STRETTA DI MANO AL RE DEI
  VIDEOGIOCHI CON LE CONGRATULAZIONI DELLA: ..."
- `$A1F6`: Lupenio's introduction and credits: "...CA CASA PIENA DI
  PERICOLOSISSIMI GUARDIANI E TRAPPOLE MORTALI. ATTENTO AMICO MIO E
  RICORDA.... OGNI CHIAVE APRE UNA ED UNA SOLA PORTA PERCIO' FAI ATTENZIONE
  E CERCA DI TROVARE LA GIUSTA STRATEGIA DI GIOCO. CREATO, DISEGNATO E
  PROGRAMMATO DA ANDREA CUCCHETTO E FRANCESCO CHIOLA. UNO SPECIALE
  RINGRAZIAMENTO A: ANNA, CINZIA, MARCO E MARIO."
- `$9FB7`, `$9FEA`: the monitor's (above).

## Hardware register census

From the code traced by 30 September 2026 (`work/census.py`); the sweep
agents complete it.

| Register | Use | Where |
|---|---|---|
| `$D008`/`$D009` | Mr Hat's X and Y, stepped in place | about 400 `INC`, `DEC`, `LDA` and `STA` instructions across the room code |
| `$D000`-`$D00F`, `$D010` | the other sprites' positions and the X high bits | across the room code, `$1B04`-`$1BE3` (set-up), `$1C06`-`$1C81` (the IRQ) |
| `$D015` | sprite enable | `$16CA`, `$1B04`, `$1C1C`-`$1C7B`, `$08A1`-`$08B2` |
| `$D01E` | sprite-sprite collision; `$D01F` (sprite-background) is never read | `$170C`-`$173D`, `$1BBE`, `$1D95`, `$1DC4`, `$55EF` |
| `$D020`-`$D026` | border, backgrounds, sprite multicolours | `$16CF`-`$16EB`, `$1E71`-`$1EF7` and others |
| `$D027`-`$D02E` | sprite colours | across the room code |
| `$D011`, `$D012`, `$D018` | mode switches (`$9265`, `$CDC0`), raster reads for timing | `$A573`-`$B56F` |
| `$D400`-`$D418` | music (`$C123`-`$C34E`) and effects (`$1CB4`-`$1D18`, `$B4D0`-`$B63D`, `$8C43`-`$8C60`) | |
| `$DC00` | joystick port 2, read at 63 places; written (keyboard row select) at six | `$1770`, `$4022`, ... |
| `$DC04`/`$DC05`, `$DC0E` | CIA 1 timer A, set by the music | `$C106`-`$C1A0` |

## Live tests

- `work/pages.py handover ...`: one non-stopping execute checkpoint per
  page, `$0200`-`$CFFF`, over about 45 seconds from the title through
  room 1 (fire, walking, a jump, a death). Pages that ran: `$08`, `$10`,
  `$16`-`$1F`, `$42`-`$46`, `$56`, `$57`, `$61`, `$6E`-`$70`, `$7C`, `$80`-`$82`,
  `$85`, `$8C`, `$92`, `$A4`-`$AA`, `$B2`, `$B4`, `$B5`, `$BD`-`$C3`. The
  monitor's pages and Lupenio's text did not run.
