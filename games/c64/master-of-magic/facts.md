# Master of Magic — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

Remember's crack of the 1985 Mastertronic tape (release 15; `orientation.md`
has the image, the loader and the trainer). The game proper starts at
`$07F9`; nothing of the crack is called after it. No version string or
build identifier was found in the game's text.

`$8000`–`$8008` holds `18 08 18 08` and `CBM80` (`C3 C2 CD 38 30`): the
signature the KERNAL looks for on a reset and on RESTORE, with both its
cold and warm start vectors set to `$0818`, the game's restart.

## Memory layout

| Thing | Where |
|---|---|
| Entry: stack, `$00`/`$01`, KERNAL screen clear, BASIC RAM init | `$07F9` |
| Restart (the `CBM80` vectors), title, main loop | `$0818` |
| Menu dispatch: 18 handler addresses, WALK to UNCAST | `$4C03`–`$4C26` |
| A small number per menu verb, copied to `$03AF` on each choice | `$4C27`–`$4C39` |
| The handler index for each choice (`2n`) | `$4C3A`–`$4C4C` |
| Menu verbs, `$10`-prefixed, zero-terminated PETSCII | `$4130`–`$41C7` |
| Nouns: items, creatures, the pedestal, `-NOTHING-` | `$460C`–`$46AB` |
| Messages | `$46B3`–`$4930` |
| EXAMINE descriptions | `$51D1`–`$5704` |
| Spell names | `$5797`–`$57C9` |
| The ending ("WITH A SUDDEN FLASH OF CRIMSEN LIGHT THELRIC APPEARS...") | `$5A5D` |
| Title scroller text | `$8009` onward |
| Controls screen and the instruction pages | `$8391`–`$8F9A` |
| Top band character set | `$3000`–`$37FF` |
| Sprite register images for the top and bottom bands | `$3A00`, `$3A20` |
| Play-screen raster interrupt | `$2653`–`$287F` |
| Title and demonstration code, their raster interrupt | `$5B27`–`$5E43`, `$5D08` |
| Music: entries `$C000` (start tune A), `$C003`, `$C006`; tune start | `$C000`–`$C32E`, `$CBC3` |

## Main loop

`$0824` calls `$2BDE`, then, while `$03C7` is zero, `$11A2`, which returns
the chosen menu option in A. The option indexes `$4C3A` for an even offset
into `$4C03`, and the handler's address is written into the operand of the
`JSR` at `$0846` (`$0847`/`$0848`): the menu dispatch is self-modifying
code, which is why a flow trace stops at it. `$4C27` gives `$03AF` a value
per option. When `$03C7` becomes non-zero the game is over; `$7B` is the
win, which prints the ending through `$2941` and starts tune 2; anything
else starts tune 1.

| Option | Verb | Handler | `$4C27` |
|---|---|---|---|
| 0 | WALK | `$08B0` | 0 |
| 1 | RUN | `$08B9` | 0 |
| 2 | PICK UP | `$195C` | 5 |
| 3 | PUT DOWN | `$1AED` | 4 |
| 4 | INVENTORY | `$1A30` | 12 |
| 5 | OPEN | `$1B9D` | 8 |
| 6 | CLOSE | `$1C31` | 8 |
| 7 | WEAR | `$1D00` | 10 |
| 8 | TAKE OFF | `$1D8B` | 10 |
| 9 | PUT IN | `$1E21` | 5 |
| 10 | TAKE OUT | `$1F15` | 5 |
| 11 | LOOK IN | `$1FCB` | 10 |
| 12 | ATTACK | `$29FC` | 10 |
| 13 | SWAP | `$20A5` | 3 |
| 14 | EXAMINE | `$2CD4` | 10 |
| 15 | DRINK | `$2D5E` | 10 |
| 16 | CAST | `$2E23` | 20 |
| 17 | UNCAST | `$2F22` | 10 |

## Text

The game's text is stored as upper-case PETSCII (`$20`–`$5F`), zero
terminated, and printed through a conversion to screen codes. The top
band's character set at `$3000` keeps the letters, digits and punctuation
at their standard screen-code positions (`$01`–`$1A`, `$20`–`$3F`); its
own graphics start at `$40`: window borders, the map tiles and small
figures. So there is no private alphabet. `+` stands for the apostrophe
("YOU+RE DEAD...").

## Hardware registers

From the code traced by the end of the sweep (`$07F9`–`$2F52`,
`$3A40`–`$3BCA`, `$5B27`–`$5E43`, `$C000`–`$C32E`, `$CBC3`); rerun when the
coverage step has traced the rest.

| Register | Use | Where |
|---|---|---|
| `$D000`–`$D010`, `$D015`, `$D017`, `$D01B`–`$D01D`, `$D027`–`$D02E` | sprite registers, written only by the play interrupt from its tables at `$3A00` and `$3A20` | `$26A2`–`$275B`, `$27EA`–`$287D` |
| `$D011`, `$D012`, `$D018`, `$D016` | the raster bands: mode, next raster line, bases | `$2653` handler, `$5D08` handler, setup at `$0A18` and `$5B32`–`$5C65` |
| `$D019`, `$D01A` | raster interrupt acknowledge and enable | the handlers; `$263F`, `$5B32`, `$5B9F`, `$5C4B` |
| `$D01F` | sprite-to-background collisions, read in two bands and collected into `$038D` | `$267D`, `$27BB` |
| `$D020`–`$D023` | border and background colours | `$0A27`–`$0A36`, band colours in the handler |
| `$D400`–`$D406`, `$D418` | voice 1 and volume, set directly for a noise burst in band 1 when `$03CF` asks | `$2782`–`$27A2` |
| `$D400`–`$D406` indexed by voice, `$D40B`, `$D412`, `$D418` | all three voices, from the music driver | `$C030`–`$C325` |
| `$D415`–`$D417` | never written: no filter | |
| `$D800`–`$DBFF` | colour RAM fills | `$5B6A`–`$5B73`, `$5E1A` |
| `$DC00` | joystick port 2 | `$0CC6` |
| `$DC0D` | read to acknowledge a CIA interrupt; the handler then returns without the KERNAL | `$265D` |
| `$DC01`, CIA timers | never touched: the keyboard comes from the KERNAL's scan (`$C5`, `$028D`) | |
| `$DD00`, `$DD02` | VIC bank per band | the handlers, `$5C3B`–`$5C48`, `$5D35`–`$5D70` |

## Graphics

## Mechanics

## Data tables

## Sound

The High Voltage SID Collection lists three tunes for the game: 1 "Main
Theme", 2 "Game Over (You're dead)", 3 "Game beaten". The game starts tune
A with `JSR $C000`; the main loop asks for A = 1 on a death and A = 2 on
the win.

## Live tests
