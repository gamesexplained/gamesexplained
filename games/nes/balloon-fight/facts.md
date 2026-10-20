# Balloon Fight — facts

What is true about this image now. Each fact is traced in the code or
observed live; the history of how it was found is in `agent-history.md`.

## The alphabet

The font is the game's own order, in the background pattern table at
PPU `$1000` (PPUCTRL bit 4 is set in play). Read from the tiles on
19 October 2026 and matched to Data Crystal's text table:

| Tile | Character |
|---|---|
| `$00-$09` | `0` to `9` |
| `$0A-$23` | `A` to `Z` |
| `$24` | space (an empty tile) |
| `$25` | `-` |
| `$26` | `.` |
| `$27` | `,` |
| `$28` | `.,` in one tile |
| `$29` | `=` |
| `$2A` | the spare-life balloon under the score |
| `$2B` | `x` (a multiplication sign) |
| `$2C` | `!` |
| `$2D` | `?` |
| `$2E` | `*` |
| `$2F` | `_` |

The sprite pattern table at `$0000` holds no font: its first tiles are
the balloonists, birds and balloons.

Strings are stored in this numbering with a header: two bytes of PPU
address, high byte first, then a count, then that many tiles. The ones
the sweep found: the menu's three lines at `$DA78`, `$DA8B` and `$DA9E`,
`1984 NINTENDO` at `$DAB3`, `PHASE-00` at `$F3F7` (the digits patched in),
`GAME  OVER` at `$F444`, `PERFECT!!!` at `$D172`, `SUPER BONUS   10000PTS!`
at `$D186`, `B=00000 PTS.` twice at `$D140` and `$D14E`, and `GAME OVER`
backwards at `$D84B`. Each is to be labelled and its format confirmed
in the listing.

## Register census

Every instruction that names a PPU, APU or I/O register, from the traced
code on the play snapshot (`kit/cpu/census.py`, 19 October 2026). A "?"
is a work item.

| Register | What the game does with it | Routine |
|---|---|---|
| `$2000` PPUCTRL | written 4 times, the first in the start-up at `$C002` | ? |
| `$2001` PPUMASK | written 4 times, the first at `$C005` | ? |
| `$2002` PPUSTATUS | read 4 times, the first at `$C008` (the start-up's wait for vertical blank) | ? |
| `$2003` OAMADDR | zeroed once, in the NMI before the sprite DMA | `$C094` |
| `$2004` OAMDATA | never named | |
| `$2005` PPUSCROLL | written 4 times | ? |
| `$2006` PPUADDR | 32 stores and 2 `STY` | ? |
| `$2007` PPUDATA | 31 stores, 2 `STX`, 6 reads (`$D547` on: the stars routine reads the nametable back) | ? |
| `$4000-$4003` square 1 | volume, sweep, period | the sound driver, `$F5xx-$F9xx` |
| `$4004-$4006` square 2 | volume, sweep, period low; `$4007` never named directly | the sound driver |
| `$4008` triangle linear counter | 3 stores; `$400A-$400B` never named directly | the sound driver |
| `$400C`, `$400E`, `$400F` noise | volume, period, length | the sound driver |
| `$4011` DMC_RAW | one store at `$F7C0` | ? |
| `$4014` OAMDMA | page `$02` once a frame | `$C094` |
| `$4015` SND_CHN | 2 stores, the first at `$DAF7` | ? |
| `$4016` JOY1 | strobe and read, `$E76C` on | ? |
| `$4017` JOY2_FRAME | `$C0` written at `$F75A`, the APU frame counter | `$F758` |

The register the census cannot see directly: the indexed `STA $4002,X`
and `STA $4003,X` at `$F58E` and `$F596` reach every channel's period
registers by X.

## Open questions

- The regions at `$D437-$D469` and `$FBCA-$FBD3` are data the flow
  tracer typed as code (undocumented opcodes decode there); their real
  extent is to be set.
