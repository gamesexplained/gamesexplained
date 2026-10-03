---
name: zx-spectrum-reference
description: ZX Spectrum facts for reverse engineering, memory map, ULA port $FE, 128K paging, AY sound, timing, the character set, and the mistakes that bite. Consult this instead of recalling from training.
---

# ZX Spectrum reference for reverse engineering

Consult this file. If a fact you need is not here, say so in the game's
`kit-feedback.md` and derive it from the emulator, not from memory.

The first profile the kit scores is the **48K machine**. The 128K facts
are here because games use them, but `PLATFORM_DEFAULTS["spectrum"]`
covers 48K until a 128K game is actually run.

## Where to read about a game first

Before any code, and before the emulator, when the contributor has said
yes to looking the game up online (`kit/START.md`): the game's page on
**Spectrum Computing**, `https://spectrumcomputing.co.uk/` (search by
title; it merged the old World of Spectrum and ZXArt catalogues), and the
**comp.sys.sinclair FAQ** at `https://worldofspectrum.net/faq/` for the
machine itself. Read the entry as a form:

- **Credits**: developer, publisher, year, genre. Fills `game.json`.
- **Controls**: keys or joystick, and on the 128K the joystick port. Say
  which input the game actually reads before driving it.
- **Reviews and the manual**: what the game does, the scoring, the
  screens. The manual, when a scan or OCR exists, outranks the summary.
- **POKEs**: addresses with their meaning attached. The best steer the
  page can give; take each one to the disassembler as a symbol candidate.
- **Screenshots**: a few, of states worth naming in `reference/`.

It is a fan catalogue: what it says is documented, not true. Record it
under Sources in `features.md` with the date read, and as `links.wiki` in
`game.json`. When a fan site answers an agent's fetch with a browser check
or 403, the Internet Archive is the fallback (the addresses are in
`kit/skills/c64/c64-reference`, "Where to read about a game first"; the
method is the same, only the wiki changes). Read the documents only; the
same searches list game images, which are never downloaded.

## Memory map (48K)

| Range | What |
|---|---|
| `$0000`–`$3FFF` | the 16K ROM. The character set is its last 768 bytes, `$3D00`–`$3FFF` (codes `$20`–`$7F`, eight bytes each, MSB first) |
| `$4000`–`$57FF` | the screen bitmap, 6144 bytes, 256×192, one bit per pixel. **Not** stored in raster order (below) |
| `$5800`–`$5AFF` | the 768 attribute bytes, one per 8×8 cell, 32 columns × 24 rows, in raster order |
| `$5B00`–`$5BFF` | printer buffer; many games reuse it. `$5B5C` is BANKM, the copy of the last value written to `$7FFD` on a 128K |
| `$5C00`–`$5CB5` | the 48K system variables. `$5C78`–`$5C7A` is the 3-byte frame counter the ROM's interrupt increments |
| `$5CB6`–`$FFFF` | free RAM. Games typically load at `$5CCB`, `$6000`, `$8000` or `$C000`, and move the stack out of the ROM's |
| stack | the ROM sets `SP` just below RAMTOP at the top of RAM (RAM-SET, `$1219`: `LD (RAMTOP),HL`, `LD (HL),$3E`, `DEC HL`, `LD SP,HL`); games move it (a common spot is `$7FFE` or the top of their own block) |

`$0000`–`$3FFF` is ROM, so the kit excludes it and never counts it as the
game's. Only the snapshot's RAM from `$4000` is the game.

## The screen

The bitmap's 192 lines are stored in three **thirds of 64 lines**, and
inside a third the eight lines of a character cell are **not** adjacent.
For a pixel at column `x` (0–255) and row `y` (0–191), the byte is at:

```
$4000 + ((y & 0xC0) << 5) + ((y & 0x07) << 8) + ((y & 0x38) << 2) + (x >> 3)
```

and the bit is `0x80 >> (x & 7)`. The attribute for that cell is at
`$5800 + ((y >> 3) * 32) + (x >> 3)`.

