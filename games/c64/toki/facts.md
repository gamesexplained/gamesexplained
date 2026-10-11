# Toki — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`
(`work/play-round1.vsf`, stage 1 in play).

## Build

An Ocean type 1 cartridge of sixteen 8 KB banks; bank 2 carries
"1991 OCEAN SOFTWARE LTD / ALL RIGHTS RESERVED" ($8CEC-$8D15, game
alphabet). No version string found.

## Memory layout

| Thing | Where |
|---|---|
| Cartridge copy routines | `cart_copy` $011F and `cart_copy_six` $0100, in the stack page |
| Cartridge directory | bank 0 from $8009, 8 bytes an entry, read by `cart_copy` |
| Ocean bank register | $DE00, written by `cart_copy` ($80 selects bank 0) and from $0502-$0B52 and $4F66-$5238 |
| Game code copied from bank 3 | $8000-$9FFF (8,004 of 8,192 bytes match bank 3 in play) |
| Screen during the stage card | $CC00 (video bank $C000, $D018 = $31) *live* |
| Sprite pointers | $CBF8 and $CFF8, written by `nmi_frame` ($4D4D, $4D50): two screens |
| Sound code | the SID writes all fall in $6615-$6ED4 (`sound_init` $660D) |

## Timing

- `game_start` ($8000) sets CIA 2 timer A to $4CC7 ($8006-$800D) and
  `stage_load` ($5271) points the NMI vector at `nmi_frame` ($4D1D): a
  timer NMI once a PAL frame.
- Two raster interrupts take turns through $FFFE: `irq_play` $837E
  (written on line 248) and `irq_panel` $BCE1 (written on line 216) *live*
  (frame capture).
- `wait_frame` ($819B) spins on $08F7 until the interrupt changes it *live*.

## Text

The game's alphabet: A-Z are $00-$19, 0-9 are $1C-$25, space $27
(stage card on screen at $CC00, row 8). Stored text in bank 0:
STAGE CLEAR ($8B27), GAME OVER, CONTINUE, the five stage names from
$8B50 (LABYRINTH OF CAVES, LAKE NEPTUNE, CAVERNS OF FIRE, ICE PALACE,
DARK JUNGLE), MUSIC and SFX ($8BA1). The play snapshot's RAM holds none
of it: the game reads its text from the cartridge.

## Hardware register census

From the disassembler's trace of the play snapshot (21,388 code bytes).

| Register | What the game does | Where |
|---|---|---|
| $D000-$D00F sprite positions | set at start-up, in `irq_play` and by `nmi_frame` | $40AA-$40DE, $8398-$83AD, $81C5-$81DE, $4D5B, $4D61 |
| $D010 sprite X high bits | | $40B7, $40CA, $8395 |
| $D011 control 1 | blank, scroll and mode | $4053, $4072, $4108, $801E, $806A, $8390, $4D3F |
| $D012 raster | wait for line $EE; compare in `irq_play` | $8012, $838B, $40A1, $42D6 |
| $D015 sprite enable | | $40F7, $8062, $8213, $4D70 |
| $D017, $D01D sprite expand | set per split | $83B0, $83B3 |
| $D018 memory control | | $405F |
| $D019, $D01A raster interrupt | acknowledge; enable | $809F, $80A2, $8030, $8055 |
| $D01C sprite multicolour | | $8216 |
| $D020 border | | $054F |
| $D021 background | incremented once ($858B), purpose ? | $858B |
| $D022, $D023 multicolours | | $83C6, $83CA |
| $D025, $D026 sprite multicolours | | $8884, $8889 |
| $D027-$D02A sprite colours | | $81EE-$8200, $4D67 |
| $D400-$D406 voice 1 (indexed by voice) | frequency, pulse, control, envelope | $6627-$6E8E |
| $D40B, $D412 voice 2 and 3 control | silenced together | $6ED1, $6ED4 |
| $D415, $D416 filter cutoff | | $6E21, $6E3A |
| $D417 resonance, $D418 volume | | $6615, $6CB5, $6620-$683C |
| $DC00, $DC01 CIA 1 ports | keyboard scan `read_keys` $5290; more reads and writes at $8577-$8595, purpose ? | $4084-$4091, $5292-$52DF, $8577-$8595 |
| $DD00 CIA 2 port A | video bank | $8034, $83BC |
| $DD04-$DD0E CIA 2 timer A | the per-frame NMI | $8008, $800D, $8019, $404D, $8052, $8196, $824C, $8259 |
| $DE00 Ocean bank register | cartridge bank select | see Memory layout |

Never written: the SID's voice 2 and 3 frequency, pulse and envelope
registers by name. The voice-1 writes are indexed by Y or X, so they
reach the other voices: an absence of named writes says nothing.

## Live tests

- PC sampled 16 times in play: always $819E (`wait_frame`).
- Writes to $9FF0 and $BFF0 read back changed: RAM, not cartridge, in play.
