# Jellyland: verified technical facts

The file `la`, `$5A00`-`$B0FF`. The other four lands have the same
layout; each one's `facts.md` gives only what differs. Unless marked
*live*, a fact comes from the code.

## The land file

| Range | What |
|---|---|
| `$5A00`-`$77FF` | sprite frames `$68`-`$DF`; `$5A00`-`$62FF` is the same in Jellyland, Pipeland, Spottyland and Rockland, and differs in Cherryland in frames `$72`-`$74` and `$76`-`$78` |
| `$7800`-`$7FFF` | the sad character set |
| `$8009`-`$88F8` | 143 tiles of 4×4 glyphs at `$8009` + 16 × tile; tile 1 is the star tile |
| `$8900` | glyph colours, sad (swapped with `$A800`, happy) |
| `$8A00`-`$8FFF` | the map: six bands, 242 tile columns each, and 14 markers at the same positions in every band |
| `$9000`-`$9199` | the parameter block |
| `$919A`-`$9299` | the stage card's strips, sad and happy |
| `$929A`-`$9359` | the card's frames |
| `$935A`-`$93D9` | the title's raster handlers and top-score sprite tables |
| `$93DA`-`$96E2` | object tables |
| `$96E3`-`$974B` | 15 restart-point tables of 7 entries |
| `$974C`-`$97D9` | Theo's speech |
| `$97DA`-`$9956` | three tunes |
| `$9957`-`$9E53` | 28 horizontal and 26 vertical movement paths, 41 animation scripts, 9 colour lists |
| `$9E54`-`$9F3D` | the top score and the cheat |
| `$A000`-`$A4B0` | the object list, 80 records of 15 bytes, ended by `$FF` |
| `$A4B1`-`$A712` | the title |
| `$A900`-`$B0FF` | the happy character set |

## The title

Jellyland's file holds the title screen. The loader jumps to `$A547`
after loading it, and so does game over at level 0 (`$3EA7` in the
engine). It makes the land happy, puts the stars back (`$A4B1`), shows
the top score, plays the title tune and scrolls the happy map from
column `$90`; fire on port 2 starts a game.

- The title tune is the engine's `$1600`: `$9E6A` swaps `$1600`-`$17FF`
  with `$7000`-`$71FF` and `$D6CB`-`$D76D` with `$7200`-`$72A2`, `$A5A7`
  plays it from `$7000`, and `$A632` swaps both back.
- The top score is `$F97F`-`$F987` in the engine; `$9E89` keeps the higher
  of score and top score, and `$9E54` shows it.
- The cheat (`$9EF9`, called each frame by `$A63D`): typing 2 1 5 4 3 5 1
  4 3 2 5 2 3 1 4 4 1 2 5 3 2 4 3 5 1 on the keys 1 to 5 (`$9EE0`) writes
  RTS over the engine's `life_lose` (`$BDC1`), so losing a life takes
  none. A wrong key starts the sequence again. Sprites 0-2 change colour
  as the sign (`$93A7`); the title puts the byte back each time it starts
  (`$A58B`). *Live*: the 25th key wrote `$60` there, and running the
  clock out then left the lives at 03 where the control lost one.

## Numbers

- Dust quota 10 (`$903E`-`$9040`); the star count starts at 153
  (`$9041`-`$9043`) and the target is 40 (`$904A`-`$904C`), so the star
  quota is 113, as the loading screen says (`$D793` in the engine).
- Time 250 sad (`$9044`-`$9046`).

## Object types

The type-to-script tables (`$956E`-`$9668`) are indexed by the record's
type, plus 25 while happy; no land's records use a type of 25 or more.
A record whose byte 5 has bits 6 and 7 both set names an animation
script directly instead of a type (`$E8A0` → `$E92B`), with its delay
from `$952E`.

## Theo's speech

"WELL DONE MAY-HEM. YOU HAVE CO-LLEC-TED / EN-OUGH MAG-IC DUST FOR ME TO
SPREAD / AC-ROSS JE-LLY-LAND. I CAN NOW MAKE / IT A HA-PPY PLACE ONCE
MORE!" (`$974C`). The hyphens split the syllables for the speech sound (`$D460`) and are not drawn.