An attribute byte is `FLASH` (bit 7), `BRIGHT` (bit 6), `PAPER` (bits
5–3) and `INK` (bits 2–0), each colour 0–7 (black, blue, red, magenta,
green, cyan, yellow, white). BRIGHT is per-cell, not per-pixel.

The commonest misreading is to treat `$5800` as the end of the bitmap and
lay the picture out linearly. It is neither: the bitmap is `$4000`–
`$57FF`, contiguous but in the third-interleaved order above, and the
attributes follow it at `$5800`. A screenshot from the emulator is the
fast check; `kit/spectrum` renders nothing itself.

## Ports

### `$FE` — the ULA (border, speaker, keyboard)

Every **even** port addresses the ULA: it decodes **A0 only** (A15 is the
128K's paging port, below); use `$FE` (`254`) to avoid clashing with other
hardware.

**Write** (`OUT ($FE),A`):

| Bit | Meaning |
|---|---|
| 0–2 | border colour, 0–7 as above |
| 3 | MIC output |
| 4 | EAR output / internal speaker (bit 3 and 4 toggle the same pin; EAR is the louder) |
| 5–7 | unused |

**Read** (`IN A,($FE)`): the **high** address byte matters too. Each zero
bit in the high byte selects one half-row of five keys:

| High byte | Keys (bit 4→0) |
|---|---|
| `$FE` | V, C, X, Z, SHIFT |
| `$FD` | G, F, D, S, A |
| `$FB` | T, R, E, W, Q |
| `$F7` | 5, 4, 3, 2, 1 |
| `$EF` | 6, 7, 8, 9, 0 |
| `$DF` | Y, U, I, O, P |
| `$BF` | H, J, K, L, ENTER |
| `$7F` | B, N, M, SYMBOL SHIFT, SPACE |

A **0** in a result bit means that key is pressed. Reading with several
address lines low ANDs the rows together, so two keys can be told apart
but three cannot (the "ghost key" the ROM reports as a break). Bits 5 and
7 always read 1; bit 6 is the EAR input, which an active speaker output
also drives.

The kit drives input through the emulator's keyboard/joystick matrix, not
by poking `$FE`, so the game's own read is what receives it.

### `$7FFD` — 128K paging

Write-only (reads return the floating bus). Also responds to any port
with bits 1 and 15 clear; use `$7FFD`.

| Bit | Meaning |
|---|---|
| 0–2 | RAM bank (0–7) paged into `$C000` |
| 3 | 0 normal screen (bank 5), 1 shadow screen (bank 7). `$4000`–`$7FFF` is always bank 5 |
| 4 | ROM select: 0 the 128K editor/menu, 1 the 48K BASIC ROM |
| 5 | set: disable paging until reset |

`$8000`–`$BFFF` is always **bank 2**, not bank 5; `$C000` is whichever bank
bits 0–2 name. Keep `$5B5C` (BANKM) in step with the port, as the FAQ notes,
or the ROM's interrupt paging corrupts the display. Banks 1, 3, 5 and 7 are
**contended** (the ULA steals cycles from them).

### The AY-3-8912 (128K/+2/+2A/+3)

```
OUT ($FFFD),n   select register n (0-14)
IN  ($FFFD)     read the selected register
OUT ($BFFD),v   write v to the selected register
```

Registers 0–13 are the three tone channels, noise and envelope; register
14 (`$FFFD` select, then `IN`) is the I/O port. The 48K has no AY.

## Timing

A 48K frame is **69888 T-states**: 224 T-states per line × (64 top border
+ 192 picture + 56 bottom border). The CPU runs at 3.5 MHz, so the "50 Hz"
interrupt is 50.08 Hz. A 128K frame is **70908 T-states** (50.01 Hz).

The interrupt is generated by the ULA at the start of the frame and, on
the 48K, is the only one. Games that pace themselves by the frame wait
for it (often `EI` + `HALT`, or a poll of the frame counter at
`$5C78`); games that pace by a delay loop run a pass in some other time
than a frame — `kit/EMULATOR.md` phase 4 says to measure the pass, not the
frame, for those.

## The character set

Codes `$20`–`$7F` follow ASCII-1967 with three changes: `$5E` is `↑`,
`$60` is `£` and `$7F` is `©`. Codes `$80`–`$8F` are sixteen 2×2 block
graphics (the ZX80/ZX81 quadrant patterns). Codes `$90`–`$A4` are the 21
**user-defined graphics**; in 128 BASIC this becomes 19 ending at `$A2`,
followed by two tokens for `SPECTRUM` and `PLAY`. Codes `$A5`–`$FF` are
the BASIC **keyword tokens** (`RND`, `INKEY$`, `AT`, `TAB` and so on), with
`$C7`–`$C9` standing for the two-character operators `<=`, `>=` and `<>`.
That is why a screen of BASIC text reads as a run of one- and two-character
words rather than as the source a player typed.

The font is the ROM's last 768 bytes (`$3D00`–`$3FFF`), eight bytes per
character, code `$20` first. Render it to read text that is stored in the
machine's own alphabet rather than in ASCII; byte-pattern search will not
find it. Confirm the ranges and the three printable-character changes
against that table in the ROM before relying on them for a specific game.

## ROM entry points

Programs call into the ROM constantly. The eight restart vectors are the
stable interface; the named routines are the 48K ROM addresses the
disassembly gives. Treat the routine addresses as **to be confirmed
against the ROM disassembly in use**, not as fixed truth:

| Entry | Routine |
|---|---|
| `RST $00` | restart |
| `RST $08` | error handler; the code is **the byte after the `RST`**, not A (`$0008` → `JR $0053`, which does `POP HL` / `LD L,(HL)`) |
| `RST $10` | print the character in A |
| `RST $18` | get the next character from the current stream |
| `RST $20` | next character / skip whitespace |
| `RST $28` | the floating-point calculator |
| `RST $30` | make BC bytes of space on the stack |
| `RST $38` | (the eighth vector) |
| `$1601` | CHAN-OPEN: open channel A ('S'=2 screen, 'K'=1 keyboard) |

A call to `$1601` followed by `RST $10` is the ROM's "print this string"
idiom; a game that keeps the ROM in place uses it for all its text.

## The mistakes that bite

- **The bitmap is not linear.** See "The screen". `$5800` is the
  attributes, not the tail of the bitmap.
- **The floating bus.** Reading a port no hardware answers returns the
  last byte the ULA fetched, so a snapshot's I/O reads are meaningless
  unless the address was the ULA's.
- **Keyboard ghosting.** Three simultaneous keys can be decoded as a
  fourth; "not pressed" is a 1, and reading a single half-row needs its
  address line low.
- **182 bytes of system variables are not free RAM.** `$5C00`–`$5CB5` is
  the ROM's; a game that keeps the ROM alive and stores there breaks the
  interrupt.
- **A 128K snapshot is not the 48K one.** `.sna` and `.z80` carry the
  banked memory too, and the byte lengths differ; the kit's reader accepts
  exactly the 48K `.sna` (49179 bytes) and refuses the rest, naming what
  it saw.
- **Contended banks are slow.** Code in banks 1, 3, 5 or 7 loses cycles
  to the ULA, which changes what a timing measurement means.

## Snapshot formats

The kit's canonical snapshot is a 48K `.sna`: a **27-byte header** then
**49152 bytes** of RAM for `$4000`–`$FFFF`, no compression.

Header bytes, in order: `I` (1), `HL'` `DE'` `BC'` `AF'` (2 each), `HL`
`DE` `BC` `IY` `IX` (2 each), `IFF2` (1), `R` (1), `AF` `SP` (2 each),
interrupt mode (1), border (1). All multi-byte values are little-endian.
A 128K `.sna` is longer and appends the port value, a PC and the extra
banks; `.z80` is a different layout, optionally compressed. The reader in
`kit/spectrum/snapshot.py` is the authority for what the kit accepts.
