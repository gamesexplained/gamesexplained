# Chiller — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

No build identifier was found in the image: the string sweep
(`work/sweep_strings.py`) turned up no version or date text. The loader's
`(ANTISOFT)` mark is a third party's (`orientation.md`). Which of the two
releases this is (the *Thriller* music or the later one) is open:
`features.md`.

## Memory layout

Where the CPU runs during play: non-stopping exec checkpoints over ranges,
3 s from `work/play-idle.vsf` with no input (`work/orient_cpu.py`, *live*):

| Range | Instructions in 3 s |
|---|---|
| `$0800`-`$2FFF` | 69,707 |
| `$3000`-`$4FFF` | 0 |
| `$5000`-`$5FFF` | 158,250 |
| `$6000`-`$6FFF` | 1,804 |
| `$7000`-`$7FFF` | 36,859 |
| `$8000`-`$BFFF` | 0 |
| `$C000`-`$CFFF` | 379,203 |
| `$E000`-`$FFFF` | 10,521 (the KERNAL's IRQ path, `$EA31` and on) |

This corrects `orientation.md`, which placed the engine's live code at
`$A000`-`$BFFF`: nothing ran there in 3 s of play.

| Thing | Where |
|---|---|
| Screen | `$0400` (`$D018 = $1D`, VIC bank 0) |
| Character set | `$3000`-`$37FF` (`$D018`) |
| Level records, one per screen, `$80` bytes each (`$100` between 4 and 5) | `$7000`-`$757F`; card pointer at `+$74` |
| Level cards | `$4100`-`$44E8` |
| Music player and tune | `$60A0`-`$61F7`, tune `$61F8`-`$6A15` |
| IRQ vector `$0314` | `music_irq` `$60F5`, set by `music_start` `$60CA` |

## Twin copies

`work/sweep_twins.py` compares every non-blank 256-byte page with every
other; `work/sweep_shadow.py` does the same for 32-byte windows above
`$E000`.

| Block | Twin | Bytes that differ | Which the code reads |
|---|---|---|---|
| `$3000`-`$33FF`, the first 128 glyphs | `$8000`-`$83FF` | 1 | The chip reads `$3000`. Four routines load `#$80` next to `#$00` (`$51A0`, `$5227`, `$C112`, and its twin `$F251`); whether one copies the set is open |
| `$0500`-`$06FF`, screen rows 7-19 | `$8500`-`$86FF` | 2 | The screen is `$0400`, so `$8400`-`$87E7` looks like a stored copy of the play screen; it holds the HUD with MAGIC CROSSES too (`$8400`) |
| `$0900`-`$09FF` | `$CE00`-`$CEFF` | 0 | The loader's copier put it there (`orientation.md`) |
| `$C001`-`$CDE0`, in pieces | `$F140`-`$FEDF`, at distances `$30FF`-`$313F` | not measured | The CPU runs 379,203 instructions a sec... in `$C000`-`$CFFF` and only the KERNAL's own path above `$E000`, so the copy under the KERNAL looks unread; not proved |
| `$B600`-`$BEFF` | itself, shifted by `$100`-`$800` | 1-11 | Repeating fill (`$FF` with `$00` every few bytes), not data |

## Timing

The music is driven from the system IRQ: `music_irq` counts zp `$02` down
each interrupt and plays the next command when it reaches the tempo in
`$02AA`. The tune sets the tempo to 6 (`$61FE`). That the IRQ is the
KERNAL's 60 Hz CIA timer and not a raster interrupt follows from its
exit through `$EA31`, and nothing in the census writes a raster compare;
not yet measured.

## Controls

The stick in control port 2 (`$DC00`, `cia1_port_a`) is the only CIA1
port read: eight `LDA $DC00` in the census, none of `$DC01`, and no
writes to CIA1 at all. So the manual's keyboard controls (Z, C, SHIFT,
`?`) go through the KERNAL's keyboard scan, not the game's own; open.

## Graphics

## Hardware register census

`work/sweep_regs.py` over `$0800`-`$CFFF`: every absolute access to
`$D000`-`$DFFF` (`work/sweep-regs.txt`, 97 registers). It counts byte
patterns, so a hit in data is a false one: the ones at odd addresses
such as `$D053`, `$D112`, `$D74A` and `$DD99` all fall in graphics or
tables and are left out here.

| Registers | What the game does with them | Where |
|---|---|---|
| `$D000`-`$D00F`, `$D010` | Sprite positions. 0 is the boy (it follows the stick, *live*); the others are open | many; `$C3E0`-`$C3F2` is seven `DEC`s of sprites 1-7's Y in a row |
| `$D015` | Sprite enable, 45 accesses: sprites switched on and off with the screens | `$0907`, `$2BF2`, `$2DA2`, … |
| `$D016` | Multicolour text on (`ORA #$10`); 40 columns on (`ORA #$08`) and off (`AND #$F7`) | multicolour at `show_card` `$5C62` and `$5D80`; `$2BF5` sets and `$C026` clears bit 3 |
| `$D018` | `$15` (the ROM font, screen `$0400`) before printing through the KERNAL, `$1C` (font at `$3000`) after | `$15` at `$2CD1` and `$55C4`; `$1C` at `$2EFB`, `show_card` `$5C6C` and `$C6B1` |
| `$D01B`, `$D01C`, `$D01D` | Sprite priority, multicolour, X expansion | `$2E97`, `$2D1C`, `$2D22`, … |
| `$D01E` | Sprite-sprite collision, read three times; the likely test for an enemy touching the boy, not yet traced | `$0987`, `$C6DA`, `$CE87` |
| `$D01F` | Sprite-background collision, read once | `$2D60` |
| `$D020`, `$D021` | Border and background. The manual says the border shows who is being controlled on the way back; these writes are where to look | `$2CC7`, `$515D`, `$57B7`, `$590E`, `$5A4B`; `game_over_wait` `$7720` reads the border |
| `$D022`-`$D024` | Multicolour background colours, set per screen | `$5BD5`, `$5D8A`, `$758E`, `$7623`, … |
| `$D025`-`$D02E` | Sprite colours | `$2B90`, `$2D10`, `$5554`, … |
| `$D011`, `$D012` | Read only, never written. Two copies of one wait loop spin until the raster is line 16 (`$D012 = $10` and `$D011` bit 7 clear); `$C46B` spins until line `$4B` | `$5BB0`, `$72C7`, `$C46B` |
| `$D400`-`$D40D` | Voices 1 and 2: the music (`music_*`, `mcmd_*`) | `$60BF`-`$61D6` |
| `$D40E`-`$D414` | Voice 3: the sound effects, all outside the music player | `$2BE3`, `$2F05`, `$5485`-`$552C` |
| `$D415`-`$D418` | Filter and volume, set once: `$D415 = $05`, `$D416 = $45` (an 11-bit cutoff of `$22D`), `$D417 = $F1` (resonance 15, voice 1 through the filter), `$D418 = $3F` (low-pass and band-pass, volume 15) | `music_init_filter` `$60A0` |
| `$DC00` | The joystick | `$2D97`, `$58BD`, `$C1C0`, `$C8C5`, `$C8D3`, `$C8E1`, `$C9C4`, `$C9DB` |
| `$D800`- | Colour RAM | many |

Never touched from the game's code: `$D013`, `$D017`, `$D019`, `$D01A`
(no raster interrupt), the CIA timers and interrupt control (`$DC04`-
`$DC0F`, `$DD04`-`$DD0F`), `$DD00` (the VIC bank stays at 0), and SID
voice 3's pulse width and oscillator read-back (`$D410`, `$D411`,
`$D41B`, `$D41C`).

## Mechanics

## Data tables

## Text

The game has its own character set but keeps the system's glyph order, so
nothing needs a private alphabet table. Read from `work/play-idle.vsf`
(`work/text_vic.py`, `work/sweep_strings.py`):

- **The font during play and on the cards.** `$D018 = $1D` in play and
  `$1C` on the cards (`show_card` `$5C6A`). Either way it points at
  `$3000` in VIC bank 0 (`$DD00 = $C7`), with the screen at `$0400`.
  Glyphs `$80`-`$BF` are the letters, digits and punctuation in
  screen-code order: A at `$81`, 0 at `$B0`, space at `$A0`. So the game's
  own on-screen strings are **screen codes plus `$80`**. `$00`-`$7F` hold
  the scenery tiles. Rendered in `work/charset-play.png`.
- **The card text is plain PETSCII**, printed through the KERNAL's CHROUT
  by `print_card` `$5CD8`. Colour codes (red for a title, blue for the
  verse, white and yellow on the title card) and cursor codes lay it out,
  and `$01` ends it. The first two bytes of a card are the cursor row and
  column, set through PLOT (`$FFF0`).

| Text | Where | Encoding | Printed by |
|---|---|---|---|
| Ten level cards, forest to haunted house and back | `$4100`-`$44E8` | PETSCII, row/column first, `$01` end | `print_card` via `show_card` `$5C4F`, from `$5BE4`; each level's record at `$7000 + $80·n` holds its card's address at `+$74` |
| "THE FOREST", the first level's heading | `$5D0D` | PETSCII card | `show_forest_card` `$5E00` |
| "MASTERTRONIC'S" | `$5D00` | screen codes + `$80` | `show_card` `$5C71`, to `$04D6` |
| The title card: welcome, the goal and the controls | `$7C00` | PETSCII card | `$7760`, after a game ends (`game_over_wait` `$7720`) |
| "PROGRAMMED BY DAVID AND RICHARD DARLING." | `$77C0` | screen codes + `$80` | `show_programmed_by` `$72ED`, to screen row 0 |
| HUD, "SCORE … MAGIC CROSSES … HI" and "ENERGY" | screen `$0400`; copies at `$8400`, and with SILVER CROSSES at `$8E00`, `$9800`, `$A200`, `$AC00` | screen codes + `$80` | open |
| "LEVEL 001", "GAME OVER" | `$0AA1`, copy at `$CFA1` | screen codes + `$80` | open |
| "PRESS CTRL FOR MENU" | `$574A` | screen codes + `$80` | `show_press_ctrl` `$5736`, to screen row 23. No call to it was found |
| "ANTISOFT", repeated | `$0806`, `$0836`-`$08CF` | PETSCII | the loader (`orientation.md`) |

The ten cards, in the order of the records at `$7000`-`$7574`:

| n | Record | Card | Heading | Verse |
|---|---|---|---|---|
| 0 | `$7000` | `$4100` | THE FOREST | MOVE THE BOY AROUND THE FOREST / COLLECTING THE BLUE MAGIC CROSSES. |
| 1 | `$7080` | `$4178` | THE CINEMA | THERE'S A MESSAGE SCRAWLED IN BLOOD... |
| 2 | `$7100` | `$41B8` | THE GHETTO | SAVE YOUR ENERGY, YOU'LL NEED IT. |
| 3 | `$7180` | `$4208` | THE GRAVEYARD | THE MIDNIGHT HOUR IS CLOSE AT HAND, / YOUR DEATH AWAITS IN THIS EVIL LAND. |
| 4 | `$7200` | `$4288` | THE HAUNTED HOUSE | YOUR GIRLFRIEND YOU ARE SEARCHING FOR, / WHEN YOU HAVE THE CROSSES SHE'LL APPEAR / BY THE DOOR. |
| 5 | `$7300` | `$4318` | THE HAUNTED HOUSE | BOTH BOY AND GIRL MUST TURN AROUND, / BECAUSE YOUR QUEST IS HOMEWARD BOUND. |
| 6 | `$7380` | `$4388` | THE GRAVEYARD | BY NOW YOUR ENERGY MUST BE LOW, / SO FIND A MUSHROOM BEFORE YOU SLOW. |
| 7 | `$7400` | `$43F0` | THE GHETTO | THE GHETTO IS A LONELY PLACE, / SO GET YOUR CROSSES WITH GREAT HASTE. |
| 8 | `$7480` | `$4458` | THE CINEMA | THE FINAL MINUTES ARE WITH YOU, / USE THEM WELL. |
| 9 | `$7500` | `$44B0` | THE FOREST | THE END IS NIGH, YOU'RE GOING TO DIE. |

The records are `$80` bytes apart except between 4 and 5, which are
`$100` apart: `$7280`-`$72FF` is not a record, and `$72E0`-`$72FF` in it
is code (`show_programmed_by`). What the rest of each record holds, and
how the game steps from one record to the next, is open; the card
pointer at `+$74` is the only field identified (`work/text_cards.py`).

The font has no apostrophe. The cards fake one with cursor codes: up, a
comma, down (`THERE{up},{down}S`), which prints the comma a row higher.
After the cinema card's `$01` end marker come the bytes "N." and another
`$01` (`$41B5`-`$41B7`); no code was found that points at them.

## Sound

The music is a small interpreter on voices 1 and 2, run from the IRQ.
`music_start` `$60CA` silences the SID, points zp `$B7/$B8` (the play
position) and `$B9/$BA` (the loop point) at `$61F8`, sets the filter
(`music_init_filter`) and puts `music_irq` `$60F5` in `$0314`.
`music_stop` `$61D2` gives `$0314` back to the KERNAL's `$EA31`.

Each tick, `music_irq` counts zp `$02` down. At zero, `music_next_command`
`$6100` reads the next byte of the tune and stores it into the low byte
of the `JMP` at `$610B` (`music_dispatch`), so **each command byte is the
low byte of its handler's address in page `$61`**. Operands follow the
command and are read by `music_fetch` `$61E9`. The handlers, read in the
code:

| Byte | Handler | Operands | What it does |
|---|---|---|---|
| `$0E` | `mcmd_note_v1` | freq hi, lo | voice 1 frequency, gate off then on with the stored waveform |
| `$26` | `mcmd_note_v2` | freq hi, lo | the same on voice 2 |
| `$3E` | `mcmd_note_both` | 2 × (hi, lo) | both voices, then falls into `$56` |
| `$56` | `mcmd_retrigger_both` | none | gate both voices off and on again |
| `$6B` | `mcmd_set_tempo` | 1 | ticks per step into `$02AA`, then ends the step |
| `$74` | `mcmd_rest` | none | reloads the counter from `$02AA`: the step ends with nothing new played |
| `$7C` | `mcmd_count` | none | `INC $02FF`, then ends the step |
| `$82` | `mcmd_set_waveforms` | 2 | control bytes for voices 1 and 2 into `$02AC`/`$02AD` |
| `$91` | `mcmd_set_envelopes` | 4 | attack/decay for voices 1 and 2, then sustain/release for 1 and 2 |
| `$AC` | `mcmd_set_pulse` | 4 | pulse width lo/hi for voice 1, then voice 2 |
| `$C7` | `mcmd_loop` | none | play position back to the loop point |
| `$00` | `$6100` itself | none | fetch the next byte at once: a no-op |

The tune runs from `$61F9` to the loop command at `$6A15`: 341 notes and
592 rests over 998 commands, at tempo 6, starting with pulse and
sawtooth (`$41`, `$21`) (`work/sweep_tune.py`, `work/sweep-tune.txt`).

**The tune's pitches are computed for the NTSC clock.** Of its 478
frequency values, 464 come within 2 cents of equal temperament taken at
the NTSC clock (1,022,727 Hz); taken at PAL (985,248 Hz) none do, and the
same 464 sit 33 to 36 cents off, which is 65 cents flat of the note above
(`work/sweep-tune-ntsc.txt`, `work/sweep-tune.txt`). That is the 0.65 of
a semitone the platform reference gives for an NTSC table played on PAL,
the machine this image was run on. Named at the NTSC clock, voice 1
opens C2, D2, F2, G2, D2, F3. The other 14 values are open.

`$02FF` counts `mcmd_count` commands (cleared by `music_start`). Two
places poll it: `$5DAD` waits for it to leave zero and then calls
`music_stop`, and `$7614` branches on it. So the tune can signal the
game, which is presumably how the title music ends; not traced. Voice 3
carries the sound effects outside the player (`$2BE3`, `$2F05`,
`$5485`-`$552C`); they are not yet read.

## Live tests
